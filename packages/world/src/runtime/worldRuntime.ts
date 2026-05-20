import type {
  InteractionExecution,
  RuntimeInteraction,
  RuntimeWay,
  RuntimeWorldState,
  WayExecution,
  WorldDocument
} from "../types.js";
import { applyEffects } from "./applyEffects.js";
import { evaluateConditionGroup } from "./evaluateConditions.js";
import { buildInitialObjectStates, unique } from "./runtimeHelpers.js";

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
    return this.isObjectInCurrentRoom(objectId) || this.isObjectInInventory(objectId);
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
    applyEffects(this.stateValue, this.world.rooms[definition.target.room].onEnter ?? [], say, triggers);

    return {
      way: { roomId, wayId, definition },
      say,
      triggers,
      state: this.state
    };
  }

  executeInteraction(objectId: string, interactionId: string): InteractionExecution {
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
    const knowledgeGained = unique(definition.result?.knowledge ?? []).filter(
      (knowledge) => !this.stateValue.knowledge.includes(knowledge)
    );

    applyEffects(this.stateValue, definition.effects ?? [], say, triggers);
    this.stateValue.knowledge.push(...knowledgeGained);

    return {
      interaction: { objectId, interactionId, definition },
      text: definition.result?.text,
      say,
      knowledgeGained,
      triggers,
      state: this.state
    };
  }
}

export function createWorldRuntime(world: WorldDocument, initialState?: Partial<RuntimeWorldState>): WorldRuntime {
  return new WorldRuntime(world, initialState);
}
