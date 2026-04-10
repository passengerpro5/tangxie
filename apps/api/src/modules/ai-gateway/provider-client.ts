import { Output, generateText, type FlexibleSchema, type ModelMessage } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { safeValidateTypes } from "@ai-sdk/provider-utils";

export type AIScene =
  | "task_extract"
  | "clarification"
  | "priority_rank"
  | "schedule_generate"
  | "reminder_copy"
  | "arrange_chat";

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
  structuredOutput?: {
    schema: FlexibleSchema<unknown>;
    name?: string;
    description?: string;
  };
}

export interface OpenAICompatibleResponse {
  id: string;
  model: string;
  outputText: string;
  raw: unknown;
  structuredOutput?: unknown;
}

export interface OpenAICompatibleProviderClient {
  chatCompletion(request: OpenAICompatibleRequest): Promise<OpenAICompatibleResponse>;
}

function joinUrl(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/$/, "")}${path}`;
}

function toModelMessages(messages: AIMessage[]): ModelMessage[] {
  return messages.map((message) => {
    if (message.role === "developer") {
      return {
        role: "system",
        content: `[Developer]\n${message.content}`,
      };
    }

    return {
      role: message.role,
      content: message.content,
    };
  });
}

export function createOpenAICompatibleProviderClient(
  fetchImpl: typeof fetch = fetch,
): OpenAICompatibleProviderClient {
  return {
    async chatCompletion(request) {
      const provider = createOpenAICompatible({
        name: "openai-compatible",
        baseURL: request.baseUrl,
        apiKey: request.apiKey,
        fetch: fetchImpl,
        supportsStructuredOutputs: Boolean(request.structuredOutput),
      });
      const result = await generateText({
        model: provider.chatModel(request.model),
        messages: toModelMessages(request.messages),
        temperature: request.temperature,
        maxOutputTokens: request.maxTokens,
        abortSignal:
          request.timeoutSeconds && request.timeoutSeconds > 0
            ? AbortSignal.timeout(request.timeoutSeconds * 1000)
            : undefined,
        ...(request.structuredOutput
          ? {
              output: Output.object({
                schema: request.structuredOutput.schema,
                name: request.structuredOutput.name,
                description: request.structuredOutput.description,
              }),
            }
          : {}),
      });
      let structuredOutput: unknown;
      if (request.structuredOutput) {
        try {
          structuredOutput = result.output;
        } catch {
          try {
            const parsedJson = JSON.parse(result.text);
            const validated = await safeValidateTypes({
              value: parsedJson,
              schema: request.structuredOutput.schema,
            });
            structuredOutput = validated.success ? validated.value : undefined;
          } catch {
            structuredOutput = undefined;
          }
        }
      }

      return {
        id: result.response.id,
        model: request.model,
        outputText: result.text,
        raw: result.response.body ?? result.response,
        structuredOutput,
      };
    },
  };
}
