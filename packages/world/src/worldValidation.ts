import type { ErrorObject, ValidateFunction } from "ajv";
import Ajv2020 from "ajv/dist/2020.js";

import type { WorldDocument, WorldObject } from "./types.js";
import { validateWorldReferences as validateReferences } from "./validation/referenceValidation.js";
import { validateObjectState } from "./validation/stateSchemaValidation.js";

type AjvLike = {
  compile<T>(schema: object): ValidateFunction<T>;
};

type AjvCtor = new (options?: { allErrors?: boolean; strict?: boolean; useDefaults?: boolean }) => AjvLike;

const Ajv2020Ctor = Ajv2020 as unknown as AjvCtor;

const stateAjv = new Ajv2020Ctor({
  allErrors: true,
  strict: false,
  useDefaults: true
});

export class WorldValidationError extends Error {
  readonly details: string[];

  constructor(details: string[]) {
    super(`World validation failed:\n${details.join("\n")}`);
    this.name = "WorldValidationError";
    this.details = details;
  }
}

export function formatAjvErrors(errors: ErrorObject[] | null | undefined): string[] {
  return errors?.map((error: ErrorObject) => {
    const location = error.instancePath || "/";
    return `${location} ${error.message ?? "is invalid"}`;
  }) ?? ["Unknown validation error"];
}

export function validateWorldSemantics(world: WorldDocument): string[] {
  return validateReferences(world, (objectId, object, errors) =>
    validateObjectState(objectId, object, errors, stateAjv)
  );
}
