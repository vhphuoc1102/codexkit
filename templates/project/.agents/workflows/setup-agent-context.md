# Setup Agent Context

Use this workflow when setting up a new repository for agent-aware work, or when the agent lacks context about local issue files and domain docs.

## Goal

Create the per-repo configuration that downstream workflows assume:

- Local markdown issue conventions
- Domain documentation layout

## Process

### 1. Explore

Read the current repo state:

- `AGENTS.md` and `CLAUDE.md` at the repo root -- does either exist? Is there already an `## Agent skills` section in either?
- `CONTEXT.md` and `CONTEXT-MAP.md` at the repo root
- `docs/adr/` and any `src/*/docs/adr/` directories
- `.scratch/` -- does a local markdown issue convention already exist?

### 2. Present findings and ask

Summarize what is present and what is missing. Then walk the user through the domain docs decision.

**Section A -- Issue tracker.**

> Explainer: CodexKit uses local markdown issues for this repo. Downstream workflows publish PRDs and implementation issues under `.scratch/<feature>/`, so work stays in the repository and does not require an external issue tracker.

Default: local markdown. Do not offer external tracker choices.

**Section B -- Domain docs.**

> Explainer: Some workflows read `CONTEXT.md` to learn the project's domain language, and `docs/adr/` for past architectural decisions. They need to know whether the repo has one global context or multiple (e.g. a monorepo with separate frontend/backend contexts) so they look in the right place.

Confirm the layout:

- **Single-context** -- one `CONTEXT.md` + `docs/adr/` at the repo root. Most repos are this.
- **Multi-context** -- `CONTEXT-MAP.md` at the root pointing to per-context `CONTEXT.md` files (typically a monorepo).

### 3. Confirm and edit

Show the user a draft of:

- The `## Agent skills` block to add to whichever of `CLAUDE.md` / `AGENTS.md` is being edited
- The contents of `docs/agents/issue-tracker.md`, `docs/agents/domain.md`

Let them edit before writing.

### 4. Write

**Pick the file to edit:**

- If `CLAUDE.md` exists, edit it.
- Else if `AGENTS.md` exists, edit it.
- If neither exists, ask the user which one to create -- don't pick for them.

Never create `AGENTS.md` when `CLAUDE.md` already exists (or vice versa) -- always edit the one that's already there.

If an `## Agent skills` block already exists in the chosen file, update its contents in-place rather than appending a duplicate. Don't overwrite user edits to the surrounding sections.

The block:

```markdown
## Agent skills

### Issue tracker

Local markdown in `.scratch/<feature-slug>/`. See `docs/agents/issue-tracker.md`.

### Domain docs

[one-line summary of layout -- single-context or multi-context]. See `docs/agents/domain.md`.
```

Then write the two docs files using the seed templates below:

- For issue tracker: use the local markdown seed below.
- For domain docs: record the layout and any consumer rules.

## Seed templates

### Local markdown issue tracker

```markdown
# Issue tracker: Local Markdown

Issues and PRDs for this repo live as markdown files in `.scratch/`.

## Conventions

- One feature per directory: `.scratch/<feature-slug>/`
- The PRD is `.scratch/<feature-slug>/PRD.md`
- Implementation issues are `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01`
- Comments and conversation history append to the bottom of the file under a `## Comments` heading

## When a workflow says "publish to the issue tracker"

Create a new file under `.scratch/<feature-slug>/`, creating directories as needed.

## When a workflow says "fetch the relevant ticket"

Read the file at the referenced path. The user will normally pass the path or issue number directly.
```

### Domain docs

```markdown
# Domain Docs

How workflows should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- `CONTEXT.md` at the repo root, or
- `CONTEXT-MAP.md` at the repo root if it exists; it points at one `CONTEXT.md` per context.
- `docs/adr/` for architectural decisions that touch the area being planned.
- In multi-context repos, also check `src/<context>/docs/adr/` for context-scoped decisions.

If these files don't exist, proceed silently. Create them lazily only when terms or decisions are resolved.

## Layout

[Record single-context or multi-context here.]

## Use the glossary vocabulary

When output names a domain concept, use the term as defined in `CONTEXT.md`. If the needed concept is missing, note it for `grill-with-docs`.

## Flag ADR conflicts

If output contradicts an existing ADR, surface the conflict explicitly instead of silently overriding it.
```

### 5. Done

Tell the user the setup is complete and which workflows will now read from these files. Mention they can edit `docs/agents/*.md` directly later -- re-running this workflow is only necessary if they want to restart local context setup.
