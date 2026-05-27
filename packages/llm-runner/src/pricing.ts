import { readFile } from "node:fs/promises";

import type { TokenUsageAggregate } from "./usageTracker.js";

export interface ModelPricing {
  inputPer1M: number;
  cachedInputPer1M?: number;
  outputPer1M: number;
}

export interface PricingCatalog {
  version: 1;
  currency: string;
  updatedAt: string;
  sourceUrl: string;
  models: Record<string, ModelPricing>;
}

export interface SessionCostBreakdown {
  currency: string;
  model: string;
  inputCost: number;
  cachedInputCost: number;
  outputCost: number;
  totalCost: number;
}

export async function loadPricingCatalog(filePath: string): Promise<PricingCatalog> {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw) as PricingCatalog;
}

export function calculateSessionCost(
  model: string,
  usage: TokenUsageAggregate,
  pricing: PricingCatalog
): SessionCostBreakdown | undefined {
  const modelPricing = pricing.models[model];
  if (!modelPricing) {
    return undefined;
  }

  const cachedPromptTokens = Math.max(0, usage.cachedTokens);
  const regularPromptTokens = Math.max(0, usage.promptTokens - cachedPromptTokens);
  const cachedInputRate = modelPricing.cachedInputPer1M ?? modelPricing.inputPer1M;

  const inputCost = costForTokens(regularPromptTokens, modelPricing.inputPer1M);
  const cachedInputCost = costForTokens(cachedPromptTokens, cachedInputRate);
  const outputCost = costForTokens(usage.completionTokens, modelPricing.outputPer1M);

  return {
    currency: pricing.currency,
    model,
    inputCost,
    cachedInputCost,
    outputCost,
    totalCost: inputCost + cachedInputCost + outputCost
  };
}

function costForTokens(tokens: number, pricePer1M: number): number {
  return (Math.max(0, tokens) / 1_000_000) * pricePer1M;
}
