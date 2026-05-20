# worlddesc

Monorepo-Grundlage fuer World-Beschreibungen in TypeScript.

Aktueller Fokus:

- JSON Schema fuer das World-Modell
- Beispielwelt als `*.world.yaml`
- TypeScript-Loader fuer YAML + Schema-Validierung
- Dokumentation der Begriffe und Modellbausteine

Wichtige Dateien:

- `schema/world.schema.json`
- `sample/test.world.yaml`
- `docs/world.md`
- `docs/gameelements.md`
- `docs/design-decisions.md`
- `packages/world/src/loadWorld.ts`

Editor-Unterstuetzung:

- `.vscode/settings.json` ordnet `*.world.yaml` automatisch dem Schema zu.

Validierung:

- `npm run checkworld` prueft standardmaessig `sample/test.world.yaml`
- `npm run checkworld -- <pfad-zur-world>` prueft eine konkrete Datei
- dabei werden auch Startplatzierung, Inventar-Referenzen und Offstage-Objekte geprueft

Geplanter Startpunkt:

- `packages/world` kapselt das Domaenenmodell und das Laden/Validieren von Welten.
