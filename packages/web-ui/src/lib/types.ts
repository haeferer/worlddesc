export interface SceneObjectView {
  objectId: string;
  title: string;
  shortDescription?: string;
}

export interface SceneWayView {
  wayId: string;
  title: string;
  desc: string;
}

export interface SceneView {
  roomId: string;
  title: string;
  description: string;
  objects: SceneObjectView[];
  ways: SceneWayView[];
  newEvents: Array<{
    id: string;
    type: string;
    text?: string;
    objectId?: string;
  }>;
  currentActionFocus?: {
    objectId?: string;
    actionId: string;
    accepted: boolean;
    primaryResultText?: string;
  };
}

export interface UiSuggestion {
  id: string;
  kind: "free-input" | "resolved-action";
  label: string;
  inputText: string;
}

export interface TranscriptEntry {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  createdAt: string;
  suggestions?: UiSuggestion[];
  debugLines?: string[];
}

export interface SessionSnapshot {
  sessionId: string;
  transcript: TranscriptEntry[];
  currentScene: SceneView;
  suggestions: UiSuggestion[];
  usage: {
    totals: {
      requests: number;
      totalTokens: number;
      cachedTokens: number;
    };
  };
  sessionUsage: {
    requests: number;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cachedTokens: number;
    reasoningTokens: number;
  };
  sessionCost?: {
    currency: string;
    model: string;
    inputCost: number;
    cachedInputCost: number;
    outputCost: number;
    totalCost: number;
  };
  warnings: {
    narrative: string[];
    knowledge: string[];
  };
  config: {
    model: string;
    apiMode: "chat" | "responses";
    debug: boolean;
    worldPath: string;
    character?: string;
    maxHistoryMessages: number;
  };
}

export interface TurnResult {
  assistantText: string;
  debugLines: string[];
  snapshot: SessionSnapshot;
}
