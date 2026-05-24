const DEFAULT_NPMRC = `registry=https://ttnpm.ttdev.local/
ca="\\n-----BEGIN CERTIFICATE-----\\nMIIEFTCCAv2gAwIBAgIILRiWqcrJae0wDQYJKoZIhvcNAQENBQAwgaExCzAJBgNV\\nBAYTAkRFMQ8wDQYDVQQIEwZIZXNzZW4xGjAYBgNVBAcTEUZyYW5rZnVydCBhbSBN\\nYWluMSAwHgYDVQQKExdUcmliZSBUZWNobm9sb2dpZXMgR21iSDELMAkGA1UECxMC\\nSVQxFjAUBgNVBAMTDXJvb3QgQ0EgVHJpYmUxHjAcBgkqhkiG9w0BCQEWD2l0QHRy\\naWJldGVjaC5kZTAeFw0yMTA1MzExMjE0MDBaFw0zMTA1MzExMjE0MDBaMIGhMQsw\\nCQYDVQQGEwJERTEPMA0GA1UECBMGSGVzc2VuMRowGAYDVQQHExFGcmFua2Z1cnQg\\nYW0gTWFpbjEgMB4GA1UEChMXVHJpYmUgVGVjaG5vbG9naWVzIEdtYkgxCzAJBgNV\\nBAsTAklUMRYwFAYDVQQDEw1yb290IENBIFRyaWJlMR4wHAYJKoZIhvcNAQkBFg9p\\ndEB0cmliZXRlY2guZGUwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQC0\\npdLO9wP+4nYuPlgekaGLoj9vcEClcrVZjuraEOibNY4h9p6Gqr2fqSG/wOltO7Ii\\n/uzGu/qaLOoi6bXeoXanjbjnEycsatDKptSsCumDgb2y8ST4pr/hRVHAYW2t/CxG\\nZkN+RZqCAvYk1/S9/j99UG+x32ztBhXUvrM+/YjOLPUC4Eefe53gjoVR1vL9CpgQ\\ndsHqkKJQMrsoUNUD1bvxs97xorhJ10TSIsVWYZAO7PanD22wN1xgiDubhZkPc8hL\\nNAmCFXR3vx2Fe5dVVhtiHxCsjgmZBC5iJ9m5WfxiMR9ymlq4MQCKCnVZU+l1pVDV\\naijOmVNsNHB/UnPA4PnDAgMBAAGjTzBNMAwGA1UdEwQFMAMBAf8wHQYDVR0OBBYE\\nFK0O1WxQuMMUaOowb1ILsVpyOupnMB4GCWCGSAGG+EIBDQQRFg94Y2EgY2VydGlm\\naWNhdGUwDQYJKoZIhvcNAQENBQADggEBAFkdSrB7gmSUp19uR+5/GC+uEHoJg6B+\\nPgmnt0TbuB9fhfRWCnFjgOUMfP2Ap8EZqpAHWcHxXTZjW4cCE26H2aPzuYN0752H\\n/SbHB+GaTyXOEEsT6rIYSBgQX8dtyO8LL+Mau6hL2wulr90JZnFgiATXE6VQIG+j\\nUkg2LnuGZXHb0oZRXC/LUndKgbX6Oi2TBJj6P7PzN2ETrYcHGfMI/zWvKKCRU1rf\\nT1hGh3A18xaYLXJNpfWQruGffncx7LqwkHdeKYsyuYWoMYr0rv0R27FJaArWfgNK\\nUgcEi0jONe+s16t9IZE0FbdhmpUiWqU5YTRw48K6MQ8KCHVkdHWzyzs=\\n-----END CERTIFICATE-----\\n"
`;

export type ScaffoldTemplateContext = {
  packageName: string;
  displayName: string;
  worlddescVersion: string;
  llmRunnerVersion: string;
};

export type ScaffoldTemplateFile = {
  path: string;
  content: string;
};

export function buildScaffoldTemplateFiles(context: ScaffoldTemplateContext): ScaffoldTemplateFile[] {
  return [
    { path: ".npmrc", content: DEFAULT_NPMRC },
    {
      path: ".gitignore",
      content: ["node_modules/", ".env", "tokens.usage.json"].join("\n") + "\n"
    },
    {
      path: "package.json",
      content: JSON.stringify(
        {
          name: context.packageName,
          private: true,
          type: "module",
          scripts: {
            checkworld: "worlddesc checkworld ./world/main.world.yaml",
            repl:
              "worlddesc-llm-repl --world ./world/main.world.yaml --narrative-guide-mix ./world/guides/main.narrative-guide-mix.yaml --character project-guide",
            "print-prompt":
              "worlddesc-llm-repl --world ./world/main.world.yaml --narrative-guide-mix ./world/guides/main.narrative-guide-mix.yaml --character project-guide --print-system-prompt"
          },
          dependencies: {
            "@worlddesc/world": `^${context.worlddescVersion}`,
            "@worlddesc/llm-runner": `^${context.llmRunnerVersion}`
          }
        },
        null,
        2
      ) + "\n"
    },
    {
      path: "README.md",
      content: [
        `# ${context.displayName}`,
        "",
        "Dieses Projekt wurde mit `worlddesc create` erzeugt.",
        "",
        "## Schnellstart",
        "",
        "1. `npm install`",
        "2. `npm run checkworld`",
        "3. optional `npm run repl`",
        "",
        "## Wichtige Orte",
        "",
        "- `world/main.world.yaml` fuer harte Weltlogik",
        "- `world/guides/` fuer narrative Guides und Mixes",
        "- `world/prompts/project-guide.character.txt` fuer die Persoenlichkeit des Begleiters",
        "- `AGENTS.md` fuer Arbeitsregeln fuer Codex und andere Agenten",
        "",
        "## Naechste sinnvolle Schritte",
        "",
        "- die Startwelt anpassen",
        "- den Narrative Guide auf deinen Ton zuschneiden",
        "- dann mit `npm run checkworld` validieren"
      ].join("\n") + "\n"
    },
    {
      path: "worlddesc.config.json",
      content: JSON.stringify(
        {
          world: "./world/main.world.yaml",
          narrativeGuideMix: "./world/guides/main.narrative-guide-mix.yaml",
          characterPrompt: "./world/prompts/project-guide.character.txt"
        },
        null,
        2
      ) + "\n"
    },
    {
      path: "AGENTS.md",
      content: [
        `# ${context.displayName} Agent Notes`,
        "",
        "Dieses Projekt trennt bewusst zwischen harter Weltlogik und narrativer Regie.",
        "",
        "## Kanonische Dateien",
        "",
        "- `world/main.world.yaml` ist die harte Weltwahrheit.",
        "- `world/guides/*.narrative-guide.yaml` enthalten nur Regie, Ton und semantische Hinweise.",
        "- `world/prompts/project-guide.character.txt` steuert den sprachlichen Begleiter, nicht die Weltlogik.",
        "",
        "## Arbeitsregeln",
        "",
        "- Neue Fakten, Objekte, Raume und Interaktionen gehoeren in die World-Datei.",
        "- Stimmung, sensorische Leitplanken und Ton gehoeren in Narrative Guides.",
        "- Versteckte Weltregeln, Locks oder Konsequenzen duerfen nicht nur in Guides oder Promptdateien auftauchen.",
        "- Nach Aenderungen an der World immer `npm run checkworld` ausfuehren.",
        "",
        "## Typischer Ablauf",
        "",
        "1. Projektziel in `docs/project-intent.md` lesen oder schärfen.",
        "2. World-Struktur in `world/main.world.yaml` aendern.",
        "3. Narrative Guide in `world/guides/` angleichen.",
        "4. Mit `npm run checkworld` pruefen."
      ].join("\n") + "\n"
    },
    {
      path: ".vscode/settings.json",
      content:
        JSON.stringify(
          {
            "yaml.schemas": {
              "./node_modules/@worlddesc/world/schema/object-asset.schema.json": [
                "*.object-asset.yaml",
                "*.object-asset.yml"
              ],
              "./node_modules/@worlddesc/world/schema/narrative-guide.schema.json": [
                "*.narrative-guide.yaml",
                "*.narrative-guide.yml"
              ],
              "./node_modules/@worlddesc/world/schema/narrative-guide-mix.schema.json": [
                "*.narrative-guide-mix.yaml",
                "*.narrative-guide-mix.yml"
              ],
              "./node_modules/@worlddesc/world/schema/world.schema.json": ["*.world.yaml", "*.world.yml"]
            },
            "files.associations": {
              "*.narrative-guide-mix.yaml": "yaml",
              "*.narrative-guide-mix.yml": "yaml",
              "*.narrative-guide.yaml": "yaml",
              "*.narrative-guide.yml": "yaml",
              "*.object-asset.yaml": "yaml",
              "*.object-asset.yml": "yaml",
              "*.world.yaml": "yaml",
              "*.world.yml": "yaml"
            }
          },
          null,
          2
        ) + "\n"
    },
    {
      path: "world/main.world.yaml",
      content: `world:
  title: ${context.displayName}
  desc: Eine kleine Startwelt fuer ein neues worlddesc-Projekt.

player:
  initialRoom: lichtung

interactionTypes:
  examine:
    title: Ansehen
    desc: Etwas genauer betrachten.
  open:
    title: Oeffnen
    desc: Ein Objekt oeffnen.
  take:
    title: Nehmen
    desc: Ein tragbares Objekt aufnehmen.
  unlock:
    title: Entriegeln
    desc: Ein verschlossenes Objekt mit einem passenden Mittel entriegeln.

objects:
  kiste:
    title: Kiste
    desc: Eine schlichte Holzkiste steht am Rand der Lichtung.
    aliases: [kiste, holzkiste]
    stateSchema:
      type: object
      additionalProperties: false
      properties:
        closed:
          type: boolean
          default: true
    interactions:
      ansehen:
        type: examine
        title: Kiste ansehen
        aliases: [kiste ansehen]
        result:
          text: Die Kiste ist alt, aber noch solide.
      oeffnen:
        type: open
        title: Kiste oeffnen
        aliases: [kiste oeffnen]
        availableWhen:
          all:
            - ref: kiste
              path: state.closed
              equals: true
        effects:
          - type: set
            ref: kiste
            path: state.closed
            value: false
        result:
          text: In der Kiste liegt ein kleiner Messingschluessel.

  schluessel:
    title: Messingschluessel
    desc: Ein kleiner Messingschluessel mit einfachem Bart.
    aliases: [schluessel, messingschluessel]
    portable: true
    interactions:
      ansehen:
        type: examine
        title: Schluessel ansehen
        aliases: [schluessel ansehen]
        result:
          text: Der Schluessel wirkt oft benutzt, aber noch verlaesslich.
      nehmen:
        type: take
        title: Schluessel nehmen
        aliases: [schluessel nehmen, aufheben]
        availableWhen:
          all:
            - ref: schluessel
              placement:
                object: kiste
            - ref: kiste
              path: state.closed
              equals: false
        effects:
          - type: move
            ref: schluessel
            to:
              inventory: player
        result:
          text: Du nimmst den kleinen Messingschluessel an dich.

  tuer:
    title: Holztuer
    desc: Eine alte Holztuer fuehrt in die Huette.
    aliases: [tuer, holztuer]
    stateSchema:
      type: object
      additionalProperties: false
      properties:
        closed:
          type: boolean
          default: true
        lockState:
          type: string
          enum: [locked, unlocked]
          default: locked
    interactions:
      ansehen:
        type: examine
        title: Tuer ansehen
        aliases: [tuer ansehen]
        result:
          text: Die Tuer ist alt und mit einem einfachen Schloss verriegelt.
      entriegeln:
        type: unlock
        title: Tuer entriegeln
        aliases: [tuer entriegeln, aufschliessen]
        availableWhen:
          all:
            - ref: tuer
              path: state.lockState
              equals: locked
            - ref: schluessel
              placement:
                inventory: player
        effects:
          - type: set
            ref: tuer
            path: state.lockState
            value: unlocked
        result:
          text: Das Schloss klickt leise auf.
      oeffnen:
        type: open
        title: Tuer oeffnen
        aliases: [tuer oeffnen]
        availableWhen:
          all:
            - ref: tuer
              path: state.closed
              equals: true
            - ref: tuer
              path: state.lockState
              equals: unlocked
        effects:
          - type: set
            ref: tuer
            path: state.closed
            value: false
        result:
          text: Die Tuer schwingt mit einem dumpfen Knarren auf.

rooms:
  lichtung:
    title: Lichtung
    desc: Eine kleine Lichtung mit einer Kiste und einer verlassenen Huette.
    ways:
      hinein:
        title: In die Huette
        desc: Durch die geoeffnete Tuer gelangst du in die Huette.
        aliases: [in die huette, hinein, huette betreten]
        availableWhen:
          all:
            - ref: tuer
              path: state.closed
              equals: false
        target:
          room: huetteInnen

  huetteInnen:
    title: Huette
    desc: Ein kleiner stiller Raum mit kalter Luft und altem Holzgeruch.
    ways:
      hinaus:
        title: Zurueck zur Lichtung
        desc: Durch die offene Tuer geht es wieder hinaus.
        aliases: [hinaus, zurueck, lichtung]
        target:
          room: lichtung

placement:
  kiste:
    room: lichtung
  schluessel:
    object: kiste
  tuer:
    room: lichtung
`
    },
    {
      path: "world/assets/README.md",
      content: [
        "# Assets",
        "",
        "Hier koennen spaeter ausgelagerte `*.object-asset.yaml`-Dateien liegen.",
        "",
        "Nutze diesen Ordner fuer wiederverwendbare Objektbausteine wie:",
        "",
        "- Tresore",
        "- Vitrinen",
        "- Maschinen",
        "- wiederkehrende Container"
      ].join("\n") + "\n"
    },
    {
      path: "world/guides/main.narrative-guide.yaml",
      content: `guide:
  kind: narrativeGuide
  id: ${toGuideId(context.packageName)}
  title: Narrative Guide fuer ${context.displayName}
  desc: Ein kleiner semantischer Ausgangspunkt fuer dieses Projekt.
  forWorld: ${context.displayName}

world:
  tone: [quiet, curious]
  associations: [threshold, small-discoveries]

rooms:
  lichtung:
    tone: [open, calm, expectant]
    associations: [daylight, pause, first-step]
    sensoryHints: [soft-grass, mild-air]
  huetteInnen:
    tone: [still, enclosed, old]
    associations: [dust, wood, held-breath]
    sensoryHints: [cold-air, dry-wood]

objects:
  kiste:
    tone: [humble, promising]
    associations: [first-secret, simple-reward]
  schluessel:
    tone: [useful, transitional]
    associations: [permission, next-step]
  tuer:
    tone: [stubborn, significant]
    associations: [threshold, resistance]
    narrativeHints: [eine-grenze-die-erst-verdient-werden-muss]
`
    },
    {
      path: "world/guides/main.narrative-guide-mix.yaml",
      content: `mix:
  kind: narrativeGuideMix
  id: ${toMixId(context.packageName)}
  title: Basis-Mix fuer ${context.displayName}

layers:
  - id: base
    guide: ./main.narrative-guide.yaml
`
    },
    {
      path: "world/prompts/project-guide.character.txt",
      content: [
        "Du bist ein warmer, ruhiger und zugewandter Begleiter.",
        "Du beschreibst klar, freundlich und atmosphaerisch, ohne die Weltlogik zu verlassen.",
        "Bleibe eher knapp als ausufernd.",
        "Halte die Stimmung praesent, aber behaupte keine neuen Fakten."
      ].join("\n") + "\n"
    },
    {
      path: "docs/project-intent.md",
      content: [
        `# ${context.displayName} Projektziel`,
        "",
        "Beschreibe hier kurz:",
        "",
        "- welche Art von Welt entstehen soll",
        "- welche Zielstimmung wichtig ist",
        "- welche Kernmechaniken im Vordergrund stehen",
        "- fuer wen sich das Projekt anfuellen soll"
      ].join("\n") + "\n"
    },
    {
      path: "docs/authoring-rules.md",
      content: [
        "# Authoring Rules",
        "",
        "- Die World-Datei ist harte Wahrheit.",
        "- Narrative Guides enthalten Regie, keine versteckten Fakten.",
        "- Prompt-Dateien formen nur den Begleiter, nicht die Weltlogik.",
        "- Neue Objekte, Wege und Interaktionen gehoeren in `world/main.world.yaml`.",
        "- IDs sollten stabil und sprechend in `camelCase` gehalten werden."
      ].join("\n") + "\n"
    },
    {
      path: "docs/workflow.md",
      content: [
        "# Workflow",
        "",
        "1. Projektziel in `docs/project-intent.md` schaerfen.",
        "2. World in `world/main.world.yaml` erweitern oder aendern.",
        "3. Narrative Guide in `world/guides/` anpassen.",
        "4. Mit `npm run checkworld` pruefen.",
        "5. Optional mit `npm run repl` den Begleiter testen."
      ].join("\n") + "\n"
    },
    {
      path: "docs/world-idea.md",
      content: [
        "# World Idea",
        "",
        "Freie Notizen fuer:",
        "",
        "- Orte",
        "- Objekte",
        "- Schluesselszenen",
        "- offene Fragen",
        "- Plotkeime"
      ].join("\n") + "\n"
    },
    {
      path: "docs/todo.md",
      content: [
        "# Todo",
        "",
        "- weitere Raeume skizzieren",
        "- Interaktionen ausbauen",
        "- Narrative Guide verfeinern",
        "- erste Runtime-Tests im REPL machen"
      ].join("\n") + "\n"
    }
  ];
}

function toGuideId(packageName: string): string {
  return `${packageName.replace(/[^a-zA-Z0-9]+/g, "")}Guide`;
}

function toMixId(packageName: string): string {
  return `${packageName.replace(/[^a-zA-Z0-9]+/g, "")}Mix`;
}
