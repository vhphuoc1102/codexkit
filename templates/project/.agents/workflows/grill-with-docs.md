# Grill With Docs

Use this workflow when a plan, spec, or design needs to be challenged against the project's existing domain model and documented decisions.

## Goal

Reach a shared understanding by questioning every aspect of the plan one at a time, updating domain documentation as decisions crystallise.

## Process

### 1. Explore

Before asking domain questions, read existing documentation:

- `CONTEXT.md` at the repo root, or each `CONTEXT.md` pointed to by `CONTEXT-MAP.md`
- `docs/adr/` and any `src/*/docs/adr/`
- Code in the area that the plan touches

If no `CONTEXT.md` exists, create it lazily when the first term is resolved.
If no `docs/adr/` exists, create it lazily when the first ADR is needed.

### 2. Challenge

Interview the user relentlessly about every aspect of this plan. Ask one question at a time, and wait for feedback before continuing.

For each question, provide your recommended answer.

If a question can be answered by exploring the codebase, inspect the code instead of asking.

### 3. Sharpen

- **Challenge against the glossary.** When the user uses a term that conflicts with the existing language in `CONTEXT.md`, call it out immediately.
- **Sharpen fuzzy language.** When the user uses vague or overloaded terms, propose a precise canonical term.
- **Discuss concrete scenarios.** Stress-test domain relationships with specific edge-case scenarios. Force the user to be precise about boundaries between concepts.
- **Cross-reference with code.** When the user states how something works, check whether the code agrees. Surface contradictions immediately.

### 4. Record

- Update `CONTEXT.md` immediately when a term is resolved. Don't batch updates; capture them as they happen. Only include terms that are meaningful to domain experts, not implementation details.
- Create an ADR only when all three are true:
  1. The decision is hard to reverse -- changing your mind later has real cost
  2. The decision is surprising without context -- a future reader will wonder "why did they do it this way?"
  3. The decision is the result of a real trade-off -- genuine alternatives existed and you picked one for specific reasons

If any of the three is missing, skip the ADR.

## Output

- Updated `CONTEXT.md` with resolved terms
- ADRs created only when justified
- A revised plan that is consistent with the project's documented language and decisions
