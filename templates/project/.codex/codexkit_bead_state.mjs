#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function resolveRepoRoot(value) {
  return value ? path.resolve(value) : path.resolve(__dirname, "..");
}

function statePath(repoRoot) {
  return path.join(repoRoot, ".codexkit", "bead-state.json");
}

function normalizeBead(value) {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  return raw.startsWith("br-") ? raw : `br-${raw}`;
}

function emptyState() {
  return {
    version: 1,
    updatedAt: null,
    active_beads: [],
    deferred_beads: [],
    completed_beads: [],
    failed_beads: [],
    awaiting_user_close: [],
    assignments: {},
    review_cycles: {},
    validation_cycles: 0
  };
}

function without(list, bead) {
  return list.filter((item) => item !== bead);
}

function addUnique(list, bead) {
  return list.includes(bead) ? list : list.concat(bead);
}

async function readJson(filePath) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return emptyState();
    throw error;
  }
}

async function writeJson(filePath, state) {
  state.updatedAt = new Date().toISOString();
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

function parseArgs(argv) {
  const result = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith("--")) {
      result._.push(item);
      continue;
    }
    const key = item.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      result[key] = true;
      continue;
    }
    result[key] = next;
    index += 1;
  }
  return result;
}

function usage() {
  return `Usage:
  node .codex/codexkit_bead_state.mjs status [--repo-root <dir>]
  node .codex/codexkit_bead_state.mjs activate --bead <id> [--agent <name>]
  node .codex/codexkit_bead_state.mjs defer --bead <id>
  node .codex/codexkit_bead_state.mjs complete --bead <id>
  node .codex/codexkit_bead_state.mjs fail --bead <id>
  node .codex/codexkit_bead_state.mjs await-close --bead <id>
  node .codex/codexkit_bead_state.mjs review-cycle --bead <id>
  node .codex/codexkit_bead_state.mjs validation-cycle
  node .codex/codexkit_bead_state.mjs clear --bead <id>`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0] || "status";
  const repoRoot = resolveRepoRoot(args["repo-root"]);
  const filePath = statePath(repoRoot);
  const state = await readJson(filePath);
  const bead = normalizeBead(args.bead);

  if (command === "status") {
    console.log(JSON.stringify({ path: filePath, state }, null, 2));
    return;
  }

  if (
    ["activate", "defer", "complete", "fail", "await-close", "review-cycle", "clear"].includes(command) &&
    !bead
  ) {
    throw new Error(`\`${command}\` requires --bead <id>\n${usage()}`);
  }

  if (command === "activate") {
    state.active_beads = addUnique(without(state.active_beads, bead), bead);
    state.deferred_beads = without(state.deferred_beads, bead);
    state.failed_beads = without(state.failed_beads, bead);
    if (args.agent) state.assignments[bead] = args.agent;
  } else if (command === "defer") {
    state.deferred_beads = addUnique(without(state.deferred_beads, bead), bead);
    state.active_beads = without(state.active_beads, bead);
  } else if (command === "complete") {
    state.completed_beads = addUnique(without(state.completed_beads, bead), bead);
    state.active_beads = without(state.active_beads, bead);
    state.failed_beads = without(state.failed_beads, bead);
  } else if (command === "fail") {
    state.failed_beads = addUnique(without(state.failed_beads, bead), bead);
    state.active_beads = without(state.active_beads, bead);
  } else if (command === "await-close") {
    state.awaiting_user_close = addUnique(without(state.awaiting_user_close, bead), bead);
    state.active_beads = without(state.active_beads, bead);
  } else if (command === "review-cycle") {
    state.review_cycles[bead] = (state.review_cycles[bead] || 0) + 1;
  } else if (command === "validation-cycle") {
    state.validation_cycles += 1;
  } else if (command === "clear") {
    state.active_beads = without(state.active_beads, bead);
    state.deferred_beads = without(state.deferred_beads, bead);
    state.completed_beads = without(state.completed_beads, bead);
    state.failed_beads = without(state.failed_beads, bead);
    state.awaiting_user_close = without(state.awaiting_user_close, bead);
    delete state.assignments[bead];
    delete state.review_cycles[bead];
  } else {
    throw new Error(usage());
  }

  await writeJson(filePath, state);
  console.log(JSON.stringify({ path: filePath, state }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
