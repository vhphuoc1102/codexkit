# Plan Workflow

Use this workflow when the user wants a plan, PRD, or executable issue breakdown before code changes.

## Goal

Produce a decision-complete plan, turn it into a PRD, then publish executable work as Beads.

## Preconditions

- Inspect the repository before planning.
- Read `docs/agents/domain.md` and relevant `CONTEXT.md`/ADR files when present.
- Prefer Beads when `br` is available. If `br` is missing, stop after PRD + issue draft and tell the user Beads must be installed before publishing executable work.

## Process

### 1. Explore

Define:

- target behavior
- explicit non-goals
- affected code areas
- dependencies and constraints
- risky assumptions and open questions

Ask only for decisions that cannot be resolved from repository context.

### 2. Draft PRD

Write a PRD from the current conversation and repository understanding.

Include:

- **Problem Statement**
- **Solution**
- **User Stories**
- **Implementation Decisions**
- **Testing Decisions**
- **Out of Scope**
- **Further Notes**

Present the PRD and ask for confirmation before creating Beads.

### 3. Draft Bead Breakdown

After PRD approval, break the work into vertical slices.

Each bead must include:

- title
- type: `AFK` or `HITL`
- user stories covered
- blockers / dependency candidates
- acceptance criteria
- visible implementation scope
- verification expectation
- whether a TDD spec is required before execution

Rules:

- A bead is a thin vertical slice, not a horizontal layer.
- Prefer many small AFK beads over large ambiguous beads.
- Mark HITL only when human decision, UX review, credential setup, or external approval is truly required.
- Do not create triage labels or triage state machines.

Present the breakdown and ask for confirmation before publishing.

### 4. Publish To Beads

Create one parent feature bead and child implementation beads with `br`.

Use:

```bash
br create "<title>" --type feature --priority 1 --json
br create "<title>" --type task --priority <0-4> --json
br dep add <child-bead> <blocking-bead>
br sync --flush-only
```

Put the PRD summary, acceptance criteria, AFK/HITL marker, and user stories in the bead body/comment using the best available `br` fields for the installed version.

Publish blockers first so dependency references use real bead ids.

### 5. Validate The Graph

Run one or more of:

```bash
br ready --json
bv --robot-plan
bv --robot-triage
bv --robot-graph --graph-format=json
```

Confirm:

- unblocked starter beads appear in ready work
- blocked beads are not ready
- no dependency cycles are present
- the next workflow is clear: `tdd`, `execute`, or `swarm`

## Output Shape

- PRD location or summary
- created parent bead id
- created child bead ids with dependencies
- ready starter beads
- recommended next command / prompt
- anything not published because it needs user confirmation or Beads tooling
