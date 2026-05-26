import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  createLlmToolHost,
  loadKnowledgeProviderFromDirectory,
  createPlayerWorldView,
  createWorldRuntime,
  loadWorldDocument
} from "../src/index.js";

const testDir = dirname(fileURLToPath(import.meta.url));

async function loadSampleToolHost() {
  const source = await readFile(resolve(testDir, "../../../sample/test.world.yaml"), "utf8");
  const runtime = createWorldRuntime(loadWorldDocument(source));
  return createLlmToolHost(createPlayerWorldView({ runtime }));
}

async function loadInteractionLabToolHost() {
  const source = await readFile(resolve(testDir, "../../../sample/interaction-lab.world.yaml"), "utf8");
  const runtime = createWorldRuntime(loadWorldDocument(source));
  return createLlmToolHost(createPlayerWorldView({ runtime }));
}

async function loadNarrativeToolHost() {
  const source = await readFile(resolve(testDir, "../../../sample/test.world.yaml"), "utf8");
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

async function loadKnowledgeToolHost() {
  const source = await readFile(resolve(testDir, "../../../sample/louvre-salon-carre.world.yaml"), "utf8");
  const runtime = createWorldRuntime(loadWorldDocument(source));
  const providerResult = await loadKnowledgeProviderFromDirectory(
    resolve(testDir, "../../../sample/louvre-salon-carre.knowledge"),
    runtime.world
  );
  return createLlmToolHost(
    createPlayerWorldView({
      runtime,
      knowledgeProvider: providerResult.provider
    })
  );
}

describe("LlmToolHost", () => {
  it("lists the first tool contract in a stable order", async () => {
    const host = await loadSampleToolHost();

    expect(host.listTools().map((tool) => tool.name)).toEqual([
      "get_current_scene",
      "get_known_object",
      "get_object_knowledge",
      "resolve_intent",
      "perform_action",
      "get_new_events"
    ]);
  });

  it("returns the current scene through the tool host", async () => {
    const host = await loadSampleToolHost();

    const scene = host.callTool("get_current_scene", {});

    expect(scene.roomId).toBe("wiese");
    expect(scene.objects.map((item) => item.objectId)).toEqual(["sonne", "kiste", "beutel"]);
    expect(scene.sampleActions.map((item) => item.commandId)).toContain("interaction:kiste:oeffnen");
    expect(scene.currentActionFocus).toBeUndefined();
  });

  it("passes through the optional narrative context slice in the current scene", async () => {
    const host = await loadNarrativeToolHost();

    const scene = host.callTool("get_current_scene", {});

    expect(scene.narrativeContext).toEqual({
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

  it("can resolve and execute a simple open flow through tools", async () => {
    const host = await loadSampleToolHost();

    host.callTool("get_new_events", {});
    const resolution = host.callTool("resolve_intent", {
      intent: {
        verb: "open",
        object1: "kiste"
      }
    });

    expect(resolution).toEqual({
      status: "resolved",
      command: {
        kind: "interaction",
        objectId: "kiste",
        actionId: "oeffnen"
      },
      verb: "open",
      object1: "kiste",
      object2: undefined,
      usedObject2AsHint: false,
      sourceActionId: "interaction:kiste:oeffnen"
    });

    if (resolution.status !== "resolved") {
      throw new Error("Expected resolved intent");
    }

    const result = host.callTool("perform_action", {
      command: resolution.command
    });

    expect(result.accepted).toBe(true);
    expect(result.scene.currentActionFocus).toEqual({
      objectId: "kiste",
      actionId: "oeffnen",
      accepted: true,
      primaryResultText: "Du hebst den Deckel. In der Kiste liegt ein kleiner Eisenschluessel."
    });
    expect(result.turn).toEqual(
      expect.objectContaining({
        newlyVisibleObjectIds: ["schluessel"],
        newlyAvailableActionIds: ["interaction:schluessel:ansehen", "interaction:schluessel:nehmen"]
      })
    );
  });

  it("returns known object details through the tool host", async () => {
    const host = await loadSampleToolHost();

    host.callTool("get_current_scene", {});
    const known = host.callTool("get_known_object", {
      objectId: "kiste"
    });

    expect(known).toEqual(
      expect.objectContaining({
        objectId: "kiste",
        perception: "visible",
        currentlyAccessible: true
      })
    );
  });

  it("returns curated object knowledge through the tool host", async () => {
    const host = await loadKnowledgeToolHost();

    host.callTool("perform_action", {
      command: {
        kind: "way",
        actionId: "zuCimabue"
      }
    });
    const knowledge = host.callTool("get_object_knowledge", {
      objectId: "cimabueMaesta"
    });

    expect(knowledge).toEqual(
      expect.objectContaining({
        scope: "object",
        targetId: "cimabueMaesta",
        format: "markdown"
      })
    );
    expect(knowledge?.markdown).toContain("Cimabue");
  });

  it("drains new events through the tool host", async () => {
    const host = await loadSampleToolHost();

    expect(host.callTool("get_new_events", {})).toHaveLength(4);
    expect(host.callTool("get_new_events", {})).toEqual([]);
  });

  it("supports an input flow through resolve_intent and perform_action", async () => {
    const host = await loadInteractionLabToolHost();

    host.callTool("get_new_events", {});
    const resolution = host.callTool("resolve_intent", {
      intent: {
        verb: "input",
        object1: "safe",
        inputText: "4862"
      }
    });

    expect(resolution.status).toBe("resolved");
    if (resolution.status !== "resolved") {
      throw new Error("Expected resolved input intent");
    }

    const result = host.callTool("perform_action", {
      command: resolution.command
    });

    expect(result.accepted).toBe(true);
    expect(result.turn).toEqual(
      expect.objectContaining({
        newlyAvailableActionIds: ["interaction:safe:oeffnen"],
        newlyKnownKnowledge: ["safe_entriegelt"]
      })
    );
  });
});
