import OpenAI from "openai";
import {
  createLlmToolHost,
  createPlayerWorldView,
  createWorldRuntime,
  loadKnowledgeProviderFromDirectory,
  loadNarrativeGuideProviderFromMixFile,
  loadWorldFile
} from "@worlddesc/world";

import type { ReplConfig } from "./config.js";
import { buildRunnerSystemPrompt } from "./promptAssembly.js";
import type {
  RunnerSession,
  RunnerSessionConfigSummary,
  RunnerSessionSnapshot,
  RunnerToolLoopResult,
  RunnerTranscriptEntry,
  RunnerTurnResult,
  RunnerUiSuggestion
} from "./sessionTypes.js";
import { runToolLoop } from "./toolLoop.js";
import { createEmptyUsageFile, createUsageTracker, type TokenUsageAggregate } from "./usageTracker.js";

export async function createRunnerSession(config: ReplConfig): Promise<RunnerSession> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set. Put it into .env or your environment before starting the REPL.");
  }

  const world = await loadWorldFile(config.worldPath);
  const runtime = createWorldRuntime(world);
  const narrativeProviderResult = config.narrativeGuideMixPath
    ? await loadNarrativeGuideProviderFromMixFile(config.narrativeGuideMixPath, world)
    : undefined;
  const knowledgeProviderResult = config.knowledgeDirPath
    ? await loadKnowledgeProviderFromDirectory(config.knowledgeDirPath, world)
    : undefined;
  const playerView = createPlayerWorldView({
    runtime,
    narrativeContextProvider: narrativeProviderResult?.provider,
    knowledgeProvider: knowledgeProviderResult?.provider
  });
  const host = createLlmToolHost(playerView);
  const client = new OpenAI({ apiKey });
  const usageTracker = createUsageTracker(config.usageFilePath);
  const usageBaseline = (await usageTracker.readSnapshot()).totals;
  const systemPrompt = await buildRunnerSystemPrompt(config);
  const sessionId = createSessionId();
  const transcript: RunnerTranscriptEntry[] = [];
  let history: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

  return {
    id: sessionId,
    config,
    async getSnapshot() {
      return buildSnapshot({
        sessionId,
        config,
        host,
        transcript,
        usageTracker,
        usageBaseline,
        narrativeWarnings: narrativeProviderResult?.warnings ?? [],
        knowledgeWarnings: knowledgeProviderResult?.warnings ?? []
      });
    },
    async getNewEvents() {
      return host.callTool("get_new_events", {});
    },
    listTools() {
      return host.listTools();
    },
    async submitTurn(inputText) {
      const normalizedInput = inputText.trim();
      if (!normalizedInput) {
        throw new Error("User input must not be empty");
      }

      transcript.push({
        id: createTranscriptEntryId("user", transcript.length),
        role: "user",
        text: normalizedInput,
        createdAt: new Date().toISOString()
      });

      const debugLines: string[] = [];
      const result = (await runToolLoop({
        client,
        host,
        apiMode: config.apiMode,
        model: config.model,
        systemPrompt,
        userMessage: normalizedInput,
        debug: config.debug,
        maxToolRounds: config.maxToolRounds,
        maxHistoryMessages: config.maxHistoryMessages,
        includeSampleActions: config.includeSampleActions,
        usageTracker,
        history,
        onDebugLog: (debugLine) => {
          debugLines.push(debugLine);
        }
      })) as RunnerToolLoopResult;

      history = result.history;

      const snapshot = await buildSnapshot({
        sessionId,
        config,
        host,
        transcript,
        usageTracker,
        usageBaseline,
        assistantText: result.assistantText,
        assistantDebugLines: debugLines,
        narrativeWarnings: narrativeProviderResult?.warnings ?? [],
        knowledgeWarnings: knowledgeProviderResult?.warnings ?? []
      });

      return {
        assistantText: result.assistantText,
        debugLines,
        snapshot
      };
    },
    async dispose() {
      history = [];
    }
  };
}

async function buildSnapshot(input: {
  sessionId: string;
  config: ReplConfig;
  host: ReturnType<typeof createLlmToolHost>;
  transcript: RunnerTranscriptEntry[];
  usageTracker: ReturnType<typeof createUsageTracker>;
  usageBaseline: TokenUsageAggregate;
  assistantText?: string;
  assistantDebugLines?: string[];
  narrativeWarnings: string[];
  knowledgeWarnings: string[];
}): Promise<RunnerSessionSnapshot> {
  const currentScene = hostGetCurrentScene(input.host);
  const suggestions = buildUiSuggestions(currentScene);
  const usage = await input.usageTracker.readSnapshot();

  if (input.assistantText) {
    input.transcript.push({
      id: createTranscriptEntryId("assistant", input.transcript.length),
      role: "assistant",
      text: input.assistantText,
      createdAt: new Date().toISOString(),
      suggestions,
      debugLines: input.assistantDebugLines?.length ? [...input.assistantDebugLines] : undefined
    });
  }

  return {
    sessionId: input.sessionId,
    config: toConfigSummary(input.config),
    transcript: input.transcript.map((entry) => ({
      ...entry,
      suggestions: entry.suggestions ? [...entry.suggestions] : undefined,
      debugLines: entry.debugLines ? [...entry.debugLines] : undefined
    })),
    currentScene,
    suggestions,
    usage,
    sessionUsage: subtractUsageAggregate(usage.totals, input.usageBaseline),
    warnings: {
      narrative: [...input.narrativeWarnings],
      knowledge: [...input.knowledgeWarnings]
    }
  };
}

function hostGetCurrentScene(host: ReturnType<typeof createLlmToolHost>) {
  return host.callTool("get_current_scene", {});
}

function buildUiSuggestions(scene: ReturnType<typeof hostGetCurrentScene>): RunnerUiSuggestion[] {
  return scene.sampleActions.slice(0, 6).map((action) => ({
    id: action.commandId,
    kind: "resolved-action",
    label: action.title,
    inputText: action.title,
    command: action.command
  }));
}

function toConfigSummary(config: ReplConfig): RunnerSessionConfigSummary {
  return {
    worldPath: config.worldPath,
    narrativeGuideMixPath: config.narrativeGuideMixPath,
    knowledgeDirPath: config.knowledgeDirPath,
    apiMode: config.apiMode,
    model: config.model,
    debug: config.debug,
    maxToolRounds: config.maxToolRounds,
    maxHistoryMessages: config.maxHistoryMessages,
    includeSampleActions: config.includeSampleActions,
    usageFilePath: config.usageFilePath,
    character: config.character
  };
}

function createSessionId(): string {
  return `session_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function createTranscriptEntryId(role: RunnerTranscriptEntry["role"], index: number): string {
  return `${role}_${index + 1}`;
}

function subtractUsageAggregate(
  current: TokenUsageAggregate,
  baseline: TokenUsageAggregate = createEmptyUsageFile().totals
): TokenUsageAggregate {
  return {
    requests: Math.max(0, current.requests - baseline.requests),
    promptTokens: Math.max(0, current.promptTokens - baseline.promptTokens),
    completionTokens: Math.max(0, current.completionTokens - baseline.completionTokens),
    totalTokens: Math.max(0, current.totalTokens - baseline.totalTokens),
    cachedTokens: Math.max(0, current.cachedTokens - baseline.cachedTokens),
    reasoningTokens: Math.max(0, current.reasoningTokens - baseline.reasoningTokens)
  };
}
