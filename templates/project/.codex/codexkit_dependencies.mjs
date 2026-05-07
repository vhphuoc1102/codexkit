import fs from "node:fs";
import path from "node:path";

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

function parseScalar(value) {
  const trimmed = String(value || "").trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function formatSkillName(skillName) {
  if (!skillName) return skillName;
  return skillName.includes(":") ? skillName : `codexkit:${skillName}`;
}

function parseSkillFile(skillFilePath) {
  const source = fs.readFileSync(skillFilePath, "utf8");
  const frontmatterMatch = source.match(FRONTMATTER_PATTERN);
  const fallbackName = path.basename(path.dirname(skillFilePath));
  if (!frontmatterMatch) {
    return {
      skill_name: formatSkillName(fallbackName),
      skill_file: skillFilePath,
      dependencies: [],
      dependencies_declared: false,
    };
  }

  const frontmatter = frontmatterMatch[1];
  const nameMatch = frontmatter.match(/^name:\s*(.+)$/m);
  const skillName = formatSkillName(nameMatch ? parseScalar(nameMatch[1]) : fallbackName);
  const dependencies = [];
  let inMetadata = false;
  let inDependencies = false;
  let current = null;
  let dependenciesDeclared = false;

  for (const line of frontmatter.split(/\r?\n/)) {
    if (!inMetadata) {
      if (/^metadata:\s*$/.test(line)) inMetadata = true;
      continue;
    }
    if (!line.trim()) continue;
    if (/^[^\s]/.test(line)) break;

    const metadataField = line.match(/^\s{2}([A-Za-z0-9_-]+):\s*(.*)$/);
    if (metadataField) {
      const [, key, rawValue] = metadataField;
      if (key === "dependencies") {
        dependenciesDeclared = true;
        inDependencies = true;
        current = null;
        if (rawValue.trim()) inDependencies = false;
        continue;
      }
      if (inDependencies) {
        inDependencies = false;
        current = null;
      }
      continue;
    }

    if (!inDependencies) continue;

    const mapEntry = line.match(/^\s{4}([A-Za-z0-9_-]+):\s*$/);
    if (mapEntry) {
      current = { id: parseScalar(mapEntry[1]) };
      dependencies.push(current);
      continue;
    }

    const listEntry = line.match(/^\s{4}-\s+id:\s*(.+)$/);
    if (listEntry) {
      current = { id: parseScalar(listEntry[1]) };
      dependencies.push(current);
      continue;
    }

    if (!current) continue;
    const field = line.match(/^\s{6}([A-Za-z0-9_-]+):\s*(.*)$/);
    if (field) {
      const [, key, rawValue] = field;
      current[key] = parseScalar(rawValue);
    }
  }

  return {
    skill_name: skillName,
    skill_file: skillFilePath,
    dependencies,
    dependencies_declared: dependenciesDeclared,
  };
}

function listSkillFiles(skillsRoot) {
  if (!fs.existsSync(skillsRoot)) return [];
  return fs
    .readdirSync(skillsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(skillsRoot, entry.name, "SKILL.md"))
    .filter((filePath) => fs.existsSync(filePath));
}

function canExecute(filePath) {
  try {
    fs.accessSync(filePath, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function defaultCommandProbe(command, envPath = process.env.PATH || "") {
  const names = process.platform === "win32" ? [command, `${command}.cmd`, `${command}.exe`] : [command];
  for (const segment of envPath.split(path.delimiter).filter(Boolean)) {
    for (const name of names) {
      const candidate = path.join(segment, name);
      if (fs.existsSync(candidate) && canExecute(candidate)) {
        return { available: true, detail: candidate };
      }
    }
  }
  return { available: false, detail: `Missing from PATH for command '${command}'` };
}

function probeDependency(dependency, commandProbe) {
  if (dependency.kind === "command") {
    const command = dependency.command || dependency.id;
    const result = commandProbe(command);
    return {
      id: dependency.id,
      kind: "command",
      target: command,
      available: result.available,
      detail: result.detail,
      missing_effect: dependency.missing_effect || "degraded",
      reason: dependency.reason || "",
    };
  }
  return {
    id: dependency.id,
    kind: dependency.kind || "unknown",
    target: dependency.target || dependency.id,
    available: true,
    detail: "Dependency kind is informational.",
    missing_effect: dependency.missing_effect || "degraded",
    reason: dependency.reason || "",
  };
}

export function buildCodexKitDependencyReport(options = {}) {
  const repoRoot = path.resolve(options.repoRoot || process.cwd());
  const skillsRoot = options.skillsRoot || path.join(repoRoot, ".agents", "skills");
  const commandProbe = options.commandProbe || defaultCommandProbe;
  const declarations = listSkillFiles(skillsRoot).map(parseSkillFile);
  const skills = declarations.map((declaration) => {
    const probed_dependencies = declaration.dependencies.map((dependency) =>
      probeDependency(dependency, commandProbe),
    );
    const missing_dependencies = probed_dependencies.filter((dependency) => !dependency.available);
    return {
      ...declaration,
      probed_dependencies,
      missing_dependencies,
      status:
        missing_dependencies.length === 0
          ? "available"
          : missing_dependencies.some((dependency) => dependency.missing_effect === "unavailable")
            ? "unavailable"
            : "degraded",
    };
  });
  const missingDependencies = skills.flatMap((skill) =>
    skill.missing_dependencies.map((dependency) => ({
      ...dependency,
      affected_skill: skill.skill_name,
    })),
  );

  return {
    checked_at: new Date().toISOString(),
    skills_root: skillsRoot,
    summary: {
      skills_total: skills.length,
      skills_with_declared_dependencies: skills.filter((skill) => skill.dependencies_declared).length,
      declared_dependencies: skills.reduce((sum, skill) => sum + skill.dependencies.length, 0),
      missing_dependencies: missingDependencies.length,
      skills_available: skills.filter((skill) => skill.status === "available").length,
      skills_degraded: skills.filter((skill) => skill.status === "degraded").length,
      skills_unavailable: skills.filter((skill) => skill.status === "unavailable").length,
    },
    skills,
    missing_dependencies: missingDependencies,
  };
}
