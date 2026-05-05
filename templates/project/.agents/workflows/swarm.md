# Swarm Workflow

Use this workflow for parallel execution of multiple independent ready Beads.

## Goal

Coordinate bounded subagent work across multiple Beads, then run one aggregate validation pass before user close approval.

## Entry Criteria

- Beads are the work source.
- `br ready` or `bv --robot-triage` identifies independent ready Beads.
- The task genuinely benefits from multiple focused workers.
- Beads do not require overlapping write ownership unless explicitly coordinated.

If Beads are missing, go to `plan.md` to create them first.

## Selection

Use Beads to select work:

```bash
br ready
bv --robot-triage
```

Prefer:

- high-priority ready Beads with no blockers
- independent Beads that can run in parallel
- Beads with clear acceptance criteria

Do not let workers choose Beads themselves. The main thread assigns one Bead to each worker.

## Process

1. List ready Beads and choose a bounded batch.
2. Record active Beads in the bead state manager:
   ```bash
   node .codex/codexkit_bead_state.mjs activate --bead br-123 --agent frontend-specialist
   ```
3. Spawn one worker per Bead.
4. Assign each worker:
   - Bead ID
   - affected scope
   - expected output
   - `execute.md` workflow
   - review loop rules
5. Choose agent role from Bead content:
   - `backend_specialist` for API, service, auth, jobs, or server behavior
   - `frontend_specialist` for UI, React, Next.js, styling, or browser behavior
   - `database_architect` for schema, migrations, data modeling, or query strategy
   - `debugger` for bug isolation or failing behavior
   - `implementer` for narrow general implementation
   - `test_writer` only when the Bead is specifically about tests
6. Do not pass explicit skill bundles by default. Agent definitions and repository routing already name relevant skills.
7. Monitor worker results: `[DONE]`, `[BLOCKED]`, `[HANDOFF]`, or `[NOOP]`.
8. Route user review feedback back to the same Bead worker or a replacement worker for that Bead.
9. After workers finish their execute/review loops, run one aggregate `check.md` or `verify.md` pass.
10. If check/verify fails, map each failure back to the relevant existing Bead and fix inside that Bead context.
11. Rerun aggregate check/verify until clean or the swarm loop gate trips.
12. Ask the user before closing any Beads.

## Validation

Use `check.md` for routine swarm work. Use `verify.md` when the Bead batch touches migrations, auth, billing, deployment, cross-cutting config, or high-risk behavior.

Swarm validation happens after the worker execute/review loops, not inside each Bead worker.

## Loop Gate

- Maximum 10 validation-fix cycles per swarm run.
- No automatic fix Bead creation during swarm validation.
- Failed check/verify output is assigned back to existing relevant Beads.
- If a failure cannot be mapped to an existing Bead, ask whether to attach it to an existing Bead or return to `plan.md` to create a new Bead.
- Stop and ask the user when a failure becomes architectural, ambiguous, or product-decision dependent.

## Rules

- Do not spawn agents just because the task is large.
- Avoid parallel edits to the same write set.
- Keep worker prompts narrow and Bead-specific.
- Keep Beads open until the user approves closure.
- Run `br sync --flush-only` after Bead updates.
