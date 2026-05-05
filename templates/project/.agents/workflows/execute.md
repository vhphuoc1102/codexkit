# Execute Workflow

Use this workflow to implement one bead or one small direct task.

## Goal

Make the smallest defensible code change, verify it, and update Beads/state when applicable.

## Modes

### Bead Mode

Use when the prompt includes a bead id, for example `execute br-123`.

1. Read `br show <id> --json`.
2. Read `.codexkit/tdd/<id>.md` if it exists.
3. Inspect the repository paths needed for the bead.
4. Reserve the intended write scope:
   ```bash
   node .codexkit/scripts/codexkit_reservations.mjs reserve --agent "<name>" --bead "<id>" --path "src/**" --ttl 3600 --json
   ```
5. Implement one vertical slice, following the TDD spec when present.
6. Run the bead verification and `check.md`-level validation.
7. Close or update the bead only after validation passes.
8. Release reservations.

### Direct Mode

Use only when the prompt is small and specific.

- If the task is broad, ambiguous, or feature-sized, route to `plan.md`.
- If the task requires test-first work, route to `tdd.md`.
- If the task touches multiple independent write scopes, route to `swarm.md`.

## Worker Rules

- Read before editing.
- Do not select extra beads while executing one assigned bead.
- Do not edit outside reserved scope in Bead Mode.
- On reservation conflict, stop and report `[BLOCKED]`.
- Do not close a bead without passing verification.
- Keep unrelated files untouched.

## Result Status

Return one of:

- `[DONE]` implementation complete, validation passed, bead updated/closed, reservations released
- `[BLOCKED]` cannot continue safely
- `[HANDOFF]` state written for resume
- `[NOOP]` assigned bead or direct task is unavailable/unsafe

## Output Shape

- status
- bead id or direct task title
- files changed
- reservation result
- verification result
- bead update/close result
- remaining risks
