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

async function loadInteractionLabWorld() {
  const source = await readFile(resolve(testDir, "../../../sample/interaction-lab.world.yaml"), "utf8");
  return loadWorldDocument(source);
}

async function loadInteractionLabRuntime() {
  return createWorldRuntime(await loadInteractionLabWorld());
}

async function loadInteractionLabView() {
  return createPlayerWorldView({ runtime: await loadInteractionLabRuntime() });
}

describe("interaction-lab sample", () => {
  it("loads and materializes default states", async () => {
    const world = await loadInteractionLabWorld();

    expect(world.objects.roteKiste.state).toEqual({ closed: true });
    expect(world.objects.blaueKiste.state).toEqual({ closed: true });
    expect(world.objects.glasVitrine.state).toEqual({ closed: true });
    expect(world.objects.hebel.state).toEqual({ position: "down" });
    expect(world.objects.safe.state).toEqual({ closed: true, locked: true });
    expect(world.objects.modusSchalter.state).toEqual({ mode: "aus" });
    expect(world.objects.thermostat.state).toEqual({ targetTemperature: 20 });
    expect(world.placement.silberRing).toEqual({ object: "glasVitrine" });
    expect(world.placement.messingSchluessel).toEqual({ object: "safe" });
  });

  it("exposes an opening ambiguity in text resolution", async () => {
    const runtime = await loadInteractionLabRuntime();

    const result = resolvePlayerActionFromText(runtime, {
      inputText: "oeffnen"
    });

    expect(result).toEqual({
      status: "ambiguous",
      candidates: [
        {
          kind: "interaction",
          objectId: "roteKiste",
          actionId: "oeffnen",
          label: "Rote Kiste: Rote Kiste oeffnen"
        },
        {
          kind: "interaction",
          objectId: "blaueKiste",
          actionId: "oeffnen",
          label: "Blaue Kiste: Blaue Kiste oeffnen"
        }
      ]
    });
  });

  it("exposes select and number input metadata through the player view", async () => {
    const view = await loadInteractionLabView();

    const scene = view.getCurrentScene();
    const schalter = scene.objects.find((item) => item.objectId === "modusSchalter");
    const thermostat = scene.objects.find((item) => item.objectId === "thermostat");

    expect(schalter?.availableInteractions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          actionId: "modusWaehlen",
          input: {
            mode: "select",
            required: true,
            options: [
              { value: "aus", label: "Aus" },
              { value: "an", label: "An" },
              { value: "bereit", label: "Bereit" },
              { value: "sonder", label: "Sonder" },
              { value: "boom", label: "Boom" }
            ]
          }
        })
      ])
    );

    expect(thermostat?.availableInteractions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          actionId: "temperaturSetzen",
          input: {
            mode: "number",
            required: true,
            min: 10,
            max: 40,
            step: 0.5,
            unit: "celsius"
          }
        })
      ])
    );
  });

  it("keeps known objects available in memory even after they become inaccessible again", async () => {
    const view = await loadInteractionLabView();

    view.getNewEvents();
    view.performAction({
      kind: "interaction",
      objectId: "hebel",
      actionId: "umlegen"
    });
    view.performAction({
      kind: "interaction",
      objectId: "glasVitrine",
      actionId: "oeffnen"
    });

    const knownWhenVisible = view.getKnownObject("silberRing");
    expect(knownWhenVisible?.availableInteractionIds).toEqual(["ansehen", "nehmen"]);

    view.performAction({
      kind: "interaction",
      objectId: "glasVitrine",
      actionId: "schliessen"
    });

    const knownWhenHidden = view.getKnownObject("silberRing");
    expect(knownWhenHidden).toEqual(
      expect.objectContaining({
        objectId: "silberRing",
        perception: "known",
        currentlyVisible: false,
        currentlyAccessible: false,
        accessibilityReason: "closed-container",
        availableInteractionIds: []
      })
    );
    expect(knownWhenHidden?.knownTexts[0]).toMatch(/silberring|innenkante/i);
  });

  it("reveals container contents after the right enabling sequence", async () => {
    const runtime = await loadInteractionLabRuntime();

    expect(runtime.getContainedObjectIds("glasVitrine")).toEqual(["silberRing"]);
    expect(runtime.listAvailableInteractions("glasVitrine").map((item) => item.interactionId)).toEqual(["ansehen"]);

    runtime.executeInteraction("hebel", "umlegen");

    expect(runtime.listAvailableInteractions("glasVitrine").map((item) => item.interactionId)).toEqual([
      "ansehen",
      "oeffnen"
    ]);

    runtime.executeInteraction("glasVitrine", "oeffnen");

    expect(runtime.listAvailableInteractions("silberRing").map((item) => item.interactionId)).toEqual([
      "ansehen",
      "nehmen"
    ]);
  });

  it("can gain structured knowledge from reading the note", async () => {
    const view = await loadInteractionLabView();

    view.getNewEvents();
    const result = view.performAction({
      kind: "interaction",
      objectId: "notiz",
      actionId: "lesen"
    });

    expect(result.accepted).toBe(true);
    expect(result.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "interaction",
          objectId: "notiz",
          knowledge: ["code_4862"]
        })
      ])
    );
  });

  it("keeps the safe locked on wrong code input", async () => {
    const runtime = await loadInteractionLabRuntime();

    const result = runtime.executeInteraction("safe", "codeEingeben", "1111");

    expect(result.branch).toBe("default");
    expect(result.text).toMatch(/nicht der richtige code/i);
    expect(runtime.getObjectState("safe")).toEqual({
      closed: true,
      locked: true
    });
  });

  it("unlocks the safe on correct code input and reveals the key afterwards", async () => {
    const runtime = await loadInteractionLabRuntime();

    const codeResult = runtime.executeInteraction("safe", "codeEingeben", "4862");

    expect(codeResult.branch).toBe("case");
    expect(codeResult.matchedCaseId).toBe("correctCode");
    expect(codeResult.text).toMatch(/entriegelt/i);
    expect(codeResult.say).toEqual(["Im Inneren des Safes klickt ein Bolzen zurueck."]);
    expect(runtime.getObjectState("safe")).toEqual({
      closed: true,
      locked: false
    });

    expect(runtime.listAvailableInteractions("safe").map((item) => item.interactionId)).toEqual([
      "ansehen",
      "codeEingeben",
      "oeffnen"
    ]);

    runtime.executeInteraction("safe", "oeffnen");

    expect(runtime.listAvailableInteractions("messingSchluessel").map((item) => item.interactionId)).toEqual([
      "ansehen",
      "nehmen"
    ]);
  });

  it("passes additionalText through the player view to the safe interaction", async () => {
    const view = await loadInteractionLabView();

    view.getNewEvents();
    const result = view.performAction({
      kind: "interaction",
      objectId: "safe",
      actionId: "codeEingeben",
      additionalText: "4862"
    });

    expect(result.accepted).toBe(true);
    expect(result.text).toMatch(/entriegelt/i);
    expect(result.turn).toEqual(
      expect.objectContaining({
        primaryResultText: "Der richtige Code. Der Safe ist jetzt entriegelt.",
        newlyVisibleObjectIds: [],
        newlyInventoryObjectIds: [],
        newlyKnownObjectIds: [],
        newlyAccessibleObjectIds: [],
        newlyAvailableActionIds: ["interaction:safe:oeffnen"],
        newlyKnownKnowledge: ["safe_entriegelt"]
      })
    );
    expect(result.turn?.newEventIds).toHaveLength(3);
    expect(result.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "interaction",
          objectId: "safe",
          knowledge: ["safe_entriegelt"]
        }),
        expect.objectContaining({
          type: "system",
          objectId: "safe",
          text: "Im Inneren des Safes klickt ein Bolzen zurueck."
        })
      ])
    );
  });

  it("reports missing structured input with a follow-up hint", async () => {
    const view = await loadInteractionLabView();

    const result = view.performAction({
      kind: "interaction",
      objectId: "safe",
      actionId: "codeEingeben"
    });

    expect(result.accepted).toBe(false);
    expect(result.failure).toEqual({
      code: "missing-input",
      kind: "input",
      message: 'Action "codeEingeben" requires an input value',
      retryable: true,
      objectId: "safe",
      actionId: "codeEingeben",
      followUp: {
        kind: "provide-input",
        prompt: 'Please provide a text value for "codeEingeben".',
        input: {
          mode: "text",
          required: true,
          pattern: "^\\d{4}$"
        }
      },
      details: {
        expectedInput: {
          mode: "text",
          required: true,
          pattern: "^\\d{4}$"
        }
      }
    });
  });

  it("reports invalid structured input before runtime execution", async () => {
    const view = await loadInteractionLabView();

    const safeFailure = view.performAction({
      kind: "interaction",
      objectId: "safe",
      actionId: "codeEingeben",
      additionalText: "abc"
    });
    const thermostatFailure = view.performAction({
      kind: "interaction",
      objectId: "thermostat",
      actionId: "temperaturSetzen",
      additionalText: "41"
    });
    const schalterFailure = view.performAction({
      kind: "interaction",
      objectId: "modusSchalter",
      actionId: "modusWaehlen",
      additionalText: "party"
    });

    expect(safeFailure.accepted).toBe(false);
    expect(safeFailure.failure).toEqual({
      code: "invalid-input",
      kind: "input",
      message: 'Input for "codeEingeben" does not match the required pattern',
      retryable: true,
      objectId: "safe",
      actionId: "codeEingeben",
      followUp: {
        kind: "correct-input",
        prompt: 'Please provide a text value that matches the declared format for "codeEingeben".',
        input: {
          mode: "text",
          required: true,
          pattern: "^\\d{4}$"
        }
      },
      details: {
        expectedInput: {
          mode: "text",
          required: true,
          pattern: "^\\d{4}$"
        },
        providedValue: "abc"
      }
    });

    expect(thermostatFailure.accepted).toBe(false);
    expect(thermostatFailure.failure).toEqual({
      code: "invalid-input",
      kind: "input",
      message: 'Input for "temperaturSetzen" is above the maximum value',
      retryable: true,
      objectId: "thermostat",
      actionId: "temperaturSetzen",
      followUp: {
        kind: "correct-input",
        prompt: 'Please provide a valid numeric value within the declared range for "temperaturSetzen".',
        input: {
          mode: "number",
          required: true,
          min: 10,
          max: 40,
          step: 0.5,
          unit: "celsius"
        }
      },
      details: {
        expectedInput: {
          mode: "number",
          required: true,
          min: 10,
          max: 40,
          step: 0.5,
          unit: "celsius"
        },
        providedValue: "41",
        max: 40
      }
    });

    expect(schalterFailure.accepted).toBe(false);
    expect(schalterFailure.failure).toEqual({
      code: "invalid-input",
      kind: "input",
      message: 'Input for "modusWaehlen" is not one of the allowed options',
      retryable: true,
      objectId: "modusSchalter",
      actionId: "modusWaehlen",
      followUp: {
        kind: "correct-input",
        prompt: 'Please choose one of the declared options for "modusWaehlen".',
        input: {
          mode: "select",
          required: true,
          options: [
            { value: "aus", label: "Aus" },
            { value: "an", label: "An" },
            { value: "bereit", label: "Bereit" },
            { value: "sonder", label: "Sonder" },
            { value: "boom", label: "Boom" }
          ]
        }
      },
      details: {
        expectedInput: {
          mode: "select",
          required: true,
          options: [
            { value: "aus", label: "Aus" },
            { value: "an", label: "An" },
            { value: "bereit", label: "Bereit" },
            { value: "sonder", label: "Sonder" },
            { value: "boom", label: "Boom" }
          ]
        },
        providedValue: "party",
        allowedValues: ["aus", "an", "bereit", "sonder", "boom"]
      }
    });
  });

  it("evaluates number inputs against declared range and step", async () => {
    const runtime = await loadInteractionLabRuntime();

    const success = runtime.executeInteraction("thermostat", "temperaturSetzen", "37");
    const failure = runtime.executeInteraction("thermostat", "temperaturSetzen", "41");

    expect(success.branch).toBe("case");
    expect(success.matchedCaseId).toBe("validTemperature");
    expect(success.text).toMatch(/gewuenschten wert/i);
    expect(runtime.getObjectState("thermostat")).toEqual({
      targetTemperature: 37
    });
    expect(failure.branch).toBe("default");
    expect(failure.text).toMatch(/ausserhalb/i);
    expect(runtime.getObjectState("thermostat")).toEqual({
      targetTemperature: 37
    });
  });

  it("evaluates select inputs against declared options", async () => {
    const runtime = await loadInteractionLabRuntime();

    const success = runtime.executeInteraction("modusSchalter", "modusWaehlen", "boom");
    const failure = runtime.executeInteraction("modusSchalter", "modusWaehlen", "party");

    expect(success.branch).toBe("case");
    expect(success.matchedCaseId).toBe("modeBoom");
    expect(success.text).toMatch(/auf boom/i);
    expect(runtime.getObjectState("modusSchalter")).toEqual({
      mode: "boom"
    });
    expect(failure.branch).toBe("default");
    expect(failure.text).toMatch(/gibt es hier nicht/i);
    expect(runtime.getObjectState("modusSchalter")).toEqual({
      mode: "boom"
    });
  });
});
