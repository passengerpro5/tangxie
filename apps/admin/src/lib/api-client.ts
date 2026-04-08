export interface AdminApiClientOptions {
  baseUrl: string;
  fetchImpl?: typeof fetch;
}

export interface ProviderPayload {
  name: string;
  providerType: "openai_compatible" | "custom";
  baseUrl: string;
  apiKey?: string;
  defaultModel: string;
  enabled?: boolean;
}

export interface ModelBindingPayload {
  providerId: string;
  scene: "task_extract" | "clarification" | "priority_rank" | "schedule_generate" | "reminder_copy";
  modelName: string;
  temperature?: number;
  maxTokens?: number;
  timeoutSeconds?: number;
  enabled?: boolean;
  isDefault?: boolean;
}

export interface PromptTemplatePayload {
  scene: "task_extract" | "clarification" | "priority_rank" | "schedule_generate" | "reminder_copy";
  templateName: string;
  systemPrompt: string;
  developerPrompt?: string | null;
  version: string;
  isActive?: boolean;
}

function joinUrl(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/$/, "")}${path}`;
}

async function readJsonResponse(response: Response) {
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function requestJson(fetchImpl: typeof fetch, url: string, init?: RequestInit) {
  const response = await fetchImpl(url, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  const payload = await readJsonResponse(response);
  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String((payload as { message?: unknown }).message ?? "Request failed")
        : "Request failed";
    throw new Error(message);
  }

  return payload;
}

export function createAdminApiClient(options: AdminApiClientOptions) {
  const fetchImpl = options.fetchImpl ?? fetch;

  return {
    listProviders() {
      return requestJson(fetchImpl, joinUrl(options.baseUrl, "/admin/ai/providers"));
    },
    createProvider(payload: ProviderPayload) {
      return requestJson(fetchImpl, joinUrl(options.baseUrl, "/admin/ai/providers"), {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    listModelBindings() {
      return requestJson(fetchImpl, joinUrl(options.baseUrl, "/admin/ai/models"));
    },
    createModelBinding(payload: ModelBindingPayload) {
      return requestJson(fetchImpl, joinUrl(options.baseUrl, "/admin/ai/models"), {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    listPromptTemplates() {
      return requestJson(fetchImpl, joinUrl(options.baseUrl, "/admin/ai/prompts"));
    },
    createPromptTemplate(payload: PromptTemplatePayload) {
      return requestJson(fetchImpl, joinUrl(options.baseUrl, "/admin/ai/prompts"), {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    listLogs() {
      return requestJson(fetchImpl, joinUrl(options.baseUrl, "/admin/ai/logs"));
    },
    testProvider(providerId: string, input: string) {
      return requestJson(
        fetchImpl,
        joinUrl(options.baseUrl, `/admin/ai/providers/${providerId}/test`),
        {
          method: "POST",
          body: JSON.stringify({ input }),
        },
      );
    },
  };
}

export type AdminApiClient = ReturnType<typeof createAdminApiClient>;
