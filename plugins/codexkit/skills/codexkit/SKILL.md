---
name: codexkit
description: Use the CodexKit CLI to initialize, update, or inspect a Codex-ready project scaffold in the current workspace.
---

# CodexKit

Use this skill when the user wants to bootstrap or maintain the CodexKit scaffold, or when they want to use the local CodexKit workflows that are already present in the current repository.

## Commands

- `npx @vhphuoc1102/codexkit init` or `npx @vhphuoc1102/codexkit install` to initialize the scaffold in the current repository.
- `npx @vhphuoc1102/codexkit update` to refresh managed files from the shipped template.
- `npx @vhphuoc1102/codexkit install --target plugin` to install only the workspace plugin into the current project.
- `npx @vhphuoc1102/codexkit install --target mcp` to install the shipped MCP bundle into the current project's `.codex/config.toml`.
- `npx @vhphuoc1102/codexkit install --target skills` to install only the shipped project skill bundle into the current project.
- `npx @vhphuoc1102/codexkit install --target mcp --scope local` to install the shipped MCP bundle into `${CODEX_HOME:-~/.codex}/config.toml`.
- `npx @vhphuoc1102/codexkit sync --target plugin` to sync the workspace plugin in a scaffolded project.
- `npx @vhphuoc1102/codexkit sync --target mcp` to sync the shipped MCP bundle in the current project config.
- `npx @vhphuoc1102/codexkit sync --target skills` to sync the shipped project skill bundle in the current project.
- `npx @vhphuoc1102/codexkit setup-codex` to scaffold the plugin into the workspace and install shipped skills locally.
- `npx @vhphuoc1102/codexkit sync-codex` to sync the workspace plugin and local shipped skills after upgrading CodexKit.
- `npx @vhphuoc1102/codexkit list --target skills` to list all shipped skills grouped by category.
- `npx @vhphuoc1102/codexkit list --target skills --query frontend` to search shipped skills by query.
- `npx @vhphuoc1102/codexkit list --target skills --scope local` to show which shipped skills are already installed in local Codex.
- `npx @vhphuoc1102/codexkit status` to inspect managed-file state.
- `npx @vhphuoc1102/codexkit install --target skills --scope local` to copy the shipped CodexKit skills into local Codex.
- `npx @vhphuoc1102/codexkit sync --target skills --scope local` to overwrite local Codex skills with the shipped CodexKit version.
- `npx @vhphuoc1102/codexkit remove --target skills --scope local --skills clean-code,planning` to remove specific CodexKit skills from local Codex.

## Rules

- Run commands from the repository root unless the user gives a different target path.
- Use `npx @vhphuoc1102/codexkit ...` so the plugin works as a standalone published package.
- Before `update`, inspect current status so local modifications to managed files are visible.
- Prefer the new `install` / `sync` / `list` command family in suggestions, but continue to recognize legacy aliases.
- Treat workflows as local project resources, not as CLI commands.
- If the repository already contains `.agents/workflows/`, prefer following those workflow files directly instead of searching npm or package cache.
- Normalize common workflow aliases before acting:
  - `impeccable`, `design`, `ui`, `ux`, `frontend design` -> `impeccable`
  - `screen spec`, `screen architecture`, `screen flow`, `business logic to screens`, `prd to screens` -> `screen-spec`
  - `setup skill`, `setup agent context`, `setup issue tracker` -> `setup-agent-context`
  - `grill`, `grill me`, `grill-with-docs` -> `grill-with-docs`
  - `to-prd`, `create PRD`, `turn this into PRD` -> `plan`
  - `to-issues`, `turn plan into issues`, `create issues`, `create beads`, `turn plan into beads` -> `plan`
  - `tdd`, `test-first`, `tdd bead` -> `tdd`
  - `create`, `execute`, `execute bead`, `run bead`, `work on br-` -> `execute`
  - `orchestrate`, `swarm`, `swarm beads`, `multi agent` -> `swarm`
  - `review workflow` -> `review`
  - `ship workflow` -> `ship`
- If the user asks to use a workflow from CodexKit and the repository is not scaffolded yet, explain that the workflow lives in the project scaffold and suggest `npx @vhphuoc1102/codexkit init` or `npx @vhphuoc1102/codexkit install`.

## Intent Mapping

- If the user asks to list available skills, run `npx @vhphuoc1102/codexkit list --target skills`.
- If the user asks to search skills by topic, run `npx @vhphuoc1102/codexkit list --target skills --query <query>`.
- If the user asks to install the project skill bundle into the current repository, run `npx @vhphuoc1102/codexkit install --target skills`.
- If the user asks to add the shipped MCP bundle into the current repository config, run `npx @vhphuoc1102/codexkit install --target mcp`.
- If the user asks to add the shipped MCP bundle into local Codex config, run `npx @vhphuoc1102/codexkit install --target mcp --scope local`.
- If the user asks to install a skill by name into local Codex, run `npx @vhphuoc1102/codexkit install --target skills --scope local --skills <name>`.
- If the user asks to install a skill by topic such as `frontend`, `debug`, or `seo`, search first, then either:
  - show matching skills with install commands, or
  - install the exact skill only if the request clearly names one skill.
- If the user asks to list installed local skills, run `npx @vhphuoc1102/codexkit list --target skills --scope local`.
- If the user asks to update both the workspace plugin and local skills, run `npx @vhphuoc1102/codexkit sync-codex`.
- If the user asks for initial full setup in the current repository, run `npx @vhphuoc1102/codexkit setup-codex`.
- If the user asks to use a CodexKit workflow in the current repository, first check whether `.agents/workflows/<name>.md` exists in the workspace and then follow that workflow locally.
- If the user asks for a workflow by an alias such as `prd to screens`, map it to the canonical file name `screen-spec`.
- If the repository has CodexKit scaffolding and the workflow file exists, do not search npm, package cache, or remote docs first.
- If the workflow file does not exist, explain that the repository is missing the scaffolded workflow and then suggest the smallest relevant scaffold command.

## Natural Language Examples

- `liệt kê skills debug` -> `npx @vhphuoc1102/codexkit list --target skills --query debug`
- `cài skill frontend-design` -> `npx @vhphuoc1102/codexkit install --target skills --scope local --skills frontend-design`
- `cài skill frontend` -> search first, then suggest exact matches such as `frontend-design`, `nextjs-react-expert`, or `tailwind-patterns`
- `xem local codex đã cài skill gì` -> `npx @vhphuoc1102/codexkit list --target skills --scope local`
- `đồng bộ lại plugin và skills` -> `npx @vhphuoc1102/codexkit sync-codex`
- `dùng workflow impeccable của CodexKit` -> resolve to `.agents/workflows/impeccable.md` in the current repository and follow that workflow
- `prd to screens` -> resolve to `.agents/workflows/screen-spec.md` in the current repository and follow that workflow
- `business logic to screens` -> resolve to `.agents/workflows/screen-spec.md` in the current repository and follow that workflow
- `grill kế hoạch này` -> resolve to `.agents/workflows/grill-with-docs.md` in the current repository and follow that workflow
- `setup issue tracker cho repo này` -> resolve to `.agents/workflows/setup-agent-context.md` in the current repository and follow that workflow
- `turn this plan into issues` -> resolve to `.agents/workflows/plan.md` in the current repository and use the issue breakdown branch
- `turn this plan into beads` -> resolve to `.agents/workflows/plan.md` in the current repository and publish Beads
- `tdd br-123` -> resolve to `.agents/workflows/tdd.md` in the current repository
- `execute br-123` -> resolve to `.agents/workflows/execute.md` in the current repository
- `run bead br-123` -> resolve to `.agents/workflows/execute.md` in the current repository
- `swarm ready beads` -> resolve to `.agents/workflows/swarm.md` in the current repository
- `create PRD from this context` -> resolve to `.agents/workflows/plan.md` in the current repository and use the PRD branch
- `use the plan workflow from CodexKit` -> resolve to `.agents/workflows/plan.md` in the current repository and follow it directly
- `follow the review workflow in this repo` -> use `.agents/workflows/review.md` from the workspace, not the npm package
- The shipped MCP bundle currently includes `context7` and a commented `mysql` example using `@benborla29/mcp-server-mysql`.

## Output

- If you used the CLI, explain which command you ran.
- If you used a local workflow, name the workflow file you followed.
- Summarize which managed files were created, updated, or already up to date when the task involved scaffold changes.
