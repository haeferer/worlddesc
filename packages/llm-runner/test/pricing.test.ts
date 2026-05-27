import { describe, expect, it } from "vitest";

import { calculateSessionCost } from "../src/pricing.js";

describe("pricing", () => {
  it("calculates session costs from prompt, cached and output tokens", () => {
    const result = calculateSessionCost(
      "gpt-5.4-mini",
      {
        requests: 1,
        promptTokens: 10_000,
        completionTokens: 2_000,
        totalTokens: 12_000,
        cachedTokens: 4_000,
        reasoningTokens: 0
      },
      {
        version: 1,
        currency: "USD",
        updatedAt: "2026-05-27",
        sourceUrl: "https://openai.com/api/pricing",
        models: {
          "gpt-5.4-mini": {
            inputPer1M: 0.75,
            cachedInputPer1M: 0.075,
            outputPer1M: 4.5
          }
        }
      }
    );

    expect(result?.currency).toBe("USD");
    expect(result?.model).toBe("gpt-5.4-mini");
    expect(result?.inputCost).toBeCloseTo(0.0045);
    expect(result?.cachedInputCost).toBeCloseTo(0.0003);
    expect(result?.outputCost).toBeCloseTo(0.009);
    expect(result?.totalCost).toBeCloseTo(0.0138);
  });
});
