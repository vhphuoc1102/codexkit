#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { readCodexKitStatus, renderCodexKitStatus, resolveRepoRoot } from "../codexkit_state.mjs";

async function readPayload() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

export async function main() {
  const payload = await readPayload();
  const repoRoot = resolveRepoRoot(payload.cwd || process.cwd(), path.dirname(fileURLToPath(import.meta.url)));
  const status = readCodexKitStatus(repoRoot);
  const notes = [];

  if (fs.existsSync(path.join(repoRoot, ".codexkit"))) {
    notes.push("CodexKit runtime is installed for this repo. Read AGENTS.md, then run node .codex/codexkit_status.mjs --json before execution work.");
  }
  if (status.handoff.exists) {
    notes.push("CodexKit handoff is present. Surface .codexkit/HANDOFF.json before resuming execution.");
  }
  if (status.reservations.active_count > 0) {
    notes.push(`CodexKit has ${status.reservations.active_count} active reservation(s). Check reservations before writing.`);
  }
  if (status.dependency_health?.summary?.missing_dependencies > 0) {
    notes.push("CodexKit dependency health has missing items. Run node .codex/codexkit_status.mjs for details.");
  }

  const output = {
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext: `${notes.join(" ") || "CodexKit session bootstrap complete."}\n\n${renderCodexKitStatus(status)}`,
    },
  };
  process.stdout.write(JSON.stringify(output));
  return 0;
}

function isDirectExecution() {
  if (!process.argv[1]) return false;
  const selfPath = fileURLToPath(import.meta.url);
  try {
    return path.resolve(fs.realpathSync.native(process.argv[1])) === path.resolve(fs.realpathSync.native(selfPath));
  } catch {
    return path.resolve(process.argv[1]) === selfPath;
  }
}

if (isDirectExecution()) {
  process.exitCode = await main();
}
