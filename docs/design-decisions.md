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
- Placement-Bedingungen muessen auf gueltige Raeume, Besitzer oder Objekte zeigen
- `set`-Effekte muessen ein existierendes Zielobjekt referenzieren
- `move`-Effekte muessen ein existierendes Zielobjekt und ein gueltiges Ziel haben

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

Aktueller Stand:

- `move` ist jetzt als Effektart im Modell und in der Runtime vorhanden
- unterstuetzt werden derzeit Ziele nach `room`, `inventory`, `offstage` und `object`
- Moves ins Inventar setzen `portable: true` voraus
- Objekt-in-Objekt-Zyklen werden verhindert

### Das LLM steht zwischen Spieler und World-Interface

Das geplante LLM ist nicht Teil der kanonischen Welt und auch nicht die Welt-Engine.

Seine Rolle ist:

- freie menschliche Eingaben aufnehmen
- diese in sinnvolle Weltabsichten uebersetzen
- Antworten der Welt natuerlicher und atmosphaerischer zurueckgeben

Wichtige Einschraenkung:

- das LLM bekommt keinen direkten Zugriff auf rohe World-Daten
- das LLM darf die Welt nur ueber eine kontrollierte Interface-Schicht in Spielerperspektive sehen

Leitprinzip:

- das LLM soll verborgenes Weltwissen nicht aktiv unterdruecken muessen
- das Interface soll dafuer sorgen, dass es dieses Wissen gar nicht erst erhaelt

Motivation:

- das LLM kann sich staerker auf gute, atmosphaerische und hilfreiche Sprache konzentrieren
- das Risiko von unbeabsichtigtem Cheaten oder Leaken sinkt

### Spielerwahrnehmung wird von World und Runtime getrennt

Objektive Weltwahrheit, laufender Weltzustand und Spielerwissen sollen nicht vermischt werden.

Deshalb unterscheiden wir konzeptionell:

- `World`: objektive Weltbeschreibung
- `Runtime`: aktueller technischer Weltzustand
- `PlayerMemory` oder `Perception`: bereits gezeigte und bekannte Informationen

Konsequenz:

- "wurde dieser Text schon gezeigt?" gehoert nicht in die World
- "weiss der Spieler das schon?" gehoert nicht in den normalen Objektzustand
- diese Informationen sollen spaeter in einer separaten Memory- oder Perception-Schicht liegen

### Zwischen Runtime und LLM soll erst eine Player-Sicht liegen

Bevor spaeter eine eigentliche LLM-Fassade entsteht, soll zunaechst eine allgemeine Spielersicht modelliert werden.

Geplante Trennung:

- `WorldRuntime` bleibt technische Engine-Schnittstelle
- `PlayerWorldView` wird die gefilterte Sicht fuer Spielerperspektive
- eine spaetere `LLMWorldView` ist hoechstens eine weitere, darauf aufbauende Fassade

Motivation:

- dieselbe Spielersicht kann fuer UI, Tests und spaetere LLM-Anbindung genutzt werden
- Spielerwissen und Weltwissen bleiben klar getrennt
- die Runtime muss nicht gleichzeitig Engine- und Spieler-API sein
- aufbereitete Texte und neue Ereignisse werden von Anfang an als eigener Teil dieser Sicht geplant

### Spieleraktionen sollen strukturiert in die Engine gehen

Die eigentliche Player- und spaetere LLM-nahe Schnittstelle soll keine freien Texte direkt an die Weltlogik uebergeben.

Stattdessen sollen strukturierte Kommandos verwendet werden, zum Beispiel:

- Interaktion mit `objectId` und `actionId`
- Wegnutzung mit `actionId`
- optional freies Zusatzfeld wie `additionalText`

Motivation:

- Sprachaufloesung bleibt ausserhalb der Weltlogik
- die Engine bleibt deterministisch und testbar
- ein spaeteres LLM kann genau die Rolle des Uebersetzers von Sprache zu strukturierter Aktion uebernehmen

Konsequenz:

- Mehrdeutigkeiten sollen nicht heimlich erraten werden
- stattdessen sollen sie als strukturierte Kandidaten sichtbar werden
- Fehlschlaege sollen ebenfalls mit stabilen Fehlercodes an die aufrufende Schicht zurueckgehen

### Strukturierte Eingabe bleibt Teil normaler Interaktionen

Parameterisierte Eingaben wie Codes oder kurze Antworten sollen keinen eigenen parallelen API- oder Runtime-Zweig erhalten.

Stattdessen gilt:

- `additionalText` ist Teil des normalen `PlayerActionCommand`
- Interaktionen koennen optional ein deklaratives `input` beschreiben
- ein validierter Eingabewert kann optional ueber `applyInputTo` in normalen Objektzustand geschrieben werden
- verzweigte Reaktionen auf Eingaben laufen ueber `cases` und `default`

Motivation:

- keine zweite Sonderarchitektur neben normalen Interaktionen
- dieselben Tests, Rueckgabetypen und Runtime-Pfade bleiben nutzbar
- das spaetere LLM kann strukturierte Eingaben liefern, ohne selbst Weltlogik auswerten zu muessen

### Player-Sicht soll klein und fachlich aufgeteilt wachsen

Die spaetere Spielersicht soll nicht als einzelne grosse Runtime-Datei entstehen.

Geplante fachliche Aufteilung:

- Vertragstypen fuer die Sicht
- Memory-Logik fuer bekanntes Wissen und bereits gelieferte Inhalte
- Event-Logik fuer neue Wahrnehmungen
- eine schmale Fassade fuer die eigentliche Player-API

Motivation:

- weniger Monsterfunktionen
- klarere Tests pro Verantwortungsbereich
- spaetere LLM-Anbindung bleibt auf einer stabilen, kleinen API statt auf verteilten Runtime-Details

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

- Ob wir zusaetzliche spezialisierte Komfortbedingungen fuer Placement brauchen
- Ob `ref` spaeter neben Objekten auch `rooms` oder globale `world`-Werte adressieren darf

## Aktueller Fokus

Die LLM-Integration ist aktuell noch nicht das Primaerthema der Umsetzung.

Der derzeitige Schwerpunkt liegt auf:

- dem Design der Weltlogik
- dem Ausbau der Runtime-Mechaniken
- einer sauberen, testbaren World-Interface-Schicht
- der Vorbereitung einer klaren Persistenzbasis

Die LLM-Architektur dient im Moment vor allem als Leitplanke fuer spaetere Entscheidungen, damit World, Runtime und Spielerperspektive von Anfang an sauber getrennt bleiben.
