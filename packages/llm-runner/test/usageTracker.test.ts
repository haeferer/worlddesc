import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { afterEach, describe, expect, it } from "vitest";

import { createUsageTracker, fromOpenAiUsage } from "../src/usageTracker.js";

const tempDirs: string[] = [];

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

describe("llm-runner usage tracker", () => {
  it("starts with an empty snapshot when the file does not exist", async () => {
    const dir = await createTempDir();
    const tracker = createUsageTracker(join(dir, "tokens.usage.json"));

    const snapshot = await tracker.readSnapshot();

    expect(snapshot.totals).toEqual({
      requests: 0,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      cachedTokens: 0,
      reasoningTokens: 0
    });
    expect(snapshot.models).toEqual({});
  });

  it("persists cumulative token usage per model", async () => {
    const dir = await createTempDir();
    const tracker = createUsageTracker(join(dir, "tokens.usage.json"));

    await tracker.recordCompletion(
      fromOpenAiUsage("gpt-5-mini", {
        prompt_tokens: 100,
        completion_tokens: 25,
        total_tokens: 125,
        prompt_tokens_details: {
          cached_tokens: 20
        },
        completion_tokens_details: {
          reasoning_tokens: 5
        }
      }, "2026-05-22T10:00:00.000Z")
    );

    const snapshot = await tracker.recordCompletion(
      fromOpenAiUsage("gpt-5-mini", {
        prompt_tokens: 40,
        completion_tokens: 10,
        total_tokens: 50,
        prompt_tokens_details: {
          cached_tokens: 8
        },
        completion_tokens_details: {
          reasoning_tokens: 2
        }
      }, "2026-05-22T10:01:00.000Z")
    );

    expect(snapshot.totals).toEqual({
      requests: 2,
      promptTokens: 140,
      completionTokens: 35,
      totalTokens: 175,
      cachedTokens: 28,
      reasoningTokens: 7
    });
    expect(snapshot.models["gpt-5-mini"]).toEqual({
      requests: 2,
      promptTokens: 140,
      completionTokens: 35,
      totalTokens: 175,
      cachedTokens: 28,
      reasoningTokens: 7
    });
    expect(snapshot.last).toEqual({
      model: "gpt-5-mini",
      recordedAt: "2026-05-22T10:01:00.000Z",
      promptTokens: 40,
      completionTokens: 10,
      totalTokens: 50,
      cachedTokens: 8,
      reasoningTokens: 2
    });
  });

  it("also understands responses-style usage fields", () => {
    const record = fromOpenAiUsage("gpt-5-mini", {
      input_tokens: 120,
      output_tokens: 30,
      input_tokens_details: {
        cached_tokens: 50
      },
      output_tokens_details: {
        reasoning_tokens: 4
      }
    }, "2026-05-22T10:02:00.000Z");

    expect(record).toEqual({
      model: "gpt-5-mini",
      recordedAt: "2026-05-22T10:02:00.000Z",
      promptTokens: 120,
      completionTokens: 30,
      totalTokens: 150,
      cachedTokens: 50,
      reasoningTokens: 4
    });
  });
});

async function createTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "worlddesc-usage-"));
  tempDirs.push(dir);
  return dir;
}
