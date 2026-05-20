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

  it("rejects placement cycles", async () => {
    const source = await readFixture("./fixtures/invalid-placement-cycle.world.yaml");

    expect(() => loadWorldDocument(source)).toThrowError(WorldValidationError);
    expect(() => loadWorldDocument(source)).toThrowError(/placement cycle detected/);
  });
});
