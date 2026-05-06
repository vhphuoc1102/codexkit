# Status Workflow

Use this workflow to summarize repository state, active work, and validation status.

## Goal

Answer "where are we now?" without re-reading the entire project.

## Include When Relevant

- current task or feature area
- current Beads state when `.beads/` or `.codex/codexkit_bead_state.mjs` exists
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
3. If the Bead state manager exists, inspect same-session state:
   ```bash
   node .codex/codexkit_bead_state.mjs status
   ```
   Include active, deferred, failed, completed, and awaiting-user-close Beads, plus assignments and cycle counts when present.
4. Summarize the active workstream.
5. Report validation that has and has not been run.
6. Include preview or deployment state if the task depends on it.
7. End with the most relevant next action.
