import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";

import {
  createProjectScaffold,
  loadNarrativeGuideMixFile,
  loadWorldFile
} from "../src/index.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("createProjectScaffold", () => {
  it("creates a ready-to-author scaffold project", async () => {
    const baseDir = await mkdtemp(join(tmpdir(), "worlddesc-create-"));
    tempDirs.push(baseDir);
    const targetDir = join(baseDir, "forest-notes");

    const result = await createProjectScaffold({ targetDir });

    expect(result.packageName).toBe("forest-notes");
    expect(basename(result.targetDir)).toBe("forest-notes");
    expect(result.createdFiles).toContain("world/main.world.yaml");
    expect(result.createdFiles).toContain("world/guides/main.narrative-guide.yaml");
    expect(result.createdFiles).toContain("AGENTS.md");

    const packageJson = JSON.parse(await readFile(join(targetDir, "package.json"), "utf8")) as {
      scripts: Record<string, string>;
      dependencies: Record<string, string>;
    };
    expect(packageJson.scripts.checkworld).toContain("worlddesc checkworld");
    expect(packageJson.dependencies["@worlddesc/world"]).toMatch(/^\^0\.1\./);
    expect(packageJson.dependencies["@worlddesc/llm-runner"]).toMatch(/^\^0\.1\./);

    const npmrc = await readFile(join(targetDir, ".npmrc"), "utf8");
    expect(npmrc).toContain("registry=https://ttnpm.ttdev.local/");

    const world = await loadWorldFile(join(targetDir, "world", "main.world.yaml"));
    expect(world.world.title).toBe("Forest Notes");
    expect(world.rooms.huetteInnen.title).toBe("Huette");

    const mix = await loadNarrativeGuideMixFile(join(targetDir, "world", "guides", "main.narrative-guide-mix.yaml"));
    expect(mix.layers).toHaveLength(1);
    expect(mix.layers[0]?.guide).toBe("./main.narrative-guide.yaml");
  });

  it("rejects non-empty target directories", async () => {
    const targetDir = await mkdtemp(join(tmpdir(), "worlddesc-create-nonempty-"));
    tempDirs.push(targetDir);
    await writeFile(join(targetDir, "keep.txt"), "occupied", "utf8");

    await expect(createProjectScaffold({ targetDir })).rejects.toThrowError(/is not empty/);
  });
});
