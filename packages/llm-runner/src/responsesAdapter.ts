export function extractResponseFunctionCalls(response: {
  output?: unknown[];
}): Array<{ name: string; arguments?: string; call_id: string }> {
  return (response.output ?? [])
    .filter(
      (item): item is { type: "function_call"; name?: unknown; arguments?: unknown; call_id?: unknown } =>
        typeof item === "object" && item !== null && "type" in item && (item as { type?: unknown }).type === "function_call"
    )
    .map((item) => ({
      name: String(item.name ?? ""),
      arguments: typeof item.arguments === "string" ? item.arguments : "",
      call_id: String(item.call_id ?? "")
    }))
    .filter((item) => item.name.length > 0 && item.call_id.length > 0);
}

export function extractResponseOutputText(response: {
  output_text?: string;
  output?: unknown[];
}): string {
  if (typeof response.output_text === "string" && response.output_text.length > 0) {
    return response.output_text;
  }

  for (const item of response.output ?? []) {
    if (
      typeof item !== "object" ||
      item === null ||
      !("type" in item) ||
      (item as { type?: unknown }).type !== "message" ||
      !("content" in item) ||
      !Array.isArray((item as { content?: unknown }).content)
    ) {
      continue;
    }

    const parts = (item as { content: unknown[] }).content
      .filter(
        (contentItem): contentItem is { type: "output_text"; text: string } =>
          typeof contentItem === "object" &&
          contentItem !== null &&
          (contentItem as { type?: unknown }).type === "output_text" &&
          typeof (contentItem as { text?: unknown }).text === "string"
      )
      .map((contentItem) => contentItem.text);

    if (parts.length > 0) {
      return parts.join("\n");
    }
  }

  return "";
}
