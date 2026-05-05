#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

export const STATE_SCHEMA_VERSION = "1.0";

function utcNow() {
  return new Date().toISOString();
}

function findRepoRoot(startDir = process.cwd()) {
  let current = path.resolve(startDir);
  while (true) {
    if (fs.existsSync(path.join(current, ".git")) || fs.existsSync(path.join(current, ".codexkit"))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return path.resolve(startDir);
    }
    current = parent;
  }
}

export function resolveRepoRoot(explicitRoot) {
  return path.resolve(explicitRoot || findRepoRoot());
}

export function getCodexKitStatePaths(repoRoot) {
  const root = path.join(repoRoot, ".codexkit");
  return {
    root,
    stateJson: path.join(root, "state.json"),
    handoffJson: path.join(root, "HANDOFF.json"),
    reservationsJson: path.join(root, "reservations.json"),
  };
}

function ensureParent(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

export function buildEmptyState() {
  return {
    schema_version: STATE_SCHEMA_VERSION,
    updated_at: utcNow(),
    active_workflow: "",
    active_beads: [],
    active_workers: [],
    approvals: {},
    next_action: "",
  };
}

export function readCodexKitState(repoRoot) {
  const statePath = getCodexKitStatePaths(repoRoot).stateJson;
  if (!fs.existsSync(statePath)) {
    return buildEmptyState();
  }
  try {
    return { ...buildEmptyState(), ...JSON.parse(fs.readFileSync(statePath, "utf8")) };
  } catch {
    return buildEmptyState();
  }
}

export function writeCodexKitState(repoRoot, state) {
  const statePath = getCodexKitStatePaths(repoRoot).stateJson;
  ensureParent(statePath);
  fs.writeFileSync(
    statePath,
    `${JSON.stringify({ ...buildEmptyState(), ...state, updated_at: utcNow() }, null, 2)}\n`,
    "utf8",
  );
}

export function readCodexKitStatus(repoRoot) {
  const paths = getCodexKitStatePaths(repoRoot);
  return {
    repo_root: repoRoot,
    state_path: paths.stateJson,
    handoff_path: paths.handoffJson,
    reservations_path: paths.reservationsJson,
    has_state: fs.existsSync(paths.stateJson),
    has_handoff: fs.existsSync(paths.handoffJson),
    has_reservations: fs.existsSync(paths.reservationsJson),
    state: readCodexKitState(repoRoot),
  };
}
