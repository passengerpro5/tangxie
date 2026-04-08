export type AIScene =
  | "task_extract"
  | "clarification"
  | "priority_rank"
  | "schedule_generate"
  | "reminder_copy";

export interface AIMessage {
  role: "system" | "developer" | "user" | "assistant";
  content: string;
}

export interface OpenAICompatibleRequest {
  baseUrl: string;
  apiKey: string;
  model: string;
  messages: AIMessage[];
  temperature?: number;
  maxTokens?: number;
  timeoutSeconds?: number;
}

export interface OpenAICompatibleResponse {
  id: string;
  model: string;
  outputText: string;
  raw: unknown;
}

export interface OpenAICompatibleProviderClient {
  chatCompletion(request: OpenAICompatibleRequest): Promise<OpenAICompatibleResponse>;
}

function joinUrl(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/$/, "")}${path}`;
}

export function createOpenAICompatibleProviderClient(
  fetchImpl: typeof fetch = fetch,
): OpenAICompatibleProviderClient {
  return {
    async chatCompletion(request) {
      const response = await fetchImpl(joinUrl(request.baseUrl, "/chat/completions"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${request.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: request.model,
          messages: request.messages,
          temperature: request.temperature,
          max_tokens: request.maxTokens,
        }),
      });

      const raw = await response.json();
      const outputText =
        typeof raw === "object" &&
        raw !== null &&
        Array.isArray((raw as { choices?: unknown[] }).choices) &&
        (raw as { choices: Array<{ message?: { content?: string } }> }).choices[0]?.message
          ?.content
          ? (raw as { choices: Array<{ message?: { content?: string } }> }).choices[0]!.message!
              .content!
          : "";

      return {
        id:
          typeof raw === "object" && raw !== null && "id" in raw
            ? String((raw as { id?: unknown }).id ?? "")
            : "",
        model: request.model,
        outputText,
        raw,
      };
    },
  };
}
