# LLM Runner

Dieses Dokument beschreibt den aktuellen ersten Ausfuehrungsstrang fuer einen echten LLM-Versuch.

Wichtig:

- `@worlddesc/world` bleibt die kanonische Welt-, Runtime- und Player-View-Schicht
- `@worlddesc/llm-runner` ist bewusst ein eigenes Package fuer OpenAI-Anbindung, Prompting und REPL

Damit folgt der Code genau der gewollten Haupttrennlinie:

- Weltlogik und deterministische Spielersicht
- sprachliche Vermittlung und Modellanbindung

## Ziel des ersten Runners

Der erste Runner soll kein Endprodukt sein.

Er soll nur einen kontrollierten ersten LLM-Versuch ermoeglichen:

- mit echter OpenAI-Anbindung
- mit dem bestehenden Tool-Contract
- mit einer einfachen, gut debuggbaren Console-REPL

## Aktueller Zuschnitt

Das neue Package liegt unter:

- `packages/llm-runner`

Es enthaelt aktuell:

- CLI und Argument-Parsing
- `.env`-Support ueber `dotenv`
- OpenAI-Client-Anbindung
- den ersten Tool-Loop mit den 5 vorgesehenen Tools
- eine einfache Console-REPL
- kleine Tests fuer Config und Tool-Schemas

## Warum zuerst eine Console-REPL

Die erste Ausfuehrungsform ist bewusst kein Web-Frontend.

Gruende:

- schnell aufsetzbar
- transparent
- gut debuggbar
- Tool-Aufrufe und Rueckgaben lassen sich leicht beobachten
- Prompt- und Tool-Verhalten koennen isoliert beurteilt werden

## Unterstuetzte Parameter

Die REPL unterstuetzt derzeit:

- `--world <path>`
- `--narrative-guide-mix <path>`
- `--api-mode <chat|responses>`
- `--model <name>`
- `--debug`
- `--max-tool-rounds <number>`
- `--max-history-messages <n>`
- `--hide-sample-actions`
- `--usage-file <path>`
- `--character <name>`
- `--system-prompt-file <path>`
- `--print-system-prompt`

Zusatzlich:

- `OPENAI_API_KEY` aus `.env` oder Umgebungsvariablen
- optional `OPENAI_MODEL` als Standard fuer `--model`
- optional `OPENAI_API_MODE` als Standard fuer `--api-mode`

Standard fuer den Usage-Counter:

- `tokens.usage.json` im aktuellen Projekt-Root

Wenn `--narrative-guide-mix` gesetzt ist:

- wird der Mix gegen die geladene World geprueft
- werden Warnungen fuer wirkungslose Layer im Banner ausgegeben
- bekommt das LLM ueber `get_current_scene()` und `perform_action()` den gemischten `narrativeContext`

Wichtig:

- `narrativeContext` ist nur Regiehilfe
- er darf keine Fakten aus `scene`, `turn` oder `currentActionFocus` ueberschreiben

## Empfohlener Start

Fuer den ersten echten REPL-Versuch ist aktuell `gpt-5.4-mini` das empfohlene Startmodell.

Gruende:

- deutlich bessere Tool-Disziplin im bisherigen Runner-Test
- weiterhin ein kleines Modell mit gutem Kosten-/Qualitaetsverhaeltnis
- sauberer im Umgang mit Einzelschrittlogik, Raumzustaenden und Toolgrenzen als `gpt-4o-mini`

Empfohlene Reihenfolge:

- zuerst `gpt-5.4-mini`
- danach bei Bedarf Vergleich mit `gpt-5.1`
- `gpt-4o-mini` oder `gpt-4.1-mini` eher als guenstige Kontrollgruppe

Fuer A/B-Tests der Tool-Disziplin ist zusaetzlich sinnvoll:

- ein Lauf mit sichtbaren `sampleActions`
- ein zweiter Lauf mit `--hide-sample-actions`

So laesst sich pruefen, ob das Modell nur an Beispielaktionen klebt oder auch ueber Verben, Objekte und Inputs robust arbeitet.

## Charakter und Ausschweifigkeit

Fuer Persoenlichkeit, Ton und Ausschweifigkeit ist `--character <name>` jetzt der bequemste Ort.

Intern mappt der Runner dabei auf:

- `prompts/<name>.character.txt`

Fuer freie Experimente oder projektlokale Spezialfaelle bleibt zusaetzlich:

- `--system-prompt-file <path>`

Warum:

- der Basisprompt des Runners haelt die harten Regeln fuer Tool-Disziplin und Weltgrenzen fest
- die Charakterdatei kann den Begleiter stilistisch formen, ohne die Welt-Engine selbst zu veraendern
- unterschiedliche Begleiter lassen sich so leicht gegeneinander testen

Geeignet fuer diese Zusatzdatei:

- Persoenlichkeit
- Erzaehlton
- Ausschweifigkeit oder Knappheit
- Umgang mit Fehlschlaegen
- Grad an Fuehrung oder Zurueckhaltung
- Art von Rueckfragen

Nicht der richtige Ort fuer:

- neue Weltregeln
- Ausnahmen von der Tool-Disziplin
- Mehrschritt-Autonomie
- verstecktes Zusatzwissen ueber die Welt

Beispiel-Dateien im Repo:

- `prompts/warm-guide.character.txt`
- `prompts/dry-curator.character.txt`
- `prompts/playful-poet.character.txt`
- `prompts/minimal-operator.character.txt`

Beispielaufruf:

```bash
npm run llm:repl -- --debug --character warm-guide
```

Direkt aus dem npm-Paket:

```bash
npx @worlddesc/llm-runner@latest --debug --character warm-guide
```

Mit Narrative-Guide-Mix:

```bash
npm run llm:repl -- --debug --character warm-guide --narrative-guide-mix ./sample/test.narrative-guide-mix.yaml
```

Direkt aus dem npm-Paket:

```bash
npx @worlddesc/llm-runner@latest --debug --character warm-guide --narrative-guide-mix ./sample/test.narrative-guide-mix.yaml
```

Additiv mit einem freien Extra-Prompt:

```bash
npm run llm:repl -- --debug --character warm-guide --system-prompt-file ./my-extra-guidance.txt
```

Was man spaeter darueber noch gut steuern kann:

- wie aktiv der Begleiter Vorschlaege macht
- wie stark er Szene-Details ausmalt
- ob er eher emotional, poetisch, sachlich oder spielmechanisch klingt
- wie oft er Optionen explizit zusammenfasst
- wie er mit Unsicherheit oder Ablehnung umgeht
- wie stark er den Spieler fuehrt oder nur spiegelt

## Aktuelle REPL-Kommandos

Zur Laufzeit gibt es zunaechst nur wenige lokale Kommandos:

- `/scene`
- `/events`
- `/tools`
- `/usage`
- `/quit`

Das ist absichtlich klein gehalten.

## Persistenter Token-Counter

Der Runner schreibt den OpenAI-Tokenverbrauch jetzt persistent in eine JSON-Datei.

Standard:

- `tokens.usage.json` im Repo-Root

Inhalt:

- Gesamtsummen ueber alle bisherigen REPL-Laeufe
- Summen pro Modell
- letzter einzelner Completion-Eintrag
- zusaetzlich auch `cachedTokens` und `reasoningTokens`, sofern die API diese Felder liefert

Wichtig:

- gezaehlt werden echte OpenAI-Completion-Aufrufe des Runners
- Tool-Aufrufe innerhalb der Welt zaehlen nicht separat, weil sie lokal ausgefuehrt werden
- bei jedem Completion-Call wird der Counter direkt fortgeschrieben

Fuer Aenderungen am Speicherort:

- `--usage-file <path>`

Zur direkten Kontrolle waehrend eines REPL-Laufs:

- `/usage`

## Verteilungs- und Publish-Grenze

Fuer den Publish ist wichtig:

- `@worlddesc/world` und `@worlddesc/llm-runner` werden als getrennte npm-Pakete veroeffentlicht
- `@worlddesc/world` enthaelt zusaetzlich die synchronisierte Package-Kopie der JSON-Schemas
- diese Package-Schemas werden nicht manuell gepflegt, sondern aus `schema/` im Repo-Root erzeugt
- `release:build` prueft vor dem Build mit `check:schemas`, dass Root- und Package-Schemas nicht auseinanderlaufen

Der praktische Smoke-Test nach einem Release ist damit:

```bash
npx @worlddesc/world@latest checkworld ./sample/test.world.yaml
npx @worlddesc/world@latest checkasset ./sample/assets/safe.object-asset.yaml
npx @worlddesc/llm-runner@latest --debug
```

## API-Schnitt und History

Aktuell unterstuetzt der Runner zwei API-Pfade:

- `--api-mode chat`
- `--api-mode responses`

Default:

- `chat`

### Chat-Modus

Das bedeutet:

- pro Modellaufruf wird die bisherige Nachrichtenhistorie wieder mitgeschickt
- dazu kommt pro Runde erneut der aktuelle deterministische Szenen-Snapshot
- formal ist das Chat
- praktisch ist es aber weiterhin ein jedes Mal neu aufgebauter Vollkontext

Fuer den aktuellen ersten Versuch ist das in Ordnung, aber noch nicht optimal.

Warum:

- die World-Engine und `PlayerWorldView` liefern bereits sehr viel frischen, strukturierten Kontext
- dadurch braucht der Runner vermutlich deutlich weniger freie Text-History als ein normaler Chatbot
- jede zusaetzliche alte Nachricht drueckt nur weiter auf Kosten und Kontext

Aktueller Default:

- `--max-history-messages 4`

Das ist absichtlich klein gehalten:

- lieber strukturierter Weltkontext
- weniger freie Chat-History
- bessere Kostenkontrolle

Naheliegende Optimierungsrichtung:

- spaeter auf die Responses API wechseln
- dort `previous_response_id` nutzen, statt jedes Mal die gesamte History manuell wieder aufzubauen

Warum das spannend ist:

- einfachere Zustandsfuehrung auf API-Seite
- offizielle Usage-Felder fuer `input_tokens_details.cached_tokens`
- bessere Sicht darauf, wie stark Prompt-Caching wirklich greift

Wichtig trotzdem:

- auch mit besserer API bleibt gute lokale Kontextdisziplin wichtig
- der groesste Hebel ist wahrscheinlich nicht "mehr History", sondern "weniger unnoetige History"

Fuer dieses Projekt ist die wahrscheinlich beste Richtung:

1. den jetzigen Chat-Runner erst mit echten Usage-Zahlen beobachten
2. die freie Nachrichtenhistory klein halten
3. den vorhandenen Responses-Pfad gezielt dagegen testen

### Responses-Modus

Der Responses-Pfad ist jetzt als experimenteller Parallelmodus vorhanden.

Er nutzt:

- die Responses API
- Funktionstools in Responses-Form
- denselben lokalen Tool-Host
- mehrere Tool-Runden innerhalb desselben Runner-Turns

Warum das sinnvoll ist:

- OpenAI empfiehlt Responses fuer neue agentische Setups
- Reasoning-Modelle und Tool-Nutzung sind dort der natuerlichere Zielpfad
- spaetere Nutzung von `previous_response_id` wird dadurch einfacher anschlussfaehig

Wichtige Einschraenkung aktuell:

- der Responses-Pfad ist bewusst noch ein Vergleichs- und Testmodus
- er ersetzt den Chat-Pfad noch nicht als Default
- die eigentliche Welt- und Tool-Disziplin ist in beiden Modi gleich

Empfohlener A/B-Vergleich:

```bash
npm run llm:repl -- --debug --api-mode chat
npm run llm:repl -- --debug --api-mode responses
```

Oder mit Guide-Mix:

```bash
npm run llm:repl -- --debug --api-mode chat --narrative-guide-mix ./sample/test.narrative-guide-mix.yaml
npm run llm:repl -- --debug --api-mode responses --narrative-guide-mix ./sample/test.narrative-guide-mix.yaml
```

## Grenzen des ersten Runners

Noch bewusst nicht Teil dieses ersten Schritts:

- Web-UI
- Savegame-Management
- Mehrspieler- oder Session-Server
- komplexes Conversation-Memory ausserhalb des Modellverlaufs
- automatische Planungsagenten
- direkte Weltsteuerung ohne Tool-Contract

Wichtig:

- auch der Runner darf die Welt nicht direkt "wissen"
- er darf nur ueber `LlmToolHost` auf `PlayerWorldView` zugreifen

Zusaetzliche Grenze fuer den ersten Versuch:

- die Engine verarbeitet genau eine Aktion pro Ausfuehrung
- der Runner soll keine Mehrfachaktionen oder Batch-Kommandos an die Welt weiterreichen
- wenn ein Spieler mehrere Schritte in einem Satz nennt, muss das LLM zuerst nur den naechsten konkreten Einzelschritt auswaehlen
- nach dessen Ausfuehrung wird die Szene neu bewertet

## Debug-Modus

Mit `--debug` protokolliert der Runner derzeit:

- Tool-Name
- Tool-Argumente
- Tool-Rueckgaben

Das ist fuer den ersten LLM-Versuch wichtig, weil wir so sehen koennen:

- ob das Modell die richtigen Tools waehlt
- ob die Intent-Aufloesung sauber ist
- ob die Turn-Zusammenfassung wirklich genutzt werden kann

Wichtig fuer `sampleActions`:

- wenn sie sichtbar sind, sind sie im Prompt ausdruecklich nur Vorschlaege und Aufloesungshilfen
- sie sind keine vollstaendige Liste legitimer Spielerhandlungen
- mit `--hide-sample-actions` werden sie fuer das LLM ganz aus Szenen und Aktionsrueckgaben entfernt

## Nächster sinnvoller Schritt

Nach diesem ersten Runner-Schnitt waere der naechste gute Ausbau:

- ein echter erster manueller LLM-Durchlauf ueber die Console-REPL

Danach koennen wir gezielt beurteilen:

- ob der Tool-Contract reicht
- ob das Prompting nachgeschaerft werden muss
- ob der Debug-Output erweitert werden sollte
- ob eine kleine UI danach wirklich sinnvoll waere

Ein moegliches spaeteres Ziel danach ist:

- eine eng begrenzte Mikroplanung durch das LLM ueber 2 bis 3 Einzelschritte

Aber nur mit klaren Leitplanken:

- kein unendliches autonomes Weiterlaufen
- neue Szene nach jedem Schritt
- sofortiger Stopp bei Fehlschlag, Mehrdeutigkeit oder fehlender neuer Evidenz
- keine Wiederholung derselben Aktion ohne triftigen neuen Grund
