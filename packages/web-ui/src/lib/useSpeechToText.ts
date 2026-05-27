import { useEffect, useMemo, useRef, useState } from "react";

export function useSpeechToText(onTranscript: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugState, setDebugState] = useState("idle");
  const [autoRestart, setAutoRestart] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const transcriptHandlerRef = useRef(onTranscript);
  const restartTimerRef = useRef<number | null>(null);
  const shouldRestartRef = useRef(false);
  const lastErrorRef = useRef<string | null>(null);
  const startingRef = useRef(false);
  const activeRef = useRef(false);

  transcriptHandlerRef.current = onTranscript;

  const supported = useMemo(
    () => typeof window !== "undefined" && Boolean(window.SpeechRecognition ?? window.webkitSpeechRecognition),
    []
  );

  useEffect(() => {
    if (!supported) {
      return;
    }

    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Recognition) {
      return;
    }

    const recognition = new Recognition();
    recognition.lang = "de-DE";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onstart = () => {
      clearRestartTimer();
      startingRef.current = false;
      activeRef.current = true;
      lastErrorRef.current = null;
      setDebugState("listening");
      setListening(true);
    };
    recognition.onresult = (event) => {
      const finalTranscript = Array.from({ length: event.results.length })
        .map((_, index) => event.results[index])
        .filter((result) => result.isFinal)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ")
        .trim();

      if (finalTranscript) {
        setDebugState(`result: ${finalTranscript}`);
        transcriptHandlerRef.current(finalTranscript);
      }
    };
    recognition.onerror = (event) => {
      const nextError = event.error || "Speech recognition failed";
      startingRef.current = false;
      activeRef.current = false;
      lastErrorRef.current = nextError;
      setError(nextError);
      setListening(false);
      setDebugState(`error: ${nextError}`);
    };
    recognition.onend = () => {
      startingRef.current = false;
      activeRef.current = false;
      setListening(false);
      const lastError = lastErrorRef.current;
      if (shouldRestartRef.current && canAutoRestartAfter(lastError)) {
        setDebugState("ended, restarting");
        scheduleRestart();
        return;
      }

      setDebugState("ended");
    };
    recognitionRef.current = recognition;

    return () => {
      shouldRestartRef.current = false;
      clearRestartTimer();
      startingRef.current = false;
      activeRef.current = false;
      recognition.stop();
      recognitionRef.current = null;
      setListening(false);
      setDebugState("disposed");
    };
  }, [supported]);

  return {
    supported,
    listening,
    error,
    autoRestart,
    debugState,
    start() {
      if (startingRef.current || activeRef.current) {
        return;
      }

      setError(null);
      startingRef.current = true;
      lastErrorRef.current = null;
      setDebugState("starting");
      try {
        recognitionRef.current?.start();
      } catch (startError) {
        startingRef.current = false;
        activeRef.current = false;
        const message = startError instanceof Error ? startError.message : String(startError);
        setError(message);
        setListening(false);
        setDebugState(`start-error: ${message}`);
      }
    },
    stop() {
      shouldRestartRef.current = false;
      setAutoRestart(false);
      clearRestartTimer();
      startingRef.current = false;
      activeRef.current = false;
      recognitionRef.current?.stop();
      setListening(false);
      setDebugState("stopped");
    },
    enableAutoRestart() {
      shouldRestartRef.current = true;
      setAutoRestart(true);
    },
    disableAutoRestart() {
      shouldRestartRef.current = false;
      setAutoRestart(false);
      clearRestartTimer();
    }
  };

  function scheduleRestart() {
    clearRestartTimer();
    restartTimerRef.current = window.setTimeout(() => {
      if (!shouldRestartRef.current) {
        return;
      }

      if (startingRef.current || activeRef.current) {
        return;
      }

      setDebugState("restarting");
      try {
        startingRef.current = true;
        lastErrorRef.current = null;
        recognitionRef.current?.start();
      } catch (startError) {
        startingRef.current = false;
        activeRef.current = false;
        const message = startError instanceof Error ? startError.message : String(startError);
        setError(message);
        setDebugState(`restart-error: ${message}`);
      }
    }, 100);
  }

  function clearRestartTimer() {
    if (restartTimerRef.current !== null) {
      window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  }
}

function canAutoRestartAfter(error: string | null): boolean {
  if (!error) {
    return true;
  }

  return ![
    "not-allowed",
    "service-not-allowed",
    "audio-capture",
    "language-not-supported"
  ].some((blockedCode) => error.includes(blockedCode));
}
