import path from "node:path";
import { pathExists, readText, removePath, writeText } from "./fs.js";
import { sha256 } from "./hash.js";
import { MANIFEST_PATH, readManifest, writeManifest } from "./manifest.js";
import {
  getInstalledShippedSkills,
  getRemovableLocalSkills,
  getSelectedShippedSkills,
  loadSkillTemplates
} from "./skills.js";
import { loadTemplateFiles } from "./templates.js";

const PLUGIN_NAME = "codexkit";
const PLUGIN_TARGET_ROOT = ".agents/plugins/codexkit";
const MARKETPLACE_PATH = ".agents/plugins/marketplace.json";
const LOCAL_SKILLS_TARGET_ROOT = "skills";
const PROJECT_SKILLS_TARGET_ROOT = ".agents/skills";
const PROJECT_SHARED_TARGET_ROOT = ".agents/.shared";

function buildManifest(version, files, features = {}) {
  return {
    version,
    managedAt: new Date().toISOString(),
    features,
    files
  };
}

function normalizePath(filePath) {
  return filePath.split(path.sep).join("/");
}

async function getCurrentHash(filePath) {
  if (!(await pathExists(filePath))) {
    return null;
  }
  return sha256(await readText(filePath));
}

function hasPluginFeature(manifest) {
  return (
    manifest?.features?.installPlugin === true ||
    manifest?.files?.some((file) => file.path.startsWith(`${PLUGIN_TARGET_ROOT}/`)) === true
  );
}

async function loadManagedTemplates({ templateRoot, pluginRoot, includePlugin = false }) {
  const templates = await loadTemplateFiles(templateRoot);
  if (!includePlugin) {
    return templates;
  }

  const pluginTemplates = await loadTemplateFiles(pluginRoot);
  return templates
    .concat(
      pluginTemplates.map((template) => ({
        ...template,
        relativePath: normalizePath(path.join(PLUGIN_TARGET_ROOT, template.relativePath))
      }))
    )
    .sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

async function loadPluginTemplates(pluginRoot) {
  const pluginTemplates = await loadTemplateFiles(pluginRoot);
  return pluginTemplates
    .map((template) => ({
      ...template,
      relativePath: normalizePath(path.join(PLUGIN_TARGET_ROOT, template.relativePath))
    }))
    .sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

async function loadProjectSkillsTemplates(templateRoot) {
  const templates = await loadTemplateFiles(templateRoot);
  return templates
    .filter(
      (template) =>
        normalizePath(template.relativePath).startsWith(`${PROJECT_SKILLS_TARGET_ROOT}/`) ||
        normalizePath(template.relativePath).startsWith(`${PROJECT_SHARED_TARGET_ROOT}/`)
    )
    .sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

function mergeManifestFeatures(existingManifest, featurePatch = {}) {
  return {
    ...(existingManifest?.features || {}),
    ...featurePatch
  };
}

async function writeProjectSubset({
  targetDir,
  templates,
  version,
  existingManifest,
  featurePatch = {},
  replacePaths = [],
  cleanupObsoletePrefixes = [],
  force = false,
  dryRun = false,
  syncMode = false
}) {
  const manifestByPath = new Map((existingManifest?.files || []).map((file) => [file.path, file]));
  const replaceSet = new Set(replacePaths);
  const templatePathSet = new Set(templates.map((template) => normalizePath(template.relativePath)));
  const cleanupPrefixes = cleanupObsoletePrefixes.map((prefix) => normalizePath(prefix));
  const shouldCleanupObsolete = (file) =>
    cleanupPrefixes.some((prefix) => file.path.startsWith(prefix)) && !templatePathSet.has(file.path);
  const nextManifestFiles = (existingManifest?.files || []).filter(
    (file) => !replaceSet.has(file.path) && !shouldCleanupObsolete(file)
  );
  const written = [];
  const skipped = [];
  const deleted = [];
  const obsolete = [];

  for (const template of templates) {
    const relativePath = normalizePath(template.relativePath);
    const destination = path.join(targetDir, template.relativePath);
    const currentHash = await getCurrentHash(destination);
    const previous = manifestByPath.get(relativePath);
    const exists = currentHash !== null;
    const isLocallyModified =
      syncMode &&
      currentHash !== null &&
      previous &&
      previous.installedHash &&
      currentHash !== previous.installedHash;

    if ((exists && !syncMode && !force) || (isLocallyModified && !force)) {
      skipped.push(relativePath);
      nextManifestFiles.push({
        path: relativePath,
        templateHash: template.templateHash,
        installedHash: currentHash || previous?.installedHash || template.templateHash
      });
      continue;
    }

    if (!dryRun) {
      await writeText(destination, template.content);
    }

    written.push(relativePath);
    nextManifestFiles.push({
      path: relativePath,
      templateHash: template.templateHash,
      installedHash: template.templateHash
    });
  }

  for (const previous of existingManifest?.files || []) {
    if (!shouldCleanupObsolete(previous)) {
      continue;
    }

    const destination = path.join(targetDir, previous.path);
    const currentHash = await getCurrentHash(destination);
    if (currentHash === null) {
      obsolete.push(previous.path);
      continue;
    }

    const isLocallyModified =
      previous.installedHash &&
      currentHash !== previous.installedHash;

    if (isLocallyModified && !force) {
      skipped.push(previous.path);
      nextManifestFiles.push(previous);
      continue;
    }

    if (!dryRun) {
      await removePath(destination);
    }

    deleted.push(previous.path);
    obsolete.push(previous.path);
  }

  if (!dryRun) {
    await writeManifest(
      targetDir,
      buildManifest(version, nextManifestFiles, mergeManifestFeatures(existingManifest, featurePatch))
    );
  }

  return { written, skipped, deleted, obsolete };
}

async function ensurePluginMarketplace({ targetDir, dryRun = false }) {
  const marketplacePath = path.join(targetDir, MARKETPLACE_PATH);
  const pluginEntry = {
    name: PLUGIN_NAME,
    source: {
      source: "local",
      path: `./${PLUGIN_TARGET_ROOT}`
    },
    policy: {
      installation: "INSTALLED_BY_DEFAULT",
      authentication: "ON_INSTALL"
    },
    category: "Developer Tools"
  };

  let marketplace = {
    name: "local-plugins",
    interface: {
      displayName: "Local Plugins"
    },
    plugins: []
  };

  if (await pathExists(marketplacePath)) {
    marketplace = JSON.parse(await readText(marketplacePath));
  }

  const plugins = Array.isArray(marketplace.plugins) ? marketplace.plugins : [];
  const existingIndex = plugins.findIndex((plugin) => plugin?.name === PLUGIN_NAME);

  if (existingIndex === -1) {
    plugins.push(pluginEntry);
  } else {
    plugins[existingIndex] = {
      ...plugins[existingIndex],
      ...pluginEntry
    };
  }

  marketplace = {
    name: marketplace.name || "local-plugins",
    interface: {
      displayName: marketplace.interface?.displayName || "Local Plugins"
    },
    ...marketplace,
    plugins
  };

  if (!dryRun) {
    await writeText(marketplacePath, JSON.stringify(marketplace, null, 2) + "\n");
  }
}

export async function installLocalSkills({
  skillsRoot,
  codexHome,
  skills,
  force = false,
  dryRun = false
}) {
  const targetDir = path.join(codexHome, LOCAL_SKILLS_TARGET_ROOT);
  const written = [];
  const skipped = [];

  const selectedSkills = await getSelectedShippedSkills({ skillsRoot, skills });

  for (const skill of selectedSkills) {
    const templates = await loadSkillTemplates(skill);

    for (const template of templates) {
      const destination = path.join(targetDir, template.relativePath);
      const exists = await pathExists(destination);

      if (exists && !force) {
        skipped.push(normalizePath(path.join(LOCAL_SKILLS_TARGET_ROOT, template.relativePath)));
        continue;
      }

      if (!dryRun) {
        await writeText(destination, template.content);
      }

      written.push(normalizePath(path.join(LOCAL_SKILLS_TARGET_ROOT, template.relativePath)));
    }
  }

  return {
    targetDir,
    written,
    skipped
  };
}

export async function syncLocalSkills({
  skillsRoot,
  codexHome,
  skills,
  dryRun = false
}) {
  return installLocalSkills({
    skillsRoot,
    codexHome,
    skills,
    force: true,
    dryRun
  });
}

export async function removeLocalSkills({
  skillsRoot,
  codexHome,
  skills,
  dryRun = false
}) {
  const targetDir = path.join(codexHome, LOCAL_SKILLS_TARGET_ROOT);
  const removed = [];
  const skipped = [];

  const removableSkills = await getRemovableLocalSkills({ skillsRoot, skills });

  for (const skill of removableSkills) {
    const destination = path.join(targetDir, skill.installRelativePath);
    if (!(await pathExists(destination))) {
      skipped.push(normalizePath(path.join(LOCAL_SKILLS_TARGET_ROOT, skill.installRelativePath)));
      continue;
    }

    if (!dryRun) {
      await removePath(destination);
    }

    removed.push(normalizePath(path.join(LOCAL_SKILLS_TARGET_ROOT, skill.installRelativePath)));
  }

  return {
    targetDir,
    removed,
    skipped
  };
}

export async function listInstalledLocalSkills({ skillsRoot, codexHome }) {
  return getInstalledShippedSkills({ skillsRoot, codexHome });
}

export async function initProject({
  targetDir,
  templateRoot,
  pluginRoot,
  version,
  installPlugin = false,
  force = false,
  dryRun = false
}) {
  const templates = await loadManagedTemplates({
    templateRoot,
    pluginRoot,
    includePlugin: installPlugin
  });
  const written = [];
  const skipped = [];
  const manifestFiles = [];

  for (const template of templates) {
    const destination = path.join(targetDir, template.relativePath);
    const exists = await pathExists(destination);

    if (exists && !force) {
      skipped.push(template.relativePath);
      manifestFiles.push({
        path: normalizePath(template.relativePath),
        templateHash: template.templateHash,
        installedHash: await getCurrentHash(destination)
      });
      continue;
    }

    if (!dryRun) {
      await writeText(destination, template.content);
    }

    written.push(template.relativePath);
    manifestFiles.push({
      path: normalizePath(template.relativePath),
      templateHash: template.templateHash,
      installedHash: template.templateHash
    });
  }

  if (!dryRun) {
    await writeManifest(
      targetDir,
      buildManifest(version, manifestFiles, { installPlugin })
    );
  }

  if (installPlugin) {
    await ensurePluginMarketplace({ targetDir, dryRun });
  }

  return { written, skipped, pluginInstalled: installPlugin };
}

export async function installWorkspacePlugin({
  targetDir,
  pluginRoot,
  version,
  force = false,
  dryRun = false
}) {
  const existingManifest = await readManifest(targetDir);
  const templates = await loadPluginTemplates(pluginRoot);
  const replacePaths = templates.map((template) => normalizePath(template.relativePath));
  const result = await writeProjectSubset({
    targetDir,
    templates,
    version,
    existingManifest,
    featurePatch: { installPlugin: true },
    replacePaths,
    force,
    dryRun,
    syncMode: false
  });

  await ensurePluginMarketplace({ targetDir, dryRun });

  return { ...result, pluginInstalled: true };
}

export async function updateProject({
  targetDir,
  templateRoot,
  pluginRoot,
  version,
  installPlugin = false,
  force = false,
  dryRun = false
}) {
  const existingManifest = await readManifest(targetDir);
  if (!existingManifest) {
    throw new Error("No CodexKit manifest found. Run `codexkit init` first.");
  }

  const manifestByPath = new Map(existingManifest.files.map((file) => [file.path, file]));
  const includePlugin = installPlugin || hasPluginFeature(existingManifest);
  const templates = await loadManagedTemplates({
    templateRoot,
    pluginRoot,
    includePlugin
  });
  const templateByPath = new Map(
    templates.map((template) => [normalizePath(template.relativePath), template])
  );
  const written = [];
  const skipped = [];
  const deleted = [];
  const obsolete = [];
  const nextManifestFiles = [];

  for (const template of templates) {
    const relativePath = normalizePath(template.relativePath);
    const destination = path.join(targetDir, template.relativePath);
    const currentHash = await getCurrentHash(destination);
    const previous = manifestByPath.get(relativePath);
    const isLocallyModified =
      currentHash !== null &&
      previous &&
      previous.installedHash &&
      currentHash !== previous.installedHash;

    if (isLocallyModified && !force) {
      skipped.push(relativePath);
      nextManifestFiles.push({
        path: relativePath,
        templateHash: template.templateHash,
        installedHash: previous.installedHash
      });
      continue;
    }

    if (!dryRun) {
      await writeText(destination, template.content);
    }

    written.push(relativePath);
    nextManifestFiles.push({
      path: relativePath,
      templateHash: template.templateHash,
      installedHash: template.templateHash
    });
  }

  for (const previous of existingManifest.files) {
    if (templateByPath.has(previous.path)) {
      continue;
    }

    const destination = path.join(targetDir, previous.path);
    const currentHash = await getCurrentHash(destination);
    if (currentHash === null) {
      obsolete.push(previous.path);
      continue;
    }

    const isLocallyModified =
      previous.installedHash &&
      currentHash !== previous.installedHash;

    if (isLocallyModified && !force) {
      skipped.push(previous.path);
      nextManifestFiles.push(previous);
      continue;
    }

    if (!dryRun) {
      await removePath(destination);
    }
    deleted.push(previous.path);
    obsolete.push(previous.path);
  }

  if (!dryRun) {
    await writeManifest(
      targetDir,
      buildManifest(version, nextManifestFiles, { installPlugin: includePlugin })
    );
  }

  if (includePlugin) {
    await ensurePluginMarketplace({ targetDir, dryRun });
  }

  return { written, skipped, deleted, obsolete, pluginInstalled: includePlugin };
}

export async function syncWorkspacePlugin({
  targetDir,
  pluginRoot,
  version,
  force = false,
  dryRun = false
}) {
  const existingManifest = await readManifest(targetDir);
  const templates = await loadPluginTemplates(pluginRoot);
  const replacePaths = templates.map((template) => normalizePath(template.relativePath));
  const result = await writeProjectSubset({
    targetDir,
    templates,
    version,
    existingManifest,
    featurePatch: { installPlugin: true },
    replacePaths,
    force,
    dryRun,
    syncMode: true
  });

  await ensurePluginMarketplace({ targetDir, dryRun });

  return { ...result, pluginInstalled: true };
}

export async function installProjectSkills({
  targetDir,
  templateRoot,
  version,
  force = false,
  dryRun = false
}) {
  const existingManifest = await readManifest(targetDir);
  const templates = await loadProjectSkillsTemplates(templateRoot);
  const replacePaths = templates.map((template) => normalizePath(template.relativePath));

  return writeProjectSubset({
    targetDir,
    templates,
    version,
    existingManifest,
    replacePaths,
    force,
    dryRun,
    syncMode: false
  });
}

export async function syncProjectSkills({
  targetDir,
  templateRoot,
  version,
  force = false,
  dryRun = false
}) {
  const existingManifest = await readManifest(targetDir);
  const templates = await loadProjectSkillsTemplates(templateRoot);
  const replacePaths = templates.map((template) => normalizePath(template.relativePath));

  return writeProjectSubset({
    targetDir,
    templates,
    version,
    existingManifest,
    replacePaths,
    cleanupObsoletePrefixes: [`${PROJECT_SKILLS_TARGET_ROOT}/`, `${PROJECT_SHARED_TARGET_ROOT}/`],
    force,
    dryRun,
    syncMode: true
  });
}

export async function statusProject({ targetDir, templateRoot, pluginRoot, version }) {
  const manifest = await readManifest(targetDir);
  const templates = await loadManagedTemplates({
    templateRoot,
    pluginRoot,
    includePlugin: hasPluginFeature(manifest)
  });
  const templateByPath = new Map(
    templates.map((template) => [normalizePath(template.relativePath), template])
  );

  if (!manifest) {
    return {
      version,
      managedCount: templates.length,
      pluginInstalled: false,
      missing: templates.map((template) => normalizePath(template.relativePath)),
      modified: [],
      outdated: [],
      obsolete: []
    };
  }

  const missing = [];
  const modified = [];
  const outdated = [];
  const obsolete = [];
  const manifestByPath = new Map(manifest.files.map((file) => [file.path, file]));

  for (const file of manifest.files) {
    const destination = path.join(targetDir, file.path);
    const currentHash = await getCurrentHash(destination);
    const template = templateByPath.get(file.path);
    if (!template) {
      obsolete.push(file.path);
    }
    if (currentHash === null) {
      missing.push(file.path);
      continue;
    }
    if (file.installedHash && currentHash !== file.installedHash) {
      modified.push(file.path);
    }
    if (template && file.templateHash !== template.templateHash) {
      outdated.push(file.path);
    }
  }

  for (const template of templates) {
    const relativePath = normalizePath(template.relativePath);
    if (manifestByPath.has(relativePath)) {
      continue;
    }

    const destination = path.join(targetDir, template.relativePath);
    const currentHash = await getCurrentHash(destination);
    if (currentHash === null) {
      missing.push(relativePath);
    } else if (currentHash !== template.templateHash) {
      modified.push(relativePath);
    }
  }

  return {
    version: manifest.version || version,
    managedCount: manifest.files.length,
    pluginInstalled: hasPluginFeature(manifest),
    missing,
    modified,
    outdated,
    obsolete
  };
}

export async function statusWorkspacePlugin({ targetDir, pluginRoot, version }) {
  const manifest = await readManifest(targetDir);
  const templates = await loadPluginTemplates(pluginRoot);
  const templateByPath = new Map(
    templates.map((template) => [normalizePath(template.relativePath), template])
  );

  if (!manifest || !hasPluginFeature(manifest)) {
    return {
      version: manifest?.version || version,
      managedCount: templates.length,
      pluginInstalled: false,
      missing: templates.map((template) => normalizePath(template.relativePath)),
      modified: [],
      outdated: []
    };
  }

  const pluginFiles = manifest.files.filter((file) =>
    file.path.startsWith(`${PLUGIN_TARGET_ROOT}/`)
  );
  const missing = [];
  const modified = [];
  const outdated = [];

  for (const template of templates) {
    const relativePath = normalizePath(template.relativePath);
    const tracked = pluginFiles.find((file) => file.path === relativePath);
    const destination = path.join(targetDir, relativePath);
    const currentHash = await getCurrentHash(destination);

    if (!tracked || currentHash === null) {
      missing.push(relativePath);
      continue;
    }
    if (tracked.installedHash && currentHash !== tracked.installedHash) {
      modified.push(relativePath);
    }
    if (templateByPath.has(relativePath) && tracked.templateHash !== template.templateHash) {
      outdated.push(relativePath);
    }
  }

  return {
    version: manifest.version || version,
    managedCount: pluginFiles.length,
    pluginInstalled: true,
    missing,
    modified,
    outdated
  };
}

export { MANIFEST_PATH };
