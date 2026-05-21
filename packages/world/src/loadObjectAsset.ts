import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { ErrorObject, ValidateFunction } from "ajv";
import Ajv2020 from "ajv/dist/2020.js";
import { parse } from "yaml";

import schema from "../../../schema/object-asset.schema.json" with { type: "json" };
import type { ObjectAssetDocument } from "./assetTypes.js";
import { validateObjectAssetReferences as validateReferences } from "./validation/assetReferenceValidation.js";
import { validateObjectState } from "./validation/stateSchemaValidation.js";

const moduleDir = dirname(fileURLToPath(import.meta.url));
const defaultSchemaPath = resolve(moduleDir, "../../../schema/object-asset.schema.json");

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

const validateAsset = ajv.compile<ObjectAssetDocument>(schema);

export class AssetValidationError extends Error {
  readonly details: string[];

  constructor(details: string[]) {
    super(`Asset validation failed:\n${details.join("\n")}`);
    this.name = "AssetValidationError";
    this.details = details;
  }
}

export async function loadObjectAssetFile(path: string): Promise<ObjectAssetDocument> {
  const source = await readFile(path, "utf8");
  return loadObjectAssetDocument(source);
}

export function loadObjectAssetDocument(source: string): ObjectAssetDocument {
  const parsed = parse(source) as unknown;

  if (!validateAsset(parsed)) {
    const details =
      validateAsset.errors?.map((error: ErrorObject) => {
        const location = error.instancePath || "/";
        return `${location} ${error.message ?? "is invalid"}`;
      }) ?? ["Unknown validation error"];

    throw new AssetValidationError(details);
  }

  const asset = structuredClone(parsed as ObjectAssetDocument);
  const semanticErrors = validateObjectAssetReferences(asset);

  if (semanticErrors.length > 0) {
    throw new AssetValidationError(semanticErrors);
  }

  return asset;
}

export function getObjectAssetSchemaPath(): string {
  return defaultSchemaPath;
}

export function validateObjectAssetReferences(asset: ObjectAssetDocument): string[] {
  return validateReferences(asset, (objectId, object, errors) =>
    validateObjectState(objectId, object, errors, stateAjv)
  );
}
