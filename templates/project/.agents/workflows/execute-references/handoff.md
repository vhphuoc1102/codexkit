# Execute Handoff Reference

Open this when writing or resuming `.codexkit/HANDOFF.json`.

## When To Write Handoff

Write handoff when:

- context is near the safe limit
- a worker or orchestrator must pause mid-execution
- reservations or partial work need explicit resume instructions
- the next agent needs more than the final chat response to continue safely

Return `[HANDOFF]` after writing the file.

## Handoff Shape

Use this minimum shape:

```json
{
  "schema_version": "1.0",
  "type": "worker",
  "reason": "context_high",
  "feature": "feature-name-or-empty",
  "epic_id": "br-epic-or-empty",
  "bead_id": "br-123",
  "agent_name": "Vector",
  "status": "in_progress",
  "files": {
    "touched": ["src/foo.ts"],
    "reserved": ["src/foo.ts"]
  },
  "done": [
    "Read acceptance criteria",
    "Implemented validation branch"
  ],
  "remaining": [
    "Run npm test -- checkout",
    "Fix failing edge case if test fails",
    "Release reservation"
  ],
  "resume_commands": [
    "node .codex/codexkit_status.mjs --json",
    "br show br-123",
    "node .codex/codexkit_reservations.mjs list --active-only --bead br-123 --json"
  ],
  "last_updated": "2026-05-07T00:00:00.000Z"
}
```

Use `type: "orchestrator"` for Batch Execution handoff. Include active workers and batch-level next actions when the orchestrator pauses.

## Reservation Policy

Release reservations that are safe to release before returning `[HANDOFF]`.

Keep a reservation active only when:

- the worktree has partial changes for that path
- another worker touching the path would create conflict
- the handoff explicitly lists the active reservation and TTL

## Resume Protocol

On resume:

1. Read `AGENTS.md`.
2. Run:
   ```bash
   node .codex/codexkit_status.mjs --json
   ```
3. Read `.codexkit/HANDOFF.json` and `.codexkit/state.json`.
4. Reopen the current Bead:
   ```bash
   br show <bead-id>
   ```
5. Check reservations:
   ```bash
   node .codex/codexkit_reservations.mjs list --active-only --json
   ```
6. Check `git status`.
7. Continue only if handoff, Bead state, reservations, and worktree agree.

If they do not agree, return `[BLOCKED]` with the mismatch and required parent/user action.

## Cleanup

When resumed work reaches `[DONE]`, `[BLOCKED]`, or `[NOOP]`, remove or archive `.codexkit/HANDOFF.json` so future sessions do not resume stale state.
