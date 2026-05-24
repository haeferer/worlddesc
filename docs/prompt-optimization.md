# Prompt Optimization

Dieses Dokument bereitet den aktuellen Runner-Prompt fuer einen gezielten Review mit einem starken Reasoning-Modell vor.

## Ziel

Wir wollen den Prompt verbessern, ohne die Rollen zu vermischen:

- die World bleibt die Wahrheitsquelle
- der Runner bleibt die Tool- und Ablaufdisziplin
- der Prompt soll den Begleiter nur klarer und robuster machen

## Aktueller Exportpfad

Der Runner kann den voll zusammengesetzten Prompt jetzt direkt ausgeben:

```bash
npm run llm:repl -- --character warm-guide --system-prompt-file ./my-extra-guidance.txt --print-system-prompt
```

Damit bekommt man genau den Text, der spaeter dem Modell als zentrale Instruktion dient.

## Was wir beim externen Review optimieren wollen

Besonders wichtig sind:

- Tool-Disziplin
- keine Vorwegnahme spaeterer Szenenzustaende
- klare Trennung von `scene` und `narrativeContext`
- gute Rueckfragen statt Halluzinationen
- knappe, belastbare Regeln statt ausufernder Meta-Instruktionen

## Offizielle OpenAI-Hinweise fuer Reasoning-Modelle

Fuer aktuelle Reasoning-Modelle empfiehlt OpenAI im Kern:

- Prompts einfach und direkt halten
- keine Chain-of-Thought-Anweisungen wie "denke Schritt fuer Schritt"
- klare Delimiter und Abschnitte verwenden
- zero-shot zuerst, few-shot nur wenn noetig
- bei agentischen und Tool-Faellen eher die Responses API als Chat Completions nutzen

Quellen:

- https://platform.openai.com/docs/guides/reasoning-best-practices
- https://platform.openai.com/docs/guides/reasoning
- https://platform.openai.com/docs/guides/prompt-engineering/best-practices

## Was das fuer unseren Runner bedeutet

Unser naechster Prompt-Review sollte besonders auf diese Punkte schauen:

1. Sind die Regeln zu lang oder redundant?
2. Ist die Prioritaet zwischen `scene`, `turn`, `currentActionFocus` und `narrativeContext` klar genug?
3. Gibt es Formulierungen, die das Modell eher zum Raten als zum Tool-Nutzen verleiten?
4. Lohnt sich eine spaetere Umstellung auf die Responses API fuer mehrfache Tool-Runden?

## Empfohlene Review-Frage an ein starkes Reasoning-Modell

Ein guter Review-Prompt sollte nicht fragen:

- "Mach den Prompt schoener"

sondern eher:

- "Welche Regeln sind redundant, zu weich oder widerspruechlich?"
- "Wo koennte das Modell trotz dieser Instruktionen noch halluzinieren?"
- "Wie wuerdest du den Prompt kuerzen, ohne Tool-Disziplin oder Weltkonsistenz zu verlieren?"

## Naechster technischer Schritt

Der aktuelle Runner nutzt noch die Chat-Completions-API.

OpenAI weist fuer Reasoning- und Tool-Workflows darauf hin, dass die Responses API in solchen Faellen oft besser ist, besonders wenn mehrere Tool-Runden und reasoning items relevant werden.

Darum ist eine spaetere Vergleichsstufe sinnvoll:

- aktueller Runner mit Chat Completions
- spaeterer Prototyp mit Responses API

Aber zuerst lohnt sich der inhaltliche Prompt-Review des jetzigen Systems.
