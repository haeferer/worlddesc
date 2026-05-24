import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { ValidateFunction } from "ajv";
import Ajv2020 from "ajv/dist/2020.js";
import { parse } from "yaml";

import schema from "../../../schema/narrative-guide-mix.schema.json" with { type: "json" };
import type { NarrativeGuideMixDocument } from "./narrativeGuideTypes.js";

const moduleDir = dirname(fileURLToPath(import.meta.url));
const defaultSchemaPath = resolve(moduleDir, "../../../schema/narrative-guide-mix.schema.json");

type AjvLike = {
  compile<T>(schema: object): ValidateFunction<T>;
};

type AjvCtor = new (options?: { allErrors?: boolean; strict?: boolean; useDefaults?: boolean }) => AjvLike;

const Ajv2020Ctor = Ajv2020 as unknown as AjvCtor;

const ajv = new Ajv2020Ctor({
  allErrors: true,
  strict: false
});

const validateMix = ajv.compile<NarrativeGuideMixDocument>(schema);

export class NarrativeGuideMixValidationError extends Error {
  readonly details: string[];

  constructor(details: string[]) {
    super(`Narrative guide mix validation failed:\n${details.join("\n")}`);
    this.name = "NarrativeGuideMixValidationError";
    this.details = details;
  }
}

export async function loadNarrativeGuideMixFile(path: string): Promise<NarrativeGuideMixDocument> {
  const source = await readFile(path, "utf8");
  return loadNarrativeGuideMixDocument(source);
}

export function loadNarrativeGuideMixDocument(source: string): NarrativeGuideMixDocument {
  const parsed = parse(source) as unknown;

  if (!validateMix(parsed)) {
    throw new NarrativeGuideMixValidationError(formatAjvErrors(validateMix.errors));
  }

  return structuredClone(parsed as NarrativeGuideMixDocument);
}

export function getNarrativeGuideMixSchemaPath(): string {
  return defaultSchemaPath;
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
