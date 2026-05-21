# Asset Instancing

Dieses Dokument skizziert die naechste Ausbaustufe nach der aktuellen Asset-Phase 0.

Heute koennen Objekt-Assets bereits fuer sich allein validiert werden. Dieses Dokument beschreibt, wie sie spaeter in eine World eingebunden und mehrfach instanziiert werden koennten.

## Ziel

Ein Objekt-Asset soll:

- in einer eigenen Datei liegen
- fuer sich allein valide sein
- in einer World ein- oder mehrfach instanziiert werden koennen
- nach dem Einmischen wieder normale Weltstruktur ergeben

Wichtig:

- Assets bleiben ein Authoring-Feature
- es soll keine eigene Asset-Runtime entstehen
- nach dem Expandieren arbeitet die Engine weiter nur mit einer normalen World

## Leitidee

Die Hauptwelt beschreibt nicht den ganzen Tresor intern neu, sondern nur:

- welches Asset sie nutzen will
- unter welcher Instanz-ID es erscheinen soll
- wo dessen Root verankert wird
- welche kleinen Teile der Instanz sie ueberschreiben will

Der Loader expandiert diese Instanz dann zu normalen Objekt-IDs in der World.

## Empfohlene Stufen

### Phase 1: Instanzen ohne freie Innenverdrahtung

In der ersten echten Einbindungsphase sollte die World nur sehr wenig koennen:

- ein Asset referenzieren
- eine Instanz-ID vergeben
- die Root-Platzierung festlegen
- einfache Objekt-Overrides setzen

Damit waeren schon diese Faelle moeglich:

- `tresor1` und `tresor2` aus derselben Asset-Datei
- derselbe Safe in zwei Raeumen
- leicht abweichende Titel oder Startzustaende pro Instanz

Noch bewusst nicht:

- freie Aussenobjekte im Safe platzieren
- interne Objektstruktur der Instanz umbauen
- Cross-Referenzen in beliebige Weltobjekte

### Phase 2: Gezielte Slots

Wenn Phase 1 stabil ist, sollte die naechste Erweiterung nicht "beliebige Ueberschreibbarkeit" sein, sondern benannte Slots.

Beispiel:

- ein Safe-Asset deklariert einen Slot `contents`
- die World kann sagen, welche externen Objekte dort eingehangen werden

So bleibt die Verbindung zur Welt bewusst und klein.

Dieser Schritt ist inzwischen in einer ersten kleinen Form umgesetzt.

### Phase 3: Erweiterte Asset-Parameter

Erst spaeter wuerden sich dann groessere Parameter lohnen, zum Beispiel:

- Code des Safes
- Modus eines Geraets
- optionale Unterobjekte
- alternative Startzustaende groesserer Objektgruppen

## Empfohlenes Zielmodell fuer Phase 1

Die World koennte spaeter ein eigenes Kapitel fuer Asset-Instanzen bekommen:

```yaml
assetInstances:
  tresor1:
    asset: safe
    rootPlacement:
      room: arbeitszimmer
```

Diese Instanz waere aus Sicht des Loaders:

- `asset`: welches Asset geladen wird
- `tresor1`: der Instanz-Prefix oder Namespace
- `rootPlacement`: wo das Root-Objekt des Assets in der Welt landet

## Root-Platzierung

Ein Asset muss in Phase 1 ueber seine Root-Objekte an die Welt angeschlossen werden.

Empfohlene Regel:

- ein Asset mit genau einem Root ist fuer Phase 1 am einfachsten
- die World liefert dafuer genau ein `rootPlacement`
- alle internen Unterobjekte behalten ihre relative Platzierung aus dem Asset

Beispiel:

- `safe` ist Root
- `messingSchluessel` liegt im Asset intern in `safe`
- die World setzt nur noch `safe` nach `room: arbeitszimmer`

## ID-Strategie

Die Instanz muss beim Expandieren in normale Weltobjekte uebersetzt werden.

Empfohlene Regel:

- alle Objekt-IDs des Assets werden mit der Instanz-ID gepraefixt
- dasselbe gilt fuer interne Referenzen in Placement, Conditions, Effects und Input-Targets

Beispiel:

- Asset-Objekt `safe` wird zu `tresor1.safe`
- Asset-Objekt `messingSchluessel` wird zu `tresor1.messingSchluessel`

In der eigentlichen YAML der expandierten World sollten diese Namen spaeter nicht von Hand gepflegt werden muessen; sie sind ein Loader-Ergebnis.

## Kleine Overrides

Phase 1 sollte nur sehr kleine Overrides erlauben.

Empfohlene erste Kandidaten:

- `title`
- `desc`
- `state`

Beispiel:

```yaml
assetInstances:
  tresor1:
    asset: safe
    rootPlacement:
      room: arbeitszimmer
    objectOverrides:
      safe:
        title: Wandsafe
        state:
          locked: false
```

Wichtig:

- Overrides referenzieren lokale Asset-IDs wie `safe`
- der Loader uebersetzt sie erst spaeter auf Instanz-IDs

## Aktueller Umsetzungsstand fuer Overrides

Die erste kleine Override-Stufe ist jetzt bereits vorhanden:

- `objectOverrides.<lokaleObjektId>.title`
- `objectOverrides.<lokaleObjektId>.desc`
- `objectOverrides.<lokaleObjektId>.state`

Die Overrides werden beim dateibasierten Laden bereits vor der Runtime in normale Weltobjekte eingemischt.

## Verbindung zur Welt

Die kniffligste Stelle ist "was liegt konkret im Tresor?".

Dafuer empfehle ich noch nicht in Phase 1:

- keine beliebigen Aussenobjekte direkt in interne Asset-Objekte zu legen
- keine freie Manipulation von `placement` quer zwischen World und Asset

Stattdessen sollte das erst mit Slots kommen.

Ein moegliches spaeteres Modell:

```yaml
assetInstances:
  tresor1:
    asset: safe
    rootPlacement:
      room: arbeitszimmer
    slotContents:
      contents:
        - arbeitszimmerSchluessel
```

Dann ist klar:

- das Asset bestimmt, dass es einen Slot `contents` gibt
- die World bestimmt, was dort eingehangen wird

## Aktueller Umsetzungsstand fuer Slots

Die erste kleine Slot-Stufe ist jetzt vorhanden:

- das Asset kann `slots` deklarieren
- eine World-Instanz kann `slotContents.<slotId>: [objektIds...]` setzen
- beim dateibasierten Laden werden diese Weltobjekte auf den internen Ziel-Container des Slots umplatziert
- ein Slot kann optional `portableOnly: true` verlangen
- dasselbe Weltobjekt darf nicht mehrfach ueber Slots belegt werden, auch nicht ueber mehrere Asset-Instanzen hinweg

Beispiel:

```yaml
assetInstances:
  tresor1:
    asset: safe
    rootPlacement:
      room: start
    slotContents:
      contents:
        - rubin
```

Damit kann `rubin` beim Laden direkt in `tresor1` liegen, obwohl das Objekt selbst aus der World stammt und nicht aus dem Asset.

## Aktuelle Slot-Regeln

Aktuell gelten fuer `slotContents` diese Regeln:

- ein Slot-Inhalt darf anfangs bereits normal in der World platziert sein
- beim dateibasierten Laden wird diese Startplatzierung durch die Slot-Platzierung ueberschrieben
- standardmaessig darf ein Slot beliebige Weltobjekte aufnehmen
- wenn das Asset `portableOnly: true` setzt, muessen alle zugewiesenen Weltobjekte `portable: true` tragen
- ein Weltobjekt darf nicht mehrfach ueber Slots zugewiesen werden

## Warum diese Reihenfolge

Diese Reihenfolge haelt das System klein:

- erst isolierte Asset-Dokumente
- dann Instanziierung
- dann gezielte Verbindungspunkte
- erst spaeter breitere Parameter

So vermeiden wir frueh:

- ein komplettes Prefab-System
- unklare Cross-Referenzen
- schwer testbare Merge-Regeln
- versteckte Sonderlogik in der Runtime

## Vorschlag fuer die naechste technische Umsetzung

Wenn wir diese Richtung annehmen, waere der naechste kleine technische Schritt:

1. ein Zielmodell fuer `assetInstances` im Schema und in TypeScript definieren
2. zunaechst nur ein Root pro Asset fuer die World-Einbindung erlauben
3. beim Laden Asset-Dateien expandieren und intern zu normalen Weltobjekten praefixen
4. erst danach erste kleine `objectOverrides` erlauben

## Aktueller Umsetzungsstand

Der erste kleine Vorbereitungsstand ist jetzt im World-Modell angekommen:

- `assetInstances` ist in Schema und TypeScript vorhanden
- eine Instanz kennt aktuell `asset` und `rootPlacement`
- `loadWorldFile()` kann die Asset-Referenz bereits als Datei aufloesen und das Asset fuer sich validieren
- `loadWorldFile()` expandiert ein Asset mit genau einem Root jetzt bereits in normale `objects` und `placement`
- die Expansion nutzt jetzt bereits kleine `objectOverrides` fuer `title`, `desc` und `state`
- einfache Slots fuer externe Weltobjekte sind jetzt ebenfalls vorhanden

Damit ist die Form der spaeteren World-Einbindung schon stabilisierbar, ohne dass wir die Merge-Logik vorschnell fest verdrahten.

## Aktuelle Aufloesungsregel

Dateibasierte World-Loads verwenden aktuell eine kleine Konvention:

- `asset: safe` wird zu `assets/safe.object-asset.yaml` relativ zur World-Datei
- `asset: ./assets/safe.object-asset.yaml` wird als expliziter relativer Dateipfad behandelt

Diese Regel ist absichtlich klein und kann spaeter noch durch einen expliziteren Asset-Katalog oder weitere Resolver erweitert werden.
