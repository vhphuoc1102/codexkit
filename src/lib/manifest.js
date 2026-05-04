import path from "node:path";
import { pathExists, readText, writeText } from "./fs.js";

export const MANIFEST_PATH = ".codexkit/manifest.json";

export async function readManifest(targetDir) {
  const manifestPath = path.join(targetDir, MANIFEST_PATH);
  if (!(await pathExists(manifestPath))) {
    return null;
  }
  return JSON.parse(await readText(manifestPath));
}

export async function writeManifest(targetDir, manifest) {
  const manifestPath = path.join(targetDir, MANIFEST_PATH);
  await writeText(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
}
