# Execute Workflow

Use this workflow for all implementation execution in CodexKit. It covers direct tasks, one assigned Bead, batch execution across multiple ready Beads, and resume from handoff. Batch execution is the swarm mode; there is no separate `swarm.md`.

## Mode Selection

Choose exactly one mode. If `.codexkit/HANDOFF.json` exists, choose **Resume From Handoff** before any other mode.

- **Resume From Handoff** when `.codexkit/HANDOFF.json` exists.
- **Batch Execution** when the request is to run multiple ready Beads, run a swarm, or execute ready work in parallel.
- **Assigned Bead Execution** when the request names exactly one Bead such as `br-123`.
- **Direct Execution** when the request is concrete and does not use Beads.

If the requested work is vague, blocked, or missing acceptance criteria, stop and route to planning or ask for the smallest clarifying decision.

## Reference Files

Open these only when the matching mode needs exact prompts, field shapes, or recovery details:

| File | When to load |
| --- | --- |
| `.agents/workflows/execute-references/worker-details.md` | Assigned Bead worker execution, worker prompts, result fields, reservation conflict details |
| `.agents/workflows/execute-references/batch-execution.md` | Batch Execution orchestration, worker spawn prompt, tend loop, completion checklist |
| `.agents/workflows/execute-references/handoff.md` | Writing or resuming `.codexkit/HANDOFF.json` |

## Direct Execution

Input:

- user request
- repository context
- affected paths discovered by inspection

Process:

1. Inspect real code and interfaces before editing.
2. Bound the scope and identify the smallest relevant validation.
3. Implement in small increments.
4. Run `check.md` validation before handoff.
5. Summarize changed behavior, validation, skipped checks, and residual risk.

## Assigned Bead Execution

Load `.agents/workflows/execute-references/worker-details.md` when running as a worker or when exact worker result fields are needed.

Input:

- one explicit `assigned_bead_id`
- optional parent-provided affected scope and expected output
- Codex nickname when running as a worker

Required setup:

```bash
node .codex/codexkit_status.mjs --json
br show <assigned-bead-id>
node .codex/codexkit_reservations.mjs list --active-only --json
```

Process:

1. Require exactly one assigned Bead. Workers never choose work with `br ready`, `br list`, or `bv`.
2. Confirm the Bead is open, unblocked, and has concrete acceptance and verification criteria.
3. Reserve every file or glob before writing:
   ```bash
   node .codex/codexkit_reservations.mjs reserve --agent "<codex-nickname>" --bead "<id>" --path "src/foo.ts" --ttl 3600 --json
   ```
4. Prefix write-heavy shell commands with:
   ```bash
   CODEXKIT_AGENT_NAME="<codex-nickname>" <command>
   ```
5. Implement only the assigned Bead.
6. Run the Bead's verification. Fix root causes and rerun.
7. After two serious failed verification attempts, return `[BLOCKED]`.
8. Release reservations before returning:
   ```bash
   node .codex/codexkit_reservations.mjs release --agent "<codex-nickname>" --bead "<id>" --json
   ```
9. Return one status: `[DONE]`, `[BLOCKED]`, `[HANDOFF]`, or `[NOOP]`.

Do not auto-close Beads and do not auto-commit. After verification passes, return `[DONE]`; the main thread asks the user before `br close` or commit.

## Batch Execution

Load `.agents/workflows/execute-references/batch-execution.md` before spawning workers or tending a live batch.

Use Batch Execution for multiple independent ready Beads.

Orchestrator process:

1. Run:
   ```bash
   br ready
   bv --robot-triage
   node .codex/codexkit_reservations.mjs sweep --json
   node .codex/codexkit_status.mjs --json
   ```
2. Select and lock a bounded batch scope of independent ready Beads before spawning workers.
3. Record active Beads, active workers, locked batch scope, and worker status in `.codexkit/state.json`.
4. Spawn one bounded worker per Bead.
5. Give each worker:
   - Codex nickname
   - agent id
   - exactly one `assigned_bead_id`
   - affected scope
   - expected output
   - this `execute.md` workflow
6. Tend worker results, reservations, and Bead graph until every worker returns `[DONE]`, `[BLOCKED]`, `[HANDOFF]`, or `[NOOP]`.
7. After each worker result, update `.codexkit/state.json` and follow the continuation rules in `execute-references/batch-execution.md`.
8. Run one aggregate `check.md` pass for routine work or `verify.md` for high-risk work only after worker-level verification is final.
9. Map aggregate validation failures back to existing Beads and fix inside those Bead contexts.
10. Ask the user before closing Beads or committing.

Rules:

- The orchestrator does not implement Beads directly.
- Workers never choose their own Beads.
- Do not resolve file conflicts by telling workers to be careful. Change reservations, Bead scope, or worker assignment.
- Silence alone is not failure. Inspect graph, reservations, and worker status before interrupting.
- Do not expand a batch from the whole `br ready` queue after execution starts. Newly ready work can be spawned only when it is inside the locked batch scope.
- Invalid worker output is not success. Require a normalized result or mark the worker `[BLOCKED]` when verification or reservation evidence is missing.

## Resume From Handoff

Load `.agents/workflows/execute-references/handoff.md` before writing, reading, or clearing `.codexkit/HANDOFF.json`.

When `.codexkit/HANDOFF.json` exists, resume handling takes precedence over direct, assigned Bead, and batch modes:

1. Read `AGENTS.md`.
2. Run:
   ```bash
   node .codex/codexkit_status.mjs --json
   ```
3. Read `.codexkit/HANDOFF.json` and `.codexkit/state.json`.
4. Reopen the current Bead or task.
5. Check active reservations and `git status`.
6. Continue only if the handoff, worktree, Bead state, and reservations agree.
7. When the resumed work reaches a final state, remove or archive the handoff so future sessions do not resume stale context.

If resume is unsafe or ambiguous, return `[BLOCKED]` with the concrete mismatch and required next action.

## Worker Contract

Workers are short-lived. A worker owns one assigned Bead and returns exactly one final status.

Minimum worker output:

```text
[DONE] br-123: <summary>
Codex nickname: <name>
Files modified: <paths>
Reservations: reserved <paths>; released <yes/no>
Verification: <command/result>
Next action: <close/commit/user review/none>
```

For blocked work:

```text
[BLOCKED] br-123 - <summary>
Requested files: <paths>
Blocker: <conflict/failing condition/missing decision>
What happened: <description>
What I need next: <specific parent or user action>
```

## Reservation Contract

- Reserve before writing.
- Keep reservations as narrow as possible.
- Use TTLs for long-running worker reservations.
- Release reservations on `[DONE]`, `[NOOP]`, and safe `[BLOCKED]`.
- On `[HANDOFF]`, release safe reservations and list any intentionally retained reservations in `.codexkit/HANDOFF.json`.

## Result Statuses

- `[DONE]`: assigned work is implemented, verification passed, and reservations are released.
- `[BLOCKED]`: the worker cannot continue safely without a parent/user action.
- `[HANDOFF]`: work is paused with `.codexkit/HANDOFF.json` written for resume.
- `[NOOP]`: assigned work is no longer actionable or was assigned incorrectly.

## Close And Commit Policy

Workers do not close Beads or commit automatically. The main thread closes or commits only after:

- verification has passed
- aggregate check/verify is clean for batch execution
- no blocking review findings remain
- the user explicitly approves close or commit
