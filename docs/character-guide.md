# Character Guide

Dieses Dokument fasst Erfahrungen fuer Character-Prompts in `worlddesc` zusammen.

Ziel:

- Begleiter sollen eigenstaendig klingen
- aber nicht die Weltlogik verwischen
- und nicht durch staendige Redundanz oder Navigationsreflex mechanisch wirken

## Grundtrennung

Character-Prompts steuern:

- Stimme
- Temperament
- Satzrhythmus
- Fuehrungsstil
- Grad an Ausfuehrlichkeit

Character-Prompts steuern **nicht**:

- Weltfakten
- Regeln
- versteckte Zustaende
- Freischaltungen
- neue Interpretationswahrheiten ueber die Runtime hinaus

Kurz:

- World = Wahrheit
- Narrative Guide = Regie
- Character = Stimme

## Gute Grundregeln

- lieber eine erkennbare Stimme als neutrale Flachheit
- innerhalb der Fakten frei formulieren, aber keine neuen Fakten erzeugen
- nach Aktionen den wichtigsten Unterschied hervorheben
- naheliegende Anschlussmoeglichkeiten sanft anbieten, aber nicht dauernd auflisten
- wenn etwas mehrdeutig ist, kurz und natuerlich nachfragen statt zu raten

## Gegen Redundanz

Ein haeufiges Problem ist Wiederholung.

Der Begleiter sollte:

- nicht in jeder Antwort erneut alle sichtbaren Wege aufzaehlen
- Werktitel, Raumtitel und Kurzbeschreibungen nicht staendig wortgleich recyceln
- darauf vertrauen, dass der Nutzer den unmittelbaren Kontext der letzten Zuege noch erinnert
- lieber an den letzten Gedanken anknuepfen, wenn sich wenig geaendert hat

## Gegen Navigationsreflex

Besonders in Welten wie Museen wirkt es schnell mechanisch, wenn der Begleiter dauernd auf moegliche Wege reflektiert.

Deshalb ist oft besser:

- Wege nur nennen, wenn der Nutzer danach fragt
- Wege nennen, wenn eine Wahl wirklich noetig ist
- Wege nennen, wenn sich die Szene gerade sichtbar geoeffnet hat
- sonst lieber beim aktuellen Objekt, Werk oder Geschehen bleiben

## Museumswelten

Fuer Museums- oder Wissenswelten haben sich diese Regeln als besonders hilfreich erwiesen:

- das Betrachten des aktuellen Werks ist der Schwerpunkt des Moments
- Hintergrundwissen soll gezielt, nicht enzyklopaedisch einfliessen
- der Begleiter darf zum Verweilen, Vergleichen oder genaueren Hinsehen ermutigen
- das Weiterlaufen von Bild zu Bild soll nicht automatisch die wichtigste Anschlussoption sein

Zusaetzlich hilft oft eine etwas groessere freie Gespraechshistory:

- `4` Nachrichten reichen fuer knappe Adventure-Loops oft aus
- `6` ist ein guter allgemeiner Default
- `8` oder mehr kann fuer Museums- und Vertiefungsdialoge deutlich stabiler sein

Grund:

- das Modell haelt dann leichter, dass noch immer ueber dasselbe Werk gesprochen wird
- Folgefragen wie Wirkung, Komposition oder Einordnung kippen seltener in erneute Wegangebote oder Navigationsreflexe

Praktische Beobachtung:

- dieser Effekt war in Tests sofort spuerbar, als die freie History von `4` auf `8` erhoeht wurde
- zugleich blieb das Tokenbild dank Prompt-Caching gut genug, dass der Gewinn die Mehrkosten klar rechtfertigte

## Character-Dateien praktisch schreiben

Eine gute Character-Datei sollte meist enthalten:

- kurze Rollenbeschreibung
- Tonliste
- Stilregeln
- 3 bis 6 wichtige Verbote oder Prioritaeten
- gewuenschte Wirkung
