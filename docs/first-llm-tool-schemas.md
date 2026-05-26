# First LLM Tool Schemas

Dieses Dokument beschreibt den ersten LLM-Contract in einer moeglichst toolnahen Form.

Es ist absichtlich kein allgemeines API-Handbuch, sondern eine kleine, fast direkt uebernehmbare Vorlage fuer den ersten kontrollierten LLM-Versuch.

## Ziel

Der erste Versuch soll auf einem kleinen Satz deterministischer Funktionen aufsetzen.

Diese Funktionen sollen:

- die Spielersicht liefern
- bei Bedarf kuratiertes Hintergrundwissen liefern
- eine breite Absicht in eine konkrete Aktion uebersetzen
- diese Aktion ausfuehren
- neue Wahrnehmungen kontrolliert zurueckgeben

## Tool Set

### `get_current_scene`

Beschreibung:

- liefert die aktuelle `PlayerSceneView`

Argumente:

```json
{}
```

Rueckgabe:

- `PlayerSceneView`

Wichtig:

- `sampleActions` sind absichtlich nur ein Beispielschnitt der aktuell direkt aufloesbaren Szenenaktionen
- sie begrenzen nicht die breitere Intent-Grammatik des LLM
- der Runner kann sie fuer A/B-Tests optional ganz aus der LLM-Sicht entfernen
- `narrativeContext` ist optional und liefert nur den aktuell relevanten semantischen Ausschnitt

Beispiel:

```json
{
  "roomId": "wiese",
  "title": "Wiese",
  "objects": [
    {
      "objectId": "kiste",
      "perception": "visible",
      "accessible": true,
      "accessibilityReason": "visible"
    }
  ],
  "inventoryObjects": [],
  "knownButNotVisibleObjects": [],
  "currentActionFocus": {
    "objectId": "kiste",
    "actionId": "oeffnen",
    "accepted": true,
    "primaryResultText": "Du hebst den Deckel. In der Kiste liegt ein kleiner Eisenschluessel."
  },
  "narrativeContext": {
    "mixId": "waldpfadDefaultMix",
    "world": {
      "tone": ["quiet", "rustic", "fairy-tale-edge"]
    },
    "room": {
      "tone": ["warm", "open", "safe"]
    },
    "objects": {
      "kiste": {
        "narrativeHints": ["einfaches-abenteuerobjekt", "fruehe-belohnung"]
      }
    }
  },
  "sampleActions": [
    {
      "commandId": "interaction:kiste:oeffnen",
      "kind": "interaction",
      "objectId": "kiste",
      "actionId": "oeffnen"
    }
  ]
}
```

### `get_known_object`

Beschreibung:

- liefert `KnownObjectView | null`

Argumente:

```json
{
  "objectId": "kiste"
}
```

Rueckgabe:

- bekannte Texte
- bekannte Wissensmarker
- aktuelle Wahrnehmungs- und Zugaenglichkeitssicht auf dieses Objekt

### `get_object_knowledge`

Beschreibung:

- liefert `PlayerKnowledgeEntryView | null`
- ist fuer kuratiertes externes Objektwissen gedacht

Argumente:

```json
{
  "objectId": "cimabueMaesta"
}
```

Rueckgabe:

- `scope`
- `targetId`
- `format`
- `markdown`

Wichtig:

- das ist keine harte Weltwahrheit
- das Tool ist fuer erklaerenden Kontext gedacht, nicht fuer Navigation oder Aktionspruefung

### `resolve_intent`

Beschreibung:

- nimmt eine breitere Spielerabsicht entgegen
- liefert entweder eine konkrete `PlayerActionCommand`-Aufloesung oder eine strukturierte Ablehnung

Argumente:

```json
{
  "intent": {
    "verb": "open",
    "object1": "kiste"
  }
}
```

Weiteres Beispiel mit Eingabe:

```json
{
  "intent": {
    "verb": "input",
    "object1": "safe",
    "inputText": "4862"
  }
}
```

Weiteres Beispiel mit `object2` als Hint:

```json
{
  "intent": {
    "verb": "unlock",
    "object1": "huettenTuer",
    "object2": "schluessel"
  }
}
```

Rueckgabe bei Erfolg:

```json
{
  "status": "resolved",
  "command": {
    "kind": "interaction",
    "objectId": "kiste",
    "actionId": "oeffnen"
  },
  "verb": "open",
  "object1": "kiste",
  "usedObject2AsHint": false,
  "sourceActionId": "interaction:kiste:oeffnen"
}
```

Rueckgabe bei Ablehnung:

```json
{
  "status": "rejected",
  "issue": {
    "code": "object2-not-supported",
    "message": "Intent verb \"open\" does not currently support object2",
    "retryable": true,
    "verb": "open",
    "object1": "roteKiste",
    "object2": "blaueKiste"
  }
}
```

### `perform_action`

Beschreibung:

- fuehrt einen bereits konkreten `PlayerActionCommand` aus

Argumente:

```json
{
  "command": {
    "kind": "interaction",
    "objectId": "kiste",
    "actionId": "oeffnen"
  }
}
```

Rueckgabe:

- `PlayerActionResultView`

Wichtige Teile:

- `accepted`
- `text`
- `events`
- `scene`
- `turn`

Besonders relevant fuer das spaetere LLM:

```json
{
  "turn": {
    "primaryResultText": "Du hebst den Deckel. In der Kiste liegt ein kleiner Eisenschluessel.",
    "newlyVisibleObjectIds": ["schluessel"],
    "newlyAvailableActionIds": [
      "interaction:schluessel:ansehen",
      "interaction:schluessel:nehmen"
    ],
    "newlyKnownKnowledge": []
  }
}
```

### `get_new_events`

Beschreibung:

- liefert `PerceptionEvent[]` seit dem letzten Abruf

Argumente:

```json
{}
```

Rueckgabe:

```json
[
  {
    "id": "object:schluessel:desc",
    "type": "object",
    "objectId": "schluessel",
    "text": "Ein kleiner Eisenschluessel mit abgewetztem Bart.",
    "isNew": true
  }
]
```

## Empfohlene Nutzungsreihenfolge

Der erste LLM-Versuch sollte bevorzugt so arbeiten:

1. `get_current_scene`
2. optional `get_known_object`
3. `resolve_intent`
4. wenn `resolved`: `perform_action`
5. optional `get_new_events`

## Warum `perform_intent` hier absichtlich fehlt

Das Projekt kennt bereits einen Komfortpfad ueber `performIntent()`.

Im ersten Tool-Contract wird er aber bewusst nicht als Primaerweg gefuehrt.

Grund:

- wir wollen Intent-Verstehen und Aktionsausfuehrung getrennt beobachten
- der erste LLM-Versuch soll debuggbar bleiben
- Fehler sollen klar einer Stufe zugeordnet werden koennen

## Codequelle

Die erste code-nahe Vertragsquelle dafuer liegt jetzt in:

- [llmToolContract.ts](C:/remoterep/worlddesc/packages/world/src/playerView/llmToolContract.ts:1)

Eine erste duenne Laufzeit-Fassade fuer genau diese Tools liegt jetzt in:

- [llmToolHost.ts](C:/remoterep/worlddesc/packages/world/src/playerView/llmToolHost.ts:1)

Damit ist der Contract nicht mehr nur dokumentiert, sondern bereits als testbarer Adapter auf `PlayerWorldView` vorhanden.

Auf Runner-Ebene gibt es zusaetzlich einen persistenten Usage-Counter in `tokens.usage.json`, damit reale OpenAI-Tokenkosten ueber REPL-Sessions hinweg beobachtbar bleiben.

Optional kann der Runner ausserdem einen `narrative guide mix` laden und den resultierenden `narrativeContext` automatisch in diese Tool-Rueckgaben einspeisen.
