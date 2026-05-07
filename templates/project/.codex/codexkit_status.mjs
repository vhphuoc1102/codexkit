#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";

import { readCodexKitStatus, renderCodexKitStatus, resolveRepoRoot } from "./codexkit_state.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const args = { repoRoot: undefined, json: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--repo-root") {
      args.repoRoot = argv[index + 1];
      index += 1;
    } else if (arg.startsWith("--repo-root=")) {
      args.repoRoot = arg.slice("--repo-root=".length);
    } else if (arg === "--json") {
      args.json = true;
    } else if (arg === "--help" || arg === "-h") {
      process.stdout.write("Usage: codexkit_status.mjs [--repo-root <path>] [--json]\n");
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

export function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const repoRoot = resolveRepoRoot(args.repoRoot, SCRIPT_DIR);
  const status = readCodexKitStatus(repoRoot);
  process.stdout.write(args.json ? `${JSON.stringify(status, null, 2)}\n` : `${renderCodexKitStatus(status)}\n`);
  return 0;
}

function isDirectExecution() {
  return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isDirectExecution()) {
  try {
    process.exitCode = main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
