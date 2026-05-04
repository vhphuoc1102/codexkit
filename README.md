# CodexKit

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> Codex-native starter kit with scaffolded docs, skills, workflows, agents, plugin support, and local skill management.

**[Official Website](https://codexkit.xyz/)** | **[Web Docs](https://codexkit.xyz/#/docs/introduction)** | **[Unikorn](https://unikorn.vn/p/codexkit)**

CodexKit helps you bootstrap a repository that already knows how to work with Codex.

Instead of rebuilding the same operating layer in every project, you get a ready-to-use scaffold with routing docs, a shipped skill catalog, workflow playbooks, focused subagents, Codex config, and update/status commands.

## Quick Install

CodexKit is published to GitHub Packages. Configure npm for the `@vhphuoc1102` scope first:

```bash
npm config set @vhphuoc1102:registry https://npm.pkg.github.com
npm config set //npm.pkg.github.com/:_authToken YOUR_GITHUB_PAT
```

Use a GitHub personal access token with `read:packages` permission for installs.

```bash
npx @vhphuoc1102/codexkit init
```

Or install globally:

```bash
npm install -g @vhphuoc1102/codexkit
codexkit init
```

Initialize into a specific directory:

```bash
npx @vhphuoc1102/codexkit init --path ./my-project
```

## What You Get

- root routing docs: `AGENTS.md`, `ARCHITECTURE.md`, `AGENT_FLOW.md`
- 40+ shipped skills in `.agents/skills`
- 19 workflow playbooks in `.agents/workflows`
- 16 focused subagents in `.codex/agents`
- Impeccable UI/UX skill and workflow for design work
- project-scoped Codex config in `.codex/config.toml`
- optional Codex execution rules in `codex/rules/default.rules`
- managed-file tracking in `.codexkit/manifest.json`

## CLI

Primary commands:

```bash
codexkit init
codexkit install
codexkit install --target plugin
codexkit install --target mcp
codexkit install --target skills
codexkit install --target skills --scope local
codexkit update
codexkit sync --target mcp
codexkit sync --target plugin
codexkit sync --target skills
codexkit sync --target skills --scope local
codexkit list --target skills
codexkit list --target skills --query frontend
codexkit list --target skills --scope local
codexkit list --target plugin
codexkit list --target mcp
codexkit remove --target skills --scope local --skills clean-code,planning
codexkit setup-codex
codexkit sync-codex
codexkit status
```

Common examples:

```bash
codexkit init --path ./my-project
codexkit install --path ./my-project
codexkit install --target plugin
codexkit install --target mcp
codexkit install --target skills

codexkit list --target skills
codexkit list --target skills --query frontend
codexkit list --target skills --scope local
codexkit list --target mcp

codexkit install --target skills --scope local
codexkit install --target skills --scope local --skills clean-code,planning
codexkit sync --target skills --scope local --skills clean-code,planning
codexkit remove --target skills --scope local --skills clean-code,planning

codexkit setup-codex
codexkit sync-codex
```

Legacy aliases still work:

```bash
codexkit install --target project
codexkit sync --target project
codexkit list-skills
codexkit search-skills frontend
codexkit list-installed-skills
codexkit install-skills
codexkit sync-skills
codexkit remove-skills --skills clean-code,planning
```

## GitHub Packages

The package is published to:

```text
https://npm.pkg.github.com
```

If a project should always use CodexKit from GitHub Packages, add this to the project's `.npmrc`:

```text
@vhphuoc1102:registry=https://npm.pkg.github.com
```

Local installs also need GitHub package authentication, either through npm config or an environment-backed `.npmrc` entry:

```text
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

## Codex Integration

CodexKit ships with a local Codex plugin scaffold:

- plugin manifest: `plugins/codexkit/.codex-plugin/plugin.json`
- plugin skill: `plugins/codexkit/skills/codexkit/SKILL.md`
- local marketplace support via `.agents/plugins/marketplace.json`

There are two different installation scopes:

- project-local: `init` or plain `install` installs the scaffold, while `install --target plugin` or `install --target skills` add only those parts into the current repository
- project-local MCP: `install --target mcp` writes the shipped MCP bundle into `.codex/config.toml`
- user-local: the shipped skill catalog is installed into `${CODEX_HOME:-~/.codex}/skills`
- user-local MCP: `install --target mcp --scope local` writes the shipped MCP bundle into `${CODEX_HOME:-~/.codex}/config.toml`

To scaffold a project:

```bash
npx @vhphuoc1102/codexkit init
npx @vhphuoc1102/codexkit install
```

To install only the workspace plugin into the current project:

```bash
npx @vhphuoc1102/codexkit install --target plugin
```

To install only the shipped project skills into the current project:

```bash
npx @vhphuoc1102/codexkit install --target skills
```

To install the shipped MCP bundle into the project or local Codex config:

```bash
npx @vhphuoc1102/codexkit install --target mcp
npx @vhphuoc1102/codexkit install --target mcp --scope local
```

The shipped MCP bundle currently includes:

- `context7` for developer documentation
- a commented `mysql` example via `@benborla29/mcp-server-mysql`; uncomment it only when you want to enable MySQL MCP intentionally

To do the full local setup in one go for the current repository:

```bash
npx @vhphuoc1102/codexkit setup-codex
```

After upgrading CodexKit, sync both the workspace plugin and local shipped skills:

```bash
npx @vhphuoc1102/codexkit sync-codex
```

To install the shipped skills into local Codex:

```bash
npx @vhphuoc1102/codexkit install --target skills --scope local
```

By default, local skills are installed into:

```text
${CODEX_HOME:-~/.codex}/skills
```

To browse or search the shipped catalog:

```bash
npx @vhphuoc1102/codexkit list --target skills
npx @vhphuoc1102/codexkit list --target skills --query frontend
npx @vhphuoc1102/codexkit list --target skills --scope local
```

The bundled plugin can also help map natural requests such as "cài skill frontend" or "liệt kê skills debug" to the right CodexKit commands.

## Codex Rules

CodexKit now ships a minimal execution policy template at `codex/rules/default.rules`.

It is intentionally narrow:

- prompts before dependency installs such as `npm install` or `pnpm install`
- prompts before `git push`
- prompts before CodexKit writes into local Codex with `--scope local`

It does not replace `AGENTS.md`, skills, or workflows. Those files still handle behavior and routing; `codex/rules/default.rules` is only for sandbox approval policy.

## Requirements

- Node.js `>=20`

## Documentation

- [Introduction](https://codexkit.xyz/#/docs/introduction)
- [Installation](https://codexkit.xyz/#/docs/installation)
- [Local Codex Setup](https://codexkit.xyz/#/docs/local-codex-setup)
- [CLI Reference](https://codexkit.xyz/#/docs/commands-and-options)

## License

MIT
