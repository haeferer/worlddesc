# Design Decisions

Dieses Dokument sammelt bewusste Architektur- und Modellentscheidungen fuer das World-Projekt. Es ergaenzt `docs/world.md`, das die Fachbegriffe und Modellbausteine beschreibt.

## Aktueller Stand

### JSON Schema ist die strukturelle Quelle

Die formale Struktur der World-Datei wird ueber `schema/world.schema.json` beschrieben.

Bedeutung:

- Editor-Support und statische Validierung orientieren sich am Schema
- das Schema prueft Form, Pflichtfelder und Datentypen
- fachliche Referenzen werden zusaetzlich im Loader geprueft

### Referenzielle Validierung passiert beim Laden

Beim Laden einer World-Datei wird nicht nur das JSON Schema angewendet, sondern auch eine semantische Referenzpruefung.

Aktuell geprueft:

- `player.initialRoom` muss auf einen existierenden Raum zeigen
- jeder `placement`-Eintrag muss auf ein existierendes Objekt zeigen
- `placement.*.room` muss auf einen existierenden Raum zeigen
- `placement.*.object` muss auf ein existierendes Objekt zeigen
- `placement.*.inventory` darf aktuell nur `player` sein
- jedes Objekt braucht genau einen `placement`-Eintrag
- Objekt-in-Objekt-Zyklen in `placement` sind ungueltig
- `rooms[*].ways[*].target.room` muss auf einen existierenden Raum zeigen
- `interaction.type` muss auf einen existierenden `interactionType` zeigen
- `availableWhen`-Bedingungen muessen existierende Objekte referenzieren
- Bedingungspfade muessen auf dem referenzierten Objekt existieren
- `set`-Effekte muessen ein existierendes Zielobjekt referenzieren

### Objektzustand wird ueber `stateSchema` deklariert

Freier Objektzustand reicht fuer robuste World-Dateien nicht aus. Deshalb wird Zustand ueber `stateSchema` beschrieben.

Regeln:

- jeder genutzte State-Pfad muss im `stateSchema` deklariert sein
- jeder konkrete State-Wert braucht `type`
- jeder konkrete State-Wert braucht `default`
- `state` ist nur noch optionaler Start-Override
- `set`-Effekte duerfen nur auf deklarierte State-Pfade schreiben

### Objekte sind aktuell der primaere Referenzanker

Weltlogik referenziert derzeit vor allem Objekte.

Konsequenzen:

- Bedingungen lesen primaer Objektzustand
- `set`-Effekte schreiben primaer in Objektzustand
- Raeume steuern Sichtbarkeit und Navigation, aber nicht den Hauptzustand

### Raeume bleiben vorerst zustandslos

Raeume bekommen aktuell keinen eigenen Zustandsmechanismus.

Stattdessen werden auch raumbezogene Zustaende ueber Objekte modelliert.

Beispiele:

- Licht an oder aus
- Nebel aktiv oder inaktiv
- Alarmstatus eines Bereichs
- aktiver Mechanismus in einem Raum

### Platzierung ist jetzt ein eigenes Modell

Der Aufenthaltsort von Objekten wird nicht mehr ueber verteilte Listen modelliert, sondern zentral in `placement`.

Aktuelle Zieltypen:

- `room`
- `inventory`
- `offstage`
- `object`

Motivation:

- ein Objekt hat genau einen Aufenthaltsort
- "Schluessel in Kiste" wird kein Sonderfall
- Besitz und Container folgen derselben Grundlogik
- Referenzpruefung bleibt zentral und nachvollziehbar

### Inventar ist vorerst reine Besitzrelation

Inventar wird aktuell nicht als eigener Containertyp modelliert, sondern als Zielkontext in `placement`.

Regeln:

- `placement.<objekt>.inventory: player` bedeutet Besitz des Spielers
- dieselben Objekte duerfen nicht gleichzeitig an einem zweiten Ort liegen
- Besitz ist aktuell nur Startplatzierung, keine ausmodellierte Laufzeitmechanik

### Beweglichkeit wird von Platzierung getrennt

Der Aufenthaltsort eines Objekts bedeutet nicht automatisch, dass es auch bewegt werden darf.

Erste einfache Regel:

- Objekte koennen `portable: true` erhalten
- nur portable Objekte duerfen spaeter ins Inventar gemoved werden

Motivation:

- ein Schluessel soll tragbar sein
- eine Huettentuer soll trotz klarer Platzierung nicht ins Inventar verschoben werden
- Platzierung und Beweglichkeit bleiben getrennte Konzepte

### Ortswechsel sollen spaeter ueber `move` modelliert werden

Fuer kuenftige Besitz- und Platzierungswechsel soll kein ganzer Satz spezialisierter Effektarten wie `pickup`, `drop`, `spawn` oder `despawn` eingefuehrt werden.

Stattdessen ist ein generischer, aber eng begrenzter `move`-Effekt vorgesehen.

Gedachte Zielrichtung:

- Raum nach Inventar
- Inventar nach Raum
- Raum nach Offstage
- Offstage nach Raum
- Objekt nach Inventar
- Inventar nach Objekt

Wichtige Einschraenkung:

- `move` ist kein freier Universalbefehl
- er soll nur fuer wohldefinierte Orts- und Besitzwechsel genutzt werden
- Zieltypen muessen strukturiert und eindeutig modelliert werden

### IDs folgen aktuell `camelCase`

Die kanonische Schreibweise fuer IDs ist derzeit `camelCase`.

Das gilt fuer:

- `interactionTypes`
- `rooms`
- `objects`
- `ways`
- `interactions`
- `placement`

## Offene Entscheidungen

- Wie genau eine Laufzeitbedingung fuer "Objekt ist im Inventar" modelliert werden soll
- Wie `move` strukturiert aussehen soll
- Ob `ref` spaeter neben Objekten auch `rooms` oder globale `world`-Werte adressieren darf
