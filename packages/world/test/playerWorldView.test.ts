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

async function loadInteractionLabPlayerView() {
  const source = await readFile(resolve(testDir, "../../../sample/interaction-lab.world.yaml"), "utf8");
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
    expect(scene.objects.every((item) => item.visible)).toBe(true);
    expect(scene.objects.every((item) => item.perception === "visible")).toBe(true);
    expect(scene.objects.every((item) => item.accessibilityReason === "visible")).toBe(true);
    expect(scene.objects[0]?.preparedTexts[0]).toEqual(
      expect.objectContaining({
        kind: "object",
        isNew: true
      })
    );
    expect(scene.ways.map((item) => item.wayId)).toEqual(["nord"]);
    expect(scene.inventoryObjects).toEqual([]);
    expect(scene.knownButNotVisibleObjects).toEqual([]);
    expect(scene.currentActionFocus).toBeUndefined();
    expect(scene.sampleActions.map((item) => item.commandId)).toEqual([
      "way:nord",
      "interaction:sonne:ansehen",
      "interaction:kiste:ansehen",
      "interaction:kiste:oeffnen",
      "interaction:beutel:ansehen",
      "interaction:beutel:oeffnen"
    ]);
    expect(scene.newEvents.map((event) => event.type)).toEqual(["room", "object", "object", "object"]);
  });

  it("builds an intent surface from the current scene without treating it as a hard whitelist", async () => {
    const view = await loadSamplePlayerView();

    const intentSurface = view.getIntentSurface();

    expect(intentSurface.verbs.map((item) => item.id)).toEqual([
      "go",
      "examine",
      "open",
      "close",
      "take",
      "unlock",
      "use",
      "put",
      "toggle",
      "read",
      "input"
    ]);
    expect(
      intentSurface.verbs.filter((item) => item.sceneRelevant).map((item) => ({
        id: item.id,
        sourceActionIds: item.sourceActionIds
      }))
    ).toEqual([
      {
        id: "go",
        sourceActionIds: ["way:nord"]
      },
      {
        id: "examine",
        sourceActionIds: [
          "interaction:sonne:ansehen",
          "interaction:kiste:ansehen",
          "interaction:beutel:ansehen"
        ]
      },
      {
        id: "open",
        sourceActionIds: ["interaction:kiste:oeffnen", "interaction:beutel:oeffnen"]
      }
    ]);
    expect(intentSurface.targets.map((item) => item.id)).toEqual(["sonne", "kiste", "beutel", "nord"]);
    expect(intentSurface.sourceActionIds).toEqual([
      "way:nord",
      "interaction:sonne:ansehen",
      "interaction:kiste:ansehen",
      "interaction:kiste:oeffnen",
      "interaction:beutel:ansehen",
      "interaction:beutel:oeffnen"
    ]);
    expect(intentSurface.suggestedCandidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          verb: expect.objectContaining({
            id: "open",
            allowsObject1: true,
            allowsObject2: false
          }),
          object1: expect.objectContaining({
            id: "kiste",
            kind: "object"
          })
        })
      ])
    );
  });

  it("maps richer scene actions onto the fixed intent verb inventory", async () => {
    const view = await loadInteractionLabPlayerView();

    const intentSurface = view.getIntentSurface();

    expect(
      intentSurface.verbs.filter((item) => item.sceneRelevant).map((item) => item.id)
    ).toEqual(["examine", "open", "toggle", "read", "input"]);
    expect(intentSurface.suggestedCandidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          verb: expect.objectContaining({ id: "read" }),
          object1: expect.objectContaining({ id: "notiz" })
        }),
        expect.objectContaining({
          verb: expect.objectContaining({ id: "toggle" }),
          object1: expect.objectContaining({ id: "hebel" })
        }),
        expect.objectContaining({
          verb: expect.objectContaining({ id: "input" }),
          object1: expect.objectContaining({ id: "safe" }),
          expectedInput: expect.objectContaining({ mode: "text" })
        }),
        expect.objectContaining({
          verb: expect.objectContaining({ id: "input" }),
          object1: expect.objectContaining({ id: "thermostat" }),
          expectedInput: expect.objectContaining({ mode: "number" })
        }),
        expect.objectContaining({
          verb: expect.objectContaining({ id: "input" }),
          object1: expect.objectContaining({ id: "modusSchalter" }),
          expectedInput: expect.objectContaining({ mode: "select" })
        })
      ])
    );
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
    expect(result.turn).toEqual(
      expect.objectContaining({
        primaryResultText: "Du hebst den Deckel. In der Kiste liegt ein kleiner Eisenschluessel.",
        newlyVisibleObjectIds: ["schluessel"],
        newlyInventoryObjectIds: [],
        newlyKnownObjectIds: ["schluessel"],
        newlyAccessibleObjectIds: ["schluessel"],
        newlyAvailableActionIds: ["interaction:schluessel:ansehen", "interaction:schluessel:nehmen"],
        newlyKnownKnowledge: []
      })
    );
    expect(result.turn?.newEventIds).toHaveLength(2);
    expect(result.turn?.newEventIds).toContain("object:schluessel:desc");
    expect(result.scene.currentActionFocus).toEqual({
      objectId: "kiste",
      actionId: "oeffnen",
      accepted: true,
      primaryResultText: "Du hebst den Deckel. In der Kiste liegt ein kleiner Eisenschluessel."
    });
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
        perception: "visible",
        currentlyVisible: true,
        currentlyAccessible: true,
        accessibilityReason: "visible",
        availableInteractionIds: ["ansehen", "oeffnen"]
      })
    );
    expect(known?.knownTexts[0]).toMatch(/truhe|kiste/i);
  });

  it("surfaces inventory objects in the scene after taking them", async () => {
    const view = await loadSamplePlayerView();

    view.getNewEvents();
    view.performAction({
      kind: "interaction",
      objectId: "kiste",
      actionId: "oeffnen"
    });
    const result = view.performAction({
      kind: "interaction",
      objectId: "schluessel",
      actionId: "nehmen"
    });

    expect(result.scene.inventoryObjectIds).toEqual(["schluessel"]);
    expect(result.scene.inventoryObjects.map((item) => item.objectId)).toEqual(["schluessel"]);
    expect(result.scene.inventoryObjects[0]).toEqual(
      expect.objectContaining({
        perception: "inventory",
        accessible: true,
        accessibilityReason: "inventory"
      })
    );
    expect(result.turn).toEqual(
      expect.objectContaining({
        primaryResultText: "Du nimmst den kleinen Eisenschluessel an dich.",
        newlyVisibleObjectIds: [],
        newlyInventoryObjectIds: ["schluessel"],
        newlyKnownObjectIds: [],
        newlyAccessibleObjectIds: [],
        newlyAvailableActionIds: [],
        newlyKnownKnowledge: []
      })
    );
    expect(result.turn?.newEventIds).toHaveLength(1);
    expect(result.scene.currentActionFocus).toEqual({
      objectId: "schluessel",
      actionId: "nehmen",
      accepted: true,
      primaryResultText: "Du nimmst den kleinen Eisenschluessel an dich."
    });
    expect(result.scene.sampleActions.map((item) => item.commandId)).toContain("interaction:schluessel:ansehen");
  });

  it("keeps known but currently invisible objects separate from the visible scene", async () => {
    const view = await loadSamplePlayerView();

    view.getNewEvents();
    view.performAction({
      kind: "interaction",
      objectId: "kiste",
      actionId: "oeffnen"
    });
    view.performAction({
      kind: "interaction",
      objectId: "schluessel",
      actionId: "nehmen"
    });
    view.performAction({
      kind: "way",
      actionId: "nord"
    });
    view.performAction({
      kind: "interaction",
      objectId: "huettenTuer",
      actionId: "entriegeln"
    });
    view.performAction({
      kind: "interaction",
      objectId: "huettenTuer",
      actionId: "oeffnen"
    });
    view.performAction({
      kind: "way",
      actionId: "huette"
    });
    const afterLeaving = view.performAction({
      kind: "way",
      actionId: "raus"
    });

    expect(afterLeaving.scene.knownButNotVisibleObjects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          objectId: "laterne",
          perception: "known",
          currentlyAccessible: false,
          accessibilityReason: "other-room",
          lastSeenAt: "huetteInnen"
        })
      ])
    );
    expect(afterLeaving.scene.objects.map((item) => item.objectId)).not.toContain("laterne");
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

  it("resolves a simple intent command into a structured action", async () => {
    const view = await loadSamplePlayerView();

    const result = view.resolveIntent({
      verb: "open",
      object1: "kiste"
    });

    expect(result).toEqual({
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
  });

  it("supports object2 as a validated hint on unlock intents", async () => {
    const view = await loadSamplePlayerView();

    view.getNewEvents();
    view.performAction({
      kind: "interaction",
      objectId: "kiste",
      actionId: "oeffnen"
    });
    view.performAction({
      kind: "interaction",
      objectId: "schluessel",
      actionId: "nehmen"
    });
    view.performAction({
      kind: "way",
      actionId: "nord"
    });

    const resolution = view.resolveIntent({
      verb: "unlock",
      object1: "huettenTuer",
      object2: "schluessel"
    });

    expect(resolution).toEqual({
      status: "resolved",
      command: {
        kind: "interaction",
        objectId: "huettenTuer",
        actionId: "entriegeln"
      },
      verb: "unlock",
      object1: "huettenTuer",
      object2: "schluessel",
      usedObject2AsHint: true,
      sourceActionId: "interaction:huettenTuer:entriegeln"
    });
  });

  it("resolves lantern ignition as a toggle intent once the lantern is reachable", async () => {
    const view = await loadSamplePlayerView();

    view.getNewEvents();
    view.performAction({
      kind: "interaction",
      objectId: "kiste",
      actionId: "oeffnen"
    });
    view.performAction({
      kind: "interaction",
      objectId: "schluessel",
      actionId: "nehmen"
    });
    view.performAction({
      kind: "way",
      actionId: "nord"
    });
    view.performAction({
      kind: "interaction",
      objectId: "huettenTuer",
      actionId: "entriegeln"
    });
    view.performAction({
      kind: "interaction",
      objectId: "huettenTuer",
      actionId: "oeffnen"
    });
    view.performAction({
      kind: "way",
      actionId: "huette"
    });

    const resolution = view.resolveIntent({
      verb: "toggle",
      object1: "laterne"
    });

    expect(resolution).toEqual({
      status: "resolved",
      command: {
        kind: "interaction",
        objectId: "laterne",
        actionId: "einschalten"
      },
      verb: "toggle",
      object1: "laterne",
      object2: undefined,
      usedObject2AsHint: false,
      sourceActionId: "interaction:laterne:einschalten"
    });
  });

  it("rejects object2 on verbs that do not support a second target yet", async () => {
    const view = await loadInteractionLabPlayerView();

    const resolution = view.resolveIntent({
      verb: "open",
      object1: "roteKiste",
      object2: "blaueKiste"
    });

    expect(resolution).toEqual({
      status: "rejected",
      issue: {
        code: "object2-not-supported",
        message: 'Intent verb "open" does not currently support object2',
        retryable: true,
        verb: "open",
        object1: "roteKiste",
        object2: "blaueKiste",
        candidateActionIds: undefined
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
      kind: "availability",
      message: 'Object "huettenTuer" is not currently accessible',
      retryable: false,
      objectId: "huettenTuer",
      actionId: "oeffnen"
    });
    expect(result.scene.currentActionFocus).toEqual({
      objectId: "huettenTuer",
      actionId: "oeffnen",
      accepted: false,
      primaryResultText: 'Object "huettenTuer" is not currently accessible'
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
      kind: "unknown",
      message: 'Unknown interaction "tanzen" on object "kiste"',
      retryable: false,
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
