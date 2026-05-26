import { readdir, readFile } from "node:fs/promises";
import { basename, extname, relative, resolve } from "node:path";

import type { WorldDocument } from "./types.js";
import type { LoadedKnowledgeProviderResult, PlayerKnowledgeEntryView, PlayerKnowledgeProvider } from "./knowledgeTypes.js";
import { KnowledgeValidationError } from "./knowledgeTypes.js";

export async function loadKnowledgeProviderFromDirectory(
  rootPath: string,
  world: WorldDocument
): Promise<LoadedKnowledgeProviderResult> {
  const objectEntries = await loadScopedMarkdownEntries(resolve(rootPath, "objects"));
  const roomEntries = await loadScopedMarkdownEntries(resolve(rootPath, "rooms"));
  const warnings: string[] = [];

  for (const objectId of Object.keys(objectEntries)) {
    if (!world.objects[objectId]) {
      throw new KnowledgeValidationError(`Knowledge file targets unknown objectId "${objectId}"`);
    }
  }

  for (const roomId of Object.keys(roomEntries)) {
    if (!world.rooms[roomId]) {
      throw new KnowledgeValidationError(`Knowledge file targets unknown roomId "${roomId}"`);
    }
  }

  for (const [targetId, entry] of Object.entries(objectEntries)) {
    if (entry.markdown.trim().length === 0) {
      warnings.push(`Object knowledge "${targetId}" is empty: ${entry.sourcePath ?? "unknown source"}`);
    }
  }

  for (const [targetId, entry] of Object.entries(roomEntries)) {
    if (entry.markdown.trim().length === 0) {
      warnings.push(`Room knowledge "${targetId}" is empty: ${entry.sourcePath ?? "unknown source"}`);
    }
  }

  const provider: PlayerKnowledgeProvider = {
    getObjectKnowledge(request) {
      const entry = objectEntries[request.objectId];
      return entry ? structuredClone(entry) : null;
    },
    getRoomKnowledge(request) {
      const entry = roomEntries[request.roomId];
      return entry ? structuredClone(entry) : null;
    }
  };

  return {
    provider,
    warnings
  };
}

async function loadScopedMarkdownEntries(
  directoryPath: string
): Promise<Record<string, PlayerKnowledgeEntryView>> {
  let files: string[];
  try {
    files = await readdir(directoryPath, {
      withFileTypes: false
    });
  } catch (error) {
    if (isMissingDirectoryError(error)) {
      return {};
    }

    throw error;
  }

  const entries: Record<string, PlayerKnowledgeEntryView> = {};

  for (const fileName of files) {
    if (extname(fileName).toLowerCase() !== ".md") {
      continue;
    }

    const targetId = basename(fileName, ".md");
    const absolutePath = resolve(directoryPath, fileName);
    const markdown = await readFile(absolutePath, "utf8");
    entries[targetId] = {
      scope: directoryPath.endsWith("rooms") ? "room" : "object",
      targetId,
      format: "markdown",
      markdown,
      sourcePath: relative(process.cwd(), absolutePath)
    };
  }

  return entries;
}

function isMissingDirectoryError(error: unknown): error is NodeJS.ErrnoException {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === "ENOENT";
}
