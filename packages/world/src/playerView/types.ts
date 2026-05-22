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
import type { PlayerIntentCommand, PlayerIntentResolution, PlayerIntentSurfaceView } from "./intentTypes.js";

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

export type PlayerObjectPerceptionKind = "visible" | "inventory" | "known";
export type PlayerObjectAccessibilityReason =
  | "visible"
  | "inventory"
  | "closed-container"
  | "other-room"
  | "offstage"
  | "unknown";

export interface PlayerSceneObjectView {
  objectId: string;
  title: string;
  shortDescription?: string;
  perception: PlayerObjectPerceptionKind;
  visible: boolean;
  accessible: boolean;
  accessibilityReason: PlayerObjectAccessibilityReason;
  availableInteractionIds: string[];
  availableInteractions: AvailableInteractionView[];
  preparedTexts: PreparedTextBlock[];
}

export interface KnownSceneObjectView {
  objectId: string;
  title: string;
  perception: PlayerObjectPerceptionKind;
  currentlyAccessible: boolean;
  accessibilityReason: PlayerObjectAccessibilityReason;
  lastSeenAt?: string;
  knownKnowledge: string[];
  knownTexts: string[];
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
  inventoryObjects: PlayerSceneObjectView[];
  knownButNotVisibleObjects: KnownSceneObjectView[];
  ways: PlayerWayView[];
  inventoryObjectIds: string[];
  newEvents: PerceptionEvent[];
  sampleActions: PlayerActionOptionView[];
}

export interface KnownObjectView {
  objectId: string;
  title: string;
  perception: PlayerObjectPerceptionKind;
  currentlyVisible: boolean;
  currentlyAccessible: boolean;
  accessibilityReason: PlayerObjectAccessibilityReason;
  lastSeenAt?: string;
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

export type PlayerActionOptionView = PlayerInteractionOptionView | PlayerWayOptionView;

export interface PlayerInteractionOptionView {
  commandId: string;
  kind: "interaction";
  objectId: string;
  objectTitle: string;
  actionId: string;
  interactionType?: string;
  title: string;
  desc?: string;
  input?: InteractionInputView;
  command: PlayerInteractionCommand;
}

export interface PlayerWayOptionView {
  commandId: string;
  kind: "way";
  actionId: string;
  title: string;
  desc: string;
  command: PlayerWayCommand;
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
  | "missing-input"
  | "invalid-input"
  | "execution-failed";

export type PlayerActionFailureKind = "unknown" | "availability" | "input" | "execution";

export interface PlayerActionFollowUp {
  kind: "provide-input" | "correct-input";
  prompt: string;
  input?: InteractionInputView;
}

export interface PlayerActionFailureDetails {
  expectedInput?: InteractionInputView;
  providedValue?: string;
  allowedValues?: string[];
  min?: number;
  max?: number;
  step?: number;
}

export interface PlayerActionFailure {
  code: PlayerActionFailureCode;
  kind: PlayerActionFailureKind;
  message: string;
  retryable: boolean;
  objectId?: string;
  actionId?: string;
  followUp?: PlayerActionFollowUp;
  details?: PlayerActionFailureDetails;
}

export interface PlayerActionResultView {
  accepted: boolean;
  text?: string;
  events: PerceptionEvent[];
  scene: PlayerSceneView;
  failure?: PlayerActionFailure;
  turn?: PlayerTurnSummaryView;
}

export interface PlayerTurnSummaryView {
  primaryResultText?: string;
  newEventIds: string[];
  newlyVisibleObjectIds: string[];
  newlyInventoryObjectIds: string[];
  newlyKnownObjectIds: string[];
  newlyAccessibleObjectIds: string[];
  newlyAvailableActionIds: string[];
  newlyKnownKnowledge: string[];
}

export interface PlayerWorldView {
  getCurrentScene(): PlayerSceneView;
  getIntentSurface(): PlayerIntentSurfaceView;
  getKnownObject(objectId: string): KnownObjectView | null;
  getNewEvents(): PerceptionEvent[];
  resolveIntent(intent: PlayerIntentCommand): PlayerIntentResolution;
  performIntent(intent: PlayerIntentCommand): PlayerActionResultView;
  performAction(action: PlayerActionCommand): PlayerActionResultView;
}
