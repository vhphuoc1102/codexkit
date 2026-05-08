import path from "node:path";
import { pathExists, readText } from "./fs.js";
import { loadTemplateFiles } from "./templates.js";

export const SKILL_CATEGORIES = [
  "Planning & Routing",
  "Backend & Platform",
  "Frontend & UI",
  "Debugging & Review",
  "Testing & Validation",
  "Docs, Delivery & Operations",
  "Security, Performance & Discoverability",
  "Shell & Environment"
];

const SKILL_DEFINITIONS = [
  ["app-builder", "Planning & Routing", "New app scaffolding, stack selection, and project setup."],
  ["architecture", "Planning & Routing", "Requirements, tradeoffs, ADRs, and system design decisions."],
  ["behavioral-modes", "Planning & Routing", "Explicit working modes such as brainstorm, implement, debug, or review."],
  ["brainstorming", "Planning & Routing", "Clarify scope and generate options before implementation."],
  ["intelligent-routing", "Planning & Routing", "Choose the best specialist skills or subagents for a task."],
  ["plan-writing", "Planning & Routing", "Written implementation plans, breakdowns, and checklists."],
  ["planning", "Planning & Routing", "Execution-ready planning with scope, risks, and acceptance criteria."],
  ["repo-onboarding", "Planning & Routing", "Fast map of an unfamiliar repository before making changes."],
  ["clean-code", "Backend & Platform", "Pragmatic coding standards and scoped implementation quality."],
  ["api-patterns", "Backend & Platform", "API design, response shapes, versioning, and protocol choices."],
  ["database-design", "Backend & Platform", "Schema design, migrations, indexes, and query strategy."],
  ["nodejs-best-practices", "Backend & Platform", "Node.js architecture, async patterns, and backend decision-making."],
  ["python-patterns", "Backend & Platform", "Python project structure, async choices, and framework direction."],
  ["rust-pro", "Backend & Platform", "Modern Rust systems work, async design, and performance."],
  ["mcp-builder", "Backend & Platform", "Design principles for building MCP servers, tools, and resources."],
  ["mobile-design", "Frontend & UI", "Touch-first UX, mobile patterns, and platform conventions."],
  ["nextjs-react-expert", "Frontend & UI", "React or Next.js architecture, rendering, and performance."],
  ["tailwind-patterns", "Frontend & UI", "Tailwind CSS v4 patterns, tokens, and utility architecture."],
  ["impeccable", "Frontend & UI", "Primary frontend UI/UX workflow for design, critique, audit, polish, and visual craft."],
  ["i18n-localization", "Frontend & UI", "Translations, locale files, RTL support, and hardcoded string checks."],
  ["game-development", "Frontend & UI", "Game-project routing and platform-specific game skill selection."],
  ["bug-hunt", "Debugging & Review", "Disciplined reproduction, scoping, and root-cause isolation."],
  ["debugging", "Debugging & Review", "Evidence-based debugging before changing code."],
  ["systematic-debugging", "Debugging & Review", "Structured debugging with explicit hypotheses and proof."],
  ["code-review", "Debugging & Review", "Patch and branch review for correctness and regressions."],
  ["code-review-checklist", "Debugging & Review", "Supplemental prompts and checks during code review."],
  ["high-signal-review", "Debugging & Review", "Findings-first review output focused on real risk."],
  ["lint-and-validate", "Testing & Validation", "Linting, type checks, formatting, and static validation."],
  ["tdd-workflow", "Testing & Validation", "RED-GREEN-REFACTOR test-driven development cycle."],
  ["test-hardening", "Testing & Validation", "Strengthen weak or flaky tests around critical behavior."],
  ["testing-patterns", "Testing & Validation", "Unit, integration, and mocking strategies."],
  ["webapp-testing", "Testing & Validation", "Browser testing, deep audits, and Playwright-style checks."],
  ["release-readiness", "Testing & Validation", "Higher-confidence validation for rollout and operational risk."],
  ["doc", "Docs, Delivery & Operations", "Work with .docx documents where formatting fidelity matters."],
  ["docs-shipper", "Docs, Delivery & Operations", "Ship docs that match real product behavior and commands."],
  ["documentation-templates", "Docs, Delivery & Operations", "README, API, and technical documentation structure guidance."],
  ["deployment-procedures", "Docs, Delivery & Operations", "Safe deployment principles, verification, and rollback thinking."],
  ["server-management", "Docs, Delivery & Operations", "Operational process management, monitoring, and scaling decisions."],
  ["mcp-onboarding", "Docs, Delivery & Operations", "Evaluate, adopt, and roll out MCP servers safely."],
  ["vulnerability-scanner", "Security, Performance & Discoverability", "OWASP-aware vulnerability analysis and attack-surface review."],
  ["red-team-tactics", "Security, Performance & Discoverability", "Authorized adversary-emulation and defensive reporting patterns."],
  ["performance-profiling", "Security, Performance & Discoverability", "Measure-first profiling and performance optimization guidance."],
  ["seo-fundamentals", "Security, Performance & Discoverability", "Search visibility, E-E-A-T, and Core Web Vitals basics."],
  ["geo-fundamentals", "Security, Performance & Discoverability", "Optimization for AI search and citation engines."],
  ["bash-linux", "Shell & Environment", "Bash and Linux command patterns for macOS or Linux."],
  ["powershell-windows", "Shell & Environment", "PowerShell patterns, pitfalls, and Windows shell syntax."]
];

const SKILL_MAP = new Map(
  SKILL_DEFINITIONS.map(([name, category, summary]) => [name, { name, category, summary }])
);

const DEPRECATED_LOCAL_SKILLS = [
  {
    name: "frontend-design",
    category: "Frontend & UI",
    summary: "Deprecated local skill removal target; superseded by impeccable.",
    installRelativePath: "frontend-design",
    kind: "directory"
  },
  {
    name: "web-design-guidelines",
    category: "Frontend & UI",
    summary: "Deprecated local skill removal target; superseded by impeccable audit and critique.",
    installRelativePath: "web-design-guidelines",
    kind: "directory"
  }
];

function sourceEntryForSkill(skillsRoot, name) {
  return name === "doc" ? path.join(skillsRoot, "doc.md") : path.join(skillsRoot, name);
}

function installRelativePathForSkill(name) {
  return name === "doc" ? "doc.md" : name;
}

function normalizeSkillName(value) {
  return value.trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "").split("/")[0];
}

function buildSkillKeywords(skill) {
  return [
    skill.name,
    skill.summary,
    skill.category,
    ...skill.name.split("-"),
    ...skill.category.toLowerCase().split(/[^a-z0-9]+/i).filter(Boolean)
  ].join(" ").toLowerCase();
}

async function readFrontmatterDescription(filePath) {
  if (!(await pathExists(filePath))) {
    return null;
  }

  const content = await readText(filePath);
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) {
    return null;
  }

  const lines = match[1].split("\n");
  let collectingDescription = false;
  const collected = [];

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (/^[A-Za-z0-9_-]+:/.test(line) && !line.startsWith("description:")) {
      collectingDescription = false;
    }

    if (line.startsWith("description:")) {
      collectingDescription = true;
      collected.push(line.slice("description:".length).trim());
      continue;
    }

    if (collectingDescription && /^\s+/.test(rawLine)) {
      collected.push(line.trim());
    }
  }

  const description = collected.join(" ").replace(/\s+/g, " ").trim();
  return description || null;
}

export function normalizeSkillSelection(skills) {
  if (!skills || skills.length === 0) {
    return null;
  }

  return new Set(skills.map(normalizeSkillName).filter(Boolean));
}

export async function getShippedSkills(skillsRoot) {
  const skills = [];

  for (const category of SKILL_CATEGORIES) {
    for (const definition of SKILL_DEFINITIONS.filter((item) => item[1] === category)) {
      const [name] = definition;
      const metadata = SKILL_MAP.get(name);
      const sourcePath = sourceEntryForSkill(skillsRoot, name);
      const descriptionSource =
        name === "doc" ? sourcePath : path.join(sourcePath, "SKILL.md");
      const description = (await readFrontmatterDescription(descriptionSource)) || metadata.summary;

      skills.push({
        name,
        category: metadata.category,
        summary: metadata.summary,
        description,
        keywords: buildSkillKeywords(metadata),
        sourcePath,
        installRelativePath: installRelativePathForSkill(name),
        kind: name === "doc" ? "file" : "directory"
      });
    }
  }

  return skills;
}

export function groupSkillsByCategory(skills) {
  return SKILL_CATEGORIES.map((category) => ({
    category,
    skills: skills.filter((skill) => skill.category === category)
  })).filter((group) => group.skills.length > 0);
}

export async function getSelectedShippedSkills({ skillsRoot, skills }) {
  const catalog = await getShippedSkills(skillsRoot);
  const selected = normalizeSkillSelection(skills);
  if (!selected) {
    return catalog;
  }

  return catalog.filter((skill) => selected.has(skill.name));
}

export async function getRemovableLocalSkills({ skillsRoot, skills }) {
  const selected = normalizeSkillSelection(skills);
  if (!selected) {
    return getShippedSkills(skillsRoot);
  }

  const activeSkills = await getSelectedShippedSkills({ skillsRoot, skills });
  const activeNames = new Set(activeSkills.map((skill) => skill.name));
  const deprecatedSkills = DEPRECATED_LOCAL_SKILLS.filter(
    (skill) => selected.has(skill.name) && !activeNames.has(skill.name)
  );

  return activeSkills.concat(deprecatedSkills);
}

export async function loadSkillTemplates(skill) {
  if (skill.kind === "file") {
    return [
      {
        relativePath: path.basename(skill.installRelativePath),
        content: await readText(skill.sourcePath)
      }
    ];
  }

  const templates = await loadTemplateFiles(skill.sourcePath);
  return templates.map((template) => ({
    relativePath: path.join(skill.installRelativePath, template.relativePath),
    content: template.content
  }));
}

export async function searchShippedSkills({ skillsRoot, query }) {
  const needle = query.trim().toLowerCase();
  const catalog = await getShippedSkills(skillsRoot);
  if (!needle) {
    return [];
  }

  return catalog.filter((skill) => skill.keywords.includes(needle));
}

export async function getInstalledShippedSkills({ skillsRoot, codexHome }) {
  const targetRoot = path.join(codexHome, "skills");
  const catalog = await getShippedSkills(skillsRoot);
  const installed = [];
  const missing = [];

  for (const skill of catalog) {
    const installPath = path.join(targetRoot, skill.installRelativePath);
    const exists =
      skill.kind === "file"
        ? await pathExists(installPath)
        : await pathExists(path.join(installPath, "SKILL.md"));

    if (exists) {
      installed.push(skill);
    } else {
      missing.push(skill);
    }
  }

  return { targetRoot, installed, missing };
}
