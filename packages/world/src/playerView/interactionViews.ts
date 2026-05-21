import type { InteractionInput, RuntimeInteraction } from "../types.js";
import type { AvailableInteractionView, InteractionInputView } from "./types.js";

export function buildAvailableInteractionView(interaction: RuntimeInteraction): AvailableInteractionView {
  return {
    actionId: interaction.interactionId,
    title: interaction.definition.title,
    desc: interaction.definition.desc,
    input: buildInteractionInputView(interaction.definition.input)
  };
}

function buildInteractionInputView(input: InteractionInput | undefined): InteractionInputView | undefined {
  if (!input) {
    return undefined;
  }

  if (input.mode === "text") {
    return {
      mode: "text",
      required: input.required !== false,
      minLength: input.minLength,
      maxLength: input.maxLength,
      pattern: input.pattern
    };
  }

  if (input.mode === "select") {
    return {
      mode: "select",
      required: input.required !== false,
      options: input.options.map((option) => ({ ...option }))
    };
  }

  return {
    mode: "number",
    required: input.required !== false,
    min: input.min,
    max: input.max,
    step: input.step,
    unit: input.unit
  };
}
