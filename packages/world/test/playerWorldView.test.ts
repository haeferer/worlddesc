import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  createPlayerWorldView,
  createWorldRuntime,
  loadWorldDocument,
  resolvePlayerActionFromText
} from "../src/index.js";

const testDir = dirname(fileURLToPath(import.meta.url));

async function loadSamplePlayerView() {
  const source = await readFile(resolve(testDir, "../../../sample/test.world.yaml"), "utf8");
  const runtime = createWorldRuntime(loadWorldDocument(source));
  return createPlayerWorldView({ runtime });
}

describe("PlayerWorldView", () => {
  it("builds a player-facing scene with texts, objects and ways", async () => {
    const view = await loadSamplePlayerView();

    const scene = view.getCurrentScene();

    expect(scene.roomId).toBe("wiese");
    expect(scene.preparedTexts).toEqual([
      expect.objectContaining({
        kind: "room",
        isNew: true
      })
    ]);
    expect(scene.objects.map((item) => item.objectId)).toEqual(["sonne", "kiste", "beutel"]);
    expect(scene.objects[0]?.preparedTexts[0]).toEqual(
      expect.objectContaining({
        kind: "object",
        isNew: true
      })
    );
    expect(scene.ways.map((item) => item.wayId)).toEqual(["nord"]);
    expect(scene.newEvents.map((event) => event.type)).toEqual(["room", "object", "object", "object"]);
  });

  it("drains new perception events once they are consumed", async () => {
    const view = await loadSamplePlayerView();

    expect(view.getNewEvents()).toHaveLength(4);
    expect(view.getNewEvents()).toEqual([]);

    const scene = view.getCurrentScene();
    expect(scene.newEvents).toEqual([]);
    expect(scene.preparedTexts[0]?.isNew).toBe(false);
  });

  it("surfaces newly visible objects and interaction text after actions", async () => {
    const view = await loadSamplePlayerView();

    view.getNewEvents();

    const result = view.performAction({
      kind: "interaction",
      objectId: "kiste",
      actionId: "oeffnen"
    });

    expect(result.accepted).toBe(true);
    expect(result.text).toMatch(/schluessel/i);
    expect(result.scene.objects.map((item) => item.objectId)).toEqual(["sonne", "kiste", "schluessel", "beutel"]);
    expect(result.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "interaction",
          objectId: "kiste",
          text: expect.stringMatching(/schluessel/i)
        }),
        expect.objectContaining({
          type: "object",
          objectId: "schluessel",
          text: expect.stringMatching(/schluessel/i)
        })
      ])
    );
  });

  it("returns known object information from player memory", async () => {
    const view = await loadSamplePlayerView();

    view.getCurrentScene();
    const known = view.getKnownObject("kiste");

    expect(known).toEqual(
      expect.objectContaining({
        objectId: "kiste",
        availableInteractionIds: ["ansehen", "oeffnen"]
      })
    );
    expect(known?.knownTexts[0]).toMatch(/truhe|kiste/i);
  });

  it("resolves a visible interaction from input text alone", async () => {
    const source = await readFile(resolve(testDir, "../../../sample/test.world.yaml"), "utf8");
    const runtime = createWorldRuntime(loadWorldDocument(source));

    const result = resolvePlayerActionFromText(runtime, {
      inputText: "kiste oeffnen"
    });

    expect(result).toEqual({
      status: "resolved",
      action: {
        kind: "interaction",
        objectId: "kiste",
        interactionId: "oeffnen"
      }
    });
  });

  it("resolves a way from input text alone", async () => {
    const source = await readFile(resolve(testDir, "../../../sample/test.world.yaml"), "utf8");
    const runtime = createWorldRuntime(loadWorldDocument(source));

    const result = resolvePlayerActionFromText(runtime, {
      inputText: "nord"
    });

    expect(result).toEqual({
      status: "resolved",
      action: {
        kind: "way",
        wayId: "nord"
      }
    });
  });

  it("resolves an interaction from object hint plus text", async () => {
    const source = await readFile(resolve(testDir, "../../../sample/test.world.yaml"), "utf8");
    const runtime = createWorldRuntime(loadWorldDocument(source));

    const result = resolvePlayerActionFromText(runtime, {
      inputText: "oeffnen",
      objectHintId: "kiste"
    });

    expect(result).toEqual({
      status: "resolved",
      action: {
        kind: "interaction",
        objectId: "kiste",
        interactionId: "oeffnen"
      }
    });
  });

  it("executes structured way commands", async () => {
    const view = await loadSamplePlayerView();

    view.getNewEvents();

    const result = view.performAction({
      kind: "way",
      actionId: "nord"
    });

    expect(result.accepted).toBe(true);
    expect(result.scene.roomId).toBe("wieseVorDemWald");
  });

  it("reports unavailable structured interactions with a failure code", async () => {
    const view = await loadSamplePlayerView();

    view.getNewEvents();

    const result = view.performAction({
      kind: "interaction",
      objectId: "huettenTuer",
      actionId: "oeffnen"
    });

    expect(result.accepted).toBe(false);
    expect(result.failure).toEqual({
      code: "object-not-accessible",
      message: 'Object "huettenTuer" is not currently accessible',
      objectId: "huettenTuer",
      actionId: "oeffnen"
    });
  });

  it("reports unknown structured actions with a failure code", async () => {
    const view = await loadSamplePlayerView();

    const result = view.performAction({
      kind: "interaction",
      objectId: "kiste",
      actionId: "tanzen"
    });

    expect(result.accepted).toBe(false);
    expect(result.failure).toEqual({
      code: "unknown-action",
      message: 'Unknown interaction "tanzen" on object "kiste"',
      objectId: "kiste",
      actionId: "tanzen"
    });
  });

  it("reports ambiguous text resolution with explicit candidates", async () => {
    const source = await readFile(resolve(testDir, "../../../sample/test.world.yaml"), "utf8");
    const runtime = createWorldRuntime(loadWorldDocument(source));

    const result = resolvePlayerActionFromText(runtime, {
      inputText: "oeffnen"
    });

    expect(result).toEqual({
      status: "ambiguous",
      candidates: [
        {
          kind: "interaction",
          objectId: "kiste",
          actionId: "oeffnen",
          label: "Kiste: Kiste oeffnen"
        },
        {
          kind: "interaction",
          objectId: "beutel",
          actionId: "oeffnen",
          label: "Beutel: Beutel oeffnen"
        }
      ]
    });
  });
});
