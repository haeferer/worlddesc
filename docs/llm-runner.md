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
- `--model <name>`
- `--debug`
- `--max-tool-rounds <number>`
- `--system-prompt-file <path>`

Zusatzlich:

- `OPENAI_API_KEY` aus `.env` oder Umgebungsvariablen
- optional `OPENAI_MODEL` als Standard fuer `--model`

## Aktuelle REPL-Kommandos

Zur Laufzeit gibt es zunaechst nur wenige lokale Kommandos:

- `/scene`
- `/events`
- `/tools`
- `/quit`

Das ist absichtlich klein gehalten.

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

## Debug-Modus

Mit `--debug` protokolliert der Runner derzeit:

- Tool-Name
- Tool-Argumente
- Tool-Rueckgaben

Das ist fuer den ersten LLM-Versuch wichtig, weil wir so sehen koennen:

- ob das Modell die richtigen Tools waehlt
- ob die Intent-Aufloesung sauber ist
- ob die Turn-Zusammenfassung wirklich genutzt werden kann

## Nächster sinnvoller Schritt

Nach diesem ersten Runner-Schnitt waere der naechste gute Ausbau:

- ein echter erster manueller LLM-Durchlauf ueber die Console-REPL

Danach koennen wir gezielt beurteilen:

- ob der Tool-Contract reicht
- ob das Prompting nachgeschaerft werden muss
- ob der Debug-Output erweitert werden sollte
- ob eine kleine UI danach wirklich sinnvoll waere
