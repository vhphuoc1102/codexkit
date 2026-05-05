# Execute Workflow

Use this workflow for normal implementation work or for executing one valid Bead. A Bead is optional; straightforward implementation requests can still use this workflow directly.

## Goal

Turn a concrete request or one Bead into a minimal, defensible implementation, then review the result before handoff.

## Modes

### Normal Execution

Use this mode when the user asks for straightforward implementation without a Bead.

Entry criteria:

- requested behavior is specific enough to implement
- product ambiguities are resolved or explicitly bounded
- affected scope is understood from repository context

Process:

1. Inspect the current code, interfaces, and affected paths.
2. Decide whether the work is direct execution or needs a plan checkpoint first.
3. Implement in small, defensible increments.
4. Keep unrelated files untouched unless they are required dependencies.
5. Delegate final review to the `reviewer` subagent using `review.md`.
6. Fix review findings and repeat review until clean or the review loop gate trips.
7. Summarize changed behavior, review result, validation still needed, and remaining risks.

### Bead Execution

Use this mode when the request includes a Bead ID such as `br-123` or `123`.

Entry criteria:

1. Validate the Bead:
   ```bash
   br show <id>
   ```
2. Confirm the Bead is open, unblocked, and assigned to this execution pass.
3. Read acceptance criteria, dependencies, and any parent epic context.
4. Mark the Bead in progress when Beads is available:
   ```bash
   br update <id> --status=in_progress
   ```
5. Record the active Bead in the bead state manager when available:
   ```bash
   node .codex/codexkit_bead_state.mjs activate --bead br-123 --agent <agent-name>
   ```

Process:

1. Inspect the code paths needed for this Bead.
2. Implement only the work required by the Bead acceptance criteria.
3. Keep the Bead ID in worker summaries and commit messages when commits are requested.
4. Delegate final review to the `reviewer` subagent using `review.md`.
5. Fix reviewer or user review feedback inside the same Bead.
6. Repeat fix-review until clean or the loop gate trips.
7. Mark the Bead implementation-complete in the local state manager, but do not close it automatically.
   ```bash
   node .codex/codexkit_bead_state.mjs complete --bead br-123
   node .codex/codexkit_bead_state.mjs await-close --bead br-123
   ```
8. Ask the user whether to close the Bead.
9. Close only after acceptance criteria pass, review has no blocking findings, and the user approves:
   ```bash
   br close <id> --reason "Completed"
   br sync --flush-only
   ```

## Review Loop Gate

- Maximum 10 fix-review cycles per execution pass.
- When the limit is reached or progress stalls, stop and report `[BLOCKED] br-###` with current findings and suggested next action.
- Do not create automatic fix Beads during execute. Fix review feedback inside the current Bead unless the user asks otherwise.

## Rules

- Execute at most one Bead per run.
- Workers do not pick their own Beads; the parent thread or swarm assigns them.
- Do not run `check.md` or `verify.md` as part of normal Bead execution. Swarm handles final check/verify at the aggregate level.
- Do not close a Bead without explicit user approval.
- Do not broaden scope without telling the user.
