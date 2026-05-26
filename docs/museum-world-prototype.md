# Museum World Prototype

Dieses Dokument beschreibt die erste Richtung fuer eine museumsartige `worlddesc`-Variante.

## Ziel

Ein virtueller Saal soll:

- begehbar sein
- bekannte Werke als Blickziele anbieten
- dem LLM erlauben, als Museumsfuehrer zu sprechen
- dabei aber die harte Raumlogik von externem Kunstwissen trennen

## Erster Prototyp

Der erste Prototyp orientiert sich am **Salon Carre** des Louvre.

Offizielle Louvre-Seite:

- [The Salon Carré - The original Salon](https://www.louvre.fr/en/explore/the-palace/the-salon-carre)

Dort werden als Meisterwerke dieses Saals unter anderem genannt:

- Cimabue, *Virgin and Child Enthroned with Six Angels (Maestà)*
- Giotto, *Saint Francis of Assisi Receiving the Stigmata*
- Fra Angelico, *Coronation of the Virgin Mary*
- Uccello, *Battle of San Romano*

## Wichtige Trennung

### 1. World

Die World beschreibt:

- Standpunkte im Raum
- Wege zwischen diesen Standpunkten
- welche Bilder dort sichtbar sind
- welche Betrachtungsaktionen moeglich sind

### 2. Artwork Dossiers

Die Dossiers beschreiben:

- Kuenstler
- Einordnung
- Stil
- moegliche Erklaerungen
- Vermittlungsfakten

Diese Dossiers gehoeren bewusst **nicht** in die World.

## Warum nicht alles in einen Raum?

Physisch ist der Salon Carre ein Raum.

Fuer die World ist es aber praktischer, ihn in **Standpunkte** zu zerlegen:

- Mitte des Saals
- Standpunkt vor Bild A
- Standpunkt vor Bild B
- Standpunkt vor Bild C
- Standpunkt vor Bild D

Das ist eine kontrollierte Abstraktion.

Vorteile:

- weniger gleichzeitige Sichtkomplexitaet
- klarere Wege
- bessere Fokussierung fuer die LLM-Szene
- keine riesige Wegliste von der Mitte aus

## Aktueller erster Schnitt

Im Sample-Prototyp:

- `sample/louvre-salon-carre.world.yaml`
- `sample/louvre-salon-carre.narrative-guide.yaml`
- `sample/louvre-salon-carre.narrative-guide-mix.yaml`
- `sample/louvre-salon-carre.artwork-dossiers.md`
- `sample/louvre-salon-carre.knowledge/`

ist der Raum als **Mitte plus vier Bild-Standpunkte** modelliert.

Wegregeln:

- von der Mitte aus zu jedem Bildstandpunkt
- von jedem Bildstandpunkt zurueck zur Mitte
- zusaetzlich Nachbarwechsel entlang der Haengung

## Naechste sinnvolle Ausbaustufen

1. Mehr bekannte Werke im selben Saal oder in benachbarten Saalabschnitten
2. explizite Wandsegmente statt nur Bild-Standpunkte
3. eigener strukturierter `artwork dossier`-Dateityp
4. eine Runner-seitige Wissenseinspeisung fuer den Museumsfuehrer
5. Regeln, wann das LLM frei auf Kunstwissen antworten darf und wann nicht

## Wissensschicht

Fuer diesen Museumsfall ist jetzt zusaetzlich eine getrennte Wissensschicht vorgemerkt.

Sie soll:

- nicht Teil der World sein
- aber als Authoring-Material im Projekt liegen
- ueber `roomId` und `objectId` adressierbar sein
- nur bei Bedarf an das LLM gegeben werden

Siehe dazu auch:

- [knowledge-layer.md](C:/remoterep/worlddesc/docs/knowledge-layer.md:1)
