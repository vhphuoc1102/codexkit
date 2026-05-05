# CodexKit Architecture

This document describes the project-level structure installed by CodexKit and how the main pieces work together.

## Overview

The scaffold is built around five layers:

- `AGENTS.md` as the routing and operating contract
- `.agents/skills/` for reusable capability modules
- `.agents/workflows/` for task playbooks
- `.codex/agents/` for focused subagents
- `.codexkit/` for lightweight Beads execution state, file reservations, and handoff files

Skills provide knowledge, workflows provide process, subagents provide bounded execution roles, and `.codexkit/` stores local coordination state.

## Directory Structure

```text
.
├── AGENTS.md
├── ARCHITECTURE.md
├── AGENT_FLOW.md
├── .agents/
│   ├── skills/
│   ├── .shared/
│   └── workflows/
│       ├── brainstorm.md
│       ├── check.md
│       ├── debug.md
│       ├── deploy.md
│       ├── enhance.md
│       ├── execute.md
│       ├── figma-to-code.md
│       ├── grill-with-docs.md
│       ├── impeccable.md
│       ├── plan.md
│       ├── preview.md
│       ├── review.md
│       ├── screen-spec.md
│       ├── setup-agent-context.md
│       ├── ship.md
│       ├── status.md
│       ├── swarm.md
│       ├── test.md
│       ├── tdd.md
│       └── verify.md
├── .codex/
│   ├── config.toml
│   └── agents/
└── .codexkit/
    ├── manifest.json
    ├── state.json
    ├── reservations.json
    ├── HANDOFF.json
    └── scripts/
```

## Responsibilities

### AGENTS.md

`AGENTS.md` is the main control document. It defines request classification, workflow routing, subagent routing, validation expectations, and approval boundaries for risky execution.

### Skills

Skills live in `.agents/skills/<name>/SKILL.md`.

Each skill should stay narrow and reusable. A skill may include `agents/openai.yaml`, task-specific companion files such as `verify.md`, `references/`, `scripts/`, and assets. Skills are knowledge modules; they should not act like hidden automation.

Impeccable is intentionally shipped as a skill at `.agents/skills/impeccable/`, not as a shared package. Its upstream attribution and Apache 2.0 license notes live in `.agents/skills/impeccable/NOTICE.md`.

### Workflows

Workflows live in `.agents/workflows/*.md`.

The Beads execution path is:

```text
plan -> tdd -> execute
              \-> swarm
```

- `plan.md` creates the PRD and Beads issue graph.
- `tdd.md` prepares test-first specs for a bead.
- `execute.md` implements one bead or a small direct task.
- `swarm.md` coordinates multiple ready beads or generic sidecar subagents.

Other workflows cover brainstorming, setup, debugging, review, validation, preview, deployment, UI/UX work, and release handoff.

### CodexKit State

Lightweight execution state lives in `.codexkit/`.

- `state.json` tracks the active workflow, beads, workers, and simple approvals.
- `reservations.json` tracks local file/path reservations so subagents do not edit overlapping scopes.
- `HANDOFF.json` records pause/resume context for long `execute` or `swarm` sessions.
- `scripts/` contains the state/status/reservation helpers used by workflows.

This state layer intentionally does not port Khuym's full onboarding or phase-gate methodology.

### Subagents

Subagents live in `.codex/agents/*.toml`.

Each subagent should own a bounded role such as `planner`, `explorer`, `implementer`, `debugger`, `reviewer`, `docs_researcher`, `test_writer`, or a domain-specific specialist. Subagents should be specialized enough that routing is predictable.

### MCP Configuration

Project-scoped MCP server definitions live in `.codex/config.toml` under `[mcp_servers]`.

Use this layer for external tool servers and remote context providers. Keep checked-in defaults conservative: include examples and disabled templates, but avoid environment-specific secrets.

### Manifest

`.codexkit/manifest.json` tracks kit-managed files. It enables `status` to report missing, modified, and outdated managed files, and `update` to refresh safe targets while preserving local customizations unless overwrite is explicitly requested.

## Design Principles

- Keep responsibilities separate: knowledge, process, execution, and coordination state should not be mixed casually.
- Prefer a small core that teams can extend.
- Make risky behavior explicit and approval-gated.
- Use Beads for executable work graphs when available, but keep generic workflows usable without Beads.

## Extension Model

Projects can extend the starter by adding skills, workflows, subagents, MCP servers, or `.codexkit/` helper scripts. The expected pattern is additive extension, not replacement of the core contract.
