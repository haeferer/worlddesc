# Narrative Guide Mixing

Dieses Dokument beschreibt den bevorzugten Phase-0-Schnitt fuer das Mischen mehrerer `narrative guide`-Dateien.

Die Leitidee:

- einzelne `narrative guide`-Dateien bleiben kleine, lesbare Layer
- ein eigenes `narrative guide mix`-Dokument beschreibt nur die Reihenfolge dieser Layer
- spaetere Layer duerfen fruehere Layer fuer dieselben Felder ueberschreiben
- die physische World bleibt dabei weiterhin die harte Referenz

## Warum ein eigenes Mix-Dokument

Ein einzelner Guide reicht oft fuer einen stabilen Grundton.

Sobald aber mehrere Deutungsschichten zusammenkommen, etwa:

- Basisweltton
- spaetere Ortsfaerbung
- besondere Inszenierung fuer eine Kampagne
- temporaere Erzaehlperspektive

wird die Reihenfolge selbst zu einer bewussten Modellentscheidung.

Deshalb soll die Reihenfolge nicht implizit ueber Dateinamen oder Ladezufall entstehen, sondern explizit in einer eigenen Mix-Datei stehen.

## Dokumentform

Ein `narrative guide mix` ist ein eigenes YAML-Dokument mit eigenem Schema.

Es beschreibt:

- Metadaten des Mixes
- geordnete `layers`
- pro Layer genau einen Guide-Verweis

Beispiel:

```yaml
mix:
  kind: narrativeGuideMix
  id: waldpfadDefaultMix

layers:
  - id: base
    guide: ./test.narrative-guide.yaml
  - id: twilight
    guide: ./test.twilight.narrative-guide.yaml
```

## Mischregel

Die Mischregel ist bewusst klein:

- Layer werden von oben nach unten angewendet
- spaeterer Layer gewinnt bei demselben Feld
- Listenfelder wie `tone`, `associations` oder `narrativeHints` werden ersetzt, nicht zusammenunioniert
- `desc` wird ebenfalls als ganzes Feld ersetzt

Das bedeutet:

- `base.rooms.huetteInnen.tone = [musty, enclosed, forgotten]`
- `twilight.rooms.huetteInnen.tone = [musty, enclosed, uneasy]`

ergibt effektiv:

- `tone = [musty, enclosed, uneasy]`

Die Regel ist absichtlich simpel, damit spaetere Loader, Tests und LLM-Sichten klar nachvollziehen koennen, woher ein Wert kommt.

## Bindung an die physische World

Ein Mix ist nie frei schwebend.

Er wird immer gegen eine konkrete physische World beurteilt.

Das bedeutet:

- `rooms.<roomId>` muss auf einen existierenden Raum der World zeigen
- `objects.<objectId>` muss auf ein existierendes Objekt der World zeigen
- unbekannte Ziele sind kein stilles Ignorieren, sondern ein Fehler

Beispiel:

- `rooms.dunklerWald` ist erlaubt, wenn die World diesen Raum kennt
- `rooms.unterirdischerTempel` ist ein Fehler, wenn es diesen Raum in der World nicht gibt

## Warnungen und Fehler

Der bevorzugte Validierungsschnitt fuer spaetere Loader ist:

### Fehler

Ein Layer ist ungueltig, wenn er etwas veraendern will, das in der referenzierten physischen World nicht existiert.

Dazu gehoeren besonders:

- unbekannte `roomId`
- unbekannte `objectId`
- nicht ladbarer Guide-Verweis

Diese Faelle sind Modellierungsfehler, keine weichen Hinweise.

### Warnungen

Ein Layer soll eine Warnung erzeugen, wenn er nach dem Mixen keine effektive Aenderung bewirkt.

Typische Faelle:

- ein spaeterer Layer setzt exakt dieselben `tone`-Werte wie der bisherige Effektivstand
- ein Layer enthaelt nur Knoten, die bereits identisch durch fruehere Layer bestimmt wurden

Die Warnung ist wichtig, weil sie auf tote oder veraltete Layer hinweist, ohne die Mischung selbst ungueltig zu machen.

## Mehrere Layer sind ausdruecklich erlaubt

Die Mix-Datei soll nicht auf zwei Layer begrenzt sein.

Mehrere Layer sind ausdruecklich gewollt, etwa:

1. Basisguide
2. Kampagnen-Ton
3. aktueller Orts-Overlay
4. besondere Erzahlausrichtung fuer einen Modus

Wichtig ist nur:

- die Reihenfolge bleibt explizit
- jeder Layer bleibt klein und lesbar
- spaetere Layer sollen gezielt ueberschreiben, nicht wahllos duplizieren

## Bevorzugter Phase-0-Zuschnitt

Noch nicht Teil dieses ersten Schnitts sind:

- bedingte Layer
- automatische Konfliktauflosung jenseits von `last layer wins`
- feldweise Merge-Operatoren wie `append`, `remove` oder `union`
- runtime-dynamische Umschaltung von Mixen

Der erste Schritt bleibt bewusst klein:

- Guides als einzelne Layer
- Mix-Datei als Reihenfolge
- strenge Referenzvalidierung
- Warnung bei wirkungslosen Layern

## Ziel fuer die spaetere LLM-Praesentation

Der Mix soll spaeter nicht die physischen `description`-Felder ueberschreiben.

Stattdessen ist die bevorzugte Richtung:

- aus World plus Guide-Mix wird ein kleiner `narrativeContext`
- dieser wird an die LLM-nahe Spielersicht angehaengt
- nur der aktuelle Ausschnitt geht in `get_current_scene()` und `get_known_object()`

Der erste kleine technische Andockpunkt dafuer ist jetzt eine optionale `narrativeContextProvider`-Schnittstelle in der Player-Sicht.

## Dateien

Aktuelle Phase-0-Dateien:

- [narrative-guide.schema.json](C:/remoterep/worlddesc/schema/narrative-guide.schema.json:1)
- [narrative-guide-mix.schema.json](C:/remoterep/worlddesc/schema/narrative-guide-mix.schema.json:1)
- [test.narrative-guide.yaml](C:/remoterep/worlddesc/sample/test.narrative-guide.yaml:1)
- [test.twilight.narrative-guide.yaml](C:/remoterep/worlddesc/sample/test.twilight.narrative-guide.yaml:1)
- [test.narrative-guide-mix.yaml](C:/remoterep/worlddesc/sample/test.narrative-guide-mix.yaml:1)
