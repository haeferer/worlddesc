# Project Scaffold

Dieses Dokument beschreibt den vorgeschlagenen Zielzustand fuer `worlddesc create <dir>`.

Die Idee ist bewusst groesser als nur eine einzelne `world.yaml`:

- ein neues Projekt soll sofort authorbar sein
- ein Codex oder Mensch soll dort direkt weiterarbeiten koennen
- harte Welt, Narrative Guides und Prompting bleiben sauber getrennt

## Ziel

`worlddesc create <dir>` soll ein kleines Authoring-Studio erzeugen:

- Grundkonfiguration
- Beispiel-World
- Narrative-Guide-Struktur
- Prompt-Dateien
- Dokumentationsanker
- npm-Skripte fuer Validierung und REPL

## Vorschlag fuer die Projektstruktur

```text
my-world/
  .npmrc
  .gitignore
  package.json
  README.md
  worlddesc.config.json
  AGENTS.md

  .vscode/
    settings.json

  world/
    main.world.yaml

    assets/
      README.md

    guides/
      main.narrative-guide.yaml
      main.narrative-guide-mix.yaml

    prompts/
      project-guide.character.txt

  docs/
    project-intent.md
    authoring-rules.md
    character-guide.md
    workflow.md
    world-idea.md
    todo.md
```

## Kernideen pro Datei

### `.npmrc`

Zweck:

- lokaler Zugriff auf die gewuenschte Registry
- gleicher Install-/Run-Pfad wie im Hauptrepo

Wichtig:

- die Datei wird vom Scaffold aus einer bekannten Vorlage erzeugt
- sie soll nicht raten muessen, welche Registry benutzt wird

### `package.json`

Soll enthalten:

- Projektname
- `private: true`
- `type: module`
- Abhaengigkeiten auf:
  - `@worlddesc/world`
  - optional `@worlddesc/llm-runner`
- klare npm-Skripte fuer Authoring

Vorschlag:

```json
{
  "name": "my-world",
  "private": true,
  "type": "module",
  "scripts": {
    "checkworld": "worlddesc checkworld ./world/main.world.yaml",
    "repl": "worlddesc-llm-repl --world ./world/main.world.yaml --narrative-guide-mix ./world/guides/main.narrative-guide-mix.yaml --character project-guide",
    "print-prompt": "worlddesc-llm-repl --world ./world/main.world.yaml --narrative-guide-mix ./world/guides/main.narrative-guide-mix.yaml --character project-guide --print-system-prompt"
  },
  "dependencies": {
    "@worlddesc/world": "^0.1.0",
    "@worlddesc/llm-runner": "^0.1.0"
  }
}
```

Wichtig:

- `checkasset` und spaetere Guide-Checks koennen zunaechst fehlen, wenn noch kein Asset existiert
- das Projekt soll sofort mit der Haupt-World lauffaehig sein

### `worlddesc.config.json`

Zweck:

- zentraler Projektanker fuer spaetere CLI-Kommandos
- keine mehrfachen Pfadangaben in jedem Script

Vorschlag:

```json
{
  "world": "./world/main.world.yaml",
  "narrativeGuideMix": "./world/guides/main.narrative-guide-mix.yaml",
  "characterPrompt": "./world/prompts/project-guide.character.txt"
}
```

Spaeter erweiterbar um:

- Default-Modell
- API-Modus
- Debug-Default

### `AGENTS.md`

Das ist ein wichtiger Teil des Scaffolds.

Es soll einem Codex oder anderen Agenten direkt sagen:

- welche Dateien kanonisch sind
- wie World und Guide getrennt bleiben
- wo neue Inhalte angelegt werden
- welche Befehle nach Aenderungen laufen sollen

Typischer Inhalt:

- `world/main.world.yaml` ist die harte Welt
- Narrative Guides liegen nur unter `world/guides/`
- Stil- oder Tonvorgaben gehoeren nicht in die World
- nach Struktur-Aenderungen `npm run checkworld`
- bei Prompt-Aenderungen optional `npm run print-prompt`

### `.vscode/settings.json`

Zweck:

- sofortige Schema-Unterstuetzung im neuen Projekt

Soll mappen:

- `*.world.yaml`
- `*.object-asset.yaml`
- `*.narrative-guide.yaml`
- `*.narrative-guide-mix.yaml`

### `world/main.world.yaml`

Soll keine riesige Demo sein, sondern eine kleine, gut lesbare Startwelt.

Empfehlung:

- 2 Raeume
- 2 bis 4 Objekte
- 1 einfacher Container oder Schluessel/Tuer-Fall

Ziel:

- das Projekt ist sofort validierbar
- der Nutzer versteht die Struktur
- ein Codex hat direkt ein brauchbares Muster

### `world/assets/README.md`

Zweck:

- erklaert, wann ausgelagerte `*.object-asset.yaml` hier hingehoeren
- verhindert, dass der Ordner wie ein toter Rest aussieht

### `world/guides/main.narrative-guide.yaml`

Soll ein minimaler, lokaler Guide sein:

- kleiner `world`-Ton
- `rooms.<roomId>`
- `objects.<objectId>`

Keine Lore-Wand, sondern nur:

- `tone`
- `associations`
- `narrativeHints`
- `sensoryHints`

### `world/guides/main.narrative-guide-mix.yaml`

Soll den zunaechst einfachsten Mix zeigen:

- genau ein Basis-Guide

Ziel:

- spaetere Overlays sind schon vorbereitet
- der Nutzer lernt den Mix-Pfad sofort

### `world/prompts/project-guide.character.txt`

Soll eine neutrale, brauchbare Standardpersoenlichkeit liefern.

Nicht zu speziell, eher:

- warm
- ruhig
- nicht zu ausschweifend
- kompatibel mit spaeteren A/B-Tests

Wichtig:

- diese Datei sollte mit `docs/character-guide.md` zusammengedacht werden
- der Prompt selbst bleibt kurz, waehrend die Guideline die Projektentscheidungen zur Stimme festhaelt
- fuer Fuehrungs- oder Museumswelten sollte zusaetzlich frueh mitgedacht werden, ob `--max-history-messages 8` sinnvoller ist als ein knapperer Adventure-Wert

### `docs/project-intent.md`

Zweck:

- was fuer eine Welt soll hier entstehen?
- welche Stimmung?
- welche Zielgruppe?
- welche Art von Spiel?

Das ist fuer Codex extrem hilfreich, weil es den Projektkontext von der harten World trennt.

### `docs/authoring-rules.md`

Soll die wichtigsten Regeln kurz wiederholen:

- World = harte Wahrheit
- Guide = Regie
- Prompt = Persoenlichkeit
- Knowledge = zusaetzliche Erklaerung
- keine Stimmung direkt in harte Weltzustandsregeln mischen
- IDs stabil halten

Wichtig ist dabei nicht nur **dass** diese Trennung genannt wird, sondern auch **warum**:

- mehr Geruch, Luft, Licht, Materialwirkung -> Narrative Guide
- mehr Hintergrund, Deutung, Kontextwissen -> Knowledge
- neue Tuer, neuer Weg, neue Interaktion -> World

### `docs/character-guide.md`

Soll festhalten:

- wie der Begleiter klingen soll
- ob er eher fuehrt oder eher zuruecktritt
- wie stark er Wege aktiv anbietet
- wie viel Wiederholung vermieden werden soll
- ob das aktuelle Objekt meist wichtiger ist als Navigation
- welche History-Tiefe fuer dieses Projekt sinnvoll ist, etwa `4`, `6` oder `8`

### `docs/workflow.md`

Soll den konkreten Arbeitsablauf zeigen:

1. World anpassen
2. Guide anpassen
3. `npm run checkworld`
4. optional `npm run repl`

### `docs/world-idea.md`

Freies grobes Ideendokument fuer:

- Schauplaetze
- Mechaniken
- Plotkeime

### `docs/todo.md`

Ein absichtlich schlichtes Backlog fuer:

- naechste Rae ume
- offene Objekte
- fehlende Narrative Guides
- Testfaelle

## Minimale npm-Skripte fuer den Scaffold

Ich wuerde mit genau diesen anfangen:

- `checkworld`
- `repl`
- `print-prompt`

Spaeter denkbar:

- `checkasset`
- `new:asset`
- `new:guide`

## Warum das fuer Codex gut ist

Der Scaffold gibt einem Agenten direkt:

- die Hauptdatei fuer Weltlogik
- die Hauptdatei fuer narrative Steuerung
- den Prompt-Ort fuer Begleiterverhalten
- den Arbeitskontext in Markdown
- die Befehle zum Validieren und Testen

Dadurch muss ein Codex nicht erst raten:

- wo die World liegt
- wo Tonregeln hingehoeren
- welche Datei bearbeitet werden darf
- wie man das Ergebnis prueft

## Phase-0-Einschaetzung

Fuer die erste Version von `create` wuerde ich noch nicht alles automatisieren.

Reicht fuer Phase 0:

- Verzeichnisstruktur
- `.npmrc`
- `package.json`
- `worlddesc.config.json`
- `AGENTS.md`
- eine kleine Beispiel-World
- ein kleiner Narrative Guide
- ein einfacher Guide-Mix
- eine Prompt-Datei
- 3 bis 5 kurze Docs

Noch nicht noetig:

- Projektgenerator fuer Assets
- interaktive Fragen
- UI
- Template-Auswahl

## Nächster technischer Schritt

Wenn wir dieses Zielmodell so wollen, dann ist der naechste saubere Schritt:

- eine echte CLI-Unterkommandostruktur `worlddesc create <dir>`
- ein Template-Verzeichnis im Repo
- eine kleine Kopierlogik mit Platzhalterersetzung fuer Projektname und Dateipfade
