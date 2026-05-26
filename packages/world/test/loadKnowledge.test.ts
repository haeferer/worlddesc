import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { KnowledgeValidationError, loadKnowledgeProviderFromDirectory, loadWorldFile } from "../src/index.js";

const testDir = dirname(fileURLToPath(import.meta.url));

describe("loadKnowledgeProviderFromDirectory", () => {
  it("loads markdown knowledge by objectId and roomId", async () => {
    const world = await loadWorldFile(resolve(testDir, "../../../sample/louvre-salon-carre.world.yaml"));
    const result = await loadKnowledgeProviderFromDirectory(
      resolve(testDir, "../../../sample/louvre-salon-carre.knowledge"),
      world
    );

    expect(result.warnings).toEqual([]);
    expect(
      result.provider.getObjectKnowledge?.({
        objectId: "uccelloSanRomano",
        roomId: "uccelloStandpunkt",
        currentlyVisible: true,
        currentlyAccessible: true,
        lastSeenAt: "uccelloStandpunkt"
      })
    ).toEqual(
      expect.objectContaining({
        scope: "object",
        targetId: "uccelloSanRomano",
        format: "markdown"
      })
    );
    expect(
      result.provider.getRoomKnowledge?.({
        roomId: "salonCarreMitte"
      })
    ).toEqual(
      expect.objectContaining({
        scope: "room",
        targetId: "salonCarreMitte",
        format: "markdown"
      })
    );
  });

  it("rejects knowledge files that target unknown ids", async () => {
    const world = await loadWorldFile(resolve(testDir, "../../../sample/test.world.yaml"));

    await expect(
      loadKnowledgeProviderFromDirectory(resolve(testDir, "../../../sample/louvre-salon-carre.knowledge"), world)
    ).rejects.toBeInstanceOf(KnowledgeValidationError);
  });
});
