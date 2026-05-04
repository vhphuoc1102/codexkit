# Impeccable Workflow

Use this workflow for UI/UX design, redesign, critique, audit, polish, and production-quality frontend craft.

## Goal

Route UI work through the Impeccable skill so design decisions are grounded in product context, screen architecture, and a confirmed design brief before implementation.

## Backing Skill

Use the shipped project skill:

- `.agents/skills/impeccable/SKILL.md`

Primary invocation:

```text
$impeccable
```

## Process

1. **No UI context yet**
   - Run `$impeccable teach`.
   - This creates or refreshes `PRODUCT.md` and, when appropriate, `DESIGN.md`.

2. **PRD or business logic exists but no screen spec exists**
   - Run `.agents/workflows/screen-spec.md` first.
   - Use it to define screen inventory, screen flow, states, and business-rule-to-UI mapping.

3. **Screen spec exists but no design brief exists**
   - Run `$impeccable shape`.
   - Shape produces the task-specific design brief and must be explicitly confirmed before implementation.

4. **Confirmed design brief exists**
   - Run `$impeccable craft`.
   - Craft shapes, lands visual direction, builds real code, inspects in browser, and iterates.

5. **Existing UI needs review**
   - Run `$impeccable critique` for UX/design review.
   - Run `$impeccable audit` for technical quality checks such as accessibility, performance, and responsive issues.

6. **Existing UI needs finishing**
   - Run `$impeccable polish`.

## Command Shortcuts

Common task routing:

- New UI from requirements: `screen-spec` then `$impeccable shape`
- New UI implementation: `$impeccable craft`
- Existing UI review: `$impeccable critique`
- Existing UI technical check: `$impeccable audit`
- Final design pass: `$impeccable polish`
- Empty states or onboarding: `$impeccable onboard`
- Responsive fixes: `$impeccable adapt`
- Typography fixes: `$impeccable typeset`
- Layout fixes: `$impeccable layout`
- Motion: `$impeccable animate`

## Rules

- Do not jump straight from PRD/business logic to visual styling when screen architecture is missing.
- Use `screen-spec.md` before Impeccable when the user has product requirements, business rules, or multi-screen flows.
- Preserve Impeccable's gates: PRODUCT context, task-specific shape brief, and browser inspection for craft work.
- If implementation and design are both requested, complete design reasoning first, then move into `create` or `$impeccable craft`.

## Output Shape

- current UI context
- selected Impeccable command
- whether `screen-spec.md` is required first
- design brief or critique summary
- implementation notes when code is in scope
