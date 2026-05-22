import type { InteractionInputView } from "./types.js";
import type { PlayerActionCommand } from "./types.js";

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

export type PlayerIntentResolutionCode =
  | "unknown-verb"
  | "missing-object1"
  | "unknown-object1"
  | "unknown-object2"
  | "object2-not-supported"
  | "intent-not-available"
  | "ambiguous-intent";

export interface PlayerIntentResolutionIssue {
  code: PlayerIntentResolutionCode;
  message: string;
  retryable: boolean;
  verb: PlayerIntentVerbId;
  object1?: string;
  object2?: string;
  candidateActionIds?: string[];
}

export type PlayerIntentResolution =
  | {
      status: "resolved";
      command: PlayerActionCommand;
      verb: PlayerIntentVerbId;
      object1?: string;
      object2?: string;
      usedObject2AsHint: boolean;
      sourceActionId: string;
    }
  | {
      status: "rejected";
      issue: PlayerIntentResolutionIssue;
    };
