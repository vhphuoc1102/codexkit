#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

import { getCodexKitStatePaths, resolveRepoRoot } from "./codexkit_state.mjs";

const SCHEMA_VERSION = "1.0";
const LOCK_TIMEOUT_MS = 2000;
const LOCK_RETRY_MS = 50;
const LOCK_STALE_MS = 30000;

function utcNow() {
  return new Date().toISOString();
}

function sleepMs(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function slash(value) {
  return String(value || "").replace(/\\/g, "/").replace(/^\.\/+/, "");
}

function hasGlob(value) {
  return /[*?[\]{}]/.test(String(value || ""));
}

function escapeRegex(text) {
  return text.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
}

function globToRegExp(pattern) {
  const normalized = slash(pattern);
  let regex = "^";
  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];
    const next = normalized[index + 1];
    if (char === "*" && next === "*") {
      regex += ".*";
      index += 1;
      continue;
    }
    if (char === "*") {
      regex += "[^/]*";
      continue;
    }
    if (char === "?") {
      regex += "[^/]";
      continue;
    }
    regex += escapeRegex(char);
  }
  return new RegExp(`${regex}$`);
}

function staticPrefix(pattern) {
  return (slash(pattern).match(/^[^*?[\]{}]*/)?.[0] || "").replace(/\/+$/, "");
}

export function patternsOverlap(leftValue, rightValue) {
  const left = slash(leftValue);
  const right = slash(rightValue);
  if (!left || !right) return false;
  if (left === "**" || right === "**" || left === right) return true;

  const leftGlob = hasGlob(left);
  const rightGlob = hasGlob(right);
  if (!leftGlob && !rightGlob) return left === right;
  if (!leftGlob && rightGlob && globToRegExp(right).test(left)) return true;
  if (leftGlob && !rightGlob && globToRegExp(left).test(right)) return true;

  const leftPrefix = staticPrefix(left);
  const rightPrefix = staticPrefix(right);
  if (!leftPrefix || !rightPrefix) return true;
  return leftPrefix.startsWith(rightPrefix) || rightPrefix.startsWith(leftPrefix);
}

function normalizePath(repoRoot, value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  if (path.isAbsolute(trimmed)) {
    return slash(path.relative(repoRoot, trimmed) || ".");
  }
  return slash(trimmed);
}

function emptyStore() {
  return { schema_version: SCHEMA_VERSION, updated_at: utcNow(), reservations: [] };
}

function reservationsPath(repoRoot) {
  return getCodexKitStatePaths(repoRoot).reservationsJson;
}

function readStore(repoRoot) {
  const filePath = reservationsPath(repoRoot);
  if (!fs.existsSync(filePath)) return emptyStore();
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return { ...emptyStore(), ...parsed, reservations: Array.isArray(parsed.reservations) ? parsed.reservations : [] };
  } catch {
    return emptyStore();
  }
}

function writeStore(repoRoot, store) {
  const filePath = reservationsPath(repoRoot);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify({ ...store, updated_at: utcNow() }, null, 2)}\n`, "utf8");
}

function withLock(repoRoot, fn) {
  const lockPath = `${reservationsPath(repoRoot)}.lock`;
  fs.mkdirSync(path.dirname(lockPath), { recursive: true });
  const deadline = Date.now() + LOCK_TIMEOUT_MS;
  while (true) {
    try {
      const fd = fs.openSync(lockPath, "wx");
      fs.writeFileSync(fd, JSON.stringify({ pid: process.pid, created_at: utcNow() }), "utf8");
      fs.closeSync(fd);
      break;
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
      let stale = false;
      try {
        stale = Date.now() - fs.statSync(lockPath).mtimeMs > LOCK_STALE_MS;
      } catch {
        stale = true;
      }
      if (stale) {
        fs.rmSync(lockPath, { force: true });
        continue;
      }
      if (Date.now() >= deadline) throw new Error("Timed out waiting for reservation lock.");
      sleepMs(LOCK_RETRY_MS);
    }
  }
  try {
    return fn();
  } finally {
    fs.rmSync(lockPath, { force: true });
  }
}

function activeReservation(reservation) {
  if (reservation.status !== "active") return false;
  return !reservation.expires_at || Date.parse(reservation.expires_at) > Date.now();
}

function sweep(repoRoot) {
  return withLock(repoRoot, () => {
    const store = readStore(repoRoot);
    const swept = [];
    for (const reservation of store.reservations) {
      if (reservation.status === "active" && reservation.expires_at && Date.parse(reservation.expires_at) <= Date.now()) {
        reservation.status = "expired";
        reservation.updated_at = utcNow();
        swept.push(reservation.id);
      }
    }
    if (swept.length) writeStore(repoRoot, store);
    return { swept_count: swept.length, swept_ids: swept };
  });
}

function reserve(repoRoot, options) {
  return withLock(repoRoot, () => {
    const paths = options.paths.map((item) => normalizePath(repoRoot, item)).filter(Boolean);
    if (!options.agent) throw new Error("reserve requires --agent.");
    if (!paths.length) throw new Error("reserve requires --path.");

    const store = readStore(repoRoot);
    const conflicts = store.reservations
      .filter(activeReservation)
      .filter((reservation) => reservation.agent !== options.agent)
      .filter((reservation) => reservation.paths.some((held) => paths.some((requested) => patternsOverlap(held, requested))));

    if (conflicts.length) return { ok: false, conflicts };

    const now = utcNow();
    const ttl = options.ttl ? Number(options.ttl) : null;
    const reservation = {
      id: `resv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      agent: options.agent,
      bead_id: options.bead || "",
      paths,
      status: "active",
      created_at: now,
      updated_at: now,
      ttl_seconds: ttl,
      expires_at: ttl ? new Date(Date.parse(now) + ttl * 1000).toISOString() : null,
      released_at: null,
      note: options.note || "",
    };
    store.reservations.push(reservation);
    writeStore(repoRoot, store);
    return { ok: true, reservation, conflicts: [] };
  });
}

function list(repoRoot, options) {
  const store = readStore(repoRoot);
  const reservations = store.reservations.filter((reservation) => {
    if (options.activeOnly && !activeReservation(reservation)) return false;
    if (options.agent && reservation.agent !== options.agent) return false;
    if (options.bead && reservation.bead_id !== options.bead) return false;
    return true;
  });
  return { reservations };
}

function release(repoRoot, options) {
  return withLock(repoRoot, () => {
    const store = readStore(repoRoot);
    const released = [];
    for (const reservation of store.reservations) {
      if (!activeReservation(reservation)) continue;
      if (options.agent && reservation.agent !== options.agent) continue;
      if (options.bead && reservation.bead_id !== options.bead) continue;
      reservation.status = "released";
      reservation.updated_at = utcNow();
      reservation.released_at = reservation.updated_at;
      released.push(reservation.id);
    }
    if (released.length) writeStore(repoRoot, store);
    return { released_count: released.length, released_ids: released };
  });
}

function parseArgs(argv) {
  const args = { command: argv[0], paths: [], repoRoot: undefined, activeOnly: false };
  for (let index = 1; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--repo-root") args.repoRoot = argv[++index];
    else if (arg === "--agent") args.agent = argv[++index];
    else if (arg === "--bead") args.bead = argv[++index];
    else if (arg === "--path") args.paths.push(argv[++index]);
    else if (arg === "--ttl") args.ttl = argv[++index];
    else if (arg === "--note") args.note = argv[++index];
    else if (arg === "--active-only") args.activeOnly = true;
    else if (arg === "--json") args.json = true;
    else if (arg === "--help" || arg === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
if (args.help || !args.command) {
  process.stdout.write("Usage: codexkit_reservations.mjs <reserve|list|release|sweep> [--agent <name>] [--bead <id>] [--path <glob>] [--ttl <seconds>] [--json]\n");
  process.exit(0);
}

const repoRoot = resolveRepoRoot(args.repoRoot);
const result =
  args.command === "reserve" ? reserve(repoRoot, args) :
  args.command === "list" ? list(repoRoot, args) :
  args.command === "release" ? release(repoRoot, args) :
  args.command === "sweep" ? sweep(repoRoot) :
  (() => { throw new Error(`Unknown command: ${args.command}`); })();

process.stdout.write(args.json ? `${JSON.stringify(result, null, 2)}\n` : `${JSON.stringify(result)}\n`);
