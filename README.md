# worlddesc

Monorepo-Grundlage fuer World-Beschreibungen in TypeScript.

Aktueller Fokus:

- JSON Schema fuer das World-Modell
- Beispielwelt als `*.world.yaml`
- TypeScript-Loader fuer YAML + Schema-Validierung
- Dokumentation der Begriffe und Modellbausteine

Wichtige Dateien:

- `schema/world.schema.json`
- `schema/object-asset.schema.json`
- `schema/narrative-guide.schema.json`
- `schema/narrative-guide-mix.schema.json`
- `sample/test.world.yaml`
- `sample/test.narrative-guide.yaml`
- `sample/test.twilight.narrative-guide.yaml`
- `sample/test.narrative-guide-mix.yaml`
- `sample/interaction-lab.world.yaml`
- `sample/assets/safe.object-asset.yaml`
- `docs/world.md`
- `docs/assets.md`
- `docs/asset-instancing.md`
- `docs/narrative-guide.md`
- `docs/narrative-guide-mixing.md`
- `docs/writing-narrative-guides.md`
- `docs/project-scaffold.md`
- `docs/llm-interface.md`
- `docs/llm-runner.md`
- `docs/first-llm-contract.md`
- `docs/first-llm-tool-schemas.md`
- `docs/prompt-optimization.md`
- `docs/action-feedback.md`
- `docs/pre-llm-topics.md`
- `docs/worldusage.md`
- `docs/gameelements.md`
- `docs/design-decisions.md`
- `prompts/warm-guide.character.txt`
- `prompts/dry-curator.character.txt`
- `prompts/opulent-guide.character.txt`
- `packages/world/src/loadWorld.ts`
- `packages/world/src/loadObjectAsset.ts`

Editor-Unterstuetzung:

- `.vscode/settings.json` ordnet `*.world.yaml` und `*.object-asset.yaml` automatisch dem passenden Schema zu.
- `.vscode/settings.json` ordnet zusaetzlich `*.narrative-guide.yaml` automatisch dem passenden Schema zu.
- `.vscode/settings.json` ordnet zusaetzlich `*.narrative-guide-mix.yaml` automatisch dem passenden Schema zu.

Validierung:

- `npm run checkworld` prueft standardmaessig `sample/test.world.yaml`
- `npm run checkworld -- <pfad-zur-world>` prueft eine konkrete Datei
- `npm run checkasset` prueft standardmaessig `sample/assets/safe.object-asset.yaml`
- `npm run checkasset -- <pfad-zum-asset>` prueft ein konkretes Objekt-Asset
- dabei werden auch Startplatzierung, Inventar-Referenzen und Offstage-Objekte geprueft

Schema-Quelle und Packaging:

- `schema/` im Repo-Root ist die einzige kanonische Quelle fuer JSON-Schemas
- `packages/world/schema/` ist nur ein synchronisierter Publish-Abdruck fuer das npm-Paket
- `npm run sync:schemas` uebertraegt die Root-Schemas in das Paket
- `npm run check:schemas` prueft, dass Package- und Root-Schemas nicht auseinanderlaufen
- `npm run build` synchronisiert die Package-Schemas automatisch vor dem TypeScript-Build
- `prepack` von `@worlddesc/world` synchronisiert die Schemas zusaetzlich direkt vor dem Paketbau

Beispielwelten:

- `sample/test.world.yaml` ist die kleine Adventure-Referenzwelt
- `sample/test.narrative-guide.yaml` ist der erste semantische Begleitrahmen fuer die Adventure-Referenzwelt
- `sample/test.twilight.narrative-guide.yaml` ist ein spaeterer kleiner Overlay-Guide fuer dieselbe Welt
- `sample/test.narrative-guide-mix.yaml` beschreibt die explizite Reihenfolge mehrerer Narrative-Guides
- `sample/interaction-lab.world.yaml` ist eine kompakte Mechanik-/Interface-Welt fuer Ambiguitaeten, Containerzugriff und offene Aktionsfragen
- `sample/assets/safe.object-asset.yaml` ist das erste isolierte Objekt-Asset fuer die Asset-Phase 0

Geplanter Startpunkt:

- `packages/world` kapselt das Domaenenmodell und das Laden/Validieren von Welten.
- `packages/llm-runner` kapselt den ersten OpenAI-basierten REPL-Runner ueber der Player-Sicht.
- der REPL-Runner kann optional ueber `--narrative-guide-mix` einen gemischten `narrativeContext` aus Guide-Dateien laden
- der REPL-Runner kann aktuell zwischen `--api-mode chat` und `--api-mode responses` umgeschaltet werden
- `worlddesc create <dir>` scaffoldet jetzt ein neues Authoring-Projekt mit World, Guide, Prompt, Docs und npm-Skripten

Release-Ablauf:

- `npm run release:version -- patch`
- `npm run release:version -- minor`
- `npm run release:version -- major`
- `npm run release:build`
- `npm run release:publish`

Dabei gilt:

- `release:version` hebt Root und beide Workspace-Pakete gemeinsam auf dieselbe Version
- `release:build` fuehrt `typecheck`, Tests, `check:schemas` und den Workspace-Build aus
- `release:publish` veroeffentlicht danach die beiden npm-Pakete
- direkte manuelle Aenderungen unter `packages/world/schema/` sollten vermieden werden

Gedachte NPX-Einstiege nach dem Publish:

- `npx @worlddesc/world@latest create ./my-world`
- `npx @worlddesc/world@latest checkworld ./sample/test.world.yaml`
- `npx @worlddesc/world@latest checkasset ./sample/assets/safe.object-asset.yaml`
- `npx @worlddesc/llm-runner@latest --debug`

Der veroeffentlichte Bin-Name von `@worlddesc/world` ist:

- `worlddesc`

Der direkte Paketaufruf ueber `npx @worlddesc/world@latest ...` ist fuer den normalen Smoke-Test aber der bequemste Weg.
