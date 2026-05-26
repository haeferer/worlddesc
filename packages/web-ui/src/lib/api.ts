import type { SessionSnapshot, TurnResult } from "./types";

export async function fetchSession(): Promise<SessionSnapshot> {
  const response = await fetch("/api/session");
  if (!response.ok) {
    throw new Error(`Failed to load session: ${response.status}`);
  }

  return (await response.json()) as SessionSnapshot;
}

export async function submitTurn(inputText: string): Promise<TurnResult> {
  const response = await fetch("/api/turns", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({ inputText })
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as
      | { error?: { message?: string } }
      | null;
    throw new Error(errorBody?.error?.message ?? `Turn request failed: ${response.status}`);
  }

  return (await response.json()) as TurnResult;
}
