import type {
  InteractionInputView,
  PlayerActionFailure,
  PlayerActionFailureCode,
  PlayerActionFailureDetails,
  PlayerActionFailureKind
} from "./types.js";

interface ActionFailureInput {
  code: PlayerActionFailureCode;
  kind: PlayerActionFailureKind;
  message: string;
  retryable: boolean;
  objectId?: string;
  actionId?: string;
  followUp?: PlayerActionFailure["followUp"];
  details?: PlayerActionFailureDetails;
}

export function createActionFailure(input: ActionFailureInput): PlayerActionFailure {
  return {
    code: input.code,
    kind: input.kind,
    message: input.message,
    retryable: input.retryable,
    objectId: input.objectId,
    actionId: input.actionId,
    followUp: input.followUp,
    details: input.details
  };
}

export function validateActionInput(
  actionId: string,
  input: InteractionInputView | undefined,
  providedValue: string | undefined
): PlayerActionFailure | null {
  if (!input) {
    return null;
  }

  const value = providedValue ?? "";

  if (input.required && value.length === 0) {
    return createActionFailure({
      code: "missing-input",
      kind: "input",
      message: `Action "${actionId}" requires an input value`,
      retryable: true,
      actionId,
      followUp: {
        kind: "provide-input",
        prompt: buildProvideInputPrompt(actionId, input),
        input
      },
      details: {
        expectedInput: input
      }
    });
  }

  if (input.mode === "text") {
    return validateTextInput(actionId, input, value);
  }

  if (input.mode === "select") {
    return validateSelectInput(actionId, input, value);
  }

  return validateNumberInput(actionId, input, value);
}

function validateTextInput(
  actionId: string,
  input: Extract<InteractionInputView, { mode: "text" }>,
  value: string
): PlayerActionFailure | null {
  if (input.minLength !== undefined && value.length < input.minLength) {
    return invalidInputFailure(actionId, input, value, `Input for "${actionId}" is shorter than the minimum length`, {
      min: input.minLength
    });
  }

  if (input.maxLength !== undefined && value.length > input.maxLength) {
    return invalidInputFailure(actionId, input, value, `Input for "${actionId}" is longer than the maximum length`, {
      max: input.maxLength
    });
  }

  if (input.pattern && !new RegExp(input.pattern).test(value)) {
    return invalidInputFailure(actionId, input, value, `Input for "${actionId}" does not match the required pattern`);
  }

  return null;
}

function validateSelectInput(
  actionId: string,
  input: Extract<InteractionInputView, { mode: "select" }>,
  value: string
): PlayerActionFailure | null {
  const allowedValues = input.options.map((option) => option.value);
  if (!allowedValues.includes(value)) {
    return invalidInputFailure(actionId, input, value, `Input for "${actionId}" is not one of the allowed options`, {
      allowedValues
    });
  }

  return null;
}

function validateNumberInput(
  actionId: string,
  input: Extract<InteractionInputView, { mode: "number" }>,
  value: string
): PlayerActionFailure | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return invalidInputFailure(actionId, input, value, `Input for "${actionId}" is not a valid number`);
  }

  if (input.min !== undefined && parsed < input.min) {
    return invalidInputFailure(actionId, input, value, `Input for "${actionId}" is below the minimum value`, {
      min: input.min
    });
  }

  if (input.max !== undefined && parsed > input.max) {
    return invalidInputFailure(actionId, input, value, `Input for "${actionId}" is above the maximum value`, {
      max: input.max
    });
  }

  if (input.step !== undefined && input.min !== undefined) {
    const steps = (parsed - input.min) / input.step;
    if (Math.abs(steps - Math.round(steps)) > 1e-9) {
      return invalidInputFailure(
        actionId,
        input,
        value,
        `Input for "${actionId}" does not match the required step interval`,
        {
          min: input.min,
          step: input.step
        }
      );
    }
  }

  return null;
}

function invalidInputFailure(
  actionId: string,
  input: InteractionInputView,
  value: string,
  message: string,
  extraDetails: Omit<PlayerActionFailureDetails, "expectedInput" | "providedValue"> = {}
): PlayerActionFailure {
  return createActionFailure({
    code: "invalid-input",
    kind: "input",
    message,
    retryable: true,
    actionId,
    followUp: {
      kind: "correct-input",
      prompt: buildCorrectInputPrompt(actionId, input),
      input
    },
    details: {
      expectedInput: input,
      providedValue: value,
      ...extraDetails
    }
  });
}

function buildProvideInputPrompt(actionId: string, input: InteractionInputView): string {
  if (input.mode === "select") {
    return `Please provide one of the allowed values for "${actionId}".`;
  }

  if (input.mode === "number") {
    return `Please provide a numeric value for "${actionId}".`;
  }

  return `Please provide a text value for "${actionId}".`;
}

function buildCorrectInputPrompt(actionId: string, input: InteractionInputView): string {
  if (input.mode === "select") {
    return `Please choose one of the declared options for "${actionId}".`;
  }

  if (input.mode === "number") {
    return `Please provide a valid numeric value within the declared range for "${actionId}".`;
  }

  return `Please provide a text value that matches the declared format for "${actionId}".`;
}
