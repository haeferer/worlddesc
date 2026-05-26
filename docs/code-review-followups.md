# Code Review Follow-ups

Diese Notiz sammelt die kleineren oder spaeteren Folgepunkte aus dem ehrlichen Struktur-Review, nachdem die drei grossen Brocken bereits angegangen wurden:

- `packages/llm-runner/src/responsesAdapter.ts`
  - Die Responses-Integration ist jetzt sauberer isoliert, arbeitet aber weiterhin nahe an SDK-Formen.
  - Falls die OpenAI-SDK-Oberflaeche erneut driftet, lohnt sich hier spaeter noch eine bewusst engere interne Typisierung fuer Ein- und Ausgabeformen.

- `packages/world/src/playerView/actionExecution.ts`
  - Laufzeitfehler werden fuer die Produktoberflaeche absichtlich generisch als `execution-failed` behandelt.
  - Fuer spaetere Debugbarkeit kann ein interner strukturierter `cause` oder ein Debug-Modus sinnvoll sein, ohne die stabile User-Oberflaeche zu verlieren.

- Knowledge Layer
  - Objektwissen ist bereits sauber angebunden.
  - Raumwissen ist konzeptionell vorbereitet, aber noch kein gleichwertiger Tool-Pfad.
  - Spaeter bewusst entscheiden:
    - entweder `get_room_knowledge` nachziehen
    - oder die Teilmenge explizit als vorlaeufig dokumentieren

- Prompt-/Dialogfokus
  - Museums- und Vertiefungswelten profitieren deutlich von etwas groesserer History.
  - Falls Prompting und History-Tuning spaeter nicht mehr reichen, koennte ein sehr kleiner expliziter Dialogfokus diskutiert werden.
  - Das sollte aber nur bewusst passieren, um keine versteckte Gespraechsautomatik in die Engine zu ziehen.

- Tests und Refactor-Disziplin
  - Die neuen Modulgrenzen in `toolLoop` und `playerView` sollten kuenftig beibehalten werden.
  - Neue Features moeglichst in den extrahierten Helfern unterbringen, statt die Koordinator-Dateien wieder anschwellen zu lassen.

## Bereits erledigt

Diese groesseren Strukturthemen wurden schon bearbeitet und gehoeren nicht mehr zu den offenen Review-Brocken:

- `packages/llm-runner/src/toolLoop.ts` in kleinere Verantwortungen aufgeteilt
- `packages/world/src/playerView/playerWorldView.ts` in Queries und Action-Pipeline zerlegt
- `packages/world/src/scaffoldTemplates.ts` auf dateibasierten Scaffold umgestellt
