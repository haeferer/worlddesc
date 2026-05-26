import { describe, expect, it } from "vitest";

import {
  createLlmToolHost,
  createPlayerWorldView,
  createWorldRuntime,
  loadWorldDocument
} from "@worlddesc/world";
import {
  buildResponsesInputFromHistory,
  buildPersistedConversationHistory,
  callToolWithPolicy,
  createToolExecutionState,
  getResponsesToolChoice,
  trimConversationHistory
} from "../src/index.js";

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));

function loadSampleHost() {
  const source = readFileSync(resolve(testDir, "../../../sample/test.world.yaml"), "utf8");
  const runtime = createWorldRuntime(loadWorldDocument(source));
  return createLlmToolHost(createPlayerWorldView({ runtime }));
}

function loadNarrativeHost() {
  const source = readFileSync(resolve(testDir, "../../../sample/test.world.yaml"), "utf8");
  const runtime = createWorldRuntime(loadWorldDocument(source));
  return createLlmToolHost(
    createPlayerWorldView({
      runtime,
      narrativeContextProvider: {
        getSceneNarrativeContext() {
          return {
            mixId: "testMix",
            world: {
              tone: ["quiet"]
            },
            room: {
              tone: ["warm"]
            },
            objects: {}
          };
        }
      }
    })
  );
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

  it("accepts perform_action when the model adds empty additionalText", () => {
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
        command: {
          ...(resolution.command as Record<string, unknown>),
          additionalText: ""
        }
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

  it("keeps narrativeContext visible even when sampleActions are hidden", () => {
    const host = loadNarrativeHost();
    const state = createToolExecutionState();

    const result = callToolWithPolicy(host, "get_current_scene", {}, state, false) as {
      sampleActions: unknown[];
      narrativeContext?: { mixId?: string };
    };

    expect(result.sampleActions).toEqual([]);
    expect(result.narrativeContext).toEqual({
      mixId: "testMix",
      world: {
        tone: ["quiet"]
      },
      room: {
        tone: ["warm"]
      },
      objects: {}
    });
  });

  it("can retrieve curated object knowledge through tool policy", () => {
    const source = readFileSync(resolve(testDir, "../../../sample/test.world.yaml"), "utf8");
    const runtime = createWorldRuntime(loadWorldDocument(source));
    const host = createLlmToolHost(
      createPlayerWorldView({
        runtime,
        knowledgeProvider: {
          getObjectKnowledge({ objectId }) {
            return {
              scope: "object",
              targetId: objectId,
              format: "markdown",
              markdown: `# ${objectId}\n\nKuratiertes Wissen.`
            };
          }
        }
      })
    );
    const state = createToolExecutionState();

    host.callTool("get_current_scene", {});
    const result = callToolWithPolicy(
      host,
      "get_object_knowledge",
      {
        objectId: "kiste"
      },
      state,
      false
    ) as { targetId: string; format: string; markdown: string };

    expect(result.targetId).toBe("kiste");
    expect(result.format).toBe("markdown");
    expect(result.markdown).toContain("Kuratiertes Wissen");
  });

  it("trims narrativeContext to a small prioritized slice for the model", () => {
    const host = createLlmToolHost(
      createPlayerWorldView({
        runtime: createWorldRuntime(
          loadWorldDocument(readFileSync(resolve(testDir, "../../../sample/test.world.yaml"), "utf8"))
        ),
        narrativeContextProvider: {
          getSceneNarrativeContext() {
            return {
              mixId: "testMix",
              world: {
                tone: ["quiet", "rustic", "watchful"],
                associations: ["threshold", "curiosity", "small-discoveries"],
                narrativeHints: ["too-much"]
              },
              room: {
                tone: ["warm", "open", "safe"],
                sensoryHints: ["sun-on-skin", "soft-grass", "bright-air"],
                narrativeHints: ["last-light", "gentle-start", "too-much"],
                associations: ["too-much"]
              },
              objects: {
                sonne: {
                  tone: ["distant", "constant"],
                  associations: ["daylight", "summer"],
                  sensoryHints: ["too-much"]
                },
                kiste: {
                  tone: ["humble", "promising"],
                  narrativeHints: ["first-discovery", "reward"],
                  associations: ["secret", "curiosity"]
                },
                beutel: {
                  tone: ["plain", "empty"],
                  narrativeHints: ["false-lead"],
                  associations: ["craftsmanship"]
                },
                schluessel: {
                  tone: ["useful"],
                  narrativeHints: ["next-step"]
                }
              }
            };
          }
        }
      })
    );
    const state = createToolExecutionState();

    const result = callToolWithPolicy(host, "get_current_scene", {}, state, false) as {
      narrativeContext?: {
        world?: Record<string, unknown>;
        room?: Record<string, unknown>;
        objects: Record<string, Record<string, unknown>>;
      };
    };

    expect(result.narrativeContext).toEqual({
      mixId: "testMix",
      world: {
        tone: ["quiet", "rustic"],
        associations: ["threshold", "curiosity"]
      },
      room: {
        tone: ["warm", "open"],
        sensoryHints: ["sun-on-skin", "soft-grass"],
        narrativeHints: ["last-light", "gentle-start"]
      },
      objects: {
        sonne: {
          tone: ["distant", "constant"],
          associations: ["daylight", "summer"]
        },
        kiste: {
          tone: ["humble", "promising"],
          narrativeHints: ["first-discovery", "reward"]
        },
        beutel: {
          tone: ["plain", "empty"],
          narrativeHints: ["false-lead"]
        }
      }
    });
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

  it("trims persisted chat history to the configured maximum", () => {
    const trimmed = trimConversationHistory(
      [
        { role: "user", content: "eins" },
        { role: "assistant", content: "zwei" },
        { role: "user", content: "drei" },
        { role: "assistant", content: "vier" },
        { role: "user", content: "fuenf" }
      ],
      4
    );

    expect(trimmed).toEqual([
      { role: "assistant", content: "zwei" },
      { role: "user", content: "drei" },
      { role: "assistant", content: "vier" },
      { role: "user", content: "fuenf" }
    ]);
  });

  it("persists only plain user and assistant text messages between turns", () => {
    const persisted = buildPersistedConversationHistory(
      [
        { role: "user", content: "oeffne die kiste" },
        {
          role: "assistant",
          content: null,
          tool_calls: [
            {
              id: "call_1",
              type: "function",
              function: {
                name: "resolve_intent",
                arguments: "{\"intent\":{\"verb\":\"open\",\"object1\":\"kiste\"}}"
              }
            }
          ]
        },
        {
          role: "tool",
          tool_call_id: "call_1",
          content: "{\"status\":\"resolved\"}"
        },
        { role: "assistant", content: "Du hebst den Deckel." },
        { role: "user", content: "nimm den schluessel" }
      ],
      4
    );

    expect(persisted).toEqual([
      { role: "user", content: "oeffne die kiste" },
      { role: "assistant", content: "Du hebst den Deckel." },
      { role: "user", content: "nimm den schluessel" }
    ]);
  });

  it("maps persisted responses history to role-correct content item types", () => {
    const input = buildResponsesInputFromHistory([
      { role: "user", content: "oeffne die kiste" },
      { role: "assistant", content: "Du hebst den Deckel." }
    ]);

    expect(input).toEqual([
      {
        type: "message",
        role: "user",
        content: [
          {
            type: "input_text",
            text: "oeffne die kiste"
          }
        ]
      },
      {
        type: "message",
        role: "assistant",
        content: [
          {
            type: "output_text",
            text: "Du hebst den Deckel."
          }
        ]
      }
    ]);
  });

  it("forces perform_action in responses mode after a successful resolve_intent", () => {
    const state = createToolExecutionState();

    expect(getResponsesToolChoice(0, state)).toBe("required");

    state.resolvedCommandKey = "{\"kind\":\"interaction\",\"objectId\":\"kiste\",\"actionId\":\"oeffnen\"}";

    expect(getResponsesToolChoice(1, state)).toEqual({
      type: "function",
      name: "perform_action"
    });
  });
});
