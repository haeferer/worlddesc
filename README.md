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
