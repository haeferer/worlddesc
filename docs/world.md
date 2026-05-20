# World Model

Dieses Dokument beschreibt das aktuelle World-Modell in fachlichen Begriffen. Es ist absichtlich so geschrieben, dass ein spaeteres LLM damit wieder in das Projekt einsteigen kann.

## Ziel des Modells

Das Modell beschreibt eine interaktive, zustandsbasierte Adventure-Welt.

Es trennt sauber zwischen:

- globaler Weltdefinition
- Spielerstart
- Raeumen als Orte
- Objekten als benennbare und interagierbare Dinge
- Platzierung als Aufenthaltsort von Objekten
- Interaktionstypen als semantische Kategorien
- Bedingungen fuer Verfuegbarkeit
- Effekten fuer Weltveraenderungen
- Resultaten fuer Spieler-Feedback

## Zentrale Begriffe

### World

`world` enthaelt die globalen Metadaten der Welt.

- `title`: Name der Welt
- `desc`: optionale Gesamtbeschreibung

### Player

`player` beschreibt den Startkontext des Spielers.

- `initialRoom`: ID des Start-Raums

Interpretation:

- Der Spielerstart ist fachlich nicht Teil des Raums, sondern des Spielerzustands.
- Besitz zur Laufzeit ist noch nicht als eigenes Submodell ausgebaut.

### Interaction Types

`interactionTypes` definiert globale semantische Interaktionstypen wie `examine`, `open`, `close` oder `unlock`.

Zweck:

- ein LLM kann Interaktionen fachlich einordnen
- eine Engine kann gleiche Typen aehnlich behandeln
- die Objektdefinitionen muessen diese Semantik nicht jedes Mal neu erklaeren

### Rooms

`rooms` sind die Orte der Welt. Jeder Raum ist ueber seine ID adressierbar.

Ein Raum hat aktuell:

- `title`
- `desc`
- `tags`
- `ways`
- `onEnter`

Interpretation:

- Ein Raum beschreibt Atmosphaere, Orientierung und Uebergaenge.
- Welche Objekte sich wo befinden, steht nicht mehr direkt im Raum, sondern zentral in `placement`.
- Ein Raum ist nicht selbst Traeger von Besitzlogik.

### Ways

`ways` beschreiben moegliche Uebergaenge aus einem Raum.

Ein Weg hat aktuell:

- `title`
- `desc`
- `aliases`
- `availableWhen`
- `target.room`

Interpretation:

- Wege sind nicht nur Himmelsrichtungen.
- Ein Weg kann auch eine benannte Aktion wie `huette betreten` sein.

### Objects

`objects` sind globale Objektinstanzen der Welt.

Ein Objekt hat aktuell:

- `title`
- `desc`
- `aliases`
- `tags`
- `portable`
- `stateSchema`
- `state`
- `interactions`

Interpretation:

- Objekte existieren global und koennen in Bedingungen, Effekten und Platzierungen referenziert werden.
- Objekte koennen sichtbar, tragbar, enthalten oder rein systemisch sein.
- Zustand und Aufenthaltsort sind getrennte Konzepte.

### Placement

`placement` beschreibt den initialen Aufenthaltsort jedes Objekts.

Jedes Objekt muss genau einen Eintrag in `placement` haben.

Moegliche Startorte sind aktuell:

- `room`: Objekt liegt in einem Raum
- `inventory`: Objekt liegt im Inventar eines Besitzers, aktuell nur `player`
- `offstage`: Objekt ist ausserhalb der aktiven Szene
- `object`: Objekt liegt in einem anderen Objekt

Interpretation:

- Platzierung ist die zentrale Quelle fuer "wo ist das Objekt?"
- Container wie Kisten sind damit kein Sonderfall mehr
- der Loader prueft, dass Platzierungen auf existierende Raeume oder Objekte zeigen
- Objekt-in-Objekt-Zyklen sind ungueltig

### Beweglichkeit von Objekten

Nicht jedes Objekt, das irgendwo liegt oder steht, soll automatisch in ein Inventar verschoben werden duerfen.

Als einfache erste Regel gibt es dafuer `portable: true`.

Interpretation:

- `portable: true` bedeutet, dass ein Objekt grundsaetzlich ins Inventar bewegt werden darf
- fehlend oder `false` bedeutet, dass es nicht als tragbares Inventarobjekt gedacht ist
- die konkrete Erreichbarkeit wird weiterhin ueber Bedingungen modelliert

Beispiel:

- `schluessel.portable: true`
- `laterne.portable: true`
- `huettenTuer` ist nicht portable

### State Schema

`stateSchema` beschreibt den erlaubten Zustand eines Objekts in einer JSON-Schema-nahen Form.

Ziel:

- moegliche State-Felder sind vorab deklariert
- jeder State-Wert hat Typinformation
- jeder State-Wert hat einen Default
- Dinge wie `enum`, Zahlenbereiche oder String-Regeln koennen beschrieben werden

Das Beispiel in `sample/test.world.yaml` zeigt typische Faelle:

- `huettenTuer.stateSchema.closed` als Boolean
- `huettenTuer.stateSchema.lockState` als Enum
- `laterne.stateSchema.fuelLevel` als Zahl mit Grenzen

### Interactions

`interactions` beschreiben konkrete Spielerhandlungen an einem Objekt.

Eine Interaktion hat aktuell:

- `type`
- `title`
- `desc`
- `intent`
- `aliases`
- `availableWhen`
- `effects`
- `result`

Interpretation:

- `type` ist die semantische Klasse
- der eigentliche Ablauf steckt in Bedingungen, Effekten und Resultaten

### Conditions

`availableWhen` verwendet eine `conditionGroup`.

Aktuell unterstuetzt das Modell:

- `all`
- `any`
- `not`

Eine einzelne Bedingung prueft:

- `ref`: Objekt-ID
- `path`: Pfad innerhalb des Objekts
- `equals`
- `contains`

Interpretation:

- Bedingungen referenzieren derzeit nur Objekte
- dadurch ist Weltlogik ueber Objektzustand modelliert

### Effects

`effects` beschreiben aktive Weltveraenderungen.

Aktuell gibt es drei Effektarten:

- `set`
- `say`
- `trigger`

Interpretation:

- `set` schreibt auf bestehende deklarierte Objektpfade
- `say` gibt unmittelbares Zusatzfeedback
- `trigger` bleibt ein Erweiterungspunkt fuer Engine-seitige Speziallogik

### Result

`result` ist die Rueckgabe einer Interaktion an den Spieler.

Aktuell:

- `text`
- `knowledge`

## Aktuelle Modelllogik aus dem Beispiel

Die Beispielwelt zeigt bereits ein deutlich reichhaltigeres Muster:

- Der Spieler startet ueber `player.initialRoom` im Raum `wiese`.
- Die Kiste steht auf der Wiese ueber `placement.kiste.room`.
- Der Schluessel liegt in der Kiste ueber `placement.schluessel.object`.
- Die Huettentuer ist geschlossen und verriegelt.
- Die Laterne ist tragbar und besitzt einen reicheren Zustand mit Enum und Zahlenbereich.
- Die Huettentuer kann erst entriegelt und danach geoeffnet werden.

Damit ist das Modell aktuell stark auf "Objekte + Platzierung + Objektzustand + Bedingungen + Effekte" ausgerichtet.

## Szenario Kiste, Schluessel, verschlossene Tuer

Das Szenario laesst sich jetzt in der Weltstruktur bereits weitgehend ausdruecken:

- `kiste` ist ein Objekt
- `schluessel` ist ein tragbares Objekt
- `placement.schluessel.object: kiste` legt den Schluessel in die Kiste
- `huettenTuer.stateSchema.lockState` modelliert den Schlosszustand
- `entriegeln` ist eine eigene Interaktion an der Tuer

Was noch nicht umgesetzt ist:

- ein echter `move`-Effekt fuer Laufzeitwechsel
- eine standardisierte Bedingung fuer "Objekt ist im Inventar"
- eine standardisierte Bedingung fuer "Objekt ist in einem Container erreichbar"

Das heisst:

- die statische Weltstruktur passt jetzt schon gut
- die Laufzeitmechanik fuer Aufheben und Ablegen ist der naechste sinnvolle Ausbauschritt

## Dokumentationsgrenzen

Dieses Dokument beschreibt Begriffe und Modellstruktur.

Technische und architektonische Festlegungen stehen in [design-decisions.md](C:/remoterep/worlddesc/docs/design-decisions.md:1).
