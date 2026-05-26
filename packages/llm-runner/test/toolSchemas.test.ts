import { describe, expect, it } from "vitest";

import { buildFirstLlmResponseToolSchemas, buildFirstLlmToolSchemas } from "../src/toolSchemas.js";

describe("llm-runner tool schemas", () => {
  it("exposes the first tool set in a stable order", () => {
    expect(buildFirstLlmToolSchemas().map((tool) => tool.function.name)).toEqual([
      "get_current_scene",
      "get_known_object",
      "get_object_knowledge",
      "resolve_intent",
      "perform_action",
      "get_new_events"
    ]);
  });

  it("describes resolve_intent with an intent object", () => {
    const schema = buildFirstLlmToolSchemas().find((tool) => tool.function.name === "resolve_intent");

    expect(schema?.function.parameters).toEqual(
      expect.objectContaining({
        type: "object",
        required: ["intent"]
      })
    );
  });

  it("can expose the same first tool set in Responses API shape", () => {
    expect(buildFirstLlmResponseToolSchemas().map((tool) => tool.name)).toEqual([
      "get_current_scene",
      "get_known_object",
      "get_object_knowledge",
      "resolve_intent",
      "perform_action",
      "get_new_events"
    ]);
  });
});
