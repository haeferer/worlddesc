# World Model

Dieses Dokument beschreibt das aktuelle World-Modell in fachlichen Begriffen. Es ist absichtlich so geschrieben, dass ein spaeteres LLM damit wieder in das Projekt einsteigen kann.

## Ziel des Modells

Das Modell beschreibt eine interaktive, zustandsbasierte Adventure-Welt.

Es trennt sauber zwischen:

- globaler Weltdefinition
- Spielerstart
- vorbereiteten Asset-Instanzen
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

### Asset Instances

`assetInstances` ist jetzt als vorbereiteter World-Bereich vorhanden.

Eine Asset-Instanz hat aktuell:

- `asset`
- `rootPlacement`
- `objectOverrides`
- `slotContents`

Interpretation:

- dieser Bereich bindet Objekt-Assets an eine World an
- die World kann damit ausdruecken, dass ein Asset wie `safe` unter einer Instanz-ID wie `tresor1` erscheinen soll
- `loadWorldFile()` kann diese Instanzen jetzt in normale `objects` und `placement` expandieren
- kleine Objekt-Ueberschreibungen wie Titel oder Startzustand koennen pro Asset-Objekt gesetzt werden
- benannte Slots koennen externe Weltobjekte gezielt in interne Asset-Container einhaengen
- Slot-Inhalte duerfen dabei aus normaler World-Platzierung kommen; diese wird beim Expandieren ueberschrieben
- `loadWorldDocument()` bleibt dagegen bewusst dateilos und expandiert keine Asset-Dateien

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

Die zweite Beispielwelt `sample/interaction-lab.world.yaml` nutzt dasselbe Modell fuer eine technischere Demonstration:

- zwei gleichzeitig oeffenbare Container fuer Ambiguitaeten
- eine Vitrine mit sichtbar werdendem, spaeter wieder unzugaenglichem Inhalt
- eine Notiz als reine Wissensquelle
- ein Safe mit echter Codeeingabe ueber `additionalText`

### Interactions

`interactions` beschreiben konkrete Spielerhandlungen an einem Objekt.

Eine Interaktion hat aktuell:

- `type`
- `title`
- `desc`
- `intent`
- `aliases`
- `availableWhen`
- `input`
- `effects`
- `result`

Interpretation:

- `type` ist die semantische Klasse
- der eigentliche Ablauf steckt in Bedingungen, Effekten und Resultaten
- parameterisierte Interaktionen koennen zusaetzlich eine deklarative Eingaberegel mit `cases` und `default` tragen

### Parameterisierte Interaktionen

Das Modell kann jetzt auch Interaktionen ausdruecken, die eine kurze strukturierte Eingabe benoetigen.

Aktuell ist dafuer vorgesehen:

- `input.mode: text`
- `input.mode: select`
- `input.mode: number`
- optionale Formregeln wie `required`, `pattern`, `minLength` und `maxLength`
- bei `select` zusaetzlich eine feste `options`-Menge
- bei `number` zusaetzlich Formgrenzen wie `min`, `max`, `step` und optional `unit`
- optional `applyInputTo` als deklaratives Ziel fuer den validierten Eingabewert
- `cases` fuer spezifische Treffer, zum Beispiel ueber `equals` oder Zahlenbereiche
- `default` als Fallback-Zweig

Interpretation:

- die Eingabe kommt ueber `PlayerActionCommand.additionalText`
- die Runtime prueft diese Eingabe gegen die deklarative Regel
- ein erfolgreich validierter Eingabewert kann ueber `applyInputTo` in einen normalen State-Pfad geschrieben werden
- spezifische Werte oder Bereiche koennen ueber `cases` unterschiedlich behandelt werden
- `default` bleibt der gemeinsame Fallback fuer alles, was keinen Case trifft
- die Player-Sicht kann damit spaeter genau ausweisen, ob eine Interaktion Freitext, eine feste Auswahl oder einen Zahlenwert erwartet

### Conditions

`availableWhen` verwendet eine `conditionGroup`.

Aktuell unterstuetzt das Modell:

- `all`
- `any`
- `not`

Eine einzelne Bedingung prueft:

- `ref`: Objekt-ID
- `path`: optionaler Pfad innerhalb des Objekts
- `placement`: optionaler Aufenthaltsort des Objekts
- `equals`
- `contains`

Interpretation:

- Bedingungen referenzieren derzeit nur Objekte
- dadurch ist Weltlogik ueber Objektzustand modelliert

### Effects

`effects` beschreiben aktive Weltveraenderungen.

Aktuell gibt es drei Effektarten:

- `set`
- `move`
- `say`
- `trigger`

Interpretation:

- `set` schreibt auf bestehende deklarierte Objektpfade
- `move` aendert den Aufenthaltsort eines Objekts
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

Ergaenzend zeigt `sample/interaction-lab.world.yaml`, dass dasselbe Modell auch fuer bewusst technische Interface-Szenarien taugt, in denen weniger Weltatmosphaere und mehr Aktionsaufloesung, Ambiguitaet und Spielerwissen im Vordergrund stehen.

## Szenario Kiste, Schluessel, verschlossene Tuer

Das Szenario laesst sich jetzt in der Weltstruktur bereits weitgehend ausdruecken:

- `kiste` ist ein Objekt
- `schluessel` ist ein tragbares Objekt
- `placement.schluessel.object: kiste` legt den Schluessel in die Kiste
- `huettenTuer.stateSchema.lockState` modelliert den Schlosszustand
- `schluessel.nehmen` kann den Schluessel per `move` ins Inventar legen
- `entriegeln` kann ueber eine Placement-Bedingung verlangen, dass der Schluessel im Inventar liegt
- `entriegeln` ist eine eigene Interaktion an der Tuer

Was noch nicht komplett ausgebaut ist:

- generische Standardaktionen fuer Aufheben oder Ablegen
- weitergehende Besitz- oder Containerregeln
- komplexere Placement-Bedingungen jenseits der aktuellen Zieltypen

Das heisst:

- die statische Weltstruktur passt
- einfache Laufzeitwechsel ueber `move` passen ebenfalls
- der naechste Ausbaupunkt ist eher Komfort und Allgemeinheit als die Grundmechanik selbst

## Dokumentationsgrenzen

Dieses Dokument beschreibt Begriffe und Modellstruktur.

Technische und architektonische Festlegungen stehen in [design-decisions.md](C:/remoterep/worlddesc/docs/design-decisions.md:1).

Ein erster ausgelagerter Authoring-Baustein fuer Objekte steht in [assets.md](C:/remoterep/worlddesc/docs/assets.md:1).
