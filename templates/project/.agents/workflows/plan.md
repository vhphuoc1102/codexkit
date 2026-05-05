# Plan Workflow

Use this workflow when the user wants an implementation plan, PRD, product spec, or Beads work graph from existing context.

This workflow is guidance, not an artifact filename. Do not create a `plan.md` file unless the user explicitly asks for a plan file.

## Goal

Produce a grounded planning output from the current conversation and repository context, then turn executable work into Beads when Beads are available:

- concise implementation plan for small or early planning requests
- PRD or product spec for `to-prd`, `create PRD`, or feature specification
- Beads for `to-issues`, implementation tickets, issue breakdown, or approved execution work
- one source bead for small PRDs, or one epic bead plus child beads for large PRDs

## Process

1. Inspect the current code or repository layout first.
2. Synthesize what is already known from the conversation and repository context.
3. Ground the output in project vocabulary from domain docs, existing tests, ADRs, and code conventions.
4. Produce the requested planning output.
5. For PRDs, publish the PRD through Beads, then apply the large-PRD auto-beads gate.
6. Publish work through the configured Beads tracker in `docs/agents/issue-tracker.md`. If Beads is not configured or `br`/`bv` is missing, output Markdown bead drafts and state what setup is missing.

## Beads Availability

Before creating work items, check:

```bash
br --help
bv --robot-triage --help
```

If Beads is available:

- read `docs/agents/issue-tracker.md` when present for local conventions
- create work with `br create --title "..." --type <type> --priority <n>`
- encode dependencies with `br dep add <bead-id> <depends-on-id>`
- inspect graph health with `bv --robot-triage` or `bv --robot-insights`
- export Beads changes with `br sync --flush-only`

If Beads is unavailable, produce Markdown drafts with the intended bead type, title, description, AFK/HITL classification, acceptance criteria, and dependencies. Say whether the missing setup is `br`, `bv`, `.beads/`, or `docs/agents/issue-tracker.md`.

## Concise Implementation Plan

When the user asks for a plan before implementation, output:

- short objective
- current-state summary
- step-by-step implementation plan
- API, data, migration, config, or UI changes
- risks and open questions
- validation and acceptance criteria

If the user approves execution work or asks for issues/tickets, create Beads from this plan.

## PRD Output

When the user asks for a PRD, product spec, or feature specification, synthesize what is already known. Do not interview the user by default. Ask only when a missing decision would materially change the PRD.

Before writing the PRD:

- understand the current codebase enough to describe current state
- identify major modules or product areas to build or modify
- look for deep modules: small public interfaces with substantial implementation behind them
- identify which behaviors need tests and what prior tests in the repo are relevant

PRD body:

```markdown
## Problem Statement

The problem the user is facing, from the user's perspective.

## Solution

The solution from the user's perspective.

## User Stories

1. As a <actor>, I want a <feature>, so that <benefit>.

Include a thorough numbered list that covers the feature end to end.

## Implementation Decisions

- Modules or product areas to build or modify
- Interfaces and contracts to add or change
- Architectural decisions
- Schema, API, configuration, or interaction decisions
- Technical clarifications already established

Do not include specific file paths or code snippets.

## Testing Decisions

- What makes a good test for this feature
- Which behaviors and modules should be tested
- Prior art for similar tests in the codebase
- Public-interface and integration-style test expectations

## Out of Scope

Things not covered by this PRD.

## Further Notes

Remaining notes, risks, or useful context.
```

After writing a small PRD, create one source bead, usually `feature`, with the PRD content in the bead body and acceptance criteria that make the whole vertical slice demoable. Use `task`, `docs`, `bug`, or `question` only when the PRD is not a user-visible feature.

## Large PRD Auto-Beads

After creating a PRD, automatically produce Beads when any of these are true:

- the PRD has more than 5 user stories
- the work touches 3 or more subsystems or product areas
- the work spans schema, API, UI, and tests
- the work needs migration, rollout, permissions, billing, data import/export, or operational coordination
- the PRD cannot be implemented as one safe, demoable vertical slice

For a large PRD:

1. Create one `epic` bead for the PRD.
2. Create child beads for vertical slices as `feature`, `task`, `bug`, `docs`, or `question`.
3. Publish parent work first so child beads can reference the real epic Bead ID.
4. Link child dependencies with `br dep add`.
5. Keep the epic open until all child beads are reviewed and the user approves closure.

## Bead Output

When the user asks for `to-issues`, implementation tickets, issue breakdown, or Beads, work from the current plan, PRD, spec, Bead reference, or conversation context. If the user passes a Bead ID, fetch and read it with `br show <id>` before slicing.

Break work into tracer-bullet vertical slices:

- each bead delivers a narrow but complete path through all relevant layers
- each completed bead is demoable or independently verifiable
- prefer many thin beads over a few broad beads
- avoid horizontal beads that only cover one layer unless that layer is the complete deliverable

Choose bead type:

- `epic` for large PRDs, multi-phase work, or parent work containers
- `feature` for user-visible capabilities
- `bug` for regressions or incorrect behavior
- `task` for implementation work that is not user-facing by itself
- `docs` for documentation-only work
- `question` for blocked decisions requiring human input

Classify each executable bead:

- `AFK` when it can be implemented and reviewed without human interaction
- `HITL` when it needs human input, such as design review, credentials, product decision, or architecture approval

Prefer `AFK` where possible, but do not hide real human dependencies.

Publish beads in dependency order so blockers have real IDs before dependent beads reference them. For large PRD auto-beads, use the epic bead ID as the parent reference.

Bead body:

```markdown
## Parent

Parent epic bead or source reference, if one exists.

## What to build

End-to-end behavior for this bead.

## Execution mode

AFK or HITL, with a short reason.

## Acceptance criteria

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Dependencies

- Blocking bead IDs, or None.
```

Do not close beads during planning. Execution and user approval own closure.
