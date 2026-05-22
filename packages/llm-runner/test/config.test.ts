import { describe, expect, it } from "vitest";

import { buildHelpText, parseReplArgs } from "../src/config.js";

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

  it("falls back to gpt-5-mini without OPENAI_MODEL", () => {
    const config = parseReplArgs([], "C:/repo", {} as NodeJS.ProcessEnv);

    expect(config.model).toBe("gpt-5-mini");
  });

  it("mentions the gpt-5-mini default in help text", () => {
    expect(buildHelpText()).toContain("OPENAI_MODEL or gpt-5-mini");
  });
});
