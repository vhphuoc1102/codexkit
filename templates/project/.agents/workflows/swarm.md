# Swarm Workflow

Use this workflow for complex work that benefits from multiple focused subagents.

## Goal

Coordinate bounded subagent work across Beads while avoiding overlapping edits.

## Modes

### Beads Swarm

Default when `.beads/` exists and `br`/`bv` are available.

1. Read current state:
   ```bash
   node .codexkit/scripts/codexkit_status.mjs --json
   node .codexkit/scripts/codexkit_reservations.mjs sweep --json
   ```
2. Inspect the work graph:
   ```bash
   bv --robot-triage
   bv --robot-plan
   br ready --json
   ```
3. Parent agent selects ready beads. Workers must not choose their own beads.
4. For each worker, define:
   - assigned bead id
   - expected output
   - allowed write scope
   - required skills
   - verification command
   - reservation identity
5. Spawn only non-overlapping work.
6. Record active workers in `.codexkit/state.json`.
7. Tend workers with graph, reservation, and status checks until done.
8. Run final review/check/verify as appropriate.

### Generic Orchestration

Use when Beads are unavailable but sidecar work is still clearly useful.

Allowed examples:

- `reviewer` reviews a diff while main agent fixes a known issue
- `docs_researcher` verifies external API behavior
- `test_writer` drafts tests for a bounded public behavior

Generic orchestration must still define bounded read/write scope and expected output.

## Handoff

When context is high, work is paused, or active workers remain, write `.codexkit/HANDOFF.json` with:

- active workflow
- active beads
- active workers
- reservations
- blockers
- next command/action

On resume, read `HANDOFF.json`, `state.json`, `br ready --json`, and active reservations before doing new work.

## Rules

- Do not spawn subagents just because the task is large.
- Do not delegate the immediate blocking task when the main thread needs the answer now.
- Never let two workers edit overlapping write scopes.
- Prefer fewer high-quality workers over a broad swarm.
- Parent integrates results and owns the final response.

## Output Shape

- selected mode
- active/finished bead ids
- worker assignments
- blocked work
- validation summary
- next ready beads or final handoff
