# Status Workflow

Use this workflow to summarize repository state, active work, and validation status.

## Goal

Answer "where are we now?" without re-reading the entire project.

## Include When Relevant

- current task or feature area
- current Beads state when `.beads/` exists
- CodexKit runtime state when `.codex/codexkit_status.mjs` exists
- changed files or major touched areas
- validation state
- preview status
- pending work or known blockers

## Process

1. Inspect repository status and recent changes.
2. If Beads are in use, inspect current Beads status:
   ```bash
   br list --json
   br ready --json
   ```
3. If the CodexKit status helper exists, inspect same-session runtime state:
   ```bash
   node .codex/codexkit_status.mjs --json
   ```
   Include `.codexkit/state.json`, `.codexkit/HANDOFF.json`, active reservations, dependency health, and next reads.
4. For active execute work, summarize active workflow, phase, active Beads, active workers, worker statuses, blockers, and `next_action`.
5. For Batch Execution, include locked batch scope, reservation health, handoff presence, aggregate validation state, and any mapped or unmapped aggregate failures when present.
6. Summarize changed files and major touched areas.
7. Report validation that has and has not been run.
8. Include preview or deployment state if the task depends on it.
9. End with the most relevant next action.
