import { useEffect, useMemo, useRef, useState } from "react";

export function useSpeechToText(onTranscript: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugState, setDebugState] = useState("idle");
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const transcriptHandlerRef = useRef(onTranscript);

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
      setError(event.error || "Speech recognition failed");
      setListening(false);
      setDebugState(`error: ${event.error || "unknown"}`);
    };
    recognition.onend = () => {
      setListening(false);
       setDebugState("ended");
    };
    recognitionRef.current = recognition;

    return () => {
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
    debugState,
    start() {
      setError(null);
      setDebugState("starting");
      try {
        recognitionRef.current?.start();
      } catch (startError) {
        const message = startError instanceof Error ? startError.message : String(startError);
        setError(message);
        setListening(false);
        setDebugState(`start-error: ${message}`);
      }
    },
    stop() {
      recognitionRef.current?.stop();
      setListening(false);
      setDebugState("stopped");
    }
  };
}
