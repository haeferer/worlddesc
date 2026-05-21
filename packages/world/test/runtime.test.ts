import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { createWorldRuntime, loadWorldDocument, loadWorldFile } from "../src/index.js";

const testDir = dirname(fileURLToPath(import.meta.url));

async function loadSampleRuntime() {
  const source = await readFile(resolve(testDir, "../../../sample/test.world.yaml"), "utf8");
  return createWorldRuntime(loadWorldDocument(source));
}

async function loadAssetRuntime(fixtureName: string) {
  return createWorldRuntime(await loadWorldFile(resolve(testDir, `./fixtures/${fixtureName}`)));
}

describe("WorldRuntime", () => {
  it("lists room objects and contained objects from placement", async () => {
    const runtime = await loadSampleRuntime();

    expect(runtime.getCurrentRoomId()).toBe("wiese");
    expect(runtime.getRoomObjectIds()).toEqual(["sonne", "kiste", "beutel"]);
    expect(runtime.getContainedObjectIds("kiste")).toEqual(["schluessel"]);
  });

  it("applies interaction effects and returns updated state", async () => {
    const runtime = await loadSampleRuntime();

    const result = runtime.executeInteraction("kiste", "oeffnen");

    expect(result.text).toMatch(/schluessel/i);
    expect(runtime.getObjectState("kiste")).toEqual({
      closed: false
    });
  });

  it("moves portable objects from open containers into inventory", async () => {
    const runtime = await loadSampleRuntime();

    runtime.executeInteraction("kiste", "oeffnen");

    expect(runtime.listAvailableInteractions("schluessel").map((item) => item.interactionId)).toEqual([
      "ansehen",
      "nehmen"
    ]);

    runtime.executeInteraction("schluessel", "nehmen");

    expect(runtime.getInventoryObjectIds()).toEqual(["schluessel"]);
    expect(runtime.getContainedObjectIds("kiste")).toEqual([]);
  });

  it("respects conditional way availability", async () => {
    const runtime = await loadSampleRuntime();

    expect(runtime.canUseWay("huette", "wieseVorDemWald")).toBe(false);

    runtime.executeInteraction("kiste", "oeffnen");
    runtime.executeInteraction("schluessel", "nehmen");
    runtime.executeWay("nord");
    runtime.executeInteraction("huettenTuer", "entriegeln");
    runtime.executeInteraction("huettenTuer", "oeffnen");

    expect(runtime.canUseWay("huette")).toBe(true);
  });

  it("filters interactions by current state", async () => {
    const runtime = await loadSampleRuntime();

    runtime.executeInteraction("kiste", "oeffnen");
    runtime.executeInteraction("schluessel", "nehmen");
    runtime.executeWay("nord");

    expect(runtime.listAvailableInteractions("huettenTuer").map((item) => item.interactionId)).toEqual([
      "ansehen",
      "entriegeln"
    ]);

    runtime.executeInteraction("huettenTuer", "entriegeln");

    expect(runtime.listAvailableInteractions("huettenTuer").map((item) => item.interactionId)).toEqual([
      "ansehen",
      "oeffnen"
    ]);
  });

  it("requires the key in inventory before unlocking the door", async () => {
    const runtime = await loadSampleRuntime();

    runtime.executeWay("nord");
    expect(runtime.listAvailableInteractions("huettenTuer").map((item) => item.interactionId)).toEqual(["ansehen"]);

    runtime.executeWay("sued");
    runtime.executeInteraction("kiste", "oeffnen");
    runtime.executeInteraction("schluessel", "nehmen");
    runtime.executeWay("nord");

    expect(runtime.listAvailableInteractions("huettenTuer").map((item) => item.interactionId)).toEqual([
      "ansehen",
      "entriegeln"
    ]);
  });

  it("reaches the inside of the hut end-to-end", async () => {
    const runtime = await loadSampleRuntime();

    runtime.executeInteraction("kiste", "oeffnen");
    runtime.executeInteraction("schluessel", "nehmen");
    runtime.executeWay("nord");
    runtime.executeInteraction("huettenTuer", "entriegeln");
    runtime.executeInteraction("huettenTuer", "oeffnen");
    runtime.executeWay("huette");

    expect(runtime.getCurrentRoomId()).toBe("huetteInnen");
    expect(runtime.getRoomObjectIds()).toEqual(["laterne"]);
    expect(runtime.listAvailableWays().map((item) => item.wayId)).toEqual(["raus"]);
  });

  it("does not allow entering the dark forest without the lantern", async () => {
    const runtime = await loadSampleRuntime();

    runtime.executeInteraction("kiste", "oeffnen");
    runtime.executeInteraction("schluessel", "nehmen");
    runtime.executeWay("nord");
    runtime.executeInteraction("huettenTuer", "entriegeln");
    runtime.executeInteraction("huettenTuer", "oeffnen");

    expect(runtime.canUseWay("nord", "wieseVorDemWald")).toBe(false);
  });

  it("allows entering the dark forest with a lit lantern", async () => {
    const runtime = await loadSampleRuntime();

    runtime.executeInteraction("kiste", "oeffnen");
    runtime.executeInteraction("schluessel", "nehmen");
    runtime.executeWay("nord");
    runtime.executeInteraction("huettenTuer", "entriegeln");
    runtime.executeInteraction("huettenTuer", "oeffnen");
    runtime.executeWay("huette");
    runtime.executeInteraction("laterne", "nehmen");
    runtime.executeInteraction("laterne", "einschalten");
    runtime.executeWay("raus");

    expect(runtime.canUseWay("nord")).toBe(true);

    runtime.executeWay("nord");

    expect(runtime.getCurrentRoomId()).toBe("dunklerWald");
    expect(runtime.listAvailableWays().map((item) => item.wayId)).toEqual(["sued"]);
  });

  it("runs a real expanded tresor1 instance with overrides", async () => {
    const runtime = await loadAssetRuntime("asset-host.world.yaml");

    expect(runtime.getRoomObjectIds()).toEqual(["notiz", "tresor1"]);
    expect(runtime.getObjectState("tresor1")).toEqual({
      closed: true,
      locked: false
    });
    expect(runtime.isObjectAccessible("rubin")).toBe(false);
    expect(runtime.getContainedObjectIds("tresor1")).toEqual(["rubin", "tresor1MessingSchluessel"]);

    runtime.executeInteraction("tresor1", "oeffnen");

    expect(runtime.getObjectState("tresor1")).toEqual({
      closed: false,
      locked: false
    });
    expect(runtime.listAvailableInteractions("tresor1MessingSchluessel").map((item) => item.interactionId)).toEqual([]);
    expect(runtime.getContainedObjectIds("tresor1")).toEqual(["rubin", "tresor1MessingSchluessel"]);
    expect(runtime.isObjectAccessible("rubin")).toBe(true);
  });

  it("can unlock and open a real expanded tresor1 instance without overrides", async () => {
    const runtime = await loadAssetRuntime("asset-host-locked.world.yaml");

    expect(runtime.getObjectState("tresor1")).toEqual({
      closed: true,
      locked: true
    });

    runtime.executeInteraction("tresor1", "codeEingeben", "4862");
    runtime.executeInteraction("tresor1", "oeffnen");

    expect(runtime.getObjectState("tresor1")).toEqual({
      closed: false,
      locked: false
    });
    expect(runtime.getContainedObjectIds("tresor1")).toEqual(["rubin", "tresor1MessingSchluessel"]);
  });

  it("keeps two expanded safe instances separate", async () => {
    const runtime = await loadAssetRuntime("asset-host-double.world.yaml");

    expect(runtime.getRoomObjectIds()).toEqual(["tresor1", "tresor2"]);
    expect(runtime.getObjectState("tresor1")).toEqual({
      closed: true,
      locked: false
    });
    expect(runtime.getObjectState("tresor2")).toEqual({
      closed: true,
      locked: true
    });

    runtime.executeInteraction("tresor1", "oeffnen");
    runtime.executeInteraction("tresor2", "codeEingeben", "4862");
    runtime.executeInteraction("tresor2", "oeffnen");

    expect(runtime.getContainedObjectIds("tresor1")).toEqual(["rubin", "tresor1MessingSchluessel"]);
    expect(runtime.getContainedObjectIds("tresor2")).toEqual(["saphir", "tresor2MessingSchluessel"]);
    expect(runtime.isObjectAccessible("rubin")).toBe(true);
    expect(runtime.isObjectAccessible("saphir")).toBe(true);
  });

  it("keeps slot content inaccessible until the owning safe is open", async () => {
    const runtime = await loadAssetRuntime("asset-host-locked.world.yaml");

    expect(runtime.isObjectAccessible("rubin")).toBe(false);
    expect(runtime.listAvailableInteractions("rubin")).toEqual([]);

    runtime.executeInteraction("tresor1", "codeEingeben", "4862");
    expect(runtime.isObjectAccessible("rubin")).toBe(false);

    runtime.executeInteraction("tresor1", "oeffnen");

    expect(runtime.isObjectAccessible("rubin")).toBe(true);
  });
});
