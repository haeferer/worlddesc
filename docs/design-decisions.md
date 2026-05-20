# Design Decisions

Dieses Dokument sammelt bewusste Architektur- und Modellentscheidungen fuer das World-Projekt. Es ergaenzt `docs/world.md`, das die Fachbegriffe und Modellbausteine beschreibt.

## Aktueller Stand

### JSON Schema ist die strukturelle Quelle

Die formale Struktur der World-Datei wird ueber `schema/world.schema.json` beschrieben.

Bedeutung:

- Editor-Support und statische Validierung orientieren sich am Schema.
- Das Schema prueft Form, Pflichtfelder und Datentypen.
- Fachliche Referenzen werden zusaetzlich im Loader geprueft.

### Referenzielle Validierung passiert beim Laden

Beim Laden einer World-Datei wird nicht nur das JSON Schema angewendet, sondern auch eine semantische Referenzpruefung.

Aktuell geprueft:

- `world.initialRoom` muss auf einen existierenden Raum zeigen
- `rooms[*].objects[*]` muessen existierende Objekte referenzieren
- `rooms[*].ways[*].target.room` muss auf einen existierenden Raum zeigen
- `interaction.type` muss auf einen existierenden `interactionType` zeigen
- `availableWhen`-Bedingungen muessen existierende Objekte referenzieren
- Bedingungspfade muessen auf dem referenzierten Objekt existieren
- `set`-Effekte muessen ein existierendes Zielobjekt referenzieren

Motivation:

- Das JSON Schema allein kann Querverweise nicht ausreichend absichern.
- Gerade Objekt-Referenzen sind fuer die Spiel- und Promptlogik zentral.
- Fehler sollen frueh beim Laden statt spaet zur Laufzeit sichtbar werden.

### Objektzustand wird ueber `stateSchema` deklariert

Freier Objektzustand reicht fuer robuste World-Dateien nicht aus. Deshalb wird Zustand jetzt ueber `stateSchema` beschrieben.

Regeln:

- jeder genutzte State-Pfad muss im `stateSchema` deklariert sein
- jeder konkrete State-Wert braucht `type`
- jeder konkrete State-Wert braucht `default`
- `state` ist nur noch optionaler Start-Override und kein freier Zustandsspeicher
- `set`-Effekte duerfen nur auf deklarierte State-Pfade schreiben

Motivation:

- Tippfehler in State-Pfaden werden frueh gefunden
- Defaults sind explizit dokumentiert
- ein LLM sieht erlaubte Werte besser, etwa bei `enum`
- eine Engine kann den Initialzustand deterministisch materialisieren

Beispielhafte Nutzung:

- Boolean-Zustaende wie `closed`
- Enums wie `lightMode: off | dim | bright`
- numerische Werte mit Grenzen wie `fuelLevel: 0..100`

### Objekte sind aktuell der primaere Referenzanker

Weltlogik referenziert derzeit vor allem Objekte.

Konsequenzen:

- Bedingungen lesen primaer Objektzustand.
- `set`-Effekte schreiben primaer in Objektzustand.
- Raeume steuern Sichtbarkeit und Navigation, aber nicht den Hauptzustand.

Diese Entscheidung passt gut zum aktuellen Adventure-Modell, weil Tueren, Container, Schalter oder NPCs leicht als globale Objektinstanzen modellierbar sind.

### Raeume bleiben vorerst zustandslos

Raeume bekommen aktuell keinen eigenen Zustandsmechanismus.

Stattdessen werden auch raumbezogene Zustaende ueber Objekte modelliert.

Das kann zweierlei Formen annehmen:

- sichtbare Objekte wie `laterne`, `generator`, `schalter`
- implizite Systemobjekte wie `huetteInnenLicht` oder `kellerAtmosphaere`

Motivation:

- das Modell bleibt bei genau einem Referenz- und Zustandskonzept
- Bedingungen, `set`-Effekte und Interaktionen funktionieren bereits objektzentriert
- ein LLM kann raumbezogene Veraenderungen trotzdem gut verstehen, wenn sie an benannte Objekte gebunden sind
- wir vermeiden einen zweiten parallelen Zustandskanal nur fuer Raeume

Beispiele fuer raumbezogene Zustaende, die zunaechst als Objekte modelliert werden sollen:

- Licht an oder aus
- Nebel aktiv oder inaktiv
- Alarmstatus eines Bereichs
- aktiver Mechanismus in einem Raum

Ein eigener Raumzustand wird erst dann relevant, wenn sich spaeter viele wirklich nicht-objekthafte Ortszustaende sammeln.

### IDs folgen aktuell `camelCase`

Die kanonische Schreibweise fuer IDs ist derzeit `camelCase`.

Das gilt fuer:

- `interactionTypes`
- `rooms`
- `objects`
- `ways`
- `interactions`

Motivation:

- Das Beispielmaterial nutzt diese Form bereits.
- Die IDs bleiben sprachlich lesbar und zugleich kompakt.
- Referenzen in YAML und TypeScript bleiben dadurch konsistent.

Regel:

- erstes Zeichen kleingeschrieben
- danach nur Buchstaben und Ziffern
- keine Leerzeichen, Bindestriche oder Unterstriche

## Trennung der Dokumentation

Die Dokumentation ist jetzt bewusst zweigeteilt:

- `docs/world.md`: Begriffswelt, Modellbausteine, fachliche Semantik
- `docs/design-decisions.md`: technische und architektonische Festlegungen

Ziel:

- Ein spaeteres LLM findet Begriffe und Entscheidungen getrennt vor.
- Fachmodell und Implementationsstrategie vermischen sich weniger.

## Offene Entscheidungen

- Ob `ref` spaeter neben Objekten auch `rooms` oder globale `world`-Werte adressieren darf
