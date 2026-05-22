import { describe, expect, it } from "vitest";

import {
  createLlmToolHost,
  createPlayerWorldView,
  createWorldRuntime,
  loadWorldDocument
} from "@worlddesc/world";
import { callToolWithPolicy, createToolExecutionState } from "../src/index.js";

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));

function loadSampleHost() {
  const source = readFileSync(resolve(testDir, "../../../sample/test.world.yaml"), "utf8");
  const runtime = createWorldRuntime(loadWorldDocument(source));
  return createLlmToolHost(createPlayerWorldView({ runtime }));
}

describe("llm-runner tool loop policy", () => {
  it("requires resolve_intent before perform_action", () => {
    const host = loadSampleHost();
    const state = createToolExecutionState();

    const result = callToolWithPolicy(
      host,
      "perform_action",
      {
        command: {
          kind: "interaction",
          objectId: "kiste",
          actionId: "oeffnen"
        }
      },
      state
    );

    expect(result).toEqual({
      accepted: false,
      error: {
        code: "missing-resolve-intent",
        message: "perform_action requires a successful resolve_intent in the same turn"
      }
    });
  });

  it("allows perform_action after a matching resolve_intent", () => {
    const host = loadSampleHost();
    const state = createToolExecutionState();

    const resolution = callToolWithPolicy(
      host,
      "resolve_intent",
      {
        intent: {
          verb: "open",
          object1: "kiste"
        }
      },
      state
    ) as { status: string; command?: unknown };

    expect(resolution.status).toBe("resolved");

    const result = callToolWithPolicy(
      host,
      "perform_action",
      {
        command: resolution.command as Record<string, unknown>
      },
      state
    ) as { accepted: boolean; turn?: { newlyVisibleObjectIds: string[] } };

    expect(result.accepted).toBe(true);
    expect(result.turn?.newlyVisibleObjectIds).toEqual(["schluessel"]);
  });

  it("can hide sampleActions from get_current_scene for the llm", () => {
    const host = loadSampleHost();
    const state = createToolExecutionState();

    const result = callToolWithPolicy(host, "get_current_scene", {}, state, false) as {
      sampleActions: unknown[];
    };

    expect(result.sampleActions).toEqual([]);
  });

  it("can hide sampleActions from perform_action scene results for the llm", () => {
    const host = loadSampleHost();
    const state = createToolExecutionState();

    const resolution = callToolWithPolicy(
      host,
      "resolve_intent",
      {
        intent: {
          verb: "open",
          object1: "kiste"
        }
      },
      state,
      false
    ) as { status: string; command?: unknown };

    expect(resolution.status).toBe("resolved");

    const result = callToolWithPolicy(
      host,
      "perform_action",
      {
        command: resolution.command as Record<string, unknown>
      },
      state,
      false
    ) as { accepted: boolean; scene: { sampleActions: unknown[] } };

    expect(result.accepted).toBe(true);
    expect(result.scene.sampleActions).toEqual([]);
  });
});
