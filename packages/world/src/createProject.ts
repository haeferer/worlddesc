import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { buildScaffoldTemplateFiles } from "./scaffoldTemplates.js";

export type CreateProjectOptions = {
  targetDir: string;
};

export type CreatedProjectResult = {
  targetDir: string;
  packageName: string;
  displayName: string;
  createdFiles: string[];
};

export async function createProjectScaffold(options: CreateProjectOptions): Promise<CreatedProjectResult> {
  const targetDir = resolve(options.targetDir);
  const displayName = toDisplayName(basename(targetDir));
  const packageName = toPackageName(basename(targetDir));
  const versions = await resolveScaffoldPackageVersions();

  await ensureTargetDirectoryIsWritable(targetDir);

  const files = buildScaffoldTemplateFiles({
    packageName,
    displayName,
    worlddescVersion: versions.worldVersion,
    llmRunnerVersion: versions.llmRunnerVersion
  });

  const createdFiles: string[] = [];

  for (const file of files) {
    const filePath = resolve(targetDir, file.path);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, file.content, "utf8");
    createdFiles.push(file.path);
  }

  return {
    targetDir,
    packageName,
    displayName,
    createdFiles
  };
}

async function ensureTargetDirectoryIsWritable(targetDir: string): Promise<void> {
  await mkdir(targetDir, { recursive: true });
  const entries = await readdir(targetDir);

  if (entries.length > 0) {
    throw new Error(`Target directory "${targetDir}" is not empty`);
  }
}

async function resolveScaffoldPackageVersions(): Promise<{
  worldVersion: string;
  llmRunnerVersion: string;
}> {
  const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const ownPackageJsonPath = resolve(packageDir, "package.json");
  const ownPackageJson = JSON.parse(await readFile(ownPackageJsonPath, "utf8")) as {
    version?: string;
  };
  const version = ownPackageJson.version ?? "0.1.0";

  return {
    worldVersion: version,
    llmRunnerVersion: version
  };
}

function toPackageName(dirName: string): string {
  const normalized = dirName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "worlddesc-project";
}

function toDisplayName(dirName: string): string {
  const cleaned = dirName
    .trim()
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) {
    return "Neue Welt";
  }

  return cleaned.replace(/\b\w/g, (match) => match.toUpperCase());
}
