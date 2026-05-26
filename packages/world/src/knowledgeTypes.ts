export interface PlayerKnowledgeEntryView {
  scope: "object" | "room";
  targetId: string;
  format: "markdown";
  markdown: string;
  sourcePath?: string;
}

export interface PlayerObjectKnowledgeRequest {
  objectId: string;
  roomId: string;
  currentlyVisible: boolean;
  currentlyAccessible: boolean;
  lastSeenAt?: string;
}

export interface PlayerRoomKnowledgeRequest {
  roomId: string;
}

export interface PlayerKnowledgeProvider {
  getObjectKnowledge?(request: PlayerObjectKnowledgeRequest): PlayerKnowledgeEntryView | null | undefined;
  getRoomKnowledge?(request: PlayerRoomKnowledgeRequest): PlayerKnowledgeEntryView | null | undefined;
}

export interface LoadedKnowledgeProviderResult {
  provider: PlayerKnowledgeProvider;
  warnings: string[];
}

export class KnowledgeValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KnowledgeValidationError";
  }
}
