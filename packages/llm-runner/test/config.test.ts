import { describe, expect, it } from "vitest";

import { parseReplArgs } from "../src/config.js";

describe("llm-runner config", () => {
  it("parses defaults", () => {
    const config = parseReplArgs([], "C:/repo", {
      OPENAI_MODEL: "gpt-test"
    } as NodeJS.ProcessEnv);

    expect(config).toEqual({
      worldPath: "C:\\repo\\sample\\test.world.yaml",
      model: "gpt-test",
      debug: false,
      maxToolRounds: 8
    });
  });

  it("parses explicit flags", () => {
    const config = parseReplArgs(
      ["--world", "./sample/interaction-lab.world.yaml", "--model", "gpt-x", "--debug", "--max-tool-rounds", "12"],
      "C:/repo",
      {} as NodeJS.ProcessEnv
    );

    expect(config).toEqual({
      worldPath: "C:\\repo\\sample\\interaction-lab.world.yaml",
      model: "gpt-x",
      debug: true,
      maxToolRounds: 12
    });
  });
});
