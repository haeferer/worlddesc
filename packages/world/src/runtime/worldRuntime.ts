import type {
  InputCase,
  InteractionExecution,
  InteractionInput,
  RuntimeInteraction,
  RuntimeWay,
  RuntimeWorldState,
  WayExecution,
  WorldDocument
} from "../types.js";
import { applyEffects } from "./applyEffects.js";
import { evaluateConditionGroup } from "./evaluateConditions.js";
import { buildInitialObjectStates, setObjectPathValue, unique } from "./runtimeHelpers.js";

export class WorldRuntime {
  readonly world: WorldDocument;
  private readonly stateValue: RuntimeWorldState;

  constructor(world: WorldDocument, initialState?: Partial<RuntimeWorldState>) {
    this.world = world;
    this.stateValue = {
      playerRoom: initialState?.playerRoom ?? world.player.initialRoom,
      placements: structuredClone(initialState?.placements ?? world.placement),
      objectStates: buildInitialObjectStates(world.objects, initialState?.objectStates),
      knowledge: [...(initialState?.knowledge ?? [])]
    };
  }

  get state(): RuntimeWorldState {
    return structuredClone(this.stateValue);
  }

  getCurrentRoomId(): string {
    return this.stateValue.playerRoom;
  }

  getCurrentRoom() {
    return this.world.rooms[this.stateValue.playerRoom];
  }

  getPlacement(objectId: string) {
    const placement = this.stateValue.placements[objectId];
    return placement ? structuredClone(placement) : undefined;
  }

  getObjectState(objectId: string) {
    const state = this.stateValue.objectStates[objectId];
    return state ? structuredClone(state) : undefined;
  }

  getKnowledge(): string[] {
    return [...this.stateValue.knowledge];
  }

  getRoomObjectIds(roomId = this.stateValue.playerRoom): string[] {
    return Object.entries(this.stateValue.placements)
      .filter(([, placement]) => "room" in placement && placement.room === roomId)
      .map(([objectId]) => objectId);
  }

  getInventoryObjectIds(): string[] {
    return Object.entries(this.stateValue.placements)
      .filter(([, placement]) => "inventory" in placement && placement.inventory === "player")
      .map(([objectId]) => objectId);
  }

  getContainedObjectIds(containerId: string): string[] {
    return Object.entries(this.stateValue.placements)
      .filter(([, placement]) => "object" in placement && placement.object === containerId)
      .map(([objectId]) => objectId);
  }

  isObjectInCurrentRoom(objectId: string): boolean {
    const placement = this.stateValue.placements[objectId];
    return Boolean(placement && "room" in placement && placement.room === this.stateValue.playerRoom);
  }

  isObjectInInventory(objectId: string): boolean {
    const placement = this.stateValue.placements[objectId];
    return Boolean(placement && "inventory" in placement && placement.inventory === "player");
  }

  isObjectAccessible(objectId: string): boolean {
    return this.isPlacementAccessible(this.stateValue.placements[objectId]);
  }

  listAvailableWays(roomId = this.stateValue.playerRoom): RuntimeWay[] {
    const room = this.world.rooms[roomId];
    return Object.entries(room.ways ?? {})
      .filter(([, way]) => evaluateConditionGroup(this.stateValue, way.availableWhen))
      .map(([wayId, definition]) => ({ roomId, wayId, definition }));
  }

  listAvailableInteractions(objectId: string): RuntimeInteraction[] {
    const object = this.world.objects[objectId];
    if (!object || !this.isObjectAccessible(objectId)) {
      return [];
    }

    return Object.entries(object.interactions ?? {})
      .filter(([, interaction]) => evaluateConditionGroup(this.stateValue, interaction.availableWhen))
      .map(([interactionId, definition]) => ({ objectId, interactionId, definition }));
  }

  canUseWay(wayId: string, roomId = this.stateValue.playerRoom): boolean {
    return this.listAvailableWays(roomId).some((way) => way.wayId === wayId);
  }

  canUseInteraction(objectId: string, interactionId: string): boolean {
    return this.listAvailableInteractions(objectId).some((interaction) => interaction.interactionId === interactionId);
  }

  executeWay(wayId: string, roomId = this.stateValue.playerRoom): WayExecution {
    const room = this.world.rooms[roomId];
    const definition = room.ways?.[wayId];

    if (!definition) {
      throw new Error(`Unknown way "${wayId}" in room "${roomId}"`);
    }

    if (!evaluateConditionGroup(this.stateValue, definition.availableWhen)) {
      throw new Error(`Way "${wayId}" is currently not available`);
    }

    const say: string[] = [];
    const triggers: string[] = [];
    this.stateValue.playerRoom = definition.target.room;
    applyEffects(this.world, this.stateValue, this.world.rooms[definition.target.room].onEnter ?? [], say, triggers);

    return {
      way: { roomId, wayId, definition },
      say,
      triggers,
      state: this.state
    };
  }

  executeInteraction(objectId: string, interactionId: string, additionalText?: string): InteractionExecution {
    const object = this.world.objects[objectId];
    const definition = object?.interactions?.[interactionId];

    if (!object || !definition) {
      throw new Error(`Unknown interaction "${interactionId}" on object "${objectId}"`);
    }

    if (!this.isObjectAccessible(objectId)) {
      throw new Error(`Object "${objectId}" is not currently accessible`);
    }

    if (!evaluateConditionGroup(this.stateValue, definition.availableWhen)) {
      throw new Error(`Interaction "${interactionId}" on object "${objectId}" is currently not available`);
    }

    const say: string[] = [];
    const triggers: string[] = [];
    const branchResult = resolveInteractionOutcome(definition, additionalText);
    const knowledgeGained = unique(branchResult.result?.knowledge ?? definition.result?.knowledge ?? []).filter(
      (knowledge) => !this.stateValue.knowledge.includes(knowledge)
    );

    if (branchResult.success && branchResult.normalizedValue !== undefined && definition.input?.applyInputTo) {
      setObjectPathValue(
        this.stateValue,
        definition.input.applyInputTo.ref ?? objectId,
        definition.input.applyInputTo.path ?? "",
        branchResult.normalizedValue
      );
    }

    applyEffects(this.world, this.stateValue, branchResult.effects ?? definition.effects ?? [], say, triggers);
    this.stateValue.knowledge.push(...knowledgeGained);

    return {
      interaction: { objectId, interactionId, definition },
      text: branchResult.result?.text ?? definition.result?.text,
      say,
      knowledgeGained,
      triggers,
      branch: branchResult.branch,
      matchedCaseId: branchResult.matchedCaseId,
      state: this.state
    };
  }

  private isPlacementAccessible(placement: WorldDocument["placement"][string] | undefined): boolean {
    if (!placement) {
      return false;
    }

    if ("room" in placement) {
      return placement.room === this.stateValue.playerRoom;
    }

    if ("inventory" in placement) {
      return placement.inventory === "player";
    }

    if ("offstage" in placement) {
      return false;
    }

    if ("object" in placement) {
      const containerPlacement = this.stateValue.placements[placement.object];
      if (!this.isPlacementAccessible(containerPlacement)) {
        return false;
      }

      const containerState = this.stateValue.objectStates[placement.object];
      return containerState?.closed !== true;
    }

    return false;
  }
}

export function createWorldRuntime(world: WorldDocument, initialState?: Partial<RuntimeWorldState>): WorldRuntime {
  return new WorldRuntime(world, initialState);
}

function resolveInteractionOutcome(
  definition: RuntimeInteraction["definition"],
  additionalText: string | undefined
): {
  branch: InteractionExecution["branch"];
  success: boolean;
  normalizedValue?: string | number;
  matchedCaseId?: string;
  effects?: RuntimeInteraction["definition"]["effects"];
  result?: RuntimeInteraction["definition"]["result"];
} {
  if (!definition.input) {
    return {
      branch: "default",
      success: true,
      effects: definition.effects,
      result: definition.result
    };
  }

  const evaluation = evaluateInteractionInput(definition.input, additionalText);
  if (!evaluation.success) {
    return {
      branch: "default",
      success: false,
      result: definition.input.default?.result,
      effects: definition.input.default?.effects
    };
  }

  const matchedCase = findMatchingInputCase(definition.input, evaluation.normalizedValue);
  if (matchedCase) {
    return {
      branch: "case",
      success: true,
      normalizedValue: evaluation.normalizedValue,
      matchedCaseId: matchedCase.id,
      effects: matchedCase.effects,
      result: matchedCase.result
    };
  }

  return {
    branch: "default",
    success: true,
    normalizedValue: evaluation.normalizedValue,
    effects: definition.input.default?.effects,
    result: definition.input.default?.result
  };
}

function evaluateInteractionInput(
  input: InteractionInput,
  additionalText: string | undefined
): { success: boolean; normalizedValue?: string | number } {
  if (input.mode === "text") {
    return evaluateTextInteractionInput(input, additionalText);
  }

  if (input.mode === "select") {
    return evaluateSelectInteractionInput(input, additionalText);
  }

  return evaluateNumberInteractionInput(input, additionalText);
}

function evaluateTextInteractionInput(
  input: Extract<InteractionInput, { mode: "text" }>,
  additionalText: string | undefined
): { success: boolean; normalizedValue?: string } {
  const value = additionalText ?? "";

  if (input.required !== false && value.length === 0) {
    return { success: false };
  }

  if (input.minLength !== undefined && value.length < input.minLength) {
    return { success: false };
  }

  if (input.maxLength !== undefined && value.length > input.maxLength) {
    return { success: false };
  }

  if (input.pattern && !new RegExp(input.pattern).test(value)) {
    return { success: false };
  }

  return {
    success: true,
    normalizedValue: value
  };
}

function evaluateSelectInteractionInput(
  input: Extract<InteractionInput, { mode: "select" }>,
  additionalText: string | undefined
): { success: boolean; normalizedValue?: string } {
  const value = additionalText ?? "";

  if (input.required !== false && value.length === 0) {
    return { success: false };
  }

  const allowedValues = new Set(input.options.map((option) => option.value));
  if (!allowedValues.has(value)) {
    return { success: false };
  }

  return {
    success: true,
    normalizedValue: value
  };
}

function evaluateNumberInteractionInput(
  input: Extract<InteractionInput, { mode: "number" }>,
  additionalText: string | undefined
): { success: boolean; normalizedValue?: number } {
  const value = additionalText ?? "";

  if (input.required !== false && value.length === 0) {
    return { success: false };
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return { success: false };
  }

  if (input.min !== undefined && parsed < input.min) {
    return { success: false };
  }

  if (input.max !== undefined && parsed > input.max) {
    return { success: false };
  }

  if (input.step !== undefined && input.min !== undefined) {
    const steps = (parsed - input.min) / input.step;
    if (Math.abs(steps - Math.round(steps)) > 1e-9) {
      return { success: false };
    }
  }

  return {
    success: true,
    normalizedValue: parsed
  };
}

function findMatchingInputCase(
  input: InteractionInput,
  normalizedValue: string | number | undefined
): InputCase | undefined {
  if (normalizedValue === undefined) {
    return undefined;
  }

  return (input.cases ?? []).find((inputCase) => matchesInputCase(input, inputCase, normalizedValue));
}

function matchesInputCase(input: InteractionInput, inputCase: InputCase, normalizedValue: string | number): boolean {
  if (input.mode === "number") {
    if (typeof normalizedValue !== "number") {
      return false;
    }

    if (typeof inputCase.equals === "number" && normalizedValue !== inputCase.equals) {
      return false;
    }

    if (inputCase.min !== undefined && normalizedValue < inputCase.min) {
      return false;
    }

    if (inputCase.max !== undefined && normalizedValue > inputCase.max) {
      return false;
    }

    return inputCase.equals !== undefined || inputCase.min !== undefined || inputCase.max !== undefined;
  }

  if (typeof normalizedValue !== "string") {
    return false;
  }

  if (typeof inputCase.equals === "string") {
    return normalizedValue === inputCase.equals;
  }

  return false;
}
