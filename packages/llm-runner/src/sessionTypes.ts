import type OpenAI from "openai";
import type { FirstLlmToolSpec } from "@worlddesc/world";
import type { PlayerActionCommand, PlayerSceneView } from "@worlddesc/world";

import type { ReplConfig } from "./config.js";
import type { TokenUsageFile } from "./usageTracker.js";

export interface RunnerSessionConfigSummary {
  worldPath: string;
  narrativeGuideMixPath?: string;
  knowledgeDirPath?: string;
  apiMode: ReplConfig["apiMode"];
  model: string;
  debug: boolean;
  maxToolRounds: number;
  maxHistoryMessages: number;
  includeSampleActions: boolean;
  usageFilePath: string;
  character?: string;
}

export interface RunnerUiSuggestion {
  id: string;
  kind: "free-input" | "resolved-action";
  label: string;
  inputText: string;
  command?: PlayerActionCommand;
}

export interface RunnerTranscriptEntry {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  createdAt: string;
  suggestions?: RunnerUiSuggestion[];
  debugLines?: string[];
}

export interface RunnerSessionSnapshot {
  sessionId: string;
  config: RunnerSessionConfigSummary;
  transcript: RunnerTranscriptEntry[];
  currentScene: PlayerSceneView;
  suggestions: RunnerUiSuggestion[];
  usage: TokenUsageFile;
  warnings: {
    narrative: string[];
    knowledge: string[];
  };
}

export interface RunnerTurnResult {
  assistantText: string;
  debugLines: string[];
  snapshot: RunnerSessionSnapshot;
}

export interface RunnerSession {
  readonly id: string;
  readonly config: ReplConfig;
  getSnapshot(): Promise<RunnerSessionSnapshot>;
  getNewEvents(): Promise<PlayerSceneView["newEvents"]>;
  listTools(): FirstLlmToolSpec[];
  submitTurn(inputText: string): Promise<RunnerTurnResult>;
  dispose(): Promise<void>;
}

export interface RunnerToolLoopResult {
  assistantText: string;
  history: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
}
