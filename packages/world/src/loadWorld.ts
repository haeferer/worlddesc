import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { ErrorObject, ValidateFunction } from "ajv";
import Ajv2020 from "ajv/dist/2020.js";
import { parse } from "yaml";

import schema from "../../../schema/world.schema.json" with { type: "json" };
import type { WorldDocument } from "./types.js";
import { validateWorldReferences as validateReferences } from "./validation/referenceValidation.js";
import { validateObjectState } from "./validation/stateSchemaValidation.js";

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

const stateAjv = new Ajv2020Ctor({
  allErrors: true,
  strict: false,
  useDefaults: true
});

const validateWorld = ajv.compile<WorldDocument>(schema);

export class WorldValidationError extends Error {
  readonly details: string[];

  constructor(details: string[]) {
    super(`World validation failed:\n${details.join("\n")}`);
    this.name = "WorldValidationError";
    this.details = details;
  }
}

export async function loadWorldFile(path: string): Promise<WorldDocument> {
  const source = await readFile(path, "utf8");
  return loadWorldDocument(source);
}

export function loadWorldDocument(source: string): WorldDocument {
  const parsed = parse(source) as unknown;

  if (!validateWorld(parsed)) {
    const details =
      validateWorld.errors?.map((error: ErrorObject) => {
        const location = error.instancePath || "/";
        return `${location} ${error.message ?? "is invalid"}`;
      }) ?? ["Unknown validation error"];

    throw new WorldValidationError(details);
  }

  const world = structuredClone(parsed as WorldDocument);
  const semanticErrors = validateWorldReferences(world);

  if (semanticErrors.length > 0) {
    throw new WorldValidationError(semanticErrors);
  }

  return world;
}

export function getWorldSchemaPath(): string {
  return defaultSchemaPath;
}

export function validateWorldReferences(world: WorldDocument): string[] {
  return validateReferences(world, (objectId, object, errors) =>
    validateObjectState(objectId, object, errors, stateAjv)
  );
}
