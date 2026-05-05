# Setup Agent Context

Use this workflow when setting up a new repository for agent-aware work, Beads issue tracking, and local domain docs.

## Goal

Create the per-repo configuration downstream workflows assume:

- Beads issue tracking conventions
- CodexKit state/reservation conventions
- Domain documentation layout

## Process

### 1. Explore

Read the current repo state:

- `AGENTS.md` and `CLAUDE.md` at the repo root
- `CONTEXT.md` and `CONTEXT-MAP.md` at the repo root
- `docs/adr/` and any `src/*/docs/adr/` directories
- `.beads/` and whether `br` / `bv` are available
- `.codexkit/` and whether state/reservation scripts exist

### 2. Present findings

Summarize what is present and missing.

**Issue tracker:** CodexKit uses Beads (`br`) as the local executable issue graph. Workflows publish PRDs and implementation beads into `.beads/`; `bv` is used for graph-aware planning and swarm selection. No GitHub/GitLab tracker is configured by this workflow.

**Local state:** CodexKit stores lightweight coordination state in `.codexkit/`, including reservations and handoff files for `execute` and `swarm`.

**Domain docs:** Confirm whether the repo has one global context or multiple contexts.

- **Single-context** -- one `CONTEXT.md` + `docs/adr/` at the repo root.
- **Multi-context** -- `CONTEXT-MAP.md` at the root pointing to per-context `CONTEXT.md` files.

### 3. Confirm and edit

Show the user a draft of:

- The `## Agent skills` block for `CLAUDE.md` or `AGENTS.md`
- `docs/agents/issue-tracker.md`
- `docs/agents/domain.md`

Let them edit before writing.

### 4. Write

Pick the file to edit:

- If `CLAUDE.md` exists, edit it.
- Else if `AGENTS.md` exists, edit it.
- If neither exists, ask the user which one to create.

If an `## Agent skills` block already exists, update it in-place.

The block:

```markdown
## Agent skills

### Issue tracker

Beads in `.beads/`. See `docs/agents/issue-tracker.md`.

### CodexKit state

Local execution state and reservations live in `.codexkit/`.

### Domain docs

[one-line summary of layout -- single-context or multi-context]. See `docs/agents/domain.md`.
```

Write the docs files using the seed templates below.

## Seed Templates

### Beads issue tracker

```markdown
# Issue tracker: Beads

Executable work for this repo lives in Beads under `.beads/`.

## Tools

- `br` manages issues, dependencies, status, and JSONL sync.
- `bv` reads the Beads graph for robot triage, ready work, parallel plans, critical paths, and cycles.

## Conventions

- PRD/feature work starts with a parent feature bead.
- Implementation work is split into child task beads.
- Dependencies are explicit: `br dep add <issue> <depends-on>`.
- `br ready --json` shows unblocked work.
- `bv --robot-plan` and `bv --robot-triage` guide swarm execution.
- TDD notes may be stored in the bead when supported or under `.codexkit/tdd/<bead-id>.md`.

## When a workflow says "publish to the issue tracker"

Create or update Beads with `br`, then run `br sync --flush-only`.

## When a workflow says "fetch the relevant ticket"

Use `br show <id> --json`.

## No external tracker

This repo does not use GitHub or GitLab issues for CodexKit workflows unless the user explicitly adds that integration later.
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

Tell the user setup is complete and that `plan`, `tdd`, `execute`, and `swarm` now read Beads/state/domain docs from these files.
