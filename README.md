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
- `sample/test.world.yaml`
- `sample/interaction-lab.world.yaml`
- `sample/assets/safe.object-asset.yaml`
- `docs/world.md`
- `docs/assets.md`
- `docs/asset-instancing.md`
- `docs/llm-interface.md`
- `docs/llm-runner.md`
- `docs/first-llm-contract.md`
- `docs/first-llm-tool-schemas.md`
- `docs/action-feedback.md`
- `docs/pre-llm-topics.md`
- `docs/worldusage.md`
- `docs/gameelements.md`
- `docs/design-decisions.md`
- `packages/world/src/loadWorld.ts`
- `packages/world/src/loadObjectAsset.ts`

Editor-Unterstuetzung:

- `.vscode/settings.json` ordnet `*.world.yaml` und `*.object-asset.yaml` automatisch dem passenden Schema zu.

Validierung:

- `npm run checkworld` prueft standardmaessig `sample/test.world.yaml`
- `npm run checkworld -- <pfad-zur-world>` prueft eine konkrete Datei
- `npm run checkasset` prueft standardmaessig `sample/assets/safe.object-asset.yaml`
- `npm run checkasset -- <pfad-zum-asset>` prueft ein konkretes Objekt-Asset
- dabei werden auch Startplatzierung, Inventar-Referenzen und Offstage-Objekte geprueft

Beispielwelten:

- `sample/test.world.yaml` ist die kleine Adventure-Referenzwelt
- `sample/interaction-lab.world.yaml` ist eine kompakte Mechanik-/Interface-Welt fuer Ambiguitaeten, Containerzugriff und offene Aktionsfragen
- `sample/assets/safe.object-asset.yaml` ist das erste isolierte Objekt-Asset fuer die Asset-Phase 0

Geplanter Startpunkt:

- `packages/world` kapselt das Domaenenmodell und das Laden/Validieren von Welten.
- `packages/llm-runner` kapselt den ersten OpenAI-basierten REPL-Runner ueber der Player-Sicht.
