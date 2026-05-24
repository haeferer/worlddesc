import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { ValidateFunction } from "ajv";
import Ajv2020 from "ajv/dist/2020.js";
import { parse } from "yaml";

import schema from "../../../schema/narrative-guide.schema.json" with { type: "json" };
import type { NarrativeGuideDocument } from "./narrativeGuideTypes.js";
import type { WorldDocument } from "./types.js";

const moduleDir = dirname(fileURLToPath(import.meta.url));
const defaultSchemaPath = resolve(moduleDir, "../../../schema/narrative-guide.schema.json");

type AjvLike = {
  compile<T>(schema: object): ValidateFunction<T>;
};

type AjvCtor = new (options?: { allErrors?: boolean; strict?: boolean; useDefaults?: boolean }) => AjvLike;

const Ajv2020Ctor = Ajv2020 as unknown as AjvCtor;

const ajv = new Ajv2020Ctor({
  allErrors: true,
  strict: false
});

const validateGuide = ajv.compile<NarrativeGuideDocument>(schema);

export class NarrativeGuideValidationError extends Error {
  readonly details: string[];

  constructor(details: string[]) {
    super(`Narrative guide validation failed:\n${details.join("\n")}`);
    this.name = "NarrativeGuideValidationError";
    this.details = details;
  }
}

export async function loadNarrativeGuideFile(path: string): Promise<NarrativeGuideDocument> {
  const source = await readFile(path, "utf8");
  return loadNarrativeGuideDocument(source);
}

export function loadNarrativeGuideDocument(source: string): NarrativeGuideDocument {
  const parsed = parse(source) as unknown;

  if (!validateGuide(parsed)) {
    throw new NarrativeGuideValidationError(formatAjvErrors(validateGuide.errors));
  }

  return structuredClone(parsed as NarrativeGuideDocument);
}

export function getNarrativeGuideSchemaPath(): string {
  return defaultSchemaPath;
}

export function validateNarrativeGuideAgainstWorld(guide: NarrativeGuideDocument, world: WorldDocument): string[] {
  const errors: string[] = [];

  for (const roomId of Object.keys(guide.rooms ?? {})) {
    if (!world.rooms[roomId]) {
      errors.push(`Narrative guide "${guide.guide.id}" references unknown room "${roomId}"`);
    }
  }

  for (const objectId of Object.keys(guide.objects ?? {})) {
    if (!world.objects[objectId]) {
      errors.push(`Narrative guide "${guide.guide.id}" references unknown object "${objectId}"`);
    }
  }

  return errors;
}

function formatAjvErrors(
  errors: ReadonlyArray<{
    instancePath?: string;
    message?: string;
  }> | null | undefined
): string[] {
  return errors?.map((error) => {
    const location = error.instancePath || "/";
    return `${location} ${error.message ?? "is invalid"}`;
  }) ?? ["Unknown validation error"];
}
