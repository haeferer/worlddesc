import type {
  InteractionType,
  ObjectContainerPlacement,
  OffstagePlacement,
  WorldObject
} from "./types.js";

export interface ObjectAssetDocument {
  asset: ObjectAssetMeta;
  interactionTypes: Record<string, InteractionType>;
  objects: Record<string, WorldObject>;
  placement: Record<string, AssetPlacement>;
  slots?: Record<string, ObjectAssetSlot>;
}

export interface ObjectAssetMeta {
  kind: "objectAsset";
  id: string;
  title?: string;
  desc?: string;
  roots: string[];
}

export type AssetPlacement = OffstagePlacement | ObjectContainerPlacement;

export interface ObjectAssetSlot {
  object: string;
}
