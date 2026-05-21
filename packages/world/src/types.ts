export interface WorldDocument {
  world: WorldMeta;
  player: Player;
  interactionTypes: Record<string, InteractionType>;
  rooms: Record<string, Room>;
  objects: Record<string, WorldObject>;
  placement: Record<string, ObjectPlacement>;
}

export interface WorldMeta {
  title: string;
  desc?: string;
}

export interface Player {
  initialRoom: string;
}

export interface InteractionType {
  title: string;
  desc?: string;
}

export interface Room {
  title: string;
  desc: string;
  tags?: string[];
  ways?: Record<string, Way>;
  onEnter?: Effect[];
}

export interface Way {
  title: string;
  desc: string;
  aliases?: string[];
  target: RoomTarget;
  availableWhen?: ConditionGroup;
}

export interface RoomTarget {
  room: string;
}

export interface WorldObject {
  title: string;
  desc: string;
  aliases?: string[];
  tags?: string[];
  portable?: boolean;
  stateSchema?: StateSchema;
  state?: Record<string, unknown>;
  interactions?: Record<string, Interaction>;
}

export type ObjectPlacement = RoomPlacement | InventoryPlacement | OffstagePlacement | ObjectContainerPlacement;

export interface RoomPlacement {
  room: string;
}

export interface InventoryPlacement {
  inventory: "player";
}

export interface OffstagePlacement {
  offstage: true;
}

export interface ObjectContainerPlacement {
  object: string;
}

export interface Interaction {
  type?: string;
  title: string;
  desc?: string;
  intent?: string;
  aliases?: string[];
  availableWhen?: ConditionGroup;
  input?: InteractionInput;
  effects?: Effect[];
  result?: Result;
}

export type InteractionInput = TextInteractionInput | SelectInteractionInput | NumberInteractionInput;

export interface TextInteractionInput {
  mode: "text";
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  applyInputTo?: InputTarget;
  cases?: InputCase[];
  default?: InteractionOutcome;
}

export interface SelectInteractionInput {
  mode: "select";
  required?: boolean;
  options: SelectOption[];
  applyInputTo?: InputTarget;
  cases?: InputCase[];
  default?: InteractionOutcome;
}

export interface NumberInteractionInput {
  mode: "number";
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  applyInputTo?: InputTarget;
  cases?: InputCase[];
  default?: InteractionOutcome;
}

export interface SelectOption {
  value: string;
  label: string;
}

export interface InputTarget {
  ref?: string;
  path?: string;
}

export interface InputCase {
  id?: string;
  equals?: string | number;
  min?: number;
  max?: number;
  effects?: Effect[];
  result?: Result;
}

export interface InteractionOutcome {
  effects?: Effect[];
  result?: Result;
}

export interface Result {
  text?: string;
  knowledge?: string[];
}

export type Effect = SetEffect | SayEffect | TriggerEffect | MoveEffect;

export interface SetEffect {
  type: "set";
  ref?: string;
  path?: string;
  value?: unknown;
}

export interface SayEffect {
  type: "say";
  text?: string;
}

export interface TriggerEffect {
  type: "trigger";
  event?: string;
}

export interface MoveEffect {
  type: "move";
  ref?: string;
  to?: ObjectPlacement;
}

export interface ConditionGroup {
  all?: Condition[];
  any?: Condition[];
  not?: Condition;
}

export interface Condition {
  ref: string;
  path?: string;
  equals?: unknown;
  contains?: unknown;
  placement?: PlacementCondition;
}

export type PlacementCondition = RoomPlacement | InventoryPlacement | OffstagePlacement | ObjectContainerPlacement;

export interface StateSchema {
  type: "object";
  description?: string;
  properties: Record<string, StateSchemaNode>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface StateSchemaNode {
  type?: string | string[];
  description?: string;
  default?: unknown;
  enum?: unknown[];
  const?: unknown;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  items?: StateSchemaNode;
  properties?: Record<string, StateSchemaNode>;
  required?: string[];
  additionalProperties?: boolean;
  [key: string]: unknown;
}

export interface RuntimeWorldState {
  playerRoom: string;
  placements: Record<string, ObjectPlacement>;
  objectStates: Record<string, Record<string, unknown> | undefined>;
  knowledge: string[];
}

export interface RuntimeWay {
  roomId: string;
  wayId: string;
  definition: Way;
}

export interface RuntimeInteraction {
  objectId: string;
  interactionId: string;
  definition: Interaction;
}

export interface InteractionExecution {
  interaction: RuntimeInteraction;
  text?: string;
  say: string[];
  knowledgeGained: string[];
  triggers: string[];
  branch: "default" | "case";
  matchedCaseId?: string;
  state: RuntimeWorldState;
}

export interface WayExecution {
  way: RuntimeWay;
  say: string[];
  triggers: string[];
  state: RuntimeWorldState;
}
