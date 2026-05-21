# LLM Interface

Dieses Dokument beschreibt die geplante Rolle des LLM im Zusammenspiel mit Welt, Runtime und Spieler.

## Grundidee

Das LLM soll nicht direkt auf die kanonische Weltdefinition zugreifen.

Stattdessen steht es zwischen menschlichem Spieler und einem begrenzten World-Interface:

- der Mensch beschreibt Absichten frei und sprachlich
- das LLM interpretiert diese Eingaben
- das LLM spricht mit einem kontrollierten Interface der Welt
- das LLM formuliert Antworten fuer den Menschen natuerlicher und atmosphaerischer aus

Wichtig:

- das LLM ist nicht die Welt-Engine
- das LLM ist nicht die Quelle der Weltwahrheit
- das LLM ist Vermittler zwischen Spieler und World-Interface

Leitidee:

- das LLM ist ein assistiver Vermittler auf Spielerseite
- es hilft beim Verstehen, Beschreiben und Formulieren von Handlungen
- gegenueber der Welt besitzt es exakt dieselben Informationsgrenzen wie der menschliche Spieler

## Position des LLM in der Architektur

Die Schichten sollen klar getrennt bleiben:

1. `World`

- kanonische Weltbeschreibung
- Objekte, Raeume, Interaktionen, Regeln, Texte, Wissen
- keine Spielersicht

2. `Runtime`

- laufender Weltzustand
- Platzierungen
- Objektzustand
- Spielerraum
- Wissensmarker
- Interaktionsergebnisse

3. `Player Memory / Perception`

- was dem Spieler bereits gezeigt wurde
- welches Wissen der Spieler bereits sicher kennt
- welche Beobachtungen neu sind
- welche Objektinformationen aktuell fuer das LLM abrufbar sind

4. `LLM Interface`

- einzige Weltzugriffsschicht fuer das LLM
- liefert nur Spielerperspektive
- nimmt sprachlich interpretierte Aktionen entgegen

## Was das LLM nicht sehen soll

Das LLM soll keinen direkten Zugriff haben auf:

- rohe World-Dateien
- versteckte Objektzustände
- nicht wahrgenommene Platzierungen
- nicht gezeigte Texte
- noch unbekannte Interaktionen

Das gilt auch dann, wenn diese Informationen in der World technisch vorhanden sind.

Wichtiges Architekturprinzip:

- das LLM soll verborgenes Wissen nicht aktiv zurueckhalten muessen
- stattdessen soll es dieses Wissen gar nicht erst erhalten

Ziel davon:

- das LLM kann sich auf Sprache, Atmosphaere und spielernahe Vermittlung konzentrieren
- das Risiko von Meta-Wissen, Andeutungen oder versehentlichem Leaken sinkt deutlich

## Was das LLM sehen soll

Das LLM soll nur Dinge sehen, die aus Spielersicht legitim sind:

- aktueller Raum und seine wahrnehmbare Beschreibung
- sichtbare oder erreichbare Objekte
- bereits bekanntes Wissen ueber diese Objekte
- neu entstandene Beobachtungen seit der letzten Aktion
- aktuell verfuegbare Handlungsmoeglichkeiten, wenn das Interface sie explizit offenlegen soll

Konsequenz:

- das LLM muss nicht gleichzeitig "reich beschreiben" und "heimlich Zusatzwissen verbergen"
- das World-Interface nimmt ihm diese Trennung ab

## Wissen und Text trennen

Es ist sinnvoll, `Wissen` und `Text` nicht gleichzusetzen.

### Text

`text` ist eine konkrete Formulierung fuer den Spieler.

Beispiele:

- "Die Kiste ist alt, aber noch stabil."
- "Das Schloss klickt leise auf."

### Wissen

`knowledge` ist eine strukturierte, spaeter wiederverwendbare Information.

Beispiele:

- `tuer_ist_alt`
- `spieler_hat_gesehen_schluessel_in_kiste`
- `huettentuer_ist_entriegelt`

### Perception State

Zusätzlich braucht es eine dritte Ebene:

- wurde dieser Text dem Spieler bereits gezeigt
- gilt diese Information fuer den Spieler als bekannt
- ist diese Beobachtung neu oder bereits verarbeitet

Diese dritte Ebene gehoert nicht in die World selbst, sondern in Runtime oder Persistenz.

## Empfohlenes Zielmodell

### World

Die World bleibt kanonisch und statisch.

Sie beschreibt:

- objektive Texte
- objektive Regeln
- objektiv ableitbares Wissen

### Runtime

Die Runtime beschreibt den tatsaechlichen Fortschritt der Instanz.

Sie verwaltet:

- Zustand
- Platzierung
- Knowledge-Marker
- ausgefuehrte Effekte

### Memory / Perception

Diese Schicht beschreibt die Spielerwahrnehmung.

Moegliche Zielstruktur:

```ts
interface PlayerMemory {
  knownKnowledge: string[];
  seenTexts: string[];
  knownObjects: Record<string, KnownObjectMemory>;
}

interface KnownObjectMemory {
  knownFacts: string[];
  seenDescriptionKeys: string[];
  lastSeenSummary?: string;
}
```

Oder eventorientiert:

```ts
interface PerceptionEvent {
  id: string;
  type: "room" | "object" | "interaction" | "system";
  objectId?: string;
  text?: string;
  knowledge?: string[];
  deliveredToPlayer: boolean;
}
```

## Empfohlenes LLM-Interface

Das LLM sollte spaeter nicht mit `WorldRuntime` direkt sprechen, sondern mit einer kleineren Fassade.

Zum Beispiel:

```ts
interface LLMWorldView {
  getCurrentScene(): PlayerSceneView;
  getKnownObjectInfo(objectId: string): KnownObjectView | null;
  getNewPerceptionEvents(): PerceptionEvent[];
  performPlayerIntent(input: ParsedIntent): ActionOutcomeView;
}
```

Wichtig daran:

- `getCurrentScene()` liefert nur die Szene aus Spielersicht
- `getKnownObjectInfo()` liefert nur bereits bekanntes Objektwissen
- `getNewPerceptionEvents()` liefert nur neue Beobachtungen
- `performPlayerIntent()` kapselt die eigentliche Weltinteraktion

## Persistenz

Die Weltdefinition selbst sollte nicht pro Spieler gespeichert werden.

Persistiert werden sollte nur:

- Referenz auf die World
- Runtime-State
- Player-Memory / Perception-State
- optional Event-Historie

Beispiel:

```ts
interface SavedGame {
  worldId: string;
  runtime: RuntimeWorldState;
  memory: PlayerMemory;
  events: PerceptionEvent[];
}
```

## Konsequenzen fuer die weitere Umsetzung

Aus dieser Architektur folgen die naechsten sinnvollen Schritte:

1. Eine getrennte `PlayerMemory`-Schicht einfuehren.
2. Ein internes Wahrnehmungs-/Eventmodell fuer neue Informationen definieren.
3. Eine schmale `LLMWorldView`-Fassade auf die Runtime setzen.
4. Sicherstellen, dass das LLM nie rohe World-Daten oder versteckte Runtime-Daten direkt erhaelt.

## Aktuelle Prioritaet

Diese LLM-Sicht ist derzeit noch eine Architekturleitplanke und nicht der primaere Umsetzungsschwerpunkt.

Aktuell stehen davor:

- Weltlogik
- Runtime-Operationen
- World-Interface
- Persistenzmodell

Erst wenn diese Schichten stabil sind, sollte die eigentliche LLM-Integration darauf aufsetzen.
