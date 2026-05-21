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

## Naechster Zwischenschritt: `PlayerWorldView`

Bevor es ueberhaupt ein `LLMWorldView` gibt, ist eine neutralere Spielersicht sinnvoll:

- `WorldRuntime` bleibt die objektive technische API
- `PlayerWorldView` wird die erste gefilterte Sicht auf dieselbe Runtime
- das spaetere LLM spricht dann nicht direkt mit der Runtime, sondern mit dieser Spielersicht oder einer kleinen Ableitung davon

Damit bleibt die Reihenfolge sauber:

1. World
2. Runtime
3. Player Memory / Perception
4. PlayerWorldView
5. spaeter optional LLMWorldView

Ziel dabei:

- die Runtime muss nicht so tun, als waere sie schon eine Spieler-API
- die Spielersicht wird als eigene fachliche Schicht explizit
- dieselbe Sicht kann spaeter sowohl fuer UI als auch fuer ein LLM verwendet werden

Eine erste TypeScript-Skizze dafuer liegt jetzt im Modul `packages/world/src/playerView/`.
Eine minimale lauffaehige Fassade existiert dort ebenfalls bereits.

### Zielbild fuer die Runtime-Schnittstelle

Die Runtime bleibt die objektive Engine-Schnittstelle:

```ts
interface WorldRuntimePort {
  getCurrentRoomId(): string;
  getCurrentRoom(): Room;
  getPlacement(objectId: string): ObjectPlacement | undefined;
  getObjectState(objectId: string): Record<string, unknown> | undefined;
  getKnowledge(): string[];
  getRoomObjectIds(roomId?: string): string[];
  getInventoryObjectIds(): string[];
  getContainedObjectIds(containerId: string): string[];
  isObjectAccessible(objectId: string): boolean;
  listAvailableWays(roomId?: string): RuntimeWay[];
  listAvailableInteractions(objectId: string): RuntimeInteraction[];
  executeWay(wayId: string, roomId?: string): WayExecution;
  executeInteraction(objectId: string, interactionId: string): InteractionExecution;
}
```

### Zielbild fuer die Spielersicht

Die Spielersicht beschreibt, was auf Spielerseite wirklich konsumierbar ist:

```ts
interface PlayerWorldView {
  getCurrentScene(): PlayerSceneView;
  getKnownObject(objectId: string): KnownObjectView | null;
  getNewEvents(): PerceptionEvent[];
  performAction(action: PlayerActionCommand): PlayerActionResultView;
}
```

Wichtig:

- `PlayerSceneView` ist eine aufbereitete, gefilterte Szene
- `KnownObjectView` enthaelt nur bereits bekanntes Objektwissen
- `PerceptionEvent` trennt neue Beobachtungen von dauerhaftem Weltzustand
- `performAction()` ist absichtlich spielernah und nicht engine-intern gedacht
- `performAction()` selbst arbeitet mit strukturierten Kommandos statt Freitext
- eine optionale Hilfsschicht darf Aktionen deterministisch ueber Aliasse, Titel und Hints aufloesen, ohne schon freie Sprachinterpretation zu sein

### Strukturierte Spieleraktionen

Die eigentliche Player-Schnittstelle soll nicht mit Freitext arbeiten, sondern mit expliziten Kommandos.

Zum Beispiel:

```ts
type PlayerActionCommand =
  | {
      kind: "interaction";
      objectId: string;
      actionId: string;
      additionalText?: string;
    }
  | {
      kind: "way";
      actionId: string;
    };
```

Das ist die passende Zielrichtung fuer die spaetere LLM-Anbindung:

- das LLM liest die Spielersicht
- das LLM uebersetzt freie Sprache in `PlayerActionCommand`
- die World-/Player-API fuehrt nur noch strukturierte Befehle aus

Konsequenz:

- Sprachverstehen bleibt ausserhalb der Weltlogik
- die Engine bleibt deterministisch und testbar
- Felder wie `additionalText` koennen spaeter Dinge wie Codes, freie Antworten oder kurze Eingaben transportieren

Wichtig dabei:

- `additionalText` ist kein separater Freitext-Kanal in die Weltlogik
- es ist nur ein strukturierter Parameter an einer normalen Interaktion
- die Welt selbst entscheidet deklarativ, ob und wie diese Eingabe ausgewertet wird

Fuer die Assistenzschicht ist dabei wichtig:

- die Player-Sicht kann pro Interaktion sichtbar machen, ob `text`, `select` oder `number` erwartet wird
- bei `select` kann sie die festen Optionen liefern
- bei `number` kann sie Bereich, Schrittweite und Einheit liefern

### Strukturierte Fehler und Ambiguitaeten

Damit UI oder spaeter ein LLM sinnvoll nachfassen koennen, sollte die Schnittstelle nicht nur Erfolg oder Misserfolg kennen.

Aktueller Zuschnitt:

- `performAction()` liefert bei Fehlschlaegen strukturierte Fehlercodes
- die optionale Textaufloesung liefert bei Mehrdeutigkeit explizite Kandidaten

Das erlaubt spaeter Rueckfragen wie:

- "Welches Objekt meinst du genau?"
- "Diese Aktion ist gerade nicht verfuegbar."
- "Dieses Objekt kannst du im Moment noch nicht erreichen."

### Was in der Spielersicht von Anfang an mitgedacht werden soll

Fuer dieses Projekt sind nicht nur rohe Objekt- und Weglisten wichtig, sondern bewusst auch aufbereitete Texte und neue Ereignisse.

Deshalb enthaelt das Zielmodell bereits:

- `preparedTexts` auf Szenen- und Objektebene
- `newEvents` auf Szenenebene
- `knownTexts` und `knownKnowledge` auf Objektebene

Diese Inhalte sind wichtig, damit die spaetere Assistenzschicht nicht rohe Weltdaten selbst in eine spielernahe Darstellung uebersetzen muss.

## Empfohlene Dateiaufteilung

Damit diese Schicht spaeter nicht in eine einzige grosse Datei kippt, ist sie bewusst als kleines Modul vorbereitet:

- `playerView/types.ts`
- `playerView/memory.ts`
- `playerView/events.ts`
- `playerView/scene.ts`
- `playerView/playerWorldView.ts`
- `playerView/actionResolution.ts`

Gedachte Verantwortung:

- `types.ts`: oeffentliche Vertragsdefinitionen
- `memory.ts`: Spielerwissen und Deliverystatus
- `events.ts`: Wahrnehmungsereignisse und deren Aufbereitung
- `scene.ts`: Aufbau einer spielerseitigen Szene aus Runtime plus Memory
- `playerWorldView.ts`: schmale Fassade auf Runtime und Memory
- `actionResolution.ts`: optionale deterministische Text-zu-Kommando-Aufloesung

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
