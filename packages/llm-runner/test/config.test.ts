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
      maxToolRounds: 8,
      maxHistoryMessages: 4,
      includeSampleActions: true,
      usageFilePath: "C:\\repo\\tokens.usage.json",
      character: undefined
    });
  });

  it("parses explicit flags", () => {
    const config = parseReplArgs(
      [
        "--world",
        "./sample/interaction-lab.world.yaml",
        "--model",
        "gpt-x",
        "--debug",
        "--max-tool-rounds",
        "12",
        "--max-history-messages",
        "6",
        "--usage-file",
        "./tmp/usage.json",
        "--character",
        "warm-guide"
      ],
      "C:/repo",
      {} as NodeJS.ProcessEnv
    );

    expect(config).toEqual({
      worldPath: "C:\\repo\\sample\\interaction-lab.world.yaml",
      model: "gpt-x",
      debug: true,
      maxToolRounds: 12,
      maxHistoryMessages: 6,
      includeSampleActions: true,
      usageFilePath: "C:\\repo\\tmp\\usage.json",
      character: "warm-guide"
    });
  });

  it("falls back to gpt-5.4-mini without OPENAI_MODEL", () => {
    const config = parseReplArgs([], "C:/repo", {} as NodeJS.ProcessEnv);

    expect(config.model).toBe("gpt-5.4-mini");
  });

  it("can hide sampleActions for the llm view", () => {
    const config = parseReplArgs(["--hide-sample-actions"], "C:/repo", {} as NodeJS.ProcessEnv);

    expect(config.includeSampleActions).toBe(false);
  });

  it("mentions the gpt-5.4-mini default in help text", () => {
    expect(buildHelpText()).toContain("OPENAI_MODEL or gpt-5.4-mini");
    expect(buildHelpText()).toContain("--hide-sample-actions");
    expect(buildHelpText()).toContain("--usage-file");
    expect(buildHelpText()).toContain("--character");
    expect(buildHelpText()).toContain("--max-history-messages");
  });
});
