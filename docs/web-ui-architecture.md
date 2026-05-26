# Web UI Architecture

Dieses Dokument beschreibt den geplanten naechsten Ausbauschritt:

- eine einfache Web-Oberflaeche fuer den bestehenden Runner
- startbar aus der CLI
- zugleich als eigenes Vite-Package lokal entwickelbar

Der Zweck ist nicht "Produkt-UI", sondern schnelleres, natuerlicheres Probieren bei Prompting, Weltenbau und Gespraechsfluss.

## Zielbild

Wir wollen zwei Clients ueber demselben Runner-Kern:

- Console-REPL
- Web-UI

Beide sollen dieselbe Sessionlogik, denselben Tool-Loop und dieselbe Weltintegration nutzen.

Die Web-UI soll:

- den Chatverlauf darstellen
- Texteingabe ueber ein normales Input-Feld erlauben
- optional HTML5-Spracherkennung nutzen, wenn der Browser sie anbietet
- strukturierte LLM-Vorschlaege als klickbare Aktionen rendern
- den Runner moeglichst ohne terminalartige Reibung pruefbar machen

## Hauptentscheidung

Die Web-Oberflaeche soll **nicht** einfach die bestehende REPL einbetten oder deren Ausgabe parsen.

Stattdessen:

- `@worlddesc/llm-runner` bekommt eine UI-neutrale Session-Schicht
- CLI und Web werden zwei getrennte Clients ueber derselben Sessionlogik

Das vermeidet:

- doppelte Turn-Logik
- unterschiedliche Interpretation von History
- fragile Textparsing-Hacks zwischen UI und Assistant-Ausgabe

## Architekturprinzip

Die Schichten sollen klar getrennt bleiben:

### 1. `@worlddesc/world`

Bleibt unveraendert die kanonische Welt-, Runtime- und Player-View-Schicht.

Hier gehoert weiterhin hin:

- Weltwahrheit
- Runtime
- Scene-/Turn-Sichten
- Tool-Host

Hier gehoert **nicht** hin:

- Browser-UI
- HTTP
- Speech-to-Text
- klickbare Suggestion-Buttons

### 2. `@worlddesc/llm-runner`

Soll von "CLI + Loop" mehr in Richtung "Session-Kern + Clients" wachsen.

Hierhin gehoert:

- OpenAI-Anbindung
- Tool-Loop
- History-Politik
- Usage-Tracking
- Session-Zustand
- strukturierte Antwort fuer verschiedene Clients

Moegliche neue Schicht:

- `RunnerSession`
- `submitTurn(userInput)`
- `getSessionSnapshot()`

### 3. `@worlddesc/web-ui`

Eigenes Vite-Package mit:

- React
- Tailwind
- funktionalen Komponenten

Hierhin gehoert:

- Chat-Rendering
- Buttons fuer Vorschlaege
- Eingabe
- optionales Browser-STT
- kleine Session-/Debug-Ansichten

## Nicht-Ziel

Der erste Web-Schritt ist bewusst **kein** vollwertiger App-Server.

Nicht Teil des ersten Schnitts:

- Mehrspielerbetrieb
- Login/Auth
- persistente Server-Sessions fuer mehrere Benutzer
- Cloud-Deployment-Architektur
- komplexes Rechte- oder Sharing-Modell

## Empfohlener technischer Schnitt

## Session-Kern im Runner

Der Runner sollte einen kleineren programmatischen Kern bekommen, der nicht an `readline` haengt.

Beispielhafte Verantwortung:

- Welt und Provider laden
- PlayerView und ToolHost erzeugen
- OpenAI-Client halten
- History halten
- pro Zug `runToolLoop(...)` ausfuehren
- strukturierte Turn-Ergebnisse liefern

Beispielhafte Form:

```ts
type RunnerSession = {
  submitTurn(input: UserTurnInput): Promise<RunnerTurnResult>;
  getSnapshot(): RunnerSessionSnapshot;
  dispose(): Promise<void>;
};
```

Die bestehende Console-REPL wird dann nur noch:

- Session erzeugen
- Terminal-Input lesen
- Ergebnisse ausgeben

## Lokaler Web-Server

Fuer den ersten Wurf ist ein kleiner lokaler HTTP-Server mit einer sehr kleinen API sinnvoll.

Empfehlung:

- Node HTTP oder ein leichtgewichtiges Server-Framework
- zunaechst lokal und single-user

Moegliche Endpunkte:

- `POST /api/session`
- `GET /api/session/:id`
- `POST /api/session/:id/turns`
- optional `GET /api/session/:id/events` spaeter

Fuer den ersten Schnitt reicht vermutlich sogar:

- genau eine lokale Session
- keine Sessionliste
- keine Wiederaufnahme ueber mehrere Browser hinweg

## Warum kein direktes REPL-Streaming zuerst

Die REPL ist ein guter Client, aber kein guter Web-Backend-Kern.

Probleme eines REPL-zentrierten Ansatzes:

- Terminal-Ausgabe ist nicht strukturiert genug
- Debug-Zeilen und Assistant-Text wuerden vermischt
- klickbare Vorschlaege muessten aus Text geparst werden
- Sessionzustand wuerde an einer falschen Schicht haengen

## Vorschlaege als strukturierte Daten

Der wichtigste UI-Punkt ist:

**Vorschlaege duerfen nicht nur in Prosa existieren.**

Das LLM darf weiter natuerlich formulieren:

- "Wenn du magst, koennen wir auf die Komposition schauen."

Aber die UI braucht zusaetzlich strukturierte Vorschlaege wie:

```ts
type UiSuggestion = {
  id: string;
  kind: "free-input" | "resolved-action" | "intent";
  label: string;
  inputText: string;
  command?: PlayerActionCommand;
};
```

Wichtig:

- Das ist **kein** Ersatz fuer freie Sprache.
- Das ist ein zusaetzlicher Ausgabekanal fuer klickbare Interaktion.

## Woher kommen die Vorschlaege

Der erste pragmatische Schritt sollte nicht sein, Assistant-Prosa zu parsen.

Stattdessen gibt es drei moegliche Quellen:

### A. deterministische Suggestions aus der Szene

Zum Beispiel aus:

- `scene.sampleActions`
- `turn.newlyAvailableActionIds`
- `currentActionFocus`

Vorteil:

- robust
- deterministisch
- sofort vorhanden

Nachteil:

- oft etwas mechanischer

### B. modellgenerierte, aber strukturierte Suggestions

Der Runner koennte das Modell explizit bitten, neben dem Fliesstext noch 0 bis 3 passende Vorschlaege in strukturierter Form zu liefern.

Vorteil:

- natuerlicher
- kontextsensitiver

Nachteil:

- mehr Modellabhaengigkeit

### C. Hybrid

Empfehlung fuer den ersten Web-Schnitt:

- Assistant-Text bleibt frei
- klickbare Vorschlaege kommen zunaechst deterministisch aus bekannten Actions und Fokus
- spaeter kann eine modellnaehere Suggestion-Schicht dazukommen

Das ist der sicherste erste Weg.

## Speech-to-Text

Browser-STT soll als progressive Erweiterung behandelt werden.

Also:

- wenn `SpeechRecognition` oder `webkitSpeechRecognition` verfuegbar ist:
  - Mikrofon-Button zeigen
- sonst:
  - nur normales Input-Feld

Wichtig:

- kein harter Produktpfad
- keine Pflicht fuer Browser-Kompatibilitaet aller Engines im ersten Schritt
- kein Server-Side-STT im ersten Wurf

## Package-Schnitt

Neues Package:

- `packages/web-ui`

Empfohlene Eigenschaften:

- Vite
- React
- TypeScript
- Tailwind

Empfohlene Unterordner:

- `src/app`
- `src/components`
- `src/lib/api`
- `src/lib/types`
- `src/lib/stt`

## Gemeinsame Typen

Damit CLI, Server und Web nicht dieselben DTOs dreifach definieren, sollten die Web-Transporttypen im Runner oder in einem kleinen gemeinsamen Modul leben.

Beispiel:

- `RunnerSessionSnapshot`
- `RunnerTurnResult`
- `UiSuggestion`
- `UiTranscriptEntry`

Im ersten Schritt reicht es vermutlich, diese Typen in `@worlddesc/llm-runner` zu halten.

Ein eigenes Shared-Package lohnt sich erst spaeter.

## Startmodi

Gewuenscht ist:

- Web-UI eigenstaendig entwickelbar
- Web-UI aus der CLI startbar

Das spricht fuer zwei Modi:

### 1. Dev-Modus der Web-App

Direkt im neuen Package:

- `npm run dev -w @worlddesc/web-ui`

Dabei laeuft:

- Vite-Dev-Server
- gegen einen lokal gestarteten Runner-Backend-Prozess oder spaeter einen Dev-Proxy

### 2. CLI-gestarteter Modus

Zum Beispiel:

- `npm run llm:web -- ...`
- oder `npm run llm:repl -- --web`

Dieser Modus soll:

- den lokalen Runner-Webserver starten
- optional den Browser-Hinweis ausgeben
- moeglichst dieselbe World-/Guide-/Character-Konfiguration wie die REPL nutzen

Der aktuelle technische Stand im Repo ist:

- `worlddesc-llm-repl --web`
- Root-Skript `npm run llm:web`
- Root-Skript `npm run llm:web:api` fuer API-only
- separates Vite-Package `packages/web-ui`

## UX-Prinzipien fuer den ersten Wurf

Die erste UI soll nicht "generische Chat-App" sein.

Sinnvoll waeren:

- grosser Chatbereich
- kompaktes Eingabefeld mit Senden
- optionaler Mikro-Button
- klar sichtbare klickbare Vorschlaege
- optional einklappbarer Debug-/Scene-Bereich

Weniger sinnvoll im ersten Schritt:

- viele Panels
- komplexe Navigation
- Settings-Flut im UI

## Debugbarkeit

Da das Projekt stark prompt- und toolzentriert ist, sollte die Web-UI Debugbarkeit nicht verstecken.

Sinnvoll:

- schaltbarer Debug-Modus
- Anzeige von:
  - aktueller Szene
  - neuen Events
  - Action-Focus
  - Usage grob
  - ggf. Tool-Log kompakt

Aber:

- standardmaessig nicht im Vordergrund
- fuer das schnelle Probieren einklappbar

## Empfohlene Umsetzung in Phasen

### Phase 1

- Session-Kern aus der REPL herausziehen
- Console-REPL auf den Session-Kern umstellen
- keine UI aendern

### Phase 2

- kleiner lokaler Web-Server im Runner
- minimale JSON-API fuer Session und Turns

### Phase 3

- neues Vite-React-Tailwind-Package
- Chatdarstellung
- Texteingabe
- klickbare Suggestions

### Phase 4

- optionales Browser-STT
- einklappbarer Debugbereich

### Phase 5

- CLI-Startmodus fuer Web
- moeglichst dieselben Konfigurationsoptionen wie bei der REPL

## Offene Entscheidungen

Vor der Implementierung bewusst klaeren:

- `--web` als Zusatz der bestehenden CLI oder eigener Befehl?
- eine lokale Session oder mehrere Session-IDs?
- HTTP polling oder spaeter SSE/WebSocket?
- Suggestions rein deterministisch oder schon frueh hybrid?

## Empfehlung

Fuer den ersten Build:

- eigener Web-Befehl statt implizitem Mischmodus
- eine lokale Session
- einfache HTTP-API
- deterministische klickbare Suggestions
- STT nur als progressive Browser-Option

So bleibt der erste Schnitt:

- robust
- gut debuggbar
- schnell nutzbar
- und offen fuer spaetere Verfeinerung
