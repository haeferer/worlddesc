import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  buildNarrativeGuideProviderFromMix,
  loadNarrativeGuideDocument,
  loadNarrativeGuideProviderFromMixFile,
  loadWorldDocument,
  NarrativeGuideMixingError
} from "../src/index.js";

const testDir = dirname(fileURLToPath(import.meta.url));

async function loadSampleWorld() {
  const source = await readFile(resolve(testDir, "../../../sample/test.world.yaml"), "utf8");
  return loadWorldDocument(source);
}

describe("narrative guide mixing", () => {
  it("loads a narrative guide mix file and builds a provider for the current scene slice", async () => {
    const world = await loadSampleWorld();

    const result = await loadNarrativeGuideProviderFromMixFile(
      resolve(testDir, "../../../sample/test.narrative-guide-mix.yaml"),
      world
    );

    expect(result.warnings).toEqual([]);
    expect(result.document.mixId).toBe("waldpfadDefaultMix");
    expect(result.document.layerIds).toEqual(["base", "twilight"]);
    expect(result.document.rooms.huetteInnen).toEqual({
      tone: ["musty", "enclosed", "uneasy"],
      associations: ["stale-air", "paused-time", "old-wood"],
      sensoryHints: ["damp-wood", "muffled-air", "dust"],
      narrativeHints: ["nicht-gemutlich-sondern-zurueckgehalten"]
    });

    const sceneContext = result.provider.getSceneNarrativeContext({
      roomId: "wiese",
      visibleObjectIds: ["kiste", "beutel"],
      inventoryObjectIds: [],
      knownButNotVisibleObjectIds: [],
      currentActionFocusObjectId: "kiste"
    });

    expect(sceneContext).toEqual({
      mixId: "waldpfadDefaultMix",
      world: {
        tone: ["quiet", "twilight", "watchful"],
        associations: ["threshold", "curiosity", "old-places", "small-discoveries"],
        narrativeHints: ["ruhe-vor-vertiefung", "helligkeit-verliert-boden"]
      },
      room: {
        tone: ["warm", "open", "safe"],
        associations: ["summer", "breath", "daylight"],
        sensoryHints: ["sun-on-skin", "soft-grass", "bright-air"]
      },
      objects: {
        kiste: {
          tone: ["humble", "promising"],
          associations: ["small-secret", "first-discovery"],
          narrativeHints: ["einfaches-abenteuerobjekt", "fruehe-belohnung"]
        },
        beutel: {
          tone: ["plain", "empty", "careful"],
          associations: ["false-lead", "craftsmanship"]
        }
      },
      currentActionFocusObject: {
        tone: ["humble", "promising"],
        associations: ["small-secret", "first-discovery"],
        narrativeHints: ["einfaches-abenteuerobjekt", "fruehe-belohnung"]
      }
    });
  });

  it("warns when a later layer makes no effective change", async () => {
    const world = await loadSampleWorld();
    const baseGuideSource = await readFile(resolve(testDir, "../../../sample/test.narrative-guide.yaml"), "utf8");
    const baseGuide = loadNarrativeGuideDocument(baseGuideSource);
    const duplicateGuide = loadNarrativeGuideDocument(baseGuideSource);

    const result = await buildNarrativeGuideProviderFromMix(
      {
        mix: {
          kind: "narrativeGuideMix",
          id: "duplicateMix"
        },
        layers: [
          { id: "base", guide: "./base.narrative-guide.yaml" },
          { id: "duplicate", guide: "./duplicate.narrative-guide.yaml" }
        ]
      },
      world,
      async (guideRef) => ({
        path: guideRef,
        guide: guideRef.includes("duplicate") ? duplicateGuide : baseGuide
      })
    );

    expect(result.warnings).toEqual(['Narrative guide layer "duplicate" made no effective changes']);
  });

  it("fails when a guide layer targets a room or object that does not exist in the world", async () => {
    const world = await loadSampleWorld();
    const baseGuideSource = await readFile(resolve(testDir, "../../../sample/test.narrative-guide.yaml"), "utf8");
    const baseGuide = loadNarrativeGuideDocument(baseGuideSource);
    const invalidGuide = loadNarrativeGuideDocument(`
guide:
  kind: narrativeGuide
  id: invalidGuide
rooms:
  unterirdischerTempel:
    tone: [forbidden]
`);

    await expect(
      buildNarrativeGuideProviderFromMix(
        {
          mix: {
            kind: "narrativeGuideMix",
            id: "invalidMix"
          },
          layers: [
            { id: "base", guide: "./base.narrative-guide.yaml" },
            { id: "invalid", guide: "./invalid.narrative-guide.yaml" }
          ]
        },
        world,
        async (guideRef) => ({
          path: guideRef,
          guide: guideRef.includes("invalid") ? invalidGuide : baseGuide
        })
      )
    ).rejects.toEqual(
      expect.objectContaining<NarrativeGuideMixingError>({
        name: "NarrativeGuideMixingError",
        details: [
          'Layer "invalid" (./invalid.narrative-guide.yaml): Narrative guide "invalidGuide" references unknown room "unterirdischerTempel"'
        ]
      })
    );
  });
});
