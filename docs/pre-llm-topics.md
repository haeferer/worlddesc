# Pre-LLM Topics

Dieses Dokument sammelt die Themen, die vor einem ersten echten LLM-Versuch noch geschaerft werden sollten.

Die Grundrichtung ist dabei klar:

- das LLM steuert die Welt nicht ueber freie Sprache
- das LLM bekommt keine rohe World-Datei
- das LLM arbeitet ueber eine kontrollierte Player-Sicht
- Aktionen sollen moeglichst deterministisch als Funktionsaufrufe ausgefuehrt werden

Das Ziel ist also eher ein Point-and-Click-aehnliches Interface fuer ein LLM als ein Parser-Adventure.

## Leitprinzip

Vor dem ersten LLM-Versuch sollte die Welt fuer das LLM so erfahrbar werden, dass das Modell:

- nur sichtbare und bekannte Elemente sieht
- strukturierte Aktionen statt freie Texte ausfuehrt
- Eingabemoeglichkeiten explizit beschrieben bekommt
- bei Ambiguitaeten nicht raten muss
- bei Fehlschlaegen stabile, maschinenlesbare Rueckgaben erhaelt

## 1. PlayerWorldView als eigentliche LLM-Schnittstelle

Der wichtigste offene Punkt ist die Frage:

- welche Daten darf das LLM pro Schritt wirklich sehen?

Vor dem ersten LLM-Versuch sollte `PlayerWorldView` fachlich noch klarer festgezogen werden.

Zu klaeren:

- welche Raumbeschreibung bekommt das LLM
- welche Objekte werden als sichtbar geliefert
- welche Objekte sind nur bekannt, aber gerade nicht sichtbar
- welche Wege werden als aktuell verfuegbar geliefert
- welche Interaktionen werden als aktuell verfuegbar geliefert
- welche Informationen gelten als `new`
- welche Informationen gelten nur als bekanntes Alt-Wissen

Ziel:

- Das LLM soll nicht aus Rohdaten selbst herausraten muessen, was gerade relevant ist.

## 2. Klare Aktionsoberflaeche

Vor dem ersten LLM-Versuch sollte die Aktionsform wirklich stabil sein.

Im Kern ist das schon gut angelegt:

- `interaction`
- `way`
- `additionalText`

Noch zu schaerfen ist:

- wie das LLM eine Aktion eindeutig adressiert
- ob eine Aktion immer ueber `actionId` geht oder ueber eine View-spezifische `commandId`
- ob Objekt- und Wegaktionen in einer gemeinsamen Aktionsliste landen sollen

Ziel:

- Das LLM soll nie raten muessen, wie ein Funktionsaufruf aufgebaut ist.

## 3. Input-Metadaten fuer Aktionen

Das ist fuer den ersten LLM-Versuch besonders wichtig.

Das LLM muss nicht nur wissen, dass eine Aktion existiert, sondern auch:

- ob sie parameterlos ist
- ob sie Text erwartet
- ob sie eine Auswahl erwartet
- ob sie eine Zahl erwartet
- welche Optionen es gibt
- welche Zahlenbereiche erlaubt sind

Bereits vorhanden ist ein guter Start mit:

- `text`
- `select`
- `number`

Noch zu schaerfen:

- wie diese Eingabeformen in der Player-Sicht exakt dargestellt werden
- ob `select`-Optionen zusaetzlich beschreibende Labels oder Hilfetexte brauchen
- wie das LLM mit invaliden Eingaben rueckgekoppelt wird

## 4. Fehler- und Rueckfrageprotokoll

Ein LLM-Versuch wird schnell hakelig, wenn Fehlschlaege nicht sauber strukturiert sind.

Vorher zu klaeren:

- welche stabilen Fehlercodes gibt es
- wann gibt es statt Fehler lieber Kandidaten fuer Rueckfragen
- wann ist eine Aktion `unknown`
- wann ist sie `known but unavailable`
- wann ist nur der Parameter ungueltig

Ziel:

- Das LLM soll systematisch nachfragen oder umplanen koennen, statt Fehlersituationen sprachlich zu improvisieren.

## 5. Ereignis- und Wahrnehmungsmodell

Fuer das spaetere LLM-Verhalten ist entscheidend, wie Weltveraenderungen rueckgemeldet werden.

Zu klaeren:

- was ist ein `new event`
- was ist nur aktualisierter Zustand
- welche Texte sind einmalige Beobachtungen
- welche Texte sind wiederholbare Beschreibungen
- welche Reihenfolge haben Ereignisse

Ziel:

- Das LLM soll nach einer Aktion eine klare, kleine Rueckgabe bekommen:
  - was hat sich geaendert
  - was ist neu wahrnehmbar
  - was sollte dem Menschen mitgeteilt werden

## 6. Sichtbarkeit, Zugaenglichkeit und Bekanntheit

Das sind drei verwandte, aber unterschiedliche Dinge.

Vor dem ersten LLM-Versuch sollte das explizit getrennt sein:

- sichtbar: der Spieler kann es gerade wahrnehmen
- zugaenglich: der Spieler kann gerade damit interagieren
- bekannt: der Spieler weiss, dass es existiert

Beispiel:

- Ein Rubin im geschlossenen Tresor kann unbekannt, spaeter bekannt, aber noch unzugaenglich, und erst danach zugaenglich sein.

Wenn diese Begriffe nicht sauber getrennt sind, beginnt das LLM spaeter leicht zu raten.

## 7. Wissens- und Memory-Modell

Vor einem ersten LLM-Versuch sollte zumindest geklaert sein, was die kleinste stabile Form von Spielerwissen ist.

Zu klaeren:

- gibt es `knowledge` nur als Marker
- gibt es bekannte Objektfakten getrennt von freien Texten
- wie wird gespeichert, was dem Spieler schon gezeigt wurde
- wie wird gespeichert, was das LLM in seinem naechsten Turn als Kontext bekommen darf

Ziel:

- Nicht das LLM merkt sich die Welt, sondern die Engine stellt das relevante Wissen kontrolliert bereit.

## 8. Deterministische Beschreibungsquellen

Das LLM soll spaeter ausschmuecken duerfen, aber nicht erfinden muessen, was objektiv da ist.

Dafuer sollte klarer werden:

- welche Texte sind kanonische Weltbeschreibungen
- welche Texte sind nur Engine-Rueckmeldungen
- welche Daten sind strukturierte Fakten statt Erzaehltext

Ziel:

- Das LLM kann Sprache veredeln, ohne selbst Weltwahrheit zu erzeugen.

## 9. Kanonische Handlungsliste pro Szene

Ein sehr wichtiger Punkt fuer einen ersten LLM-Versuch:

- Bekommt das LLM einfach Objekt- und Weglisten
- oder bekommt es pro Turn eine fertige Liste aktuell moeglicher Handlungen

Ich halte Letzteres fuer sehr stark.

Beispiel:

- `tresor1.oeffnen`
- `tresor1.codeEingeben`
- `nord`

Mit Input-Metadaten dazu.

Ziel:

- Das LLM mappt Nutzerintention auf eine kleine vorhandene Aktionsmenge, statt die Welt selbst kombinatorisch zu durchsuchen.

## 10. Beobachtbare Zustandsaenderungen

Nach einer Aktion sollte nicht nur ein Text zurueckkommen, sondern auch eine strukturierte Aenderungssicht.

Zu klaeren:

- welche Objekte sind neu sichtbar geworden
- welche Interaktionen sind neu verfuegbar
- welche Wege sind neu verfuegbar
- welche bekannten Dinge sind verschwunden oder unzugaenglich geworden

Ziel:

- Das LLM kann dem Spieler veraenderte Optionen erklaeren, ohne selbst Diffs aus Rohdaten bauen zu muessen.

## 11. Persistenzschnitt fuer spaetere LLM-Zuege

Vor dem ersten LLM-Versuch muss noch nicht die volle Savegame-Story fertig sein.

Aber klar sein sollte:

- was ist Runtime-State
- was ist Player-Memory
- was ist Event-Historie
- was bekommt das LLM bei einem neuen Turn frisch geliefert

Ziel:

- Das LLM arbeitet turn-basiert gegen eine saubere, rekonstruierbare Spielersicht.

## 12. Tool- oder Function-Contract fuer das LLM

Vor dem ersten echten Versuch sollte man schon grob festziehen, wie der LLM-Aufruf spaeter aussieht.

Nicht die Endintegration, aber zumindest:

- welche Funktionen es gibt
- welche Parameter jede Funktion erwartet
- welche Rueckgaben jede Funktion liefert

Naheliegende Kandidaten:

- `get_scene_view()`
- `get_known_object(objectId)`
- `perform_action(command)`
- `poll_new_events()`

Ziel:

- Der erste LLM-Versuch sollte nicht gleichzeitig Interface-Design-Experiment sein.

## 13. Grenzen des ersten LLM-Versuchs

Vorher sollte bewusst entschieden werden, was der erste Versuch noch nicht koennen muss.

Empfohlene Einschraenkungen:

- keine freie Parser-Steuerung
- keine versteckten Meta-Abkuerzungen
- keine komplexen Mehrschrittplaene in einem einzigen Engine-Call
- keine Weltbearbeitung ausserhalb aktueller Funktionsaufrufe

Ziel:

- Der erste Versuch testet die Interface-Qualitaet, nicht die maximale kreative Freiheit.

## Empfohlene Reihenfolge vor dem ersten Versuch

Wenn wir das noch sinnvoll priorisieren wollen, wuerde ich vorher diese Reihenfolge empfehlen:

1. `PlayerWorldView` als echte LLM-Sicht schaerfen
2. Aktionsliste und Input-Metadaten stabilisieren
3. Fehler- und Rueckfrageprotokoll festziehen
4. Sichtbarkeit, Zugaenglichkeit und Bekanntheit sauber trennen
5. Ereignis- und Memory-Modell fuer Turn-Rueckgaben konkretisieren
6. erst dann den ersten echten LLM-Versuch fahren

## Kurzfazit

Vor dem ersten LLM-Schritt geht es nicht primaer um mehr Weltlogik, sondern um:

- eine kleine, stabile Spieler-API
- deterministische Sicht auf die Welt
- klare Aktionen
- klare Rueckgaben
- klare Grenzen dessen, was das LLM wissen und tun darf

Wenn diese Dinge scharf genug sind, wird der erste LLM-Versuch deutlich aussagekraeftiger und wesentlich weniger chaotisch.
