# Plan Workflow

Use this workflow when the user wants an implementation plan, PRD, product spec, or issues from existing context.

This workflow is guidance, not an artifact filename. Do not create a `plan.md` file unless the user explicitly asks for a plan file.

## Goal

Produce a grounded planning output from the current conversation and repository context:

- a concise implementation plan when the user asks for a plan
- a PRD or product spec when the user asks for `to-prd`, `create PRD`, or feature specification
- issue slices when the user asks for `to-issues`, implementation tickets, or issue breakdown
- issue slices automatically after a large PRD

## Process

1. Inspect the current code or repository layout first.
2. Synthesize what is already known from the conversation and repository context.
3. Ground the output in project vocabulary from domain docs, existing tests, ADRs, and code conventions.
4. Produce the requested planning output.
5. For PRDs, apply the large-PRD auto-issues gate.
6. Publish PRDs or issues only through the configured issue tracker in `docs/agents/issue-tracker.md`. If no tracker is configured, output the PRD or issue drafts in Markdown and say what setup is missing.

## Concise Implementation Plan

When the user asks for a plan before implementation, output:

- short objective
- current-state summary
- step-by-step implementation plan
- API, data, migration, config, or UI changes
- risks and open questions
- validation and acceptance criteria

Good plans are grounded in the real repository, ordered by dependency, explicit about risks, and clear about final validation.

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

If publishing to an issue tracker, apply the configured triage label, normally `needs-triage`, when the tracker conventions support it.

## Large PRD Auto Issues

After creating a PRD, automatically produce issue slices when any of these are true:

- the PRD has more than 5 user stories
- the work touches 3 or more subsystems or product areas
- the work spans schema, API, UI, and tests
- the work needs migration, rollout, permissions, billing, data import/export, or operational coordination
- the PRD cannot be implemented as one safe, demoable vertical slice

When an issue tracker is configured, publish the PRD first and use its issue identifier as the `Parent` reference for auto-created issues. If no tracker is configured, output the PRD and issue drafts together in Markdown and state that tracker setup is missing.

## Issue Output

When the user asks for issues, implementation tickets, or issue breakdown, work from the current plan, PRD, spec, issue reference, or conversation context. If the user passes an issue reference, fetch and read the issue body and comments before slicing.

Break the work into tracer-bullet vertical slices:

- each issue delivers a narrow but complete path through all relevant layers
- each completed issue is demoable or independently verifiable
- prefer many thin slices over a few broad slices
- avoid horizontal issues that only cover one layer unless that layer is the complete deliverable

Classify each slice:

- `AFK` -- can be implemented and merged without human interaction
- `HITL` -- needs human interaction, such as design review or architecture decision

Prefer `AFK` where possible.

Publish issues in dependency order so blockers have real issue identifiers before dependent issues reference them.

Issue body:

```markdown
## Parent

A reference to the parent PRD or source issue, if one exists. Omit this section when there is no parent.

## What to build

A concise description of this vertical slice. Describe the end-to-end behavior, not layer-by-layer implementation.

## Type

AFK or HITL, with a short reason.

## Acceptance criteria

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Blocked by

- A reference to the blocking ticket, if any

Or: None - can start immediately.
```

Do not close or modify any parent issue unless the user explicitly asks.
