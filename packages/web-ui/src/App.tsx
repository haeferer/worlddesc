import type { FormEvent, KeyboardEvent, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import { fetchSession, submitTurn } from "./lib/api";
import type { SessionSnapshot, TranscriptEntry, UiSuggestion } from "./lib/types";
import { useSpeechToText } from "./lib/useSpeechToText";

type LocalTranscriptEntry = TranscriptEntry & {
  pending?: boolean;
};

export function App() {
  const [snapshot, setSnapshot] = useState<SessionSnapshot | null>(null);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [optimisticEntries, setOptimisticEntries] = useState<LocalTranscriptEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const transcriptScrollRef = useRef<HTMLElement | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  const stt = useSpeechToText((transcript) => {
    if (pending) {
      setInput((current) => (current ? `${current} ${transcript}` : transcript));
      return;
    }

    void sendTurn(transcript);
  });

  useEffect(() => {
    void loadInitialSession();
  }, []);

  const transcriptEntries = useMemo<LocalTranscriptEntry[]>(() => {
    return [...(snapshot?.transcript ?? []), ...optimisticEntries];
  }, [optimisticEntries, snapshot]);

  const latestAssistantEntry = useMemo(() => {
    return [...transcriptEntries].reverse().find((entry) => entry.role === "assistant") ?? null;
  }, [transcriptEntries]);

  useEffect(() => {
    if (!shouldAutoScroll) {
      return;
    }

    transcriptEndRef.current?.scrollIntoView({
      block: "end",
      behavior: pending ? "smooth" : "auto"
    });
  }, [pending, shouldAutoScroll, transcriptEntries]);

  const formatNumber = useMemo(() => new Intl.NumberFormat("de-DE"), []);

  function handleTranscriptScroll() {
    const element = transcriptScrollRef.current;
    if (!element) {
      return;
    }

    const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
    setShouldAutoScroll(distanceFromBottom < 96);
  }

  async function loadInitialSession() {
    try {
      setError(null);
      setSnapshot(await fetchSession());
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : String(nextError));
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextInput = input.trim();
    if (!nextInput || pending) {
      return;
    }

    await sendTurn(nextInput);
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }

    event.preventDefault();
    const nextInput = input.trim();
    if (!nextInput || pending) {
      return;
    }

    void sendTurn(nextInput);
  }

  async function sendTurn(nextInput: string) {
    const trimmedInput = nextInput.trim();
    if (!trimmedInput) {
      return;
    }

    const optimisticEntry: LocalTranscriptEntry = {
      id: `optimistic-user-${Date.now()}`,
      role: "user",
      text: trimmedInput,
      createdAt: new Date().toISOString(),
      pending: true
    };

    setOptimisticEntries([optimisticEntry]);
    setInput("");
    setPending(true);
    setError(null);

    try {
      const result = await submitTurn(trimmedInput);
      setSnapshot(result.snapshot);
      setOptimisticEntries([]);
    } catch (nextError) {
      setOptimisticEntries([]);
      setInput(trimmedInput);
      setError(nextError instanceof Error ? nextError.message : String(nextError));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_#2f261f,_#17120e_56%,_#0d0a08)] text-stone-100">
      <div className="mx-auto grid h-full max-w-7xl grid-rows-[minmax(0,1fr)] gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.9fr)]">
        <main className="flex min-h-0 flex-col overflow-hidden rounded-[28px] border border-amber-200/10 bg-stone-950/65 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur">
          <header className="border-b border-amber-200/10 px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[0.7rem] uppercase tracking-[0.24em] text-amber-200/70">worlddesc guide</p>
                <h1 className="font-serif text-2xl text-stone-50">Gespräch mit der Welt</h1>
              </div>
              {snapshot ? (
                <div className="rounded-full border border-amber-200/15 bg-amber-50/5 px-3 py-1 text-sm text-amber-100/80">
                  {snapshot.config.model} · {snapshot.config.apiMode}
                </div>
              ) : null}
            </div>
          </header>

          <section
            ref={transcriptScrollRef}
            onScroll={handleTranscriptScroll}
            className="flex-1 overflow-y-auto px-5 py-5"
          >
            <div className="space-y-4">
            {error ? (
              <div className="rounded-2xl border border-red-400/20 bg-red-950/40 px-4 py-3 text-sm text-red-100">
                {error}
              </div>
            ) : null}

            {snapshot?.warnings.narrative.map((warning) => (
              <Notice key={`n-${warning}`} tone="amber" text={`Narrative warning: ${warning}`} />
            ))}
            {snapshot?.warnings.knowledge.map((warning) => (
              <Notice key={`k-${warning}`} tone="sky" text={`Knowledge warning: ${warning}`} />
            ))}

            {transcriptEntries.length ? (
              transcriptEntries.map((entry) => (
                <TranscriptBubble key={entry.id} entry={entry} showDebug={showDebug} onSuggestion={sendTurn} />
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-amber-100/15 bg-stone-900/55 px-5 py-6 text-sm text-stone-300">
                Die Session ist bereit. Sprich die Welt an, oder probiere einen Vorschlag aus dem rechten Bereich.
              </div>
            )}
              <div ref={transcriptEndRef} />
            </div>
          </section>

          <footer className="border-t border-amber-200/10 px-5 py-4">
            <form className="space-y-3" onSubmit={handleSubmit}>
              <div className="flex gap-3">
                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={handleInputKeyDown}
                  placeholder="Was moechtest du tun?"
                  className="min-h-[84px] flex-1 resize-y rounded-2xl border border-amber-100/15 bg-stone-900/80 px-4 py-3 text-sm text-stone-50 outline-none transition focus:border-amber-200/40 focus:ring-2 focus:ring-amber-300/20"
                />
                <div className="flex flex-col gap-2">
                  <button
                    type="submit"
                    disabled={pending || !input.trim()}
                    className="rounded-2xl bg-amber-200 px-4 py-3 text-sm font-medium text-stone-950 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:bg-stone-700 disabled:text-stone-400"
                  >
                    {pending ? "Denke nach…" : "Senden"}
                  </button>
                  {stt.supported ? (
                    <button
                      type="button"
                      onClick={() => (stt.listening ? stt.stop() : stt.start())}
                      className="rounded-2xl border border-amber-100/15 bg-stone-900/80 px-4 py-3 text-sm text-stone-100 transition hover:border-amber-200/30 hover:bg-stone-800"
                    >
                      {stt.listening ? "Stopp" : "Sprechen"}
                    </button>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-stone-400/85">
                {stt.supported ? <p>STT: {stt.debugState}</p> : null}
                {stt.error ? <p className="text-red-200/80">{stt.error}</p> : null}
              </div>
            </form>
          </footer>
        </main>

        <aside className="min-h-0 space-y-5 overflow-y-auto pr-1">
          <Panel title="Naechste Vorschlaege" eyebrow="clickable">
            {latestAssistantEntry?.suggestions?.length ? (
              <div className="flex flex-wrap gap-2">
                {latestAssistantEntry.suggestions.map((suggestion) => (
                  <SuggestionButton
                    key={suggestion.id}
                    suggestion={suggestion}
                    disabled={pending}
                    onClick={sendTurn}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-stone-300/75">Noch keine klickbaren Vorschlaege fuer diesen Moment.</p>
            )}
          </Panel>

          <Panel title={snapshot?.currentScene.title ?? "Szene"} eyebrow="current scene">
            {snapshot ? (
              <div className="space-y-4 text-sm text-stone-200/90">
                <p className="leading-6 text-stone-200/85">{snapshot.currentScene.description}</p>
                <div>
                  <h3 className="mb-2 text-xs uppercase tracking-[0.2em] text-amber-100/55">Objekte</h3>
                  <ul className="space-y-2">
                    {snapshot.currentScene.objects.map((object) => (
                      <li key={object.objectId} className="rounded-2xl border border-amber-100/10 bg-stone-900/70 px-3 py-2">
                        <p className="font-medium text-stone-100">{object.title}</p>
                        {object.shortDescription ? (
                          <p className="mt-1 text-sm text-stone-300/80">{object.shortDescription}</p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="mb-2 text-xs uppercase tracking-[0.2em] text-amber-100/55">Wege</h3>
                  <ul className="space-y-2">
                    {snapshot.currentScene.ways.map((way) => (
                      <li key={way.wayId} className="rounded-2xl border border-stone-100/10 bg-black/20 px-3 py-2">
                        <p className="font-medium text-stone-100">{way.title}</p>
                        <p className="mt-1 text-sm text-stone-300/75">{way.desc}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <p className="text-sm text-stone-300/80">Lade Szene…</p>
            )}
          </Panel>

          <Panel title="Status" eyebrow="session">
            {snapshot ? (
              <div className="space-y-3 text-sm text-stone-200/85">
                <p>World: {snapshot.config.worldPath}</p>
                <p>History: {snapshot.config.maxHistoryMessages}</p>
                <p>
                  Session:
                  {" "}
                  In {formatNumber.format(snapshot.sessionUsage.promptTokens)}
                  {" "}
                  · Out {formatNumber.format(snapshot.sessionUsage.completionTokens)}
                  {" "}
                  · Cached {formatNumber.format(snapshot.sessionUsage.cachedTokens)}
                </p>
                <button
                  type="button"
                  onClick={() => setShowDebug((current) => !current)}
                  className="rounded-full border border-stone-100/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-stone-200/75 transition hover:border-amber-100/25 hover:text-stone-100"
                >
                  {showDebug ? "Debug verbergen" : "Debug zeigen"}
                </button>
              </div>
            ) : (
              <p className="text-sm text-stone-300/80">Verbinde…</p>
            )}
          </Panel>
        </aside>
      </div>
    </div>
  );
}

function Panel(props: { title: string; eyebrow: string; children: ReactNode }) {
  return (
    <section className="rounded-[28px] border border-amber-200/10 bg-stone-950/65 p-5 shadow-[0_16px_60px_rgba(0,0,0,0.25)] backdrop-blur">
      <p className="text-[0.68rem] uppercase tracking-[0.24em] text-amber-100/50">{props.eyebrow}</p>
      <h2 className="mt-2 font-serif text-xl text-stone-50">{props.title}</h2>
      <div className="mt-4">{props.children}</div>
    </section>
  );
}

function Notice(props: { tone: "amber" | "sky"; text: string }) {
  const toneClasses =
    props.tone === "amber"
      ? "border-amber-200/20 bg-amber-100/10 text-amber-50"
      : "border-sky-300/20 bg-sky-200/10 text-sky-50";

  return <div className={`rounded-2xl border px-4 py-3 text-sm ${toneClasses}`}>{props.text}</div>;
}

function TranscriptBubble(props: {
  entry: LocalTranscriptEntry;
  showDebug: boolean;
  onSuggestion: (inputText: string) => Promise<void>;
}) {
  const isUser = props.entry.role === "user";

  return (
    <article className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={[
          "max-w-[92%] rounded-[24px] px-4 py-3 shadow-[0_16px_48px_rgba(0,0,0,0.18)]",
          isUser
            ? props.entry.pending
              ? "bg-amber-100 text-stone-900 ring-2 ring-amber-200/40"
              : "bg-amber-200 text-stone-950"
            : "border border-stone-100/10 bg-stone-900/80 text-stone-100"
        ].join(" ")}
      >
        <p className="whitespace-pre-wrap leading-7">{props.entry.text}</p>
        {isUser && props.entry.pending ? (
          <p className="mt-2 text-xs uppercase tracking-[0.16em] text-stone-700/75">Wird gesendet…</p>
        ) : null}
        {!isUser && props.entry.suggestions?.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {props.entry.suggestions.map((suggestion) => (
              <SuggestionButton
                key={suggestion.id}
                suggestion={suggestion}
                disabled={false}
                onClick={props.onSuggestion}
                compact
              />
            ))}
          </div>
        ) : null}
        {!isUser && props.showDebug && props.entry.debugLines?.length ? (
          <details className="mt-3 rounded-2xl border border-stone-100/10 bg-black/20 px-3 py-2 text-xs text-stone-300">
            <summary className="cursor-pointer uppercase tracking-[0.16em] text-stone-200/65">Debug</summary>
            <pre className="mt-2 whitespace-pre-wrap font-mono leading-5 text-stone-300/85">
              {props.entry.debugLines.join("\n")}
            </pre>
          </details>
        ) : null}
      </div>
    </article>
  );
}

function SuggestionButton(props: {
  suggestion: UiSuggestion;
  disabled: boolean;
  onClick: (inputText: string) => Promise<void>;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={props.disabled}
      onClick={() => void props.onClick(props.suggestion.inputText)}
      className={[
        "rounded-full border border-amber-100/15 bg-amber-100/8 text-left text-sm text-amber-50 transition",
        "hover:border-amber-200/40 hover:bg-amber-100/15 disabled:cursor-not-allowed disabled:opacity-50",
        props.compact ? "px-3 py-1.5" : "px-4 py-2"
      ].join(" ")}
    >
      {props.suggestion.label}
    </button>
  );
}
