import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { AssetValidationError, loadObjectAssetDocument } from "../src/index.js";

const testDir = dirname(fileURLToPath(import.meta.url));

async function readFixture(path: string): Promise<string> {
  return readFile(resolve(testDir, path), "utf8");
}

describe("loadObjectAssetDocument", () => {
  it("loads the safe asset and materializes default state", async () => {
    const source = await readFixture("../../../sample/assets/safe.object-asset.yaml");
    const asset = loadObjectAssetDocument(source);

    expect(asset.asset.roots).toEqual(["safe"]);
    expect(asset.objects.safe.state).toEqual({
      closed: true,
      locked: true
    });
    expect(asset.placement.messingSchluessel).toEqual({
      object: "safe"
    });
    expect(asset.slots).toEqual({
      contents: {
        object: "safe"
      }
    });
  });

  it("rejects phase 0 roots that are not offstage", async () => {
    const source = await readFixture("./fixtures/invalid-root-placement.object-asset.yaml");

    expect(() => loadObjectAssetDocument(source)).toThrowError(AssetValidationError);
    expect(() => loadObjectAssetDocument(source)).toThrowError(/must use offstage placement/);
  });

  it("rejects asset-specific placement cycles", async () => {
    const source = await readFixture("./fixtures/invalid-placement-cycle.object-asset.yaml");

    expect(() => loadObjectAssetDocument(source)).toThrowError(AssetValidationError);
    expect(() => loadObjectAssetDocument(source)).toThrowError(/placement cycle detected/);
  });

  it("rejects slots that target missing asset objects", async () => {
    const source = await readFixture("./fixtures/invalid-slot.object-asset.yaml");

    expect(() => loadObjectAssetDocument(source)).toThrowError(AssetValidationError);
    expect(() => loadObjectAssetDocument(source)).toThrowError(/slots\.contents\.object references unknown object/);
  });
});
