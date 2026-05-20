import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { resolve } from "node:path";

import { loadWorldFile, WorldValidationError } from "./loadWorld.js";

async function main(): Promise<void> {
  const inputPaths = process.argv.slice(2);
  const filePaths = inputPaths.length > 0 ? inputPaths : ["sample/test.world.yaml"];

  let hasErrors = false;

  for (const inputPath of filePaths) {
    const resolvedPath = resolve(process.cwd(), inputPath);

    try {
      await access(resolvedPath, constants.R_OK);
      const world = await loadWorldFile(resolvedPath);
      console.log(
        `OK ${inputPath} (${Object.keys(world.rooms).length} rooms, ${Object.keys(world.objects).length} objects)`
      );
    } catch (error) {
      hasErrors = true;

      if (error instanceof WorldValidationError) {
        console.error(`INVALID ${inputPath}`);
        for (const detail of error.details) {
          console.error(`  - ${detail}`);
        }
        continue;
      }

      const message = error instanceof Error ? error.message : String(error);
      console.error(`ERROR ${inputPath}`);
      console.error(`  - ${message}`);
    }
  }

  if (hasErrors) {
    process.exitCode = 1;
  }
}

await main();
