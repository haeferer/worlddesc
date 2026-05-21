import type {
  InteractionExecution,
  InteractionInput,
  ObjectPlacement,
  Room,
  RuntimeInteraction,
  RuntimeWay,
  RuntimeWorldState,
  WayExecution,
  WorldDocument
} from "../types.js";

export interface WorldRuntimePort {
  readonly world: WorldDocument;
  readonly state: RuntimeWorldState;

  getCurrentRoomId(): string;
  getCurrentRoom(): Room;
  getPlacement(objectId: string): ObjectPlacement | undefined;
  getObjectState(objectId: string): Record<string, unknown> | undefined;
  getKnowledge(): string[];

  getRoomObjectIds(roomId?: string): string[];
  getInventoryObjectIds(): string[];
  getContainedObjectIds(containerId: string): string[];

  isObjectAccessible(objectId: string): boolean;

  listAvailableWays(roomId?: string): RuntimeWay[];
  listAvailableInteractions(objectId: string): RuntimeInteraction[];

  executeWay(wayId: string, roomId?: string): WayExecution;
  executeInteraction(objectId: string, interactionId: string, additionalText?: string): InteractionExecution;
}

export interface PlayerMemory {
  knownKnowledge: string[];
  seenRooms: string[];
  knownObjects: Record<string, KnownObjectMemory>;
  deliveredEventIds: string[];
}

export interface KnownObjectMemory {
  knownTexts: string[];
  knownKnowledge: string[];
  lastSeenAt?: string;
}

export interface PerceptionEvent {
  id: string;
  type: "room" | "object" | "interaction" | "system";
  roomId?: string;
  objectId?: string;
  text?: string;
  knowledge?: string[];
  isNew: boolean;
}

export interface PreparedTextBlock {
  kind: "room" | "object" | "interaction" | "system";
  text: string;
  isNew: boolean;
  objectId?: string;
}

export interface PlayerSceneObjectView {
  objectId: string;
  title: string;
  shortDescription?: string;
  accessible: boolean;
  availableInteractionIds: string[];
  availableInteractions: AvailableInteractionView[];
  preparedTexts: PreparedTextBlock[];
}

export interface PlayerWayView {
  wayId: string;
  title: string;
  desc: string;
}

export interface PlayerSceneView {
  roomId: string;
  title: string;
  description: string;
  preparedTexts: PreparedTextBlock[];
  objects: PlayerSceneObjectView[];
  ways: PlayerWayView[];
  inventoryObjectIds: string[];
  newEvents: PerceptionEvent[];
}

export interface KnownObjectView {
  objectId: string;
  title: string;
  knownTexts: string[];
  knownKnowledge: string[];
  availableInteractionIds: string[];
  availableInteractions: AvailableInteractionView[];
}

export interface AvailableInteractionView {
  actionId: string;
  title: string;
  desc?: string;
  input?: InteractionInputView;
}

export type InteractionInputView = TextInteractionInputView | SelectInteractionInputView | NumberInteractionInputView;

export interface TextInteractionInputView {
  mode: "text";
  required: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}

export interface SelectInteractionInputView {
  mode: "select";
  required: boolean;
  options: SelectOptionView[];
}

export interface NumberInteractionInputView {
  mode: "number";
  required: boolean;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}

export interface SelectOptionView {
  value: string;
  label: string;
}

export interface PlayerWayCommand {
  kind: "way";
  actionId: string;
}

export interface PlayerInteractionCommand {
  kind: "interaction";
  objectId: string;
  actionId: string;
  additionalText?: string;
}

export type PlayerActionCommand = PlayerWayCommand | PlayerInteractionCommand;

export type PlayerActionFailureCode =
  | "unknown-object"
  | "unknown-action"
  | "object-not-accessible"
  | "action-not-available"
  | "execution-failed";

export interface PlayerActionFailure {
  code: PlayerActionFailureCode;
  message: string;
  objectId?: string;
  actionId?: string;
}

export interface PlayerActionResultView {
  accepted: boolean;
  text?: string;
  events: PerceptionEvent[];
  scene: PlayerSceneView;
  failure?: PlayerActionFailure;
}

export interface PlayerWorldView {
  getCurrentScene(): PlayerSceneView;
  getKnownObject(objectId: string): KnownObjectView | null;
  getNewEvents(): PerceptionEvent[];
  performAction(action: PlayerActionCommand): PlayerActionResultView;
}
