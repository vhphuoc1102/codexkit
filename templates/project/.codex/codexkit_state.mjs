#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

import { buildCodexKitDependencyReport } from "./codexkit_dependencies.mjs";

export const STATE_SCHEMA_VERSION = "1.0";

const DEFAULT_APPROVED_GATES = {
  context: false,
  plan: false,
  execution: false,
  review: false,
};

function utcNow() {
  return new Date().toISOString();
}

function ensureParent(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function normalizeStringArray(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string" && item.trim()) : [];
}

function normalizeOptionalString(value) {
  return typeof value === "string" ? value : "";
}

function normalizeActiveWorkers(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => item && typeof item === "object" && !Array.isArray(item))
    .map((worker) => ({
      agent_id: normalizeOptionalString(worker.agent_id),
      codex_name: normalizeOptionalString(worker.codex_name || worker.agent_nickname),
      bead_id: normalizeOptionalString(worker.bead_id),
      status: normalizeOptionalString(worker.status),
      started_at: normalizeOptionalString(worker.started_at),
      updated_at: normalizeOptionalString(worker.updated_at),
    }));
}

function normalizeApprovedGates(value) {
  const gates = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    ...DEFAULT_APPROVED_GATES,
    context: Boolean(gates.context),
    plan: Boolean(gates.plan),
    execution: Boolean(gates.execution),
    review: Boolean(gates.review),
  };
}

export function resolveRepoRoot(explicitRoot, startFrom = process.cwd()) {
  if (explicitRoot) return path.resolve(explicitRoot);
  const cwd = path.resolve(startFrom);
  try {
    const stdout = execFileSync("git", ["rev-parse", "--show-toplevel"], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return path.resolve(stdout.trim());
  } catch {
    let candidate = cwd;
    while (true) {
      if (fs.existsSync(path.join(candidate, ".git")) || fs.existsSync(path.join(candidate, ".codexkit"))) {
        return candidate;
      }
      const parent = path.dirname(candidate);
      if (parent === candidate) return cwd;
      candidate = parent;
    }
  }
}

export function getCodexKitStatePaths(repoRoot) {
  return {
    stateJson: path.join(repoRoot, ".codexkit", "state.json"),
    handoff: path.join(repoRoot, ".codexkit", "HANDOFF.json"),
    reservations: path.join(repoRoot, ".codexkit", "reservations.json"),
    config: path.join(repoRoot, ".codexkit", "config.json"),
    agents: path.join(repoRoot, "AGENTS.md"),
  };
}

export function buildDefaultState(overrides = {}) {
  return {
    schema_version: STATE_SCHEMA_VERSION,
    feature_slug: normalizeOptionalString(overrides.feature_slug),
    mode: normalizeOptionalString(overrides.mode),
    active_workflow: normalizeOptionalString(overrides.active_workflow),
    phase: normalizeOptionalString(overrides.phase) || "idle",
    phase_number: Number.isFinite(overrides.phase_number) ? overrides.phase_number : 0,
    epic_id: normalizeOptionalString(overrides.epic_id),
    approved_gates: normalizeApprovedGates(overrides.approved_gates),
    active_beads: normalizeStringArray(overrides.active_beads),
    active_workers: normalizeActiveWorkers(overrides.active_workers),
    blockers: normalizeStringArray(overrides.blockers),
    focus: normalizeOptionalString(overrides.focus),
    summary: normalizeOptionalString(overrides.summary),
    next_action: normalizeOptionalString(overrides.next_action),
    deferred_beads: normalizeStringArray(overrides.deferred_beads),
    last_updated: normalizeOptionalString(overrides.last_updated) || utcNow(),
  };
}

export function normalizeCodexKitState(state) {
  if (!state || typeof state !== "object" || Array.isArray(state)) return buildDefaultState();
  return buildDefaultState(state);
}

export function readCodexKitState(repoRoot) {
  return normalizeCodexKitState(readJsonIfExists(getCodexKitStatePaths(repoRoot).stateJson));
}

export function writeCodexKitState(repoRoot, nextState) {
  const statePath = getCodexKitStatePaths(repoRoot).stateJson;
  const normalized = normalizeCodexKitState({
    ...nextState,
    last_updated: utcNow(),
  });
  ensureParent(statePath);
  fs.writeFileSync(statePath, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  return normalized;
}

export function readCodexKitHandoff(repoRoot) {
  return readJsonIfExists(getCodexKitStatePaths(repoRoot).handoff);
}

export function writeCodexKitHandoff(repoRoot, handoff) {
  const handoffPath = getCodexKitStatePaths(repoRoot).handoff;
  const payload = {
    schema_version: "1.0",
    last_updated: utcNow(),
    ...(handoff && typeof handoff === "object" && !Array.isArray(handoff) ? handoff : {}),
  };
  ensureParent(handoffPath);
  fs.writeFileSync(handoffPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return payload;
}

export function clearCodexKitHandoff(repoRoot) {
  const handoffPath = getCodexKitStatePaths(repoRoot).handoff;
  if (fs.existsSync(handoffPath)) fs.rmSync(handoffPath, { force: true });
}

function readDependencyHealth(repoRoot) {
  try {
    return buildCodexKitDependencyReport({ repoRoot });
  } catch (error) {
    return {
      checked_at: utcNow(),
      summary: { missing_dependencies: 0 },
      skills: [],
      missing_dependencies: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export function readCodexKitStatus(repoRoot) {
  const paths = getCodexKitStatePaths(repoRoot);
  const handoff = readCodexKitHandoff(repoRoot);
  const state = readCodexKitState(repoRoot);
  const reservations = readJsonIfExists(paths.reservations);
  const activeReservations = Array.isArray(reservations?.reservations)
    ? reservations.reservations.filter((reservation) => reservation.status === "active")
    : [];

  return {
    repo_root: repoRoot,
    state_path: paths.stateJson,
    handoff_path: paths.handoff,
    reservations_path: paths.reservations,
    state_json: {
      exists: fs.existsSync(paths.stateJson),
      ...state,
    },
    handoff: {
      exists: Boolean(handoff),
      ...(handoff || {}),
    },
    reservations: {
      exists: fs.existsSync(paths.reservations),
      active_count: activeReservations.length,
      active_agents: [...new Set(activeReservations.map((item) => item.agent).filter(Boolean))].sort(),
      active_reservations: activeReservations,
    },
    dependency_health: readDependencyHealth(repoRoot),
    next_reads: [
      "AGENTS.md",
      ...(handoff ? [".codexkit/HANDOFF.json"] : []),
      ".codexkit/state.json",
    ],
  };
}

export function renderCodexKitStatus(status) {
  const missing = status.dependency_health?.summary?.missing_dependencies || 0;
  return [
    `Repo: ${status.repo_root}`,
    `State: ${status.state_json.exists ? "present" : "missing"} (${status.state_json.phase})`,
    `Handoff: ${status.handoff.exists ? "present" : "absent"}`,
    `Active reservations: ${status.reservations.active_count}`,
    `Missing dependencies: ${missing}`,
    `Next reads: ${status.next_reads.join(", ")}`,
  ].join("\n");
}
