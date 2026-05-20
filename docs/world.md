# World Model

Dieses Dokument beschreibt das aktuelle World-Modell in fachlichen Begriffen. Es ist absichtlich so geschrieben, dass ein spaeteres LLM damit wieder in das Projekt einsteigen kann.

## Ziel des Modells

Das Modell beschreibt eine interaktive, zustandsbasierte Adventure-Welt.

Es trennt sauber zwischen:

- globaler Weltdefinition
- Spielerstart und Startbesitz
- Raeumen als Orte
- Objekten als benennbare und interagierbare Dinge
- Interaktionstypen als semantische Kategorien
- Bedingungen fuer Verfuegbarkeit
- Effekten fuer Weltveraenderungen
- Resultaten fuer Spieler-Feedback

## Zentrale Begriffe

### World

`world` enthaelt die globalen Metadaten der Welt.

- `title`: Name der Welt
- `desc`: optionale Gesamtbeschreibung
- `offstageObjects`: optionale Objekt-IDs fuer bewusst nicht aktive Startobjekte

### Player

`player` beschreibt den Startkontext des Spielers.

- `initialRoom`: ID des Start-Raums
- `initialInventory`: optionale Liste der Startobjekte im Besitz des Spielers

Interpretation:

- Der Spielerstart ist fachlich nicht Teil des Raums, sondern des Spielerzustands.
- Besitz wird zunaechst nur als Aufenthaltsort eines Objekts verstanden.

### Interaction Types

`interactionTypes` definiert globale semantische Interaktionstypen wie `examine`, `open` oder `close`.

Zweck:

- ein LLM kann Interaktionen fachlich einordnen
- eine Engine kann gleiche Typen aehnlich behandeln
- die Objektdefinitionen muessen diese Semantik nicht jedes Mal neu erklaeren

Jeder Typ hat aktuell:

- `title`
- `desc` optional

### Rooms

`rooms` sind die Orte der Welt. Jeder Raum ist ueber seine ID adressierbar.

Ein Raum hat aktuell:

- `title`: kurzer Anzeigename
- `desc`: raeumliche oder atmosphaerische Beschreibung
- `tags`: optionale semantische Marker
- `objects`: IDs der im Raum sichtbaren/interagierbaren Objekte
- `ways`: erreichbare Ausgaenge oder Uebergaenge
- `onEnter`: optionale Effekte beim Betreten

Interpretation:

- Ein Raum ist der primaere Container fuer Sichtbarkeit.
- Objekte sind global definiert, aber raumweise eingeblendet.
- Navigation ist explizit ueber `ways` modelliert.
- Ein Raum ist nicht selbst Traeger von Besitzlogik.

### Ways

`ways` beschreiben moegliche Uebergaenge aus einem Raum.

Ein Weg hat aktuell:

- `title`
- `desc`
- `aliases`: alternative sprachliche Ausdruecke
- `availableWhen`: optionale Bedingung
- `target.room`: Zielraum-ID

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
- `stateSchema`: deklarative Beschreibung des erlaubten Zustands
- `state`: optionale explizite Startwerte, die gegen `stateSchema` validiert werden
- `interactions`: moegliche Interaktionen mit dem Objekt

Interpretation:

- Objekte existieren global und koennen in verschiedenen Raeumen referenziert werden.
- Jedes Objekt braucht zu Beginn genau einen Aufenthaltsort.
- Zustand ist nicht mehr frei, sondern pro Objekt explizit beschrieben.
- Defaults kommen aus `stateSchema` und koennen beim Laden materialisiert werden.
- Typische State-Werte sind booleans, Zahlen, Strings oder kleine Enums.

### Initiale Objektplatzierung

Jedes Objekt soll beim Start genau einmal verortet sein.

Moegliche Startorte sind aktuell:

- in `rooms[*].objects`
- in `player.initialInventory`
- in `world.offstageObjects`

Interpretation:

- `rooms[*].objects` bedeutet sichtbar oder raumgebunden praesent
- `player.initialInventory` bedeutet im Besitz des Spielers
- `world.offstageObjects` bedeutet bewusst ausserhalb der aktiven Szene

Ein Objekt darf dabei nicht gleichzeitig an mehreren Startorten auftauchen.

### State Schema

`stateSchema` beschreibt den erlaubten Zustand eines Objekts in einer JSON-Schema-nahen Form.

Ziel:

- moegliche State-Felder sind vorab deklariert
- jeder State-Wert hat Typinformation
- jeder State-Wert hat einen Default
- Dinge wie `enum`, Zahlenbereiche oder String-Regeln koennen beschrieben werden

Beispielidee:

```yaml
stateSchema:
  type: object
  additionalProperties: false
  properties:
    closed:
      type: boolean
      default: true
    lockState:
      type: string
      enum: [unlocked, locked]
      default: unlocked
```

Das Beispiel in `sample/test.world.yaml` zeigt inzwischen mehrere typische Faelle:

- `huettenTuer.stateSchema` mit einem einfachen Boolean-Feld
- `laterne.stateSchema.lightMode` mit `enum: [off, dim, bright]`
- `laterne.stateSchema.fuelLevel` mit `type: integer`, `minimum` und `maximum`

Wichtig fuer die Interpretation:

- `default` beschreibt den initialen Wert
- `enum` schraenkt erlaubte Zustandswerte explizit ein
- Grenzen wie `minimum` und `maximum` machen numerische Zustandsraeume maschinenlesbar
- `state` kann Defaults optional ueberschreiben, aber nicht ausserhalb des Schemas erweitern

### Interactions

`interactions` beschreiben konkrete Spielerhandlungen an einem Objekt.

Eine Interaktion hat aktuell:

- `type`: Referenz auf einen globalen `interactionType`
- `title`
- `desc`
- `intent`: natuerliche Beschreibung der Spielerabsicht
- `aliases`: alternative Formulierungen
- `availableWhen`: Bedingung fuer Verfuegbarkeit
- `effects`: Weltveraenderungen
- `result`: textuelles und semantisches Ergebnis

Interpretation:

- `type` ist die semantische Klasse.
- Der eigentliche spielerische Ablauf steckt in `availableWhen`, `effects` und `result`.

### Conditions

`availableWhen` verwendet eine `conditionGroup`.

Aktuell unterstuetzt das Modell:

- `all`: alle Bedingungen muessen wahr sein
- `any`: mindestens eine Bedingung muss wahr sein
- `not`: eine einzelne Bedingung darf nicht wahr sein

Eine einzelne Bedingung prueft:

- `ref`: Objekt-ID
- `path`: Pfad innerhalb des Objekts
- `equals`: exakter Vergleich
- `contains`: Array enthaelt Wert

Interpretation:

- Bedingungen referenzieren derzeit nur Objekte.
- Dadurch ist Weltlogik ueber Objektzustand modelliert.

### Effects

`effects` beschreiben aktive Weltveraenderungen.

Aktuell gibt es drei Effektarten:

- `set`: schreibt einen Wert auf `ref` + `path`
- `say`: gibt zusaetzlichen Text aus
- `trigger`: loest ein benanntes Event aus

Interpretation:

- `set` ist der wichtigste primitive Baustein fuer Zustandsaenderungen.
- `say` kann fuer unmittelbares Feedback genutzt werden.
- `trigger` ist ein Erweiterungspunkt fuer Engine-seitige Speziallogik.

### Result

`result` ist die Rueckgabe einer Interaktion an den Spieler.

Aktuell:

- `text`: Antworttext
- `knowledge`: semantische Wissensmarker

Interpretation:

- `knowledge` kann spaeter genutzt werden fuer Erinnerung, Hinweise oder adaptives Prompting.

## Aktuelle Modelllogik aus dem Beispiel

Die Beispielwelt zeigt bereits ein klares Muster:

- Der Spieler startet ueber `player.initialRoom` im Raum `wiese`.
- Die Tuer hat Zustand in `object.state.closed`.
- Die Tuer deklariert ihren Zustand ueber `stateSchema`.
- Die Laterne zeigt ein reichhaltigeres `stateSchema` mit `enum` und Zahlenbereich.
- Die Interaktion `oeffnen` ist nur verfuegbar, wenn `closed == true`.
- Interaktionen koennen auch auf andere deklarierte State-Werte wie `state.lightMode` zugreifen.
- Der Effekt `set` aendert den Objektzustand.
- Ein Raum-Weg kann denselben Zustand pruefen und damit Navigation freischalten.

Damit ist das Modell aktuell stark auf "sichtbare Welt + Objektzustand + Bedingungen + Effekte" ausgerichtet.

## Dokumentationsgrenzen

Dieses Dokument beschreibt Begriffe und Modellstruktur.

Technische und architektonische Festlegungen stehen in [design-decisions.md](C:/remoterep/worlddesc/docs/design-decisions.md:1).
