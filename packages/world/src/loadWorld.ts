import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { ValidateFunction } from "ajv";
import Ajv2020 from "ajv/dist/2020.js";
import { parse } from "yaml";

import schema from "../../../schema/world.schema.json" with { type: "json" };
import { expandWorldAssetInstances } from "./assets/expandWorldAssetInstances.js";
import type { WorldDocument } from "./types.js";
import { validateWorldAssetReferences as validateFileAssetReferences } from "./assets/validateWorldAssetReferences.js";
import { formatAjvErrors, validateWorldSemantics, WorldValidationError } from "./worldValidation.js";

const moduleDir = dirname(fileURLToPath(import.meta.url));
const defaultSchemaPath = resolve(moduleDir, "../../../schema/world.schema.json");

type AjvLike = {
  compile<T>(schema: object): ValidateFunction<T>;
};

type AjvCtor = new (options?: { allErrors?: boolean; strict?: boolean; useDefaults?: boolean }) => AjvLike;

const Ajv2020Ctor = Ajv2020 as unknown as AjvCtor;

const ajv = new Ajv2020Ctor({
  allErrors: true,
  strict: false
});

const validateWorld = ajv.compile<WorldDocument>(schema);

export async function loadWorldFile(path: string): Promise<WorldDocument> {
  const source = await readFile(path, "utf8");
  const baseWorld = loadWorldDocument(source);
  const assetErrors = await validateFileAssetReferences(baseWorld, path);

  if (assetErrors.length > 0) {
    throw new WorldValidationError(assetErrors);
  }

  return expandWorldAssetInstances(baseWorld, path);
}

export function loadWorldDocument(source: string): WorldDocument {
  const parsed = parse(source) as unknown;

  if (!validateWorld(parsed)) {
    throw new WorldValidationError(formatAjvErrors(validateWorld.errors));
  }

  const world = structuredClone(parsed as WorldDocument);
  const semanticErrors = validateWorldSemantics(world);

  if (semanticErrors.length > 0) {
    throw new WorldValidationError(semanticErrors);
  }

  return world;
}

export function getWorldSchemaPath(): string {
  return defaultSchemaPath;
}

export function validateWorldReferences(world: WorldDocument): string[] {
  return validateWorldSemantics(world);
}
