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
- `availableWhen.placement` zeigt auf gueltige Platzierungsziele
- `set.ref` zeigt auf ein existierendes Objekt
- `set.path` zeigt auf einen existierenden Objektpfad
- `move.ref` zeigt auf ein existierendes Objekt
- `move.to` zeigt auf gueltige Platzierungsziele

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

- `portable` wirkt jetzt in der Runtime als Schutzregel fuer Moves ins Inventar

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

Unterstuetzte Platzierungspruefungen:

- Objekt liegt in einem Raum
- Objekt liegt im Inventar des Spielers
- Objekt liegt offstage
- Objekt liegt in einem anderen Objekt

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

### 12a. Parameterisierte Interaktionen auswerten

Interaktionen koennen jetzt eine kurze strukturierte Eingabe verlangen.

Unterstuetzt:

- `input.mode: text`
- `input.mode: select`
- `input.mode: number`
- `required`
- `minLength`
- `maxLength`
- `pattern`
- `options`
- `min`
- `max`
- `step`
- `unit`
- `applyInputTo`
- `cases`
- `default`

Bedeutung heute:

- `PlayerActionCommand.additionalText` wird an die Runtime weitergereicht
- die Runtime prueft die Eingabe gegen die deklarative Regel
- bei Erfolg kann der validierte Wert deklarativ in Objektzustand geschrieben werden
- spezifische Eingabewerte oder Zahlenbereiche koennen ueber `cases` mit Matchern wie `equals`, `min` und `max` unterschiedliche `effects` und `result`-Inhalte ausloesen
- `default` bildet den Fallback fuer nicht getroffene Cases oder ungueltige Eingaben

### 13. Ortswechsel durch `move` ausfuehren

Als konkrete Weltveraenderung ist jetzt auch `move` unterstuetzt.

Damit kann eine Interaktion:

- ein Objekt in einen Raum bewegen
- ein Objekt ins Inventar des Spielers bewegen
- ein Objekt offstage setzen
- ein Objekt in ein anderes Objekt bewegen

Zur Laufzeit geprueft wird dabei:

- Zielkontext ist strukturell gueltig
- Inventar-Moves erfordern `portable: true`
- Objekt-in-Objekt-Zyklen duerfen nicht entstehen

### 14. Trigger als Hook beschreiben

`trigger` ist aktuell als Effektart im Modell vorhanden.

Bedeutung heute:

- die World kann benannte Trigger-Ereignisse beschreiben

Wichtig:

- der Loader validiert nur die Struktur
- eine konkrete Engine-Semantik fuer Trigger ist aktuell noch nicht implementiert

### 15. World per CLI pruefen

Die World kann ueber den Root-Befehl validiert werden.

Unterstuetzt:

- `npm run checkworld`
- `npm run checkworld -- <datei>`

Damit werden aktuell ausgefuehrt:

- Build des Workspace-Pakets
- Laden der World
- Schema-Validierung
- Referenzpruefung

### 15a. Objekt-Asset laden und pruefen

Neben kompletten Worlds kann das Projekt jetzt auch isolierte Objekt-Assets validieren.

Unterstuetzt:

- `loadObjectAsset()` und `loadObjectAssetFile()`
- `schema/object-asset.schema.json`
- `npm run checkasset`
- semantische Validierung von Root-Objekten, interner Platzierung, State-Pfaden und Zyklen

Wichtig:

- Assets sind aktuell ein Authoring-Format
- sie werden noch nicht in Worlds instanziiert oder zur Laufzeit separat behandelt

### 16. Runtime-Instanz erzeugen

Eine geladene World kann jetzt in eine Laufzeitinstanz ueberfuehrt werden.

Unterstuetzt:

- Erzeugen einer Runtime aus der World-Struktur
- Startzustand aus `player.initialRoom`, `placement` und materialisierten Objekt-States
- optionales Ueberschreiben eines Initialzustands

Relevante Stelle:

- [runtime.ts](C:/remoterep/worlddesc/packages/world/src/runtime.ts:1)

### 17. Laufzeitstatus lesen

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

### 18. Verfuegbare Wege zur Laufzeit ermitteln

Die Runtime kann aus dem aktuellen Raum alle momentan begehbaren Wege ermitteln.

Unterstuetzt:

- Bedingungspruefung fuer `ways[*].availableWhen`
- Rueckgabe der aktuell nutzbaren Wege

Typische Nutzung:

- Navigation in einer Engine vorbereiten
- LLM nur die gerade moeglichen Wege anbieten

### 19. Verfuegbare Objektinteraktionen zur Laufzeit ermitteln

Die Runtime kann fuer ein zugaengliches Objekt alle aktuell moeglichen Interaktionen bestimmen.

Unterstuetzt:

- Objekt muss aktuell zugaenglich sein
- Bedingungspruefung fuer `interactions[*].availableWhen`
- Rueckgabe der verfuegbaren Interaktionen

Wichtig:

- direkte Raumobjekte und Inventarobjekte sind zugaenglich
- Containerinhalte werden zugaenglich, wenn ihr Container selbst zugaenglich und nicht `closed: true` ist
- Placement-Bedingungen werden zur Laufzeit ausgewertet

### 20. Wege ausfuehren

Die Runtime kann einen verfuegbaren Weg wirklich benutzen.

Unterstuetzt:

- Wechsel von `playerRoom`
- Ausfuehrung von `onEnter`-Effekten des Zielraums
- Rueckgabe von `say`-Texten und `trigger`-Events

### 21. Objektinteraktionen ausfuehren

Die Runtime kann eine verfuegbare Interaktion an einem zugaenglichen Objekt ausfuehren.

Unterstuetzt:

- Verfuegbarkeitspruefung
- Ausfuehrung von `set`
- Ausfuehrung von `move`
- Sammeln von `say`
- Sammeln von `trigger`
- Uebernahme von `result.text`
- Uebernahme neuer `knowledge`-Marker

Das bedeutet:

- der deklarierte Weltzustand wird jetzt nicht nur beschrieben, sondern auch wirklich angewendet

### 22. Zustandsuebergaenge verfolgen

Nach einer ausgefuehrten Interaktion oder einem Weg steht der neue Weltzustand in der Runtime direkt zur Verfuegung.

Unterstuetzt:

- veraenderte Objektzustaende
- veraenderter Spielerraum
- angereicherter Knowledge-Stand

Typisches Beispiel:

- `kiste.oeffnen` setzt `kiste.state.closed` von `true` auf `false`
- `schluessel.nehmen` bewegt den Schluessel von `object: kiste` nach `inventory: player`

## Noch nicht unterstuetzte Operationen

Diese Dinge sind fachlich vorbereitet oder angedacht, aber aktuell noch nicht als Operation implementiert:

- generische Inventaroperationen wie `pickup` oder `drop`
- automatische Ableitung sprachlicher Standardinteraktionen fuer Moves
- Engine-Ausfuehrung von `trigger`
- voll implementierte Player-Memory- oder Perception-Schicht
- voll ausgereifte spielerperspektivische `PlayerWorldView` auf die Runtime
- Persistenz von Runtime plus Spielerwissen

Wichtig:

- eine erste `PlayerWorldView` ist bereits vorhanden
- sie liefert aktuelle Szene, sichtbare Objekte, Inventar, Wege, aufbereitete Texte und neue Wahrnehmungsereignisse
- die Aktionsabwicklung arbeitet im Kern mit strukturierten Spielerkommandos
- eine separate Hilfsschicht kann diese Kommandos deterministisch aus Text, Aliasen und Hints ableiten
- `additionalText` wird bereits bis in normale Interaktionen durchgereicht und dort fuer deklarative Eingaberegeln ausgewertet
- sichtbare Interaktionen koennen jetzt auch ihre erwartete Eingabeform samt Metadaten an die Player-Sicht liefern
- Fehlschlaege werden dabei bereits strukturiert mit Fehlercodes wie `unknown-object`, `unknown-action`, `object-not-accessible` oder `action-not-available` zurueckgegeben
- die Textaufloesung kann neben `resolved` und `unresolved` auch bewusst `ambiguous` liefern, inklusive Kandidatenliste
- die Schicht ist damit als Basis nutzbar, aber noch nicht die spaetere vollstaendige Spieler- oder LLM-Fassade

## Kurzfazit

Aktuell unterstuetzt die World-Instanz bereits:

- Laden
- formale Validierung
- semantische Referenzpruefung
- deklarativen Objektzustand
- initiale Platzierung
- bedingte Interaktionen
- `set`-basierte Zustandsaenderung
- `move`-basierte Platzierungsaenderung
- textuelles und semantisches Feedback
- Runtime-Instanziierung
- Laufzeitnavigation
- Laufzeitinteraktionen

Noch nicht voll unterstuetzt ist die eigentliche Laufzeitmechanik fuer Besitz- und Ortswechsel. Genau dort liegt der naechste sinnvolle Ausbauschritt.
