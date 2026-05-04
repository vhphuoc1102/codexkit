# Plan Workflow

Use this workflow when the user wants an implementation plan before code changes.

## Goal

Produce a decision-complete plan that someone could execute without re-discovering the problem.

## Process

1. Inspect the current code or repository layout first.
2. Define:
   - target behavior
   - explicit non-goals
   - dependencies and constraints
3. Break the work into sequenced implementation steps.
4. Capture API, data, migration, and config changes if any.
5. Call out risky assumptions and open questions.
6. Define validation and acceptance criteria.

## Good Plan Characteristics

- grounded in the real repository, not generic advice
- ordered by dependency
- explicit about risks and unknowns
- clear about what will be validated at the end

## Output Shape

- short objective
- current-state summary
- step-by-step plan
- risks and open questions
- validation plan

## Extended Outputs

When the user asks, extend this workflow into one of two optional branches.

### Branch A -- Produce a PRD

Synthesize the current conversation context and codebase understanding into a PRD. Do NOT interview the user -- synthesize what you already know.

The PRD should include:

- **Problem Statement** -- the problem the user is facing, from their perspective
- **Solution** -- the solution from the user's perspective
- **User Stories** -- a long, numbered list in the format: As a <actor>, I want a <feature>, so that <benefit>. Cover all aspects of the feature.
- **Implementation Decisions** -- modules to build or modify, interfaces, architectural decisions, schema changes, API contracts. Do NOT include specific file paths or code snippets.
- **Testing Decisions** -- what makes a good test, which modules to test, prior art for tests in the codebase
- **Out of Scope** -- what is not covered
- **Further Notes** -- any remaining notes

Publish the PRD using the configured issue tracker described in `docs/agents/issue-tracker.md`.

### Branch B -- Break into issues

Turn the approved plan into independently-grabbable issues using vertical slices (tracer bullets).

#### 1. Gather context

Work from the approved plan and current conversation context. If the user passes an issue reference, fetch it from the issue tracker.

#### 2. Explore the codebase (optional)

If you have not already explored the codebase, do so. Issue titles and descriptions should use the project's domain glossary vocabulary, and respect ADRs in the area you're touching.

#### 3. Draft vertical slices

Break the plan into tracer bullet issues. Each issue is a thin vertical slice that cuts through ALL integration layers end-to-end, NOT a horizontal slice of one layer.

Slices may be AFK or HITL:
- AFK -- can be implemented and merged without human interaction
- HITL -- requires human interaction (architectural decision or design review)

Prefer AFK over HITL where possible.

Rules:
- Each slice delivers a narrow but COMPLETE path through every layer (schema, API, UI, tests)
- A completed slice is demoable or verifiable on its own
- Prefer many thin slices over few thick ones

#### 4. Quiz the user

Present the proposed breakdown as a numbered list. For each slice, show:

- **Title** -- short descriptive name
- **Type** -- AFK / HITL
- **Blocked by** -- which other slices must complete first
- **User stories covered** -- which user stories this addresses

Ask the user:
- Does the granularity feel right? (too coarse / too fine)
- Are the dependency relationships correct?
- Should any slices be merged or split further?
- Are the correct slices marked as AFK and HITL?

Iterate until the user approves the breakdown.

#### 5. Publish the issues

For each approved slice, publish a new issue to the configured issue tracker. Read the conventions from `docs/agents/issue-tracker.md`.

Publish in dependency order (blockers first) so you can reference real issue identifiers in the "Blocked by" field.

Issue body shape:

```markdown
## Parent

A reference to the parent issue (if the source was an existing issue, otherwise omit this section).

## What to build

A concise description of this vertical slice. Describe the end-to-end behavior, not layer-by-layer implementation.

## Acceptance criteria

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Blocked by

- A reference to the blocking ticket (if any)

Or "None - can start immediately" if no blockers.
```

Do NOT close or modify any parent issue.
