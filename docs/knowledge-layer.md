# Knowledge Layer

Dieses Dokument beschreibt eine zusaetzliche Wissensschicht fuer `worlddesc`, die bewusst **nicht** Teil der harten World ist.

## Ziel

Die Wissensschicht soll es ermoeglichen, dass ein spaeteres LLM:

- ueber Objekte, Orte oder Werke mehr erklaeren kann
- Hintergrundwissen, Deutungen und Kontext liefern kann
- ohne dass dieses Wissen Teil der harten Weltlogik wird

Typische Faelle:

- Museumsfuehrer zu Gemaelden
- historische oder literarische Kontexte
- Biografien von Kuenstlern
- erklaerende kulturgeschichtliche Einordnungen

## Grundsatz

Die Wissensschicht ist:

- **Authoring-Material**
- **retrieval-basiert**
- **nicht-kanonische Raumlogik**

Sie ist damit weder:

- Teil der World-Physik
- Teil der Runtime-Truth
- noch blosse freie Halluzination des LLM

## Empfohlene Trennung

### 1. World

Die World beschreibt nur:

- Positionen
- Sichtbarkeit
- Interaktionen
- Wege
- harte Zustaende

### 2. Narrative Guide

Der Narrative Guide beschreibt nur:

- Ton
- Wahrnehmungsnaehe
- semantische Lesart
- sensorische Leitplanken

### 3. Knowledge Layer

Die Wissensschicht beschreibt:

- erklaerendes Hintergrundwissen
- historische Kontexte
- kuenstlerische Einordnung
- didaktische Vermittlungspunkte

Wichtig:

- diese Schicht darf die Welt nicht veraendern
- sie erklaert nur, sie schaltet nichts frei

## Gehoert das in die Authoring-Schicht?

Ja, klar.

Warum:

- das Wissen soll kuratiert, versioniert und pruefbar sein
- es ist inhaltliche Projektarbeit, nicht nur Laufzeittechnik
- man will solche Inhalte redigieren, austauschen und teilen koennen

Deshalb ist die Wissensschicht am besten:

- als Projektdateien authorbar
- aber erst zur Laufzeit selektiv zugeladen

Kurz:

- **Authoring-Quelle: ja**
- **direkter World-Bestandteil: nein**
- **Runner-/LLM-Retrieval zur Laufzeit: ja**

## Empfohlene Dateiform

Fuer den ersten Schnitt ist Markdown sehr gut.

Warum:

- leicht zu schreiben
- gut fuer Menschen und Codex
- natuerlich fuer kuratierte Erklaerungen
- spaeter trotzdem parsebar

Empfohlene Struktur:

```text
knowledge/
  rooms/
    <roomId>.md
  objects/
    <objectId>.md
```

Beispiele:

- `knowledge/rooms/salonCarreMitte.md`
- `knowledge/objects/cimabueMaesta.md`
- `knowledge/objects/giottoStigmata.md`

Der Anker bleibt also einfach:

- `roomId`
- `objectId`

Genau wie bei World und Narrative Guide.

## Warum Markdown und nicht sofort JSON oder YAML?

Weil diese Schicht vor allem fuer:

- reichere Erklaerung
- kuratorische Notizen
- spaetere Vermittlung

gedacht ist.

Markdown ist dafuer angenehmer als ein frueh verengtes Datenformat.

Spaeter kann man immer noch:

- Frontmatter einfuehren
- strukturierte Felder extrahieren
- ein zusaetzliches Schema fuer Knowledge-Dateien definieren

## Laufzeitidee

Die Wissensschicht sollte **nicht komplett** in die Szene geschuettet werden.

Stattdessen:

- `get_current_scene()` liefert weiterhin primär Welt + narrativeContext
- zusaetzliches Wissen wird **on demand** geholt

Bevorzugter Retrieval-Schnitt:

- `get_object_knowledge(objectId)`
- optional spaeter `get_room_knowledge(roomId)`

Der erste technische Schnitt ist jetzt angebunden:

- Markdown-Dateien unter `objects/<objectId>.md` und `rooms/<roomId>.md`
- Loader ueber `loadKnowledgeProviderFromDirectory(...)`
- REPL-Anbindung ueber `--knowledge-dir <path>`
- on-demand Tool `get_object_knowledge(objectId)`

Im Museumsfall:

- Welt sagt: du stehst vor `uccelloSanRomano`
- Wissenstool sagt: wer Uccello ist, warum das Bild beruehmt ist, welche Vermittlungspunkte interessant sind

## Sollte das Wissen in der LLM-History bleiben?

Eher **nein**, zumindest nicht als voller Freitextblock.

Warum:

- das LLM wird sonst mit altem Spezialwissen zugeschuettet
- spaetere Szenen werden unnötig belastet
- man riskiert, dass das Modell aus altem Wissen weiterredet, obwohl die aktuelle Situation woanders ist

Deshalb ist die bevorzugte Regel:

- Wissenssnippets werden **ephemer** und **kontextuell** gegeben
- sie sollen nicht blind in der normalen freien Chat-History akkumulieren

## Besser loeschen oder versionieren?

Am besten:

### Standardfall

- alte Wissenssnippets **nicht** in die persistierte freie History uebernehmen
- stattdessen bei Bedarf neu holen

Das ist der einfache und meist richtige Weg.

### Erweiterter Fall

Wenn dieselbe Wissensquelle waehrend einer Session variieren kann, dann ist eine kleine Versionsidee sinnvoll:

- `knowledgeContextVersion`
- oder `knowledgeSourceVersion`

Dann kann spaeteres Wissen frueheres bewusst ersetzen, statt es nur anzuhaufen.

Aber:

- fuer den ersten Schnitt ist **ephemer statt historisch** wichtiger als komplexe Versionierung

## Empfehlung fuer den ersten Schnitt

1. Wissensdateien als Markdown
2. getrennt nach `rooms/` und `objects/`
3. Anker nur ueber `roomId` und `objectId`
4. on-demand Retrieval statt globales Mitsenden
5. nicht in normale freie History uebernehmen
6. spaeter optional kleine `knowledgeContextVersion`

## Museumsfall

Fuer den Louvre-Prototypen bedeutet das:

- `sample/louvre-salon-carre.world.yaml` bleibt Raumlogik
- `sample/louvre-salon-carre.narrative-guide.yaml` bleibt Raumton
- `knowledge/objects/*.md` koennen spaeter die Werkdossiers tragen
- der Museumsfuehrer darf dieses Wissen gezielt abrufen, wenn der Spieler ein Bild betrachtet oder danach fragt

## Aktueller Stand

Die erste Wissensschicht ist jetzt bewusst so geschnitten:

1. Authoring als Markdown-Dateien
2. strenge Bindung an `roomId` und `objectId`
3. Fehler bei unbekannten Ziel-IDs
4. Laufzeit-Retrieval ueber separaten Provider
5. Wissensabruf nicht als Bestandteil von `scene`
6. Wissensabruf nicht als normale persistierte Tool-History

## Naechster technischer Schritt

Wenn wir diesen Schnitt weiter ausbauen, dann sind die naechsten guten Erweiterungen:

1. optional `get_room_knowledge(roomId)`
2. spaeter projektweite `knowledge/`-Konvention auch im Scaffold
3. optional kleine `knowledgeContextVersion` oder `knowledgeSourceVersion`
4. spaeter gezieltere Prompt-Regeln fuer Museums- oder Wissenswelten
