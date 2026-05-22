import type { InteractionInputView } from "./types.js";

export type PlayerIntentTargetKind = "object" | "inventory" | "room" | "way";
export type PlayerIntentVerbId =
  | "go"
  | "examine"
  | "open"
  | "close"
  | "take"
  | "unlock"
  | "use"
  | "put"
  | "toggle"
  | "read"
  | "input";

export interface PlayerIntentTargetView {
  id: string;
  title: string;
  kind: PlayerIntentTargetKind;
  visible?: boolean;
  accessible?: boolean;
}

export interface PlayerIntentVerbView {
  id: PlayerIntentVerbId;
  title: string;
  desc?: string;
  allowsObject1: boolean;
  allowsObject2: boolean;
  allowsInput: boolean;
  input?: InteractionInputView;
  sceneRelevant?: boolean;
  sourceActionIds?: string[];
}

export interface PlayerIntentCommand {
  verb: PlayerIntentVerbId;
  object1?: string;
  object2?: string;
  inputText?: string;
  inputNumber?: number;
}

export interface PlayerIntentCandidateView {
  verb: PlayerIntentVerbView;
  object1?: PlayerIntentTargetView;
  object2?: PlayerIntentTargetView;
  expectedInput?: InteractionInputView;
}

export interface PlayerIntentSurfaceView {
  verbs: PlayerIntentVerbView[];
  targets: PlayerIntentTargetView[];
  suggestedCandidates: PlayerIntentCandidateView[];
  sourceActionIds: string[];
}
