# Setup Agent Context

Use this workflow when setting up a new repository for agent-aware work, or when the agent lacks context about Beads and domain docs.

## Goal

Create the per-repo configuration that downstream workflows assume:

- Beads issue-tracker conventions
- Domain documentation layout

## Process

### 1. Explore

Read the current repo state:

- `AGENTS.md` and `CLAUDE.md` at the repo root -- does either exist? Is there already an `## Agent skills` section in either?
- `CONTEXT.md` and `CONTEXT-MAP.md` at the repo root
- `docs/adr/` and any `src/*/docs/adr/` directories
- `docs/agents/issue-tracker.md` and `docs/agents/domain.md`
- `.beads/` and `.beads/beads.jsonl`
- tool availability:
  ```bash
  br --help
  bv --robot-triage --help
  ```

Do not run bare `bv`; it may open an interactive TUI.

### 2. Present findings and ask

Summarize what is present and what is missing. Then walk the user through the domain docs decision.

**Section A -- Issue tracker.**

> Explainer: CodexKit uses Beads for issue tracking. Planning workflows create PRD, epic, feature, task, bug, docs, or question Beads with `br`; swarm workflows use `br ready` and `bv --robot-triage` to select independent work.

Default: Beads. Do not offer external tracker choices.

If `br`, `bv`, or `.beads/` is missing, explain that planning workflows will output Markdown bead drafts until Beads is installed and initialized.

**Section B -- Domain docs.**

> Explainer: Some workflows read `CONTEXT.md` to learn the project's domain language, and `docs/adr/` for past architectural decisions. They need to know whether the repo has one global context or multiple (e.g. a monorepo with separate frontend/backend contexts) so they look in the right place.

Confirm the layout:

- **Single-context** -- one `CONTEXT.md` + `docs/adr/` at the repo root. Most repos are this.
- **Multi-context** -- `CONTEXT-MAP.md` at the root pointing to per-context `CONTEXT.md` files, typically in a monorepo.

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

Never create `AGENTS.md` when `CLAUDE.md` already exists, or vice versa. Always edit the one that's already there.

If an `## Agent skills` block already exists in the chosen file, update its contents in-place rather than appending a duplicate. Do not overwrite user edits to the surrounding sections.

The block:

```markdown
## Agent skills

### Issue tracker

Beads in `.beads/`. Use `br` for CRUD, `br ready` for unblocked work, `br dep add` for dependencies, `br sync --flush-only` for export, and `bv --robot-*` commands for graph-aware triage. See `docs/agents/issue-tracker.md`.

### Domain docs

[one-line summary of layout -- single-context or multi-context]. See `docs/agents/domain.md`.
```

Then write the two docs files using the seed templates below:

- For issue tracker: use the Beads seed below.
- For domain docs: record the layout and any consumer rules.

## Seed Templates

### Beads Issue Tracker

````markdown
# Issue Tracker: Beads

This repo uses Beads for issue tracking. Beads are stored in `.beads/` and should be tracked in git.

## Required tools

- `br` from beads_rust for issue CRUD and dependency updates
- `bv` from beads_viewer for robot-mode graph triage

Do not run bare `bv` in agent sessions. Use only `bv --robot-*` commands.

## Core commands

```bash
br ready
br list --status=open
br show <id>
br create --title "..." --type task --priority 2
br update <id> --status=in_progress
br dep add <bead-id> <depends-on-id>
br close <id> --reason "Completed"
br sync --flush-only
bv --robot-triage
bv --robot-insights
````

## Types

- `epic` for large PRDs, multi-phase work, or parent containers
- `feature` for user-visible capabilities
- `bug` for regressions or incorrect behavior
- `task` for implementation work that is not user-facing by itself
- `docs` for documentation-only work
- `question` for blocked decisions requiring human input

## Workflow rules

- `plan.md` creates PRD/source Beads, epic Beads, and child Beads.
- `execute.md` executes one assigned Bead or normal implementation work without a Bead.
- `swarm.md` selects and assigns multiple ready Beads; workers never choose their own Beads.
- Beads are not closed automatically. Ask the user before `br close`.
- After Beads changes, run `br sync --flush-only`. This does not run git commands.

## Missing setup fallback

If `br`, `bv`, or `.beads/` is unavailable, output Markdown bead drafts with type, title, body, AFK/HITL classification, acceptance criteria, and dependencies. State which Beads setup piece is missing.
```

### Domain Docs

```markdown
# Domain Docs

How workflows should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- `CONTEXT.md` at the repo root, or
- `CONTEXT-MAP.md` at the repo root if it exists; it points at one `CONTEXT.md` per context.
- `docs/adr/` for architectural decisions that touch the area being planned.
- In multi-context repos, also check `src/<context>/docs/adr/` for context-scoped decisions.

If these files do not exist, proceed silently. Create them lazily only when terms or decisions are resolved.

## Layout

[Record single-context or multi-context here.]

## Use the glossary vocabulary

When output names a domain concept, use the term as defined in `CONTEXT.md`. If the needed concept is missing, note it for `grill-with-docs`.

## Flag ADR conflicts

If output contradicts an existing ADR, surface the conflict explicitly instead of silently overriding it.
```

### 5. Done

Tell the user the setup is complete and which workflows will now read from these files. Mention they can edit `docs/agents/*.md` directly later; re-running this workflow is only necessary if they want to restart local context setup.
