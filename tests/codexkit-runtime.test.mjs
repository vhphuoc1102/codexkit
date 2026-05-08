import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  removeLocalSkills,
  syncProjectSkills,
} from "../src/lib/kit.js";
import {
  getSelectedShippedSkills,
} from "../src/lib/skills.js";
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
const SKILLS_ROOT = path.join(TEMPLATE_ROOT, ".agents", "skills");
const PRE_TOOL_HOOK = path.join(TEMPLATE_ROOT, ".codex", "hooks", "codexkit_pre_tool_use.mjs");
const SESSION_START_HOOK = path.join(TEMPLATE_ROOT, ".codex", "hooks", "codexkit_session_start.mjs");
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

function runSessionStartHook(repoRoot, payload = { cwd: repoRoot }) {
  const result = spawnSync(process.execPath, [SESSION_START_HOOK], {
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

test("session-start hook emits Codex SessionStart-specific JSON", () => {
  const repoRoot = makeRepo();
  const output = runSessionStartHook(repoRoot);

  assert.deepEqual(Object.keys(output), ["hookSpecificOutput"]);
  assert.equal(output.hookSpecificOutput.hookEventName, "SessionStart");
  assert.match(output.hookSpecificOutput.additionalContext, /CodexKit runtime is installed/);
  assert.match(output.hookSpecificOutput.additionalContext, /Repo:/);
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

test("screen spec workflow creates traceable business-to-screen artifacts", () => {
  const workflowPath = path.join(TEMPLATE_ROOT, ".agents", "workflows", "screen-spec.md");
  const templatePath = path.join(
    TEMPLATE_ROOT,
    ".agents",
    "workflows",
    "screen-spec-references",
    "output-template.md",
  );

  assert.equal(fs.existsSync(workflowPath), true);
  assert.equal(fs.existsSync(templatePath), true);

  const workflow = fs.readFileSync(workflowPath, "utf8");
  assert.match(workflow, /`CONTEXT\.md` at the repo root/);
  assert.match(workflow, /docs\/CONTEXT\.md/);
  assert.match(workflow, /docs\/adr\//);
  assert.match(workflow, /docs\/decisions\//);
  assert.match(workflow, /docs\/screen-specs\/<feature-slug>\.md/);
  assert.match(workflow, /screen-spec-references\/output-template\.md/);
  assert.match(workflow, /REQ-001/);
  assert.match(workflow, /ADR-001/);
  assert.match(workflow, /Every requirement must map to at least one screen, flow, form field, table column, interaction, state, or open question/);
  assert.match(workflow, /Every form field, table column, and interaction should cite a requirement or ADR/);
  assert.match(workflow, /Group by user flow and user outcome/);
  assert.match(workflow, /\$impeccable shape/);

  const template = fs.readFileSync(templatePath, "utf8");
  assert.match(template, /## Requirements Reference/);
  assert.match(template, /\| ID \| Source \| Text \| Screens \|/);
  assert.match(template, /## Actors \/ Roles/);
  assert.match(template, /## Screen Inventory/);
  assert.match(template, /## Screen Flow/);
  assert.match(template, /```mermaid/);
  assert.match(template, /#### Components/);
  assert.match(template, /#### Forms/);
  assert.match(template, /\| Form \| Field \| Type \| Required \| Validation \| Default \/ Source \| Business Rule \|/);
  assert.match(template, /#### Tables \/ Lists/);
  assert.match(template, /\| Table \| Column \| Data Source \| Sort \/ Filter \/ Search \| Row \/ Batch Actions \| Business Rule \|/);
  assert.match(template, /#### Interactions/);
  assert.match(template, /\| Action \| Trigger \| Result \| Business Rule \|/);
  assert.match(template, /#### States/);
  assert.match(template, /\| State \| When \| UI Behavior \|/);
  assert.match(template, /#### Business Rules/);
  assert.match(template, /## Shared UI Patterns/);
  assert.match(template, /## Open Questions/);
  assert.match(template, /## Next Steps/);
  assert.match(template, /\$impeccable shape/);
});

test("frontend UI routing uses impeccable instead of retired frontend skills", async () => {
  const shippedSkills = await getSelectedShippedSkills({ skillsRoot: SKILLS_ROOT });
  const shippedNames = new Set(shippedSkills.map((skill) => skill.name));
  assert.equal(shippedNames.has("impeccable"), true);
  assert.equal(shippedNames.has("frontend-design"), false);
  assert.equal(shippedNames.has("web-design-guidelines"), false);
  assert.equal(fs.existsSync(path.join(SKILLS_ROOT, "impeccable", "SKILL.md")), true);
  assert.equal(fs.existsSync(path.join(SKILLS_ROOT, "frontend-design")), false);
  assert.equal(fs.existsSync(path.join(SKILLS_ROOT, "web-design-guidelines")), false);

  const routingFiles = [
    "AGENTS.md",
    "AGENT_FLOW.md",
    ".agents/workflows/figma-to-code.md",
    ".codex/agents/frontend-specialist.toml",
    ".codex/agents/implementer.toml",
    ".codex/agents/seo-specialist.toml",
    ".agents/skills/clean-code/SKILL.md",
    ".agents/skills/nextjs-react-expert/SKILL.md",
  ];

  for (const relativePath of routingFiles) {
    const content = fs.readFileSync(path.join(TEMPLATE_ROOT, relativePath), "utf8");
    assert.doesNotMatch(content, /frontend-design/, relativePath);
    assert.doesNotMatch(content, /web-design-guidelines/, relativePath);
  }

  const agentsGuide = fs.readFileSync(path.join(TEMPLATE_ROOT, "AGENTS.md"), "utf8");
  assert.match(agentsGuide, /Impeccable Command Routing/);
  assert.match(agentsGuide, /\$impeccable shape/);
  assert.match(agentsGuide, /\$impeccable craft/);
  assert.match(agentsGuide, /\$impeccable audit/);
  assert.match(agentsGuide, /\$impeccable polish/);
});

test("deprecated local frontend skills can still be removed", async () => {
  const codexHome = fs.mkdtempSync(path.join(os.tmpdir(), "codexkit-local-skills-"));
  const localSkillsRoot = path.join(codexHome, "skills");
  const retiredSkills = ["frontend-design", "web-design-guidelines"];

  for (const skill of retiredSkills) {
    const skillPath = path.join(localSkillsRoot, skill);
    fs.mkdirSync(skillPath, { recursive: true });
    fs.writeFileSync(path.join(skillPath, "SKILL.md"), `---\nname: ${skill}\n---\n`, "utf8");
  }

  const result = await removeLocalSkills({
    skillsRoot: SKILLS_ROOT,
    codexHome,
    skills: retiredSkills,
  });

  assert.equal(result.removed.length, 2);
  assert.equal(fs.existsSync(path.join(localSkillsRoot, "frontend-design")), false);
  assert.equal(fs.existsSync(path.join(localSkillsRoot, "web-design-guidelines")), false);
});

test("project skill sync removes obsolete managed retired skill files", async () => {
  const repoRoot = makeRepo();
  const obsoletePath = ".agents/skills/frontend-design/SKILL.md";
  const obsoleteAbsolutePath = path.join(repoRoot, obsoletePath);
  fs.mkdirSync(path.dirname(obsoleteAbsolutePath), { recursive: true });
  fs.writeFileSync(obsoleteAbsolutePath, "# retired\n", "utf8");
  fs.writeFileSync(
    path.join(repoRoot, ".codexkit", "manifest.json"),
    `${JSON.stringify(
      {
        version: "test",
        managedAt: new Date().toISOString(),
        features: {},
        files: [
          {
            path: obsoletePath,
            templateHash: "retired",
            installedHash: null,
          },
        ],
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  const result = await syncProjectSkills({
    targetDir: repoRoot,
    templateRoot: TEMPLATE_ROOT,
    version: "test",
  });

  assert.equal(result.deleted.includes(obsoletePath), true);
  assert.equal(fs.existsSync(obsoleteAbsolutePath), false);
});
