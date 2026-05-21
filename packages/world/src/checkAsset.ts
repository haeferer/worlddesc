#!/usr/bin/env node

import { resolve } from "node:path";

import { AssetValidationError, loadObjectAssetFile } from "./loadObjectAsset.js";

async function main(): Promise<void> {
  const inputPaths = process.argv.slice(2);
  const filePaths = inputPaths.length > 0 ? inputPaths : ["sample/assets/safe.object-asset.yaml"];

  let hadError = false;

  for (const path of filePaths) {
    const resolvedPath = resolve(path);

    try {
      const asset = await loadObjectAssetFile(resolvedPath);
      console.log(
        `OK ${path} (${Object.keys(asset.objects).length} objects, ${asset.asset.roots.length} roots)`
      );
    } catch (error) {
      hadError = true;

      if (error instanceof AssetValidationError) {
        console.error(`ERROR ${path}`);
        for (const detail of error.details) {
          console.error(`  - ${detail}`);
        }
      } else {
        console.error(`ERROR ${path}`);
        console.error(`  - ${(error as Error).message}`);
      }
    }
  }

  if (hadError) {
    process.exitCode = 1;
  }
}

void main();
