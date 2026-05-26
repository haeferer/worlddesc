import { readFile, readdir } from "node:fs/promises";
import { dirname, posix, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export type ScaffoldTemplateContext = {
  packageName: string;
  displayName: string;
  worlddescVersion: string;
  llmRunnerVersion: string;
};

export type ScaffoldTemplateFile = {
  path: string;
  content: string;
};

const TEMPLATE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../templates/project");

export async function buildScaffoldTemplateFiles(
  context: ScaffoldTemplateContext
): Promise<ScaffoldTemplateFile[]> {
  const templatePaths = await listTemplateFiles(TEMPLATE_ROOT);

  return Promise.all(
    templatePaths.map(async (templatePath) => {
      const template = await readFile(templatePath, "utf8");
      return {
        path: toProjectRelativePath(templatePath),
        content: renderTemplate(template, context)
      };
    })
  );
}

async function listTemplateFiles(rootDir: string): Promise<string[]> {
  const entries = await readdir(rootDir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const entryPath = resolve(rootDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listTemplateFiles(entryPath)));
      continue;
    }

    files.push(entryPath);
  }

  return files.sort((left, right) => left.localeCompare(right, "en"));
}

function toProjectRelativePath(templatePath: string): string {
  return relative(TEMPLATE_ROOT, templatePath).split("\\").join(posix.sep);
}

function renderTemplate(template: string, context: ScaffoldTemplateContext): string {
  return template
    .replaceAll("__PACKAGE_NAME__", context.packageName)
    .replaceAll("__DISPLAY_NAME__", context.displayName)
    .replaceAll("__WORLDDESC_VERSION__", context.worlddescVersion)
    .replaceAll("__LLM_RUNNER_VERSION__", context.llmRunnerVersion)
    .replaceAll("__GUIDE_ID__", toGuideId(context.packageName))
    .replaceAll("__MIX_ID__", toMixId(context.packageName));
}

function toGuideId(packageName: string): string {
  return `${packageName.replace(/[^a-zA-Z0-9]+/g, "")}Guide`;
}

function toMixId(packageName: string): string {
  return `${packageName.replace(/[^a-zA-Z0-9]+/g, "")}Mix`;
}
