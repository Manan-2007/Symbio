import "server-only";

// Azure OpenAI chat completions. Keys stay on the server; route handlers call this.

type Content = string | ({ type: "text"; text: string } | { type: "image_url"; image_url: { url: string; detail?: "low" | "high" | "auto" } })[];
export type ChatMessage = { role: "system" | "user" | "assistant"; content: Content };

export function isAzureConfigured(): boolean {
  return Boolean(process.env.AZURE_OPENAI_API_KEY && process.env.AZURE_OPENAI_ENDPOINT);
}

/**
 * AZURE_OPENAI_ENDPOINT may be the full chat-completions URL (as copied from the Azure portal)
 * or just the resource URL, in which case deployment and API version are appended.
 */
function completionsUrl(): string {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT!.trim();
  if (endpoint.includes("/chat/completions")) return endpoint;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT ?? "gpt-4o";
  const version = process.env.AZURE_OPENAI_API_VERSION ?? "2025-01-01-preview";
  return `${endpoint.replace(/\/$/, "")}/openai/deployments/${encodeURIComponent(deployment)}/chat/completions?api-version=${encodeURIComponent(version)}`;
}

export async function chatCompletion(messages: ChatMessage[], options: { maxTokens?: number; json?: boolean; temperature?: number } = {}): Promise<string> {
  if (!isAzureConfigured()) throw new Error("not_configured");
  const response = await fetch(completionsUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json", "api-key": process.env.AZURE_OPENAI_API_KEY! },
    body: JSON.stringify({
      messages,
      max_tokens: options.maxTokens ?? 400,
      temperature: options.temperature ?? 0.3,
      ...(options.json ? { response_format: { type: "json_object" } } : {}),
    }),
    signal: AbortSignal.timeout(25_000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`azure_${response.status}`);
  const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  const text = data.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text.trim()) throw new Error("empty_response");
  return text.trim();
}
