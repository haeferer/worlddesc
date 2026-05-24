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
    case "create": {
      const { createProjectScaffold } = await import("./createProject.js");
      const targetDir = args[0];

      if (!targetDir) {
        console.error("Missing target directory for create command.");
        printHelp();
        process.exitCode = 1;
        return;
      }

      const result = await createProjectScaffold({ targetDir });
      console.log(`Created worlddesc project in ${result.targetDir}`);
      console.log(`- package: ${result.packageName}`);
      console.log(`- world: world/main.world.yaml`);
      console.log(`- guide mix: world/guides/main.narrative-guide-mix.yaml`);
      console.log(`- next: npm install && npm run checkworld`);
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
      "Usage: worlddesc <command> [args]",
      "",
      "Commands:",
      "  checkworld [paths...]   Validate one or more world files",
      "  checkasset [paths...]   Validate one or more object asset files",
      "  create <dir>            Create a new worlddesc authoring project",
      "",
      "Examples:",
      "  npx @worlddesc/world@latest checkworld ./sample/test.world.yaml",
      "  npx @worlddesc/world@latest checkasset ./sample/assets/safe.object-asset.yaml",
      "  npx @worlddesc/world@latest create ./my-world"
    ].join("\n")
  );
}

void main();
