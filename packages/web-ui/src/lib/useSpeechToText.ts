import { useEffect, useMemo, useRef, useState } from "react";

export function useSpeechToText(onTranscript: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

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
    recognition.onresult = (event) => {
      const finalTranscript = Array.from({ length: event.results.length })
        .map((_, index) => event.results[index])
        .filter((result) => result.isFinal)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ")
        .trim();

      if (finalTranscript) {
        onTranscript(finalTranscript);
      }
    };
    recognition.onerror = (event) => {
      setError(event.error || "Speech recognition failed");
      setListening(false);
    };
    recognition.onend = () => {
      setListening(false);
    };
    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [onTranscript, supported]);

  return {
    supported,
    listening,
    error,
    start() {
      setError(null);
      recognitionRef.current?.start();
      setListening(true);
    },
    stop() {
      recognitionRef.current?.stop();
      setListening(false);
    }
  };
}
