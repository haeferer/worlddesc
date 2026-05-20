export interface WorldDocument {
  world: WorldMeta;
  interactionTypes: Record<string, InteractionType>;
  rooms: Record<string, Room>;
  objects: Record<string, WorldObject>;
}

export interface WorldMeta {
  title: string;
  desc?: string;
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
  objects?: string[];
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
  stateSchema?: StateSchema;
  state?: Record<string, unknown>;
  interactions?: Record<string, Interaction>;
}

export interface Interaction {
  type?: string;
  title: string;
  desc?: string;
  intent?: string;
  aliases?: string[];
  availableWhen?: ConditionGroup;
  effects?: Effect[];
  result?: Result;
}

export interface Result {
  text?: string;
  knowledge?: string[];
}

export type Effect = SetEffect | SayEffect | TriggerEffect;

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

export interface ConditionGroup {
  all?: Condition[];
  any?: Condition[];
  not?: Condition;
}

export interface Condition {
  ref: string;
  path: string;
  equals?: unknown;
  contains?: unknown;
}

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
