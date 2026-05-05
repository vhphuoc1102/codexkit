#!/usr/bin/env node

import { readCodexKitStatus, resolveRepoRoot } from "./codexkit_state.mjs";

function parseArgs(argv) {
  const args = { repoRoot: undefined, json: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--repo-root") {
      args.repoRoot = argv[++index];
      continue;
    }
    if (arg.startsWith("--repo-root=")) {
      args.repoRoot = arg.slice("--repo-root=".length);
      continue;
    }
    if (arg === "--json") {
      args.json = true;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      process.stdout.write("Usage: codexkit_status.mjs [--repo-root <path>] [--json]\n");
      process.exit(0);
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const status = readCodexKitStatus(resolveRepoRoot(args.repoRoot));

if (args.json) {
  process.stdout.write(`${JSON.stringify(status, null, 2)}\n`);
} else {
  process.stdout.write(
    [
      `Repo: ${status.repo_root}`,
      `State: ${status.has_state ? "present" : "missing"}`,
      `Handoff: ${status.has_handoff ? "present" : "missing"}`,
      `Reservations: ${status.has_reservations ? "present" : "missing"}`,
      `Active workflow: ${status.state.active_workflow || "none"}`,
      `Active beads: ${status.state.active_beads.length}`,
      `Active workers: ${status.state.active_workers.length}`,
    ].join("\n") + "\n",
  );
}
