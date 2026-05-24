# Writing Narrative Guides

Dieses Dokument beschreibt, wie gute `narrative guide`- und `narrative guide mix`-Dateien fuer dieses Projekt geschrieben werden sollten.

Das wichtigste Ziel ist nicht maximale Lore-Tiefe, sondern:

- sharebare Deutungsschichten
- stabile Erzaehlhilfe fuer das LLM
- ohne die physische World zu verschmutzen

## Grundregel

Ein guter Guide hilft beim Erzaehlen, ohne neue Weltwahrheit zu behaupten.

Das bedeutet:

- Fakten bleiben in der physischen World
- Guides liefern nur Deutung, Schwerpunkt und Regie

Kurz:

- `World` sagt: was ist wahr
- `Narrative Guide` sagt: wie es gelesen werden soll

## Wofuer Guides gut sind

Gute Einsatzfaelle:

- Raumgrundton
- Objektwirkung
- sensorische Leitplanken
- kleine narrative Betonungen
- Tabus fuer unerwuenschte Erzaehlrichtungen

Weniger gute Einsatzfaelle:

- versteckte Fakten
- komplette Lore-Datenbanken
- Kausalbehauptungen, die die World nicht traegt
- dynamische Dramaturgie-Maschinen im Guide selbst

## Gute Felder

Diese Felder sind fuer den aktuellen Schnitt besonders passend:

- `tone`
- `associations`
- `narrativeHints`
- `sensoryHints`
- `taboos`
- optional `desc`

Sie funktionieren gut, weil sie:

- klein bleiben
- lokal lesbar sind
- keine zweite Faktenschicht erzwingen

## Schlechte Guides

Ein Guide wird problematisch, wenn er:

- Fakten erfindet
- der Szene etwas hinzudichtet
- zu viel globale Lore auf einmal transportiert
- dieselben Felder in mehreren Layern wahllos dupliziert

Schwaches Beispiel:

```yaml
rooms:
  huetteInnen:
    desc: Hier wurde vor zwanzig Jahren ein Bergmann ermordet.
```

Das ist problematisch, wenn diese Information nirgends als kanonische Weltwahrheit fuer den Spieler getragen wird.

Besser:

```yaml
rooms:
  huetteInnen:
    tone: [musty, uneasy, withheld]
    associations: [paused-time, abandonment]
    sensoryHints: [damp-wood, muffled-air]
```

Das hilft der Erzaehlung, ohne neue Weltfakten zu behaupten.

## Gute Guides sind lokal

Ein guter Guide arbeitet moeglichst nahe an:

- `world`
- `rooms.<roomId>`
- `objects.<objectId>`

Er sollte nicht versuchen, die gesamte Weltgeschichte in jedem Knoten mitzuschleppen.

Lieber:

- wenige starke Hinweise

als:

- viele allgemeine, austauschbare Adjektive

## Gute Mixes

Ein guter Mix hat eine erkennbare Schichtung.

Zum Beispiel:

1. Basisguide
2. spezifischer Overlay-Guide
3. besondere Erzaehlfokussierung

Jeder Layer sollte eine erkennbare Aufgabe haben.

Schlecht waere:

- drei Layer, die alle fast dasselbe auf dieselben Knoten schreiben

Gut ist:

- ein klarer Grundton
- ein spaeterer gezielter Ueberschreibungs-Layer

## Warnsignale beim Schreiben

Diese Dinge sind gute Hinweise, dass ein Guide oder Mix zu gross oder zu unklar wird:

- der Guide enthaelt lange Prosa statt kleine Signale
- dieselbe Aussage taucht auf `world`, `room` und `object` nochmal auf
- ein Layer aendert fast nichts
- die Wirkung eines Layers ist nach kurzer Zeit nicht mehr erklaerbar

Wenn ein spaeterer Loader hier Warnungen ausgibt, ist das kein Stoerfall, sondern wertvolles Feedback.

## Shareability

Gerade weil Guides und Mixes als eigene Dateien vorliegen, sind sie gut teilbar.

Das macht sie zu:

- Regiepaketen
- Inszenierungsprofilen
- austauschbaren Erzaehlrahmen ueber derselben physischen Welt

Deshalb sollten gute Guides:

- klein
- klar
- wiederverwendbar
- ohne projektspezifischen Ballast

geschrieben sein.

## Richtlinie fuer das LLM

Ein guter Guide ist fuer das LLM:

- klein genug, um lokal mitgeschickt zu werden
- klar genug, um nicht mit Fakten verwechselt zu werden
- stark genug, um den Ton wirklich zu beeinflussen

Die Leitfrage sollte sein:

`Hilft dieser Guide dem LLM beim Erzaehlen, ohne es vom harten Szenenzustand wegzuziehen?`

Wenn die Antwort nein ist, ist der Guide wahrscheinlich zu breit oder zu faktisch.

## Aktueller technischer Stand

Fuer diesen Teil sind wir jetzt auf einem guten Phase-0/1-Zwischenstand:

- eigenes Guide-Schema
- eigenes Mix-Schema
- Beispiel-Guides und Mix-Datei
- klare Mischregeln
- echter Loader fuer Guide- und Mix-Dateien
- Referenzvalidierung gegen eine World beim Mischen
- Warnungen fuer wirkungslose Layer
- `narrativeContextProvider` aus einem echten Mix
- erster `narrativeContext`-Andockpunkt in der Player-Sicht

Noch nicht umgesetzt sind dagegen:

- echtes Einspeisen eines gemischten Guide-Ausschnitts in den Runner
- ein eigener CLI-Checkpfad fuer Guides und Mixe
- das Laden eines Mixes direkt aus World- oder Runner-Konfiguration ohne Hilfscode

Das heisst:

- als Authoring-, Mix- und Provider-Schnitt sind wir schon gut aufgestellt
- als komplett durchverdrahtete Laufzeit- und Runner-Kette noch nicht ganz fertig

## Verwandte Dokumente

- [narrative-guide.md](C:/remoterep/worlddesc/docs/narrative-guide.md:1)
- [narrative-guide-mixing.md](C:/remoterep/worlddesc/docs/narrative-guide-mixing.md:1)
- [design-decisions.md](C:/remoterep/worlddesc/docs/design-decisions.md:1)
