# Screen Spec Workflow

Use this workflow when the user has product requirements, business logic, a PRD, feature rules, `CONTEXT.md`, or ADRs and needs to turn them into implementation-ready UX architecture before visual design.

This workflow produces a durable screen architecture artifact. It does not decide visual style.

## Goal

Produce a screen specification that explains which screens exist, how they connect, what each screen contains, which forms, fields, tables, columns, interactions, states, and business rules must exist, and which requirements each part satisfies.

Default output artifact:

```text
docs/screen-specs/<feature-slug>.md
```

Use the canonical template:

```text
.agents/workflows/screen-spec-references/output-template.md
```

## Process

### 1. Discover Context

Before asking the user for source material, search the repository for business and decision context:

- `CONTEXT.md` at the repo root
- `docs/CONTEXT.md`
- any `CONTEXT.md` files under `docs/`
- ADRs under `docs/adr/`
- decision records under `docs/decisions/`
- the PRD, existing plan, local issue, Bead, or user-provided requirements

If `CONTEXT.md`, ADRs, decision records, PRD, plan, issue, and user-provided requirements are all missing, ask the user for source context before writing a spec.

List every source used in the final artifact. If expected sources are missing, state that explicitly.

### 2. Extract Requirements

Extract screen-relevant requirements from the discovered sources:

- actors, roles, permissions, and constraints
- primary jobs-to-be-done
- business rules that affect UI behavior
- data-entry needs, including forms and fields
- table, list, or reporting needs, including columns and row actions
- validation, empty, loading, error, success, and permission behavior
- ADR constraints that affect screen structure, navigation, data visibility, or interactions

Assign trace IDs:

- `REQ-001`, `REQ-002`, etc. for product, business, and UX requirements
- `ADR-001`, `ADR-002`, etc. for ADR-derived or decision-record constraints

Preserve source paths or source names in the requirements reference table.

### 3. Identify Screens

Identify screens by user flow, not by technical module.

For each screen, determine:

- purpose
- entry points and exits
- primary user action
- displayed data
- collected data
- forms and fields
- tables, lists, columns, filters, sorting, and row or batch actions
- components
- interactions
- states and edge cases
- business rule mapping

Every screen must satisfy at least one `REQ-###` or `ADR-###`, or be explicitly marked as supporting infrastructure.

### 4. Write The Spec

Write or update:

```text
docs/screen-specs/<feature-slug>.md
```

Use `.agents/workflows/screen-spec-references/output-template.md` as the output shape.

Every requirement must map to at least one screen, flow, form field, table column, interaction, state, or open question.

Every form field, table column, and interaction should cite a requirement or ADR when business logic drives it.

### 5. Draw The Screen Flow

Include a Mermaid flowchart covering:

- entry points
- happy path
- error paths
- validation paths
- cancel and back behavior
- destructive or confirmation paths
- cross-screen dependencies

Use user-facing screen names in the diagram. Do not use internal module names unless users also see them.

## Output Contract

The artifact must include:

- source context summary
- requirements reference table with `ID | Source | Text | Screens`
- actors and roles table
- screen inventory table
- Mermaid screen flow
- screen details for each screen:
  - components table
  - forms table: `Form | Field | Type | Required | Validation | Default/Source | Business Rule`
  - tables table: `Table | Column | Data Source | Sort/Filter/Search | Row/Batch Actions | Business Rule`
  - interactions table: `Action | Trigger | Result | Business Rule`
  - states table: `State | When | UI Behavior`
  - business rules with `REQ-###` and `ADR-###` references
- shared UI patterns
- open questions
- next steps and handoff to `$impeccable shape`

## Rules

- Do not design visual style here. No color, font, brand treatment, illustration, spacing, or visual polish decisions.
- Do not invent backend behavior or product rules. If a rule is unclear, list it as an open question.
- Do not skip forms, fields, tables, columns, validations, or permissions when the requirements imply data entry or data review.
- Do not group screens by technical module. Group by user flow and user outcome.
- Do not hide ADR conflicts. If the screen spec contradicts an ADR or decision record, call it out explicitly.
- Every screen must satisfy at least one requirement or be marked as supporting infrastructure.
- Every requirement must map to a screen, flow, form field, table column, interaction, state, or open question.
- Missing empty, loading, error, validation, permission denied, and success states become implementation defects.
- `$impeccable shape` consumes this artifact for UX and visual direction. It should not change required fields, columns, or business rules unless it raises an explicit open question.
