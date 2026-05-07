import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildDefaultState,
  readCodexKitHandoff,
  writeCodexKitHandoff,
  writeCodexKitState,
} from "../templates/project/.codex/codexkit_state.mjs";
import {
  listReservations,
  releaseReservations,
  reservationPatternsOverlap,
  reservePaths,
  sweepExpiredReservations,
} from "../templates/project/.codex/codexkit_reservations.mjs";

const ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const TEMPLATE_ROOT = path.join(ROOT, "templates", "project");
const PRE_TOOL_HOOK = path.join(TEMPLATE_ROOT, ".codex", "hooks", "codexkit_pre_tool_use.mjs");
const STATUS_SCRIPT = path.join(TEMPLATE_ROOT, ".codex", "codexkit_status.mjs");

function makeRepo() {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "codexkit-runtime-"));
  fs.mkdirSync(path.join(repoRoot, ".codexkit"), { recursive: true });
  fs.writeFileSync(path.join(repoRoot, "AGENTS.md"), "# Test\n", "utf8");
  return repoRoot;
}

function runPreToolHook(repoRoot, payload) {
  const result = spawnSync(process.execPath, [PRE_TOOL_HOOK], {
    cwd: repoRoot,
    input: JSON.stringify(payload),
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

test("state helper normalizes workers and writes handoff", () => {
  const repoRoot = makeRepo();
  const state = writeCodexKitState(repoRoot, {
    phase: "execute/batch",
    active_workers: [
      {
        agent_id: "agent-1",
        agent_nickname: "Vector",
        bead_id: "br-1",
        status: "running",
      },
    ],
  });
  assert.equal(state.phase, "execute/batch");
  assert.equal(state.active_workers[0].codex_name, "Vector");
  assert.equal(buildDefaultState().approved_gates.execution, false);

  const handoff = writeCodexKitHandoff(repoRoot, {
    type: "worker",
    bead_id: "br-1",
    remaining: ["run tests"],
  });
  assert.equal(handoff.type, "worker");
  assert.equal(readCodexKitHandoff(repoRoot).bead_id, "br-1");
});

test("reservation helper reserves, detects overlap, releases, and sweeps", () => {
  const repoRoot = makeRepo();
  assert.equal(reservationPatternsOverlap("src/**/*.ts", "src/app.ts"), true);
  assert.equal(reservationPatternsOverlap("src/a.ts", "src/b.ts"), false);

  const first = reservePaths(repoRoot, {
    agent: "Vector",
    beadId: "br-1",
    paths: ["src/**/*.ts"],
    ttlSeconds: 3600,
  });
  assert.equal(first.ok, true);

  const conflict = reservePaths(repoRoot, {
    agent: "Relay",
    beadId: "br-2",
    paths: ["src/app.ts"],
    ttlSeconds: 3600,
  });
  assert.equal(conflict.ok, false);
  assert.equal(conflict.conflicts[0].agent, "Vector");

  const list = listReservations(repoRoot, { activeOnly: true });
  assert.equal(list.reservations.length, 1);

  const released = releaseReservations(repoRoot, { agent: "Vector", beadId: "br-1" });
  assert.equal(released.released_count, 1);

  reservePaths(repoRoot, {
    agent: "Relay",
    beadId: "br-2",
    paths: ["src/app.ts"],
    ttlSeconds: 1,
  });
  const storePath = path.join(repoRoot, ".codexkit", "reservations.json");
  const store = JSON.parse(fs.readFileSync(storePath, "utf8"));
  store.reservations[1].expires_at = "2000-01-01T00:00:00.000Z";
  fs.writeFileSync(storePath, `${JSON.stringify(store, null, 2)}\n`, "utf8");
  assert.equal(sweepExpiredReservations(repoRoot).swept_count, 1);
});

test("pre-tool hook blocks conflicting write-heavy shell commands", () => {
  const repoRoot = makeRepo();
  reservePaths(repoRoot, {
    agent: "Vector",
    beadId: "br-1",
    paths: ["src/app.ts"],
    ttlSeconds: 3600,
  });

  const blocked = runPreToolHook(repoRoot, {
    cwd: repoRoot,
    tool_input: {
      command: "git add src/app.ts",
      env: { CODEXKIT_AGENT_NAME: "Relay" },
    },
  });
  assert.equal(blocked.continue, false);
  assert.match(blocked.systemMessage, /blocked/i);

  const warned = runPreToolHook(repoRoot, {
    cwd: repoRoot,
    tool_input: {
      command: "echo ok > src/app.ts",
    },
  });
  assert.equal(warned.continue, true);
  assert.match(warned.systemMessage, /CODEXKIT_AGENT_NAME/);
});

test("status helper reports state, handoff, and reservation health without mutation", () => {
  const repoRoot = makeRepo();
  writeCodexKitState(repoRoot, { phase: "execute/direct" });
  writeCodexKitHandoff(repoRoot, { type: "orchestrator", next_action: "resume" });
  reservePaths(repoRoot, {
    agent: "Vector",
    beadId: "br-1",
    paths: ["src/app.ts"],
    ttlSeconds: 3600,
  });

  const before = fs.readFileSync(path.join(repoRoot, ".codexkit", "state.json"), "utf8");
  const stdout = execFileSync(process.execPath, [STATUS_SCRIPT, "--repo-root", repoRoot, "--json"], {
    encoding: "utf8",
  });
  const status = JSON.parse(stdout);
  assert.equal(status.state_json.phase, "execute/direct");
  assert.equal(status.handoff.exists, true);
  assert.equal(status.reservations.active_count, 1);
  assert.equal(fs.readFileSync(path.join(repoRoot, ".codexkit", "state.json"), "utf8"), before);
});

test("scaffold ships unified execute workflow, helpers, hooks, and routing aliases", () => {
  const required = [
    ".agents/workflows/execute.md",
    ".codex/codexkit_state.mjs",
    ".codex/codexkit_reservations.mjs",
    ".codex/codexkit_status.mjs",
    ".codex/codexkit_dependencies.mjs",
    ".codex/hooks/codexkit_pre_tool_use.mjs",
    ".codex/hooks/codexkit_session_start.mjs",
    ".codex/hooks/codexkit_stop.mjs",
    ".codex/hooks.json",
    ".agents/workflows/execute-references/worker-details.md",
    ".agents/workflows/execute-references/batch-execution.md",
    ".agents/workflows/execute-references/handoff.md",
  ];
  for (const relativePath of required) {
    assert.equal(fs.existsSync(path.join(TEMPLATE_ROOT, relativePath)), true, relativePath);
  }
  assert.equal(fs.existsSync(path.join(TEMPLATE_ROOT, ".agents", "workflows", "swarm.md")), false);

  const executeWorkflow = fs.readFileSync(path.join(TEMPLATE_ROOT, ".agents", "workflows", "execute.md"), "utf8");
  assert.match(executeWorkflow, /execute-references\/worker-details\.md/);
  assert.match(executeWorkflow, /execute-references\/batch-execution\.md/);
  assert.match(executeWorkflow, /execute-references\/handoff\.md/);
  assert.match(executeWorkflow, /Resume From Handoff.*before any other mode/);
  assert.match(executeWorkflow, /locked batch scope/);
  assert.match(executeWorkflow, /Invalid worker output is not success/);
  assert.match(executeWorkflow, /spawning or reassigning a worker for the mapped Bead/);
  assert.match(executeWorkflow, /must not become hidden work outside Beads/);

  const batchReference = fs.readFileSync(
    path.join(TEMPLATE_ROOT, ".agents", "workflows", "execute-references", "batch-execution.md"),
    "utf8",
  );
  assert.match(batchReference, /## Batch Scope Contract/);
  assert.match(batchReference, /## Agent Type Selection Contract/);
  assert.match(batchReference, /spawn_agent\(agent_type="<AGENT_TYPE>", message="<WORKER_PROMPT>", fork_context=false\)/);
  assert.match(batchReference, /frontend_specialist/);
  assert.match(batchReference, /backend_specialist/);
  assert.match(batchReference, /database_architect/);
  assert.match(batchReference, /test_writer/);
  assert.match(batchReference, /never choose their own Bead/);
  assert.match(batchReference, /Use `.agents\/workflows\/execute\.md` Assigned Bead Execution/);
  assert.match(batchReference, /## Continuation Rules/);
  assert.match(batchReference, /assigned -> running -> done \| blocked \| handoff \| noop/);
  assert.match(batchReference, /Do not expand from the full `br ready` queue/);
  assert.match(batchReference, /## Aggregate Failure Mapping/);
  assert.match(batchReference, /## Fix Worker Reassignment/);
  assert.match(batchReference, /## Orchestrator Rescue Boundaries/);
  assert.match(batchReference, /spawn or reassign a worker for that mapped Bead/);
  assert.match(batchReference, /does not implement Bead fixes/);
  assert.match(batchReference, /aggregate `check\.md` or `verify\.md` has run clean/);
  assert.match(batchReference, /blocked with explicit unmapped reasons/);

  const handoffReference = fs.readFileSync(
    path.join(TEMPLATE_ROOT, ".agents", "workflows", "execute-references", "handoff.md"),
    "utf8",
  );
  assert.match(handoffReference, /Resume From Handoff takes precedence/);
  assert.match(handoffReference, /## Worker And Orchestrator Handoffs/);
  assert.match(handoffReference, /## Required Handoff Fields/);
  assert.match(handoffReference, /stale or unsafe/);
  assert.match(handoffReference, /handoff is incomplete/);
  assert.match(handoffReference, /mark the path `\[BLOCKED\]`/);
  assert.match(handoffReference, /remove or archive `.codexkit\/HANDOFF\.json`/);

  const workerReference = fs.readFileSync(
    path.join(TEMPLATE_ROOT, ".agents", "workflows", "execute-references", "worker-details.md"),
    "utf8",
  );
  assert.match(workerReference, /does not mean the Bead was closed or committed/);
  assert.match(workerReference, /## Invalid Or Incomplete Results/);
  assert.match(workerReference, /must not infer `\[DONE\]` from prose/);
  assert.match(workerReference, /## Aggregate-Fix Assignment/);
  assert.match(workerReference, /aggregate failing command and output/);

  const statusWorkflow = fs.readFileSync(path.join(TEMPLATE_ROOT, ".agents", "workflows", "status.md"), "utf8");
  assert.doesNotMatch(statusWorkflow, /codexkit_bead_state/);
  assert.match(statusWorkflow, /node \.codex\/codexkit_status\.mjs --json/);
  assert.match(statusWorkflow, /\.codexkit\/state\.json/);
  assert.match(statusWorkflow, /\.codexkit\/HANDOFF\.json/);
  assert.match(statusWorkflow, /active reservations/);
  assert.match(statusWorkflow, /active workers/);
  assert.match(statusWorkflow, /locked batch scope/);
  assert.match(statusWorkflow, /mapped or unmapped aggregate failures/);

  const pluginSkill = fs.readFileSync(path.join(ROOT, "plugins", "codexkit", "skills", "codexkit", "SKILL.md"), "utf8");
  assert.match(pluginSkill, /`swarm`, `run ready beads`, `parallel beads` -> `execute`/);
  assert.match(pluginSkill, /execute br-123/);
});
