# Execute Handoff Reference

Open this when writing or resuming `.codexkit/HANDOFF.json`.

## When To Write Handoff

Write handoff when:

- context is near the safe limit
- a worker or orchestrator must pause mid-execution
- reservations or partial work need explicit resume instructions
- the next agent needs more than the final chat response to continue safely

Return `[HANDOFF]` after writing the file.

If `.codexkit/HANDOFF.json` already exists at workflow start, Resume From Handoff takes precedence over direct, assigned Bead, and batch execution. Do not start new execution until the handoff is read, reconciled, cleared, or explicitly blocked.

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

## Worker And Orchestrator Handoffs

Use `type: "worker"` when one assigned Bead pauses. It must include the Bead id, agent name, touched files, retained reservations, done work, remaining work, and resume commands.

Use `type: "orchestrator"` for Batch Execution handoff. It must include locked batch scope, active workers, final worker results already received, active reservations, aggregate validation status, and batch-level next actions.

## Required Handoff Fields

A handoff is valid only when it includes enough state to resume safely:

- worker handoff: task or Bead id, agent name, touched files, reserved files, done work, remaining work, resume commands, reservation state, and last updated time
- orchestrator handoff: locked batch scope, active workers, completed worker results, blocked or noop Beads, active reservations, aggregate validation status, next action, and last updated time

If required fields are missing, the handoff is incomplete.

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

If they do not agree, treat the handoff as stale or unsafe and return `[BLOCKED]` with the mismatch and required parent/user action. Do not spawn replacement workers until the mismatch is resolved.

If the handoff is incomplete, mark the path `[BLOCKED]`, keep reservations unchanged unless they are proven safe to release, and ask for the parent or user decision needed to resume manually, discard the handoff, or release and reassign.

## Cleanup

When resumed work reaches `[DONE]`, `[BLOCKED]`, or `[NOOP]`, remove or archive `.codexkit/HANDOFF.json` so future sessions do not resume stale state. If the resumed work returns another `[HANDOFF]`, rewrite the file with the new state rather than leaving old resume instructions in place.
