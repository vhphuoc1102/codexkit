# Batch Execution Reference

Open this when orchestrating multiple ready Beads through `execute.md` Batch Execution.

## Protocol

1. Get `EPIC_ID` from `.codexkit/state.json`, user context, or validated planning artifacts when available.
2. Check graph:
   ```bash
   bv --robot-triage --graph-root <EPIC_ID>
   ```
   If no graph root is known, use `br ready` and record the limitation.
3. Sweep expired reservations:
   ```bash
   node .codex/codexkit_reservations.mjs sweep --json
   ```
4. Parent selects each ready Bead. Workers never select work.
5. Lock the batch scope before the first worker is spawned.
6. Spawn bounded workers with slim explicit context. Do not fork the full parent context for routine Beads.
7. Record worker id, nickname, assigned Bead, locked scope, and status in `.codexkit/state.json`.
8. Tend graph, reservations, and worker results until the batch reaches a final state.

## Batch Scope Contract

Before spawning, write down the locked batch scope: user request, epic or graph root when known, selected Bead ids, excluded ready Beads, and allowed file or subsystem boundaries when those are known.

- Newly ready Beads may be spawned only when they belong to the same user request, current epic or graph root, and approved batch scope.
- Do not expand from the full `br ready` queue after execution starts.
- Work outside the locked scope is recorded in `next_action`; it is not spawned in the current batch.
- If scope is unclear, stop and ask for the smallest decision instead of widening the batch.

## Worker Spawn Prompt

```text
You are a CodexKit worker subagent.

Identity:
- Codex nickname: <CODEX_SUBAGENT_NAME>
- Agent ID: <AGENT_ID>
- Epic ID: <EPIC_ID or none>
- Assigned Bead ID: <ASSIGNED_BEAD_ID>
- Feature: <FEATURE_NAME or none>
- Project root: <PROJECT_ROOT>

Contract:
- Use `.agents/workflows/execute.md` Assigned Bead Execution.
- Execute only the assigned Bead.
- Use your Codex nickname for reservations.
- Prefix write-heavy shell commands with `CODEXKIT_AGENT_NAME="<CODEX_SUBAGENT_NAME>"`.
- Return exactly one final status: [DONE], [BLOCKED], [HANDOFF], or [NOOP].

Startup:
1. Read `AGENTS.md`.
2. Run `node .codex/codexkit_status.mjs --json`.
3. Read `.codexkit/state.json` when present.
4. Run `br show <ASSIGNED_BEAD_ID>`.
5. Reserve files, implement, verify, release, and report.

Startup hint: <STARTUP_HINT>
```

## Tend Loop

While workers are active, graph has ready or in-progress work, or reservations remain:

```bash
bv --robot-triage --graph-root <EPIC_ID>
node .codex/codexkit_reservations.mjs sweep --json
node .codex/codexkit_reservations.mjs list --active-only --json
node .codex/codexkit_status.mjs --json
```

Use `wait_agent(..., timeout_ms=60000)` only when a result is needed. Silence alone is not failure. Inspect graph and reservations before sending interrupts or follow-up messages.

## State Transitions

Worker status follows one path:

```text
assigned -> running -> done | blocked | handoff | noop
```

After each worker result, update `.codexkit/state.json` before spawning or asking the user. The update must reconcile `active_workers`, `active_beads`, blockers, reservations, and `next_action`. A worker or Bead must not remain active after it has a final status.

## Continuation Rules

- `[DONE]`: mark the worker `done`, confirm Bead-level verification passed, confirm reservations released, keep the Bead awaiting user close or commit approval, then run graph and reservation triage before considering more work.
- `[BLOCKED]`: mark the worker `blocked`, record the blocker and reservation state, and reassign or respawn only when the blocker is technical, the scope is still clear, reservations are clean, and no user or product decision is needed. Otherwise stop the affected path and ask the user or leave a concrete `next_action`.
- `[HANDOFF]`: mark the worker or orchestrator `handoff`, read `.codexkit/HANDOFF.json`, preserve resume instructions, and pause by default. Respawn only when the handoff is complete, worktree and reservations have no partial conflict, context budget is safe, and the Bead remains inside the locked batch scope.
- `[NOOP]`: mark the worker `noop`, clear the assignment, and triage whether the Bead is closed, blocked, duplicate, or out of scope. Replace it only with another ready Bead inside the locked batch scope.

If a worker result does not start with `[DONE]`, `[BLOCKED]`, `[HANDOFF]`, or `[NOOP]`, do not infer success. Ask the worker to normalize the result if it is still reachable; otherwise mark the worker `[BLOCKED]` with missing result evidence.

## Aggregate Failure Mapping

When aggregate `check.md` or `verify.md` fails after worker-level verification, map each failure to a Bead in the locked batch scope before fixing it.

Use concrete evidence: failed files, worker-touched files, test names, package or module ownership, error text, Bead acceptance criteria, and verification criteria. Record the mapped Bead, mapping reason, confidence or ambiguity, and `next_action` in `.codexkit/state.json`.

- If the mapping is clear, spawn or reassign a worker for that mapped Bead.
- If one failure crosses multiple Beads, split only when each part maps cleanly; otherwise mark the batch path `[BLOCKED]`.
- If no in-scope Bead owns the failure, do not create hidden work. Record the unmapped failure and ask the user for scope or planning.

## Fix Worker Reassignment

A fix worker is still an Assigned Bead Execution worker. Give it exactly one mapped Bead id plus the original worker result, aggregate failing command and output, suspected files, reservation expectations, and required verification.

The fix worker must reserve before writing, fix the root cause inside the mapped Bead context, run the Bead verification and the aggregate failing command, release reservations, and return `[DONE]`, `[BLOCKED]`, `[HANDOFF]`, or `[NOOP]`.

## Orchestrator Rescue Boundaries

The Batch Execution orchestrator does not implement Bead fixes. It may inspect logs, classify failures, reconcile graph state, sweep or release stale reservations when safe, update `.codexkit/state.json`, and spawn or reassign workers.

The main thread may implement code only outside Batch Execution, in Assigned Bead Execution running in the main thread, or when the user explicitly overrides the orchestration rule.

## Completion Checklist

Before declaring Batch Execution complete:

- final graph triage has no unexpected ready/in-progress Beads for the batch
- no in-scope newly ready Beads remain unhandled unless they have explicit `next_action`
- no active reservations remain for completed workers
- blocked or noop Beads have explicit next actions
- aggregate `check.md` or `verify.md` has run clean after worker-level verification
- aggregate failures are either fixed by mapped Bead workers or blocked with explicit unmapped reasons
- `.codexkit/state.json` active workers are cleared or accurately marked final
- user has not been asked to close Beads until verification is clean

## Red Flags

- spawning workers before Beads are ready
- full-context worker forks for routine Beads
- worker edits without reservations
- passive waiting while graph or reservations are unhealthy
- resolving conflicts by optimism instead of reservation/scope changes
- missing state updates after worker results
