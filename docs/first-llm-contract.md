# First LLM Contract

Dieses Dokument beschreibt den vorgeschlagenen ersten Funktionsvertrag fuer einen kontrollierten LLM-Versuch.

Ziel ist nicht maximale Flexibilitaet, sondern ein kleiner, stabiler und gut testbarer Einstieg.

## Leitidee

Der erste LLM-Versuch soll kein Black-Box-Experiment sein.

Deshalb gilt:

- das LLM bekommt eine klare Spielersicht
- das LLM formuliert daraus eine Absicht
- die Engine loest diese Absicht deterministisch auf
- erst dann wird eine konkrete Aktion ausgefuehrt

Wichtig:

- `intent verstehen` und `aktion ausfuehren` bleiben bewusst getrennt
- so koennen wir spaeter klar sehen, ob ein Problem im Sprachverstehen oder in der Weltlogik liegt

## Vorgeschlagene Funktionen

### 1. `get_current_scene()`

Liefert die aktuelle Spielersicht als Hauptanker fuer einen Turn.

Enthaelt insbesondere:

- Raum
- sichtbare Objekte
- Inventarobjekte
- bekannte, gerade nicht sichtbare Objekte
- `sampleActions`
- `intentSurface`
- optional `currentActionFocus`
- optional `narrativeContext`
- aktuelle vorbereitete Texte

Zweck:

- das LLM bekommt eine kompakte, deterministische Sicht auf die aktuelle Szene
- `sampleActions` sind dabei nur Beispiel- und Aufloesungshilfen, keine vollstaendige Whitelist aller legitimen Spielerabsichten
- `currentActionFocus` kann zusaetzlich das zuletzt bearbeitete Objekt und das Primaerergebnis der letzten Aktion sichtbar machen, ohne selbst Sprachlogik zu enthalten
- `narrativeContext` ist ein kleiner, bereits gemischter Regieausschnitt fuer Weltton, Raumton und relevante Objektdeutung, nicht die ganze Lore

## 2. `get_known_object(objectId)`

Liefert bekannte Detailinformationen zu einem Objekt.

Zweck:

- gezielte Nachschau, wenn das LLM fuer eine Antwort oder Rueckfrage mehr Kontext zu einem einzelnen Objekt braucht

Wichtig:

- diese Funktion ist nachgelagert und sollte im Normalfall nicht fuer jedes Objekt aufgerufen werden

## 3. `get_object_knowledge(objectId)`

Liefert kuratiertes externes Hintergrundwissen zu einem bekannten Objekt.

Zweck:

- fuer Museumsfuehrer, historische Einordnung, Autorschaft oder Deutung
- bewusst getrennt von harter World-Truth
- on-demand statt als Dauerbestandteil der Szene

Wichtig:

- dieses Wissen ist Erklaerungsschicht, nicht Raumlogik
- es darf `scene`, `turn` und konkrete Tool-Ergebnisse nicht ueberstimmen
- der Retrieval-Pfad ist bewusst separiert, damit das Wissen nicht blind in der normalen Turn-History akkumuliert

## 4. `resolve_intent(intent)`

Nimmt eine breitere Spielerabsicht entgegen und versucht, sie deterministisch auf eine konkrete Aktion zurueckzufuehren.

Gedachte Eingabe:

- `verb`
- `object1`
- optional `object2`
- optional `inputText`
- optional `inputNumber`

Gedachte Rueckgabe:

- `resolved` mit konkretem `PlayerActionCommand`
- oder `rejected` mit strukturierter Ursache

Zweck:

- das LLM kann freie Spielerabsicht in die Weltsprache uebersetzen
- die Engine prueft danach, ob diese Absicht in der aktuellen Szene konkret aufloesbar ist

Wichtig:

- bei freier Nutzereingabe soll `resolve_intent` immer vor `perform_action` stehen
- auch sichtbare `sampleActions` oder offensichtliche Wege sind kein Grund, diesen Schritt zu ueberspringen
- wenn mehrere Wege oder Aktionen gleich plausibel sind, soll die LLM-Schicht kurz nachfragen statt zu raten

## 5. `perform_action(command)`

Fuehrt nur bereits strukturierte Player-Aktionen aus.

Beispiele:

- `interaction` mit `objectId` und `actionId`
- `way` mit `actionId`

Rueckgabe:

- `PlayerActionResultView`
- inklusive `scene`
- inklusive `events`
- inklusive `turn`

Zweck:

- die eigentliche Weltveraenderung bleibt auf einer engen, testbaren Kommandoebene

## 6. `get_new_events()`

Liefert neue Wahrnehmungsereignisse seit dem letzten Abruf.

Zweck:

- optionaler Nachkanal fuer spaetere UIs oder LLM-Ablaufe
- fuer den ersten Versuch wahrscheinlich seltener wichtig, aber sinnvoll als Teil des kleinen Grundsets

## Empfohlener Turn-Ablauf

Der erste LLM-Versuch sollte idealerweise diesem Muster folgen:

1. `get_current_scene()`
2. optional `get_known_object(objectId)` oder `get_object_knowledge(objectId)`
3. das LLM formuliert intern eine Absicht
4. `resolve_intent(intent)`
5. wenn `resolved`: `perform_action(command)`
6. wenn `rejected`: Rueckfrage, Umformulierung oder Alternativvorschlag
7. das LLM nutzt `turn` und `scene` fuer seine Antwort an den Spieler

## Empfohlenes Startmodell

Fuer den ersten manuellen Test dieses Contracts ist aktuell `gpt-5.4-mini` die empfohlene Startwahl im Runner.

Die Idee dabei:

- zuerst ein kleines, aber deutlich stabileres Tool-Use-Modell pruefen
- danach bei Bedarf mit `gpt-5.1` auf noch mehr Zuverlaessigkeit vergleichen

## Warum nicht direkt `perform_intent()` als Hauptweg

Obwohl das Projekt bereits einen zusammengesetzten Weg `performIntent()` kennt, sollte der erste LLM-Versuch ihn nicht als Hauptschnitt verwenden.

Grund:

- die Trennung zwischen Intent-Aufloesung und Aktionsausfuehrung macht Fehler besser sichtbar
- wir koennen dadurch genauer sehen, ob das LLM die Absicht schlecht gefuellt hat oder ob die Szene die Aktion nicht traegt
- der erste Versuch wird damit mehr Interface-Test und weniger Magie

`perform_intent()` kann spaeter ein Komfortpfad sein, aber nicht der zentrale Debugging-Pfad des ersten Versuchs.

## Minimaler Contract in Kurzform

Der vorgeschlagene erste Satz an Funktionen ist:

- `get_current_scene()`
- `get_known_object(objectId)`
- `get_object_knowledge(objectId)`
- `resolve_intent(intent)`
- `perform_action(command)`
- `get_new_events()`

## Rolle von `turn`

Fuer den ersten LLM-Versuch ist `turn` in der Aktionsrueckgabe besonders wichtig.

Warum:

- das LLM muss nicht selbst zwei Szenen vergleichen
- die Engine sagt bereits, was in diesem Zug neu passiert ist

Wichtige Felder:

- `primaryResultText`
- `newlyVisibleObjectIds`
- `newlyInventoryObjectIds`
- `newlyKnownObjectIds`
- `newlyAccessibleObjectIds`
- `newlyAvailableActionIds`
- `newlyKnownKnowledge`

## Was bewusst noch nicht Teil dieses ersten Contracts ist

Noch nicht noetig fuer den ersten Versuch:

- komplexe Mehrschrittplaene in einem Call
- freie Parser-Eingaben direkt an die Engine
- automatische Objektkombinationslogik fuer `object2`
- autonomes Weltwissen ausserhalb der aktuellen Spielersicht
- Toolsets mit vielen Nebenfunktionen

Wichtig dabei:

- die Engine verarbeitet bewusst genau eine Aktion pro Ausfuehrung
- Mehrschrittabsichten wie "nimm den Schluessel und geh nach Norden" werden nicht als Batch an die Welt uebergeben
- falls der Spieler mehrere Schritte in einem Satz nennt, muss die aufrufende LLM-Schicht zuerst nur den naechsten konkreten Einzelschritt auswaehlen
- nach diesem Schritt wird die Szene neu geholt und erst dann ueber den naechsten Schritt entschieden

Der erste Contract soll klein genug bleiben, dass er:

- testbar
- dokumentierbar
- nachvollziehbar
- debuggbar

bleibt.

## Kurzfazit

Der erste LLM-Contract sollte nicht versuchen, schon das Endsystem zu sein.

Er soll nur diese drei Dinge sauber leisten:

- Szene sehen
- Absicht deterministisch aufloesen
- konkrete Aktion ausfuehren

Wenn das stabil funktioniert, kann der spaetere Ausbau deutlich sicherer und entspannter erfolgen.

## Naechste Konkretisierung

Die toolnahe Fassung dieses Contracts ist jetzt zusaetzlich beschrieben in:

- [first-llm-tool-schemas.md](C:/remoterep/worlddesc/docs/first-llm-tool-schemas.md:1)

Und als erste testbare Adapter-Schicht umgesetzt in:

- [llmToolHost.ts](C:/remoterep/worlddesc/packages/world/src/playerView/llmToolHost.ts:1)
