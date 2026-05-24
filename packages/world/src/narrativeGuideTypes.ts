import type { PlayerNarrativeContextProvider, PlayerNarrativeNodeView } from "./playerView/types.js";

export interface NarrativeGuideMeta {
  kind: "narrativeGuide";
  id: string;
  title?: string;
  desc?: string;
  forWorld?: string;
}

export interface NarrativeGuideDocument {
  guide: NarrativeGuideMeta;
  world?: PlayerNarrativeNodeView;
  rooms?: Record<string, PlayerNarrativeNodeView>;
  objects?: Record<string, PlayerNarrativeNodeView>;
}

export interface NarrativeGuideMixMeta {
  kind: "narrativeGuideMix";
  id: string;
  title?: string;
  desc?: string;
  forWorld?: string;
}

export interface NarrativeGuideMixLayerDocument {
  id?: string;
  guide: string;
  optional?: boolean;
  desc?: string;
}

export interface NarrativeGuideMixDocument {
  mix: NarrativeGuideMixMeta;
  layers: NarrativeGuideMixLayerDocument[];
}

export interface MixedNarrativeGuideDocument {
  mixId?: string;
  layerIds: string[];
  world?: PlayerNarrativeNodeView;
  rooms: Record<string, PlayerNarrativeNodeView>;
  objects: Record<string, PlayerNarrativeNodeView>;
}

export interface NarrativeGuideMixResult {
  document: MixedNarrativeGuideDocument;
  warnings: string[];
}

export interface NarrativeGuideProviderResult extends NarrativeGuideMixResult {
  provider: PlayerNarrativeContextProvider;
}
