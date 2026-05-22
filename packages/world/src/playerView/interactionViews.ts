import type { InteractionInput, RuntimeInteraction, RuntimeWay } from "../types.js";
import type {
  AvailableInteractionView,
  InteractionInputView,
  PlayerInteractionOptionView,
  PlayerWayOptionView
} from "./types.js";

export function buildAvailableInteractionView(interaction: RuntimeInteraction): AvailableInteractionView {
  return {
    actionId: interaction.interactionId,
    title: interaction.definition.title,
    desc: interaction.definition.desc,
    input: buildInteractionInputView(interaction.definition.input)
  };
}

export function buildInteractionActionOption(
  objectId: string,
  objectTitle: string,
  interaction: RuntimeInteraction
): PlayerInteractionOptionView {
  return {
    commandId: `interaction:${objectId}:${interaction.interactionId}`,
    kind: "interaction",
    objectId,
    objectTitle,
    actionId: interaction.interactionId,
    interactionType: interaction.definition.type,
    title: interaction.definition.title,
    desc: interaction.definition.desc,
    input: buildInteractionInputView(interaction.definition.input),
    command: {
      kind: "interaction",
      objectId,
      actionId: interaction.interactionId
    }
  };
}

export function buildWayActionOption(way: RuntimeWay): PlayerWayOptionView {
  return {
    commandId: `way:${way.wayId}`,
    kind: "way",
    actionId: way.wayId,
    title: way.definition.title,
    desc: way.definition.desc,
    command: {
      kind: "way",
      actionId: way.wayId
    }
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
