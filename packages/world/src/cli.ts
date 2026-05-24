#!/usr/bin/env node

async function main(): Promise<void> {
  const [command, ...args] = process.argv.slice(2);

  switch (command) {
    case "checkworld": {
      process.argv = [process.argv[0] ?? "node", "checkworld", ...args];
      await import("./checkWorld.js");
      return;
    }
    case "checkasset": {
      process.argv = [process.argv[0] ?? "node", "checkasset", ...args];
      await import("./checkAsset.js");
      return;
    }
    case "--help":
    case "-h":
    case undefined:
      printHelp();
      return;
    default:
      console.error(`Unknown command "${command}"`);
      printHelp();
      process.exitCode = 1;
  }
}

function printHelp(): void {
  console.log(
    [
      "Usage: worlddesc-world <command> [args]",
      "",
      "Commands:",
      "  checkworld [paths...]   Validate one or more world files",
      "  checkasset [paths...]   Validate one or more object asset files",
      "",
      "Examples:",
      "  npx @worlddesc/world checkworld ./sample/test.world.yaml",
      "  npx @worlddesc/world checkasset ./sample/assets/safe.object-asset.yaml"
    ].join("\n")
  );
}

void main();
