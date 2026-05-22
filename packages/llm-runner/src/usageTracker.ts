import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export interface TokenUsageRecord {
  model: string;
  recordedAt: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cachedTokens: number;
  reasoningTokens: number;
}

export interface TokenUsageAggregate {
  requests: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cachedTokens: number;
  reasoningTokens: number;
}

export interface TokenUsageFile {
  version: 1;
  updatedAt: string;
  totals: TokenUsageAggregate;
  models: Record<string, TokenUsageAggregate>;
  last?: TokenUsageRecord;
}

export interface UsageTracker {
  readonly filePath: string;
  recordCompletion(record: TokenUsageRecord): Promise<TokenUsageFile>;
  readSnapshot(): Promise<TokenUsageFile>;
}

export function createUsageTracker(filePath: string): UsageTracker {
  return {
    filePath,
    async recordCompletion(record) {
      const snapshot = await readUsageSnapshot(filePath);
      const next = applyUsageRecord(snapshot, record);
      await writeUsageSnapshot(filePath, next);
      return next;
    },
    async readSnapshot() {
      return readUsageSnapshot(filePath);
    }
  };
}

export async function readUsageSnapshot(filePath: string): Promise<TokenUsageFile> {
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<TokenUsageFile>;
    return normalizeUsageFile(parsed);
  } catch (error) {
    if (isMissingFileError(error)) {
      return createEmptyUsageFile();
    }

    throw error;
  }
}

export async function writeUsageSnapshot(filePath: string, snapshot: TokenUsageFile): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
}

export function createEmptyUsageFile(): TokenUsageFile {
  return {
    version: 1,
    updatedAt: "",
    totals: createEmptyAggregate(),
    models: {}
  };
}

export function applyUsageRecord(snapshot: TokenUsageFile, record: TokenUsageRecord): TokenUsageFile {
  const current = normalizeUsageFile(snapshot);
  const modelAggregate = current.models[record.model] ?? createEmptyAggregate();

  const nextModelAggregate = addUsageAggregate(modelAggregate, record);
  const nextTotals = addUsageAggregate(current.totals, record);

  return {
    version: 1,
    updatedAt: record.recordedAt,
    totals: nextTotals,
    models: {
      ...current.models,
      [record.model]: nextModelAggregate
    },
    last: { ...record }
  };
}

export function fromOpenAiUsage(
  model: string,
  usage: {
    prompt_tokens?: number | null;
    completion_tokens?: number | null;
    total_tokens?: number | null;
    prompt_tokens_details?: {
      cached_tokens?: number | null;
    } | null;
    completion_tokens_details?: {
      reasoning_tokens?: number | null;
    } | null;
    input_tokens?: number | null;
    output_tokens?: number | null;
    input_tokens_details?: {
      cached_tokens?: number | null;
    } | null;
    output_tokens_details?: {
      reasoning_tokens?: number | null;
    } | null;
  },
  recordedAt = new Date().toISOString()
): TokenUsageRecord {
  const promptTokens = usage.prompt_tokens ?? usage.input_tokens ?? 0;
  const completionTokens = usage.completion_tokens ?? usage.output_tokens ?? 0;
  const totalTokens = usage.total_tokens ?? promptTokens + completionTokens;
  const cachedTokens = usage.prompt_tokens_details?.cached_tokens ?? usage.input_tokens_details?.cached_tokens ?? 0;
  const reasoningTokens =
    usage.completion_tokens_details?.reasoning_tokens ?? usage.output_tokens_details?.reasoning_tokens ?? 0;

  return {
    model,
    recordedAt,
    promptTokens,
    completionTokens,
    totalTokens,
    cachedTokens,
    reasoningTokens
  };
}

function normalizeUsageFile(input: Partial<TokenUsageFile> | undefined): TokenUsageFile {
  const totals = normalizeAggregate(input?.totals);
  const models = Object.fromEntries(
    Object.entries(input?.models ?? {}).map(([model, aggregate]) => [model, normalizeAggregate(aggregate)])
  );

  return {
    version: 1,
    updatedAt: input?.updatedAt ?? "",
    totals,
    models,
    last: input?.last
      ? {
          model: input.last.model,
          recordedAt: input.last.recordedAt,
          promptTokens: input.last.promptTokens,
          completionTokens: input.last.completionTokens,
          totalTokens: input.last.totalTokens,
          cachedTokens: input.last.cachedTokens ?? 0,
          reasoningTokens: input.last.reasoningTokens ?? 0
        }
      : undefined
  };
}

function normalizeAggregate(input: Partial<TokenUsageAggregate> | undefined): TokenUsageAggregate {
  return {
    requests: input?.requests ?? 0,
    promptTokens: input?.promptTokens ?? 0,
    completionTokens: input?.completionTokens ?? 0,
    totalTokens: input?.totalTokens ?? 0,
    cachedTokens: input?.cachedTokens ?? 0,
    reasoningTokens: input?.reasoningTokens ?? 0
  };
}

function addUsageAggregate(aggregate: TokenUsageAggregate, record: TokenUsageRecord): TokenUsageAggregate {
  return {
    requests: aggregate.requests + 1,
    promptTokens: aggregate.promptTokens + record.promptTokens,
    completionTokens: aggregate.completionTokens + record.completionTokens,
    totalTokens: aggregate.totalTokens + record.totalTokens,
    cachedTokens: aggregate.cachedTokens + record.cachedTokens,
    reasoningTokens: aggregate.reasoningTokens + record.reasoningTokens
  };
}

function createEmptyAggregate(): TokenUsageAggregate {
  return {
    requests: 0,
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    cachedTokens: 0,
    reasoningTokens: 0
  };
}

function isMissingFileError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
