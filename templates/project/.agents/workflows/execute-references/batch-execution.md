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
5. Spawn bounded workers with slim explicit context. Do not fork the full parent context for routine Beads.
6. Record worker id, nickname, assigned Bead, and status in `.codexkit/state.json`.
7. Tend graph, reservations, and worker results until the batch reaches a final state.

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

## Result Handling

- `[DONE]`: mark worker complete, confirm reservations released, keep Bead awaiting user close approval.
- `[BLOCKED]`: record blocker, keep or release reservations based on worker report, decide whether to reassign, descope, or ask user.
- `[HANDOFF]`: read `.codexkit/HANDOFF.json`, preserve resume instructions, and pause or respawn only when safe.
- `[NOOP]`: clear worker assignment and triage whether the Bead is closed, blocked, duplicate, or out of scope.

## Completion Checklist

Before declaring Batch Execution complete:

- final graph triage has no unexpected ready/in-progress Beads for the batch
- no active reservations remain for completed workers
- blocked or noop Beads have explicit next actions
- aggregate `check.md` or `verify.md` has run
- `.codexkit/state.json` active workers are cleared or accurately marked final
- user has not been asked to close Beads until verification is clean

## Red Flags

- spawning workers before Beads are ready
- full-context worker forks for routine Beads
- worker edits without reservations
- passive waiting while graph or reservations are unhealthy
- resolving conflicts by optimism instead of reservation/scope changes
- missing state updates after worker results
