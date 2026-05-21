import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { loadWorldDocument, WorldValidationError } from "../src/index.js";

const testDir = dirname(fileURLToPath(import.meta.url));

async function readFixture(path: string): Promise<string> {
  return readFile(resolve(testDir, path), "utf8");
}

describe("loadWorldDocument", () => {
  it("loads the sample world and materializes default state", async () => {
    const source = await readFixture("../../../sample/test.world.yaml");
    const world = loadWorldDocument(source);

    expect(world.objects.huettenTuer.state).toEqual({
      closed: true,
      lockState: "locked"
    });
    expect(world.placement.schluessel).toEqual({
      object: "kiste"
    });
  });

  it("loads the interaction lab sample", async () => {
    const source = await readFixture("../../../sample/interaction-lab.world.yaml");
    const world = loadWorldDocument(source);

    expect(world.player.initialRoom).toBe("werkraum");
    expect(world.objects.safe.interactions?.codeEingeben?.type).toBe("input");
  });

  it("rejects placement cycles", async () => {
    const source = await readFixture("./fixtures/invalid-placement-cycle.world.yaml");

    expect(() => loadWorldDocument(source)).toThrowError(WorldValidationError);
    expect(() => loadWorldDocument(source)).toThrowError(/placement cycle detected/);
  });

  it("rejects invalid state paths against stateSchema", async () => {
    const source = await readFixture("./fixtures/invalid-state-path.world.yaml");

    expect(() => loadWorldDocument(source)).toThrowError(WorldValidationError);
    expect(() => loadWorldDocument(source)).toThrowError(/state\.clsoed/);
  });

  it("accepts prepared assetInstances without expanding them yet", () => {
    const source = `
world:
  title: Asset Preview
player:
  initialRoom: start
interactionTypes:
  examine:
    title: Untersuchen
assetInstances:
  tresor1:
    asset: safe
    rootPlacement:
      room: start
rooms:
  start:
    title: Start
    desc: Ein leerer Testraum.
objects:
  notiz:
    title: Notiz
    desc: Nur ein Platzhalterobjekt.
placement:
  notiz:
    room: start
`;

    const world = loadWorldDocument(source);

    expect(world.assetInstances?.tresor1).toEqual({
      asset: "safe",
      rootPlacement: {
        room: "start"
      }
    });
  });

  it("loads a world file and resolves asset instance references by convention", async () => {
    const fixturePath = resolve(testDir, "./fixtures/asset-host.world.yaml");

    const { loadWorldFile } = await import("../src/index.js");
    const world = await loadWorldFile(fixturePath);

    expect(world.assetInstances?.tresor1?.asset).toBe("safe");
    expect(world.objects.tresor1.title).toBe("Wandsafe");
    expect(world.objects.tresor1.state).toEqual({
      closed: true,
      locked: false
    });
    expect(world.objects.tresor1MessingSchluessel.title).toBe("Messingschluessel");
    expect(world.placement.rubin).toEqual({
      object: "tresor1"
    });
    expect(world.placement.tresor1).toEqual({
      room: "start"
    });
    expect(world.placement.tresor1MessingSchluessel).toEqual({
      object: "tresor1"
    });
    expect(world.objects.tresor1.interactions?.codeEingeben?.input?.cases?.[0]?.effects?.[0]).toMatchObject({
      ref: "tresor1"
    });
  });

  it("rejects missing asset files during file-based world loading", async () => {
    const fixturePath = resolve(testDir, "./fixtures/missing-asset-host.world.yaml");
    const { loadWorldFile } = await import("../src/index.js");

    expect(() => loadWorldDocument(`
world:
  title: Missing Asset Preview
player:
  initialRoom: start
interactionTypes:
  examine:
    title: Untersuchen
assetInstances:
  tresor1:
    asset: missingSafe
    rootPlacement:
      room: start
rooms:
  start:
    title: Start
    desc: Ein leerer Testraum.
objects:
  notiz:
    title: Notiz
    desc: Nur ein Platzhalterobjekt.
placement:
  notiz:
    room: start
`)).not.toThrow();

    await expect(loadWorldFile(fixturePath)).rejects.toThrowError(/could not be loaded/);
  });

  it("rejects unknown slot ids during asset expansion", async () => {
    const fixturePath = resolve(testDir, "./fixtures/asset-host-invalid-slot.world.yaml");
    const { loadWorldFile } = await import("../src/index.js");

    await expect(loadWorldFile(fixturePath)).rejects.toThrowError(/references unknown asset slot "missingSlot"/);
  });

  it("rejects duplicate slot assignments of the same world object", async () => {
    const fixturePath = resolve(testDir, "./fixtures/asset-host-duplicate-slot-object.world.yaml");
    const { loadWorldFile } = await import("../src/index.js");

    await expect(loadWorldFile(fixturePath)).rejects.toThrowError(/assigns object "rubin" more than once/);
  });

  it("rejects duplicate slot assignments across multiple asset instances", async () => {
    const fixturePath = resolve(testDir, "./fixtures/asset-host-duplicate-slot-across-instances.world.yaml");
    const { loadWorldFile } = await import("../src/index.js");

    await expect(loadWorldFile(fixturePath)).rejects.toThrowError(/more than once across asset instances/);
  });

  it("rejects invalid state overrides against the asset object stateSchema", async () => {
    const fixturePath = resolve(testDir, "./fixtures/asset-host-invalid-state-override.world.yaml");
    const { loadWorldFile } = await import("../src/index.js");

    await expect(loadWorldFile(fixturePath)).rejects.toThrowError(/objectOverrides\.safe\.state/);
    await expect(loadWorldFile(fixturePath)).rejects.toThrowError(/locked/);
  });

  it("rejects non-portable objects in portableOnly slots", async () => {
    const fixturePath = resolve(testDir, "./fixtures/portable-slot-host.world.yaml");
    const { loadWorldFile } = await import("../src/index.js");

    await expect(loadWorldFile(fixturePath)).rejects.toThrowError(/requires portable objects/);
  });
});
