import { dirname, resolve } from "node:path";

export function resolveObjectAssetReference(worldFilePath: string, assetReference: string): string {
  const worldDir = dirname(worldFilePath);

  if (assetReference.endsWith(".object-asset.yaml") || assetReference.endsWith(".object-asset.yml")) {
    return resolve(worldDir, assetReference);
  }

  return resolve(worldDir, "assets", `${assetReference}.object-asset.yaml`);
}
