# World Usage

Dieses Dokument beschreibt, welche Operationen auf einer World-Instanz mit dem aktuellen Stand des Projekts bereits unterstuetzt werden.

Es geht hier nicht um moegliche Zukunftsmechaniken, sondern um das, was heute schon im Modell, im Loader und in der Validierung konkret vorgesehen ist.

## Aktuell unterstuetzte Operationen

### 1. World-Datei laden

Eine `*.world.yaml` kann geladen und geparst werden.

Aktuell vorhanden:

- YAML-Parsing
- TypeScript-Loader
- Zugriff auf die geladene World als strukturierte Daten

Relevante Stelle:

- [loadWorld.ts](C:/remoterep/worlddesc/packages/world/src/loadWorld.ts:1)

### 2. Struktur gegen das JSON Schema validieren

Beim Laden wird die World-Datei gegen das JSON Schema geprueft.

Das deckt aktuell ab:

- Pflichtfelder
- Datentypen
- erlaubte Objektstrukturen
- Placement-Struktur
- State-Schema-Struktur

Ziel:

- formale Fehler frueh erkennen
- ungueltige Worlds gar nicht erst als Instanz akzeptieren

### 3. Referenzen semantisch validieren

Neben dem JSON Schema wird die World auch semantisch geprueft.

Aktuell geprueft:

- `player.initialRoom` zeigt auf einen existierenden Raum
- `placement` existiert fuer jedes Objekt
- `placement.<objekt>.room` zeigt auf einen existierenden Raum
- `placement.<objekt>.object` zeigt auf ein existierendes Objekt
- `placement.<objekt>.inventory` darf aktuell nur `player` sein
- Objekt-in-Objekt-Zyklen sind ungueltig
- `interaction.type` zeigt auf einen existierenden `interactionType`
- `availableWhen.ref` zeigt auf ein existierendes Objekt
- `availableWhen.path` zeigt auf einen existierenden Objektpfad
- `set.ref` zeigt auf ein existierendes Objekt
- `set.path` zeigt auf einen existierenden Objektpfad

### 4. IDs formal pruefen

IDs werden aktuell auf die vereinbarte `camelCase`-Form geprueft.

Betroffen sind:

- `interactionTypes`
- `rooms`
- `objects`
- `ways`
- `interactions`
- `placement`

### 5. Objektzustand aus `stateSchema` materialisieren

Wenn ein Objekt ein `stateSchema` hat, werden Default-Werte beim Laden materialisiert.

Das bedeutet:

- deklarierte State-Felder erhalten ihren `default`
- `state` kann optionale Startwerte ueberschreiben
- das Ergebnis liegt nach dem Laden als konkreter Objektzustand vor

Beispiel:

- `huettenTuer.state.closed` wird zu `true`
- `huettenTuer.state.lockState` wird zu `locked`

### 6. Objektzustand auf Gueltigkeit pruefen

Objektzustand wird nicht frei akzeptiert, sondern gegen das jeweilige `stateSchema` geprueft.

Aktuell unterstuetzt:

- Typpruefung
- Default-Pflicht fuer konkrete State-Werte
- Enum-Pruefung
- Zahlenbereiche wie `minimum` und `maximum`
- rekursive Pruefung verschachtelter State-Schemas

### 7. Initiale Objektplatzierung ausdruecken

Die World-Instanz kann aktuell ausdruecken, wo jedes Objekt zu Beginn ist.

Unterstuetzte Platzierungen:

- in einem Raum
- im Inventar des Spielers
- offstage
- in einem anderen Objekt

Damit lassen sich bereits modellieren:

- Objekt auf der Wiese
- Objekt in der Huette
- Schluessel in Kiste
- Objekt im Startinventar
- Objekt ausserhalb der aktiven Szene

### 8. Tragbarkeit markieren

Objekte koennen aktuell als tragbar markiert werden.

Unterstuetzt:

- `portable: true`

Bedeutung heute:

- das Modell kann ausdruecken, dass ein Objekt grundsaetzlich ins Inventar bewegbar sein soll

Wichtig:

- es gibt noch keine fertige Laufzeitmechanik, die `portable` automatisch ausfuehrt
- `portable` ist aktuell eine modellierte Regel, noch kein eigener Bewegungsprozess

### 9. Objektinteraktionen beschreiben

Die World kann Interaktionen an Objekten definieren.

Unterstuetzt:

- semantischer Typ ueber `interaction.type`
- Anzeigename und Beschreibung
- Sprachvarianten ueber `aliases`
- Spielerintention ueber `intent`
- Bedingungen ueber `availableWhen`
- Effekte ueber `effects`
- Rueckgaben ueber `result`

### 10. Verfuegbarkeit von Interaktionen pruefbar beschreiben

Interaktionen und Wege koennen bedingt modelliert werden.

Unterstuetzte logische Bausteine:

- `all`
- `any`
- `not`

Unterstuetzte Vergleichsarten:

- `equals`
- `contains`

Das erlaubt heute schon Regeln wie:

- Tuer nur oeffnen, wenn `state.lockState == unlocked`
- Kiste nur oeffnen, wenn `state.closed == true`

### 11. Zustand durch `set` aendern

Als konkrete Weltveraenderung ist aktuell `set` unterstuetzt.

Damit kann eine Interaktion:

- einen existierenden State-Pfad eines Objekts veraendern

Typische Faelle:

- `closed: true -> false`
- `lockState: locked -> unlocked`
- `lightMode: off -> dim`

### 12. Direktes Feedback geben

Als Rueckgabe oder Nebeneffekt werden aktuell unterstuetzt:

- `result.text`
- `result.knowledge`
- `say`-Effekte

Damit kann eine World-Instanz:

- sichtbares oder gesprochenes Feedback erzeugen
- semantische Wissensmarker anhaengen

### 13. Trigger als Hook beschreiben

`trigger` ist aktuell als Effektart im Modell vorhanden.

Bedeutung heute:

- die World kann benannte Trigger-Ereignisse beschreiben

Wichtig:

- der Loader validiert nur die Struktur
- eine konkrete Engine-Semantik fuer Trigger ist aktuell noch nicht implementiert

### 14. World per CLI pruefen

Die World kann ueber den Root-Befehl validiert werden.

Unterstuetzt:

- `npm run checkworld`
- `npm run checkworld -- <datei>`

Damit werden aktuell ausgefuehrt:

- Build des Workspace-Pakets
- Laden der World
- Schema-Validierung
- Referenzpruefung

### 15. Runtime-Instanz erzeugen

Eine geladene World kann jetzt in eine Laufzeitinstanz ueberfuehrt werden.

Unterstuetzt:

- Erzeugen einer Runtime aus der World-Struktur
- Startzustand aus `player.initialRoom`, `placement` und materialisierten Objekt-States
- optionales Ueberschreiben eines Initialzustands

Relevante Stelle:

- [runtime.ts](C:/remoterep/worlddesc/packages/world/src/runtime.ts:1)

### 16. Laufzeitstatus lesen

Die Runtime kann den aktuellen Zustand der Weltinstanz auslesen.

Unterstuetzt:

- aktueller Spielerraum
- aktueller Objektzustand
- aktuelle Platzierung eines Objekts
- Inventarobjekte
- direkte Raumobjekte
- direkte Containerinhalte
- aktueller Knowledge-Stand

Typische Abfragen:

- `getCurrentRoomId()`
- `getRoomObjectIds()`
- `getInventoryObjectIds()`
- `getContainedObjectIds("kiste")`
- `getObjectState("huettenTuer")`

### 17. Verfuegbare Wege zur Laufzeit ermitteln

Die Runtime kann aus dem aktuellen Raum alle momentan begehbaren Wege ermitteln.

Unterstuetzt:

- Bedingungspruefung fuer `ways[*].availableWhen`
- Rueckgabe der aktuell nutzbaren Wege

Typische Nutzung:

- Navigation in einer Engine vorbereiten
- LLM nur die gerade moeglichen Wege anbieten

### 18. Verfuegbare Objektinteraktionen zur Laufzeit ermitteln

Die Runtime kann fuer ein zugaengliches Objekt alle aktuell moeglichen Interaktionen bestimmen.

Unterstuetzt:

- Objekt muss aktuell zugaenglich sein
- Bedingungspruefung fuer `interactions[*].availableWhen`
- Rueckgabe der verfuegbaren Interaktionen

Wichtig:

- aktuell gelten nur direkte Raumobjekte und Inventarobjekte als zugaenglich
- Containerinhalte werden noch nicht automatisch als zugaenglich behandelt

### 19. Wege ausfuehren

Die Runtime kann einen verfuegbaren Weg wirklich benutzen.

Unterstuetzt:

- Wechsel von `playerRoom`
- Ausfuehrung von `onEnter`-Effekten des Zielraums
- Rueckgabe von `say`-Texten und `trigger`-Events

### 20. Objektinteraktionen ausfuehren

Die Runtime kann eine verfuegbare Interaktion an einem zugaenglichen Objekt ausfuehren.

Unterstuetzt:

- Verfuegbarkeitspruefung
- Ausfuehrung von `set`
- Sammeln von `say`
- Sammeln von `trigger`
- Uebernahme von `result.text`
- Uebernahme neuer `knowledge`-Marker

Das bedeutet:

- der deklarierte Weltzustand wird jetzt nicht nur beschrieben, sondern auch wirklich angewendet

### 21. Zustandsuebergaenge verfolgen

Nach einer ausgefuehrten Interaktion oder einem Weg steht der neue Weltzustand in der Runtime direkt zur Verfuegung.

Unterstuetzt:

- veraenderte Objektzustaende
- veraenderter Spielerraum
- angereicherter Knowledge-Stand

Typisches Beispiel:

- `kiste.oeffnen` setzt `kiste.state.closed` von `true` auf `false`

## Noch nicht unterstuetzte Operationen

Diese Dinge sind fachlich vorbereitet oder angedacht, aber aktuell noch nicht als Operation implementiert:

- `move`-Effekt fuer Ortswechsel
- Laufzeitwechsel von Raum nach Inventar
- Laufzeitwechsel von Objekt nach Inventar
- generische Inventaroperationen wie `pickup` oder `drop`
- Bedingung "Objekt ist im Inventar"
- Bedingung "Objekt liegt in Objekt X"
- automatische Sichtbarkeitsableitung oder Zugaenglichkeit fuer Containerinhalte
- Engine-Ausfuehrung von `trigger`

## Kurzfazit

Aktuell unterstuetzt die World-Instanz bereits:

- Laden
- formale Validierung
- semantische Referenzpruefung
- deklarativen Objektzustand
- initiale Platzierung
- bedingte Interaktionen
- `set`-basierte Zustandsaenderung
- textuelles und semantisches Feedback
- Runtime-Instanziierung
- Laufzeitnavigation
- Laufzeitinteraktionen

Noch nicht voll unterstuetzt ist die eigentliche Laufzeitmechanik fuer Besitz- und Ortswechsel. Genau dort liegt der naechste sinnvolle Ausbauschritt.
