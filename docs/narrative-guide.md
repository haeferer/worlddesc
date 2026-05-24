# Narrative Guide

Dieses Dokument beschreibt eine moegliche zweite Mischungsebene ueber der physischen World.

Die Leitidee:

- die World bleibt die pruefbare physische Wahrheit
- der `narrative guide` beschreibt keinen Zustand der Physik
- er liefert einen semantischen und erzählerischen Deutungsrahmen fuer spaetere LLM-Ausgabe

## Warum eine zweite Ebene

Ohne zweite Ebene kippt das System leicht in eine von zwei Richtungen:

- nur harte Simulation und dadurch oft technisch oder trocken
- oder zu viel freie Interpretation direkt durch das LLM

Der `narrative guide` soll dazwischen liegen:

- nicht freie Fantasie
- nicht Physik
- sondern interpretierbare, halb-stabile Bedeutungshinweise

## Beziehung zur physischen World

Die physische World beschreibt:

- was existiert
- wo etwas ist
- was offen, verschlossen oder tragbar ist
- welche Interaktionen und Wege gelten

Der `narrative guide` beschreibt dagegen:

- wie sich ein Raum oder Objekt grundsaetzlich anfuehlt
- welche Assoziationen daran haengen
- welche erzählerischen Lesarten stabil nahegelegt werden

Wichtig:

- der `narrative guide` darf harte Weltwahrheit nicht ueberschreiben
- er ist keine zweite Runtime fuer Physik
- er ist ein optionaler Bedeutungsrahmen fuer spaetere Darstellung

## Bevorzugter Schnitt

Der erste kleine Zuschnitt orientiert sich bewusst an bestehenden IDs:

- `world`
- `rooms.<roomId>`
- `objects.<objectId>`

Das ist attraktiv, weil es:

- leicht validierbar ist
- direkt an bestehende World-IDs andockt
- keinen zweiten komplizierten Referenzapparat braucht

## Vorgeschlagene Felder

Ein kleiner `narrativeNode` kann aktuell enthalten:

- `tone`
- `associations`
- `narrativeHints`
- `sensoryHints`
- `taboos`
- `desc`

Dabei gilt:

- `tone` beschreibt die Grundstimmung
- `associations` beschreibt stabile Bedeutungsfelder
- `narrativeHints` gibt kleine Regieanweisungen fuer spaetere Erzaehlung
- `sensoryHints` hilft bei sinnlicher Beschreibung
- `taboos` kann spaeter markieren, was der Guide bewusst nicht romantisieren oder betonen soll
- `desc` ist eine optionale freie Kurzbeschreibung dieser Deutungsebene

## Beispielhafte Nutzung

Nicht:

```yaml
objects:
  laterne:
    state:
      lightMode: off
```

sondern zusaetzlich:

```yaml
objects:
  laterne:
    tone: [fragile, hopeful]
    associations: [guidance, courage, borrowed-light]
    narrativeHints: [licht-gegen-dunkelheit, tragbare-orientierung]
```

Die Physik sagt dann:

- Laterne ist aus
- Laterne ist tragbar

Der Guide sagt:

- diese Laterne soll nicht wie bloesser Schrott klingen
- sie traegt erzählerisch Hoffnung, Orientierung und Uebergang

## Mixing-Idee

Der bevorzugte Gedanke ist aktuell:

- nicht die physische Runtime direkt damit anreichern
- sondern den Guide als zweite Mischungsebene beim Bau einer spaeteren LLM-Sicht zu verwenden

Also eher:

1. `World` und `Runtime`
2. `PlayerWorldView`
3. kontextuell relevanter Ausschnitt aus dem `narrative guide`
4. daraus spaeter eine erzählnaeher gemischte Sicht fuer das LLM

Wichtig:

- das LLM soll nicht den kompletten Guide auf einmal bekommen
- sondern nur den aktuell relevanten Ausschnitt, etwa fuer:
  - aktuellen Raum
  - sichtbare Objekte
  - vielleicht zuletzt fokussierte Objekte

## Mehrere Guides und explizite Mix-Reihenfolge

Ein einzelner Guide ist nur der erste Schritt.

Sobald mehrere Guides zusammenkommen, soll die Reihenfolge explizit in einem eigenen Mix-Dokument beschrieben werden.

Dabei gilt als bevorzugter Phase-0-Schnitt:

- mehrere `narrative guide`-Dateien sind erlaubt
- ein eigenes `narrative guide mix`-Dokument beschreibt ihre Reihenfolge
- spaetere Layer ueberschreiben fruehere Layer feldweise
- wirkungslose Layer sollen spaeter als Warnung markiert werden
- Layer, die auf nicht existierende `roomId` oder `objectId` zielen, sind Fehler

Die genauere Regel ist in [narrative-guide-mixing.md](C:/remoterep/worlddesc/docs/narrative-guide-mixing.md:1) beschrieben.

Fuer Autorenhinweise zur Qualitaet von Guides und Mixes siehe:

- [writing-narrative-guides.md](C:/remoterep/worlddesc/docs/writing-narrative-guides.md:1)

## Was bewusst noch nicht Teil dieser Phase ist

Noch nicht vorgesehen:

- globale Fraktionssimulation
- komplette Lore-Datenbanken
- dynamische Dramaturgie-State-Maschinen
- automatische Ueberschreibung physischer Weltfakten

Der erste Guide soll klein bleiben:

- lokal
- lesbar
- validierbar
- optional

## Dateien

Aktuelle Phase-0-Dateien:

- [narrative-guide.schema.json](C:/remoterep/worlddesc/schema/narrative-guide.schema.json:1)
- [test.narrative-guide.yaml](C:/remoterep/worlddesc/sample/test.narrative-guide.yaml:1)
- [narrative-guide-mix.schema.json](C:/remoterep/worlddesc/schema/narrative-guide-mix.schema.json:1)
- [test.narrative-guide-mix.yaml](C:/remoterep/worlddesc/sample/test.narrative-guide-mix.yaml:1)

Diese Ebene ist jetzt nicht mehr nur Authoring-Grundlage.

Aktuell bereits vorhanden sind:

- Loader fuer `narrative guide`- und `narrative guide mix`-Dateien
- World-gebundene Referenzpruefung beim Mischen
- Warnungen fuer Layer ohne effektive Aenderung
- ein daraus gebauter `narrativeContextProvider` fuer die Player-Sicht

Noch nicht vollstaendig durchverdrahtet ist vor allem die automatische Nutzung im Runner.
