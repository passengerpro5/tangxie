import type {
  AdminApiClient,
  ModelBindingPayload,
  PromptTemplatePayload,
  ProviderPayload,
} from "../lib/api-client.ts";

export type AdminPageId = "providers" | "models" | "prompts" | "logs";

export interface AdminCollectionState<T> {
  items: T[];
}

export interface AdminConsoleState {
  pageId: AdminPageId;
  loading: boolean;
  message: string | null;
  error: string | null;
  lastProviderTest: unknown;
  providers: AdminCollectionState<Record<string, unknown>>;
  models: AdminCollectionState<Record<string, unknown>>;
  prompts: AdminCollectionState<Record<string, unknown>>;
  logs: AdminCollectionState<Record<string, unknown>>;
}

export interface AdminConsoleControllerOptions {
  apiClient: AdminApiClient;
  initialPageId?: AdminPageId;
}

function createInitialState(pageId: AdminPageId): AdminConsoleState {
  return {
    pageId,
    loading: false,
    message: null,
    error: null,
    lastProviderTest: null,
    providers: { items: [] },
    models: { items: [] },
    prompts: { items: [] },
    logs: { items: [] },
  };
}

function providerKey(item: Record<string, unknown>) {
  return [
    String(item.name ?? ""),
    String(item.providerType ?? ""),
    String(item.baseUrl ?? ""),
  ].join("::");
}

function providerTimestamp(item: Record<string, unknown>) {
  const updatedAt = Date.parse(String(item.updatedAt ?? ""));
  if (Number.isFinite(updatedAt)) {
    return updatedAt;
  }

  const createdAt = Date.parse(String(item.createdAt ?? ""));
  if (Number.isFinite(createdAt)) {
    return createdAt;
  }

  return 0;
}

function dedupeProviders(items: Record<string, unknown>[]) {
  const latestByKey = new Map<string, Record<string, unknown>>();
  for (const item of items) {
    const key = providerKey(item);
    const existing = latestByKey.get(key);
    if (!existing || providerTimestamp(item) >= providerTimestamp(existing)) {
      latestByKey.set(key, item);
    }
  }

  return Array.from(latestByKey.values()).sort(
    (left, right) => providerTimestamp(right) - providerTimestamp(left),
  );
}

function findMatchingProvider(
  items: Record<string, unknown>[],
  payload: ProviderPayload,
) {
  return items.find((item) => {
    return (
      String(item.name ?? "") === payload.name &&
      String(item.baseUrl ?? "") === payload.baseUrl &&
      String(item.providerType ?? "") === payload.providerType
    );
  });
}

function formatProviderTestError(error: unknown) {
  const message = error instanceof Error ? error.message : "Request failed";
  if (/invalid token/i.test(message)) {
    return `上游 Provider 鉴权失败：${message}`;
  }

  return message;
}

export function createAdminConsoleController(options: AdminConsoleControllerOptions) {
  let state = createInitialState(options.initialPageId ?? "providers");
  const listeners = new Set<() => void>();

  function emit() {
    for (const listener of listeners) {
      listener();
    }
  }

  function patch(next: Partial<AdminConsoleState>) {
    state = {
      ...state,
      ...next,
    };
    emit();
  }

  async function withRequest<T>(work: () => Promise<T>, successMessage?: string) {
    patch({ loading: true, error: null, message: null });
    try {
      const result = await work();
      patch({
        loading: false,
        error: null,
        message: successMessage ?? null,
      });
      return result;
    } catch (error) {
      patch({
        loading: false,
        error: error instanceof Error ? error.message : "Request failed",
        message: null,
      });
      throw error;
    }
  }

  async function loadPage(pageId: AdminPageId) {
    patch({ pageId });

    return withRequest(async () => {
      if (pageId === "providers") {
        const providers = await options.apiClient.listProviders();
        patch({ providers: { items: dedupeProviders(providers.items) } });
        return providers;
      }

      if (pageId === "models") {
        const models = await options.apiClient.listModelBindings();
        patch({ models });
        return models;
      }

      if (pageId === "prompts") {
        const prompts = await options.apiClient.listPromptTemplates();
        patch({ prompts });
        return prompts;
      }

      const logs = await options.apiClient.listLogs();
      patch({ logs });
      return logs;
    });
  }

  async function createProvider(payload: ProviderPayload) {
    patch({ loading: true, error: null, message: null });
    try {
      const currentProviders =
        state.pageId === "providers" && state.providers.items.length > 0
          ? state.providers
          : await options.apiClient.listProviders();
      const existing = findMatchingProvider(currentProviders.items, payload);
      const updatedExisting = Boolean(existing && typeof existing.id === "string");
      const created = existing && typeof existing.id === "string"
        ? await options.apiClient.updateProvider(existing.id, payload)
        : await options.apiClient.createProvider(payload);
      const listed = await options.apiClient.listProviders();
      const hasCreated = listed.items.some((item) => (item as { id?: unknown }).id === (created as { id?: unknown }).id);
      const providers = hasCreated
        ? { items: dedupeProviders(listed.items) }
        : { items: dedupeProviders([...listed.items, created]) };
      patch({
        loading: false,
        error: null,
        message: updatedExisting ? "服务商已更新" : "服务商已创建",
        providers,
        pageId: "providers",
      });
      return providers;
    } catch (error) {
      patch({
        loading: false,
        error: error instanceof Error ? error.message : "Request failed",
        message: null,
      });
      throw error;
    }
  }

  async function createModelBinding(payload: ModelBindingPayload) {
    return withRequest(async () => {
      const created = await options.apiClient.createModelBinding(payload);
      const listed = await options.apiClient.listModelBindings();
      const hasCreated = listed.items.some((item) => (item as { id?: unknown }).id === (created as { id?: unknown }).id);
      const models = hasCreated
        ? listed
        : { items: [...listed.items, created] };
      patch({ models, pageId: "models" });
      return models;
    }, "模型绑定已保存");
  }

  async function createPromptTemplate(payload: PromptTemplatePayload) {
    return withRequest(async () => {
      const created = await options.apiClient.createPromptTemplate(payload);
      const listed = await options.apiClient.listPromptTemplates();
      const hasCreated = listed.items.some((item) => (item as { id?: unknown }).id === (created as { id?: unknown }).id);
      const prompts = hasCreated
        ? listed
        : { items: [...listed.items, created] };
      patch({ prompts, pageId: "prompts" });
      return prompts;
    }, "提示词模板已保存");
  }

  async function updatePromptTemplate(promptId: string, payload: Partial<PromptTemplatePayload>) {
    return withRequest(async () => {
      const updated = await options.apiClient.updatePromptTemplate(promptId, payload);
      const listed = await options.apiClient.listPromptTemplates();
      const prompts = {
        items: listed.items.map((item) =>
          (item as { id?: unknown }).id === promptId ? { ...item, ...updated } : item,
        ),
      };
      patch({ prompts, pageId: "prompts" });
      return prompts;
    }, "提示词模板已更新");
  }

  async function testProvider(providerId: string, input: string) {
    patch({ loading: true, error: null, message: null });
    try {
      const result = await options.apiClient.testProvider(providerId, input);
      const logs = await options.apiClient.listLogs();
      patch({
        loading: false,
        error: null,
        message: "服务商测试已完成",
        logs,
        lastProviderTest: result,
      });
      return result;
    } catch (error) {
      patch({
        loading: false,
        error: formatProviderTestError(error),
        message: null,
      });
      throw error;
    }
  }

  return {
    get state() {
      return state;
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    loadPage,
    createProvider,
    createModelBinding,
    createPromptTemplate,
    updatePromptTemplate,
    testProvider,
  };
}
