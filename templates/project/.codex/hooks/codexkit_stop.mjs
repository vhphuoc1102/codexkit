#!/usr/bin/env node

import { readCodexKitStatus, resolveRepoRoot } from "../codexkit_state.mjs";

async function readPayload() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

export async function main() {
  const payload = await readPayload();
  const repoRoot = resolveRepoRoot(payload.cwd || process.cwd());
  const status = readCodexKitStatus(repoRoot);
  const warnings = [];

  if (status.handoff.exists) warnings.push("CodexKit handoff remains present.");
  if (status.reservations.active_count > 0) {
    warnings.push(`CodexKit has ${status.reservations.active_count} active reservation(s).`);
  }
  if (status.state_json.active_workers.length > 0) {
    warnings.push(`CodexKit state has ${status.state_json.active_workers.length} active worker(s).`);
  }

  const output = { continue: true };
  if (warnings.length > 0) output.systemMessage = warnings.join(" ");
  process.stdout.write(JSON.stringify(output));
  return 0;
}

if (process.argv[1]) {
  process.exitCode = await main();
}
