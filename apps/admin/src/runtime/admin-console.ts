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

export function createAdminConsoleController(options: AdminConsoleControllerOptions) {
  const state = createInitialState(options.initialPageId ?? "providers");
  const listeners = new Set<() => void>();

  function emit() {
    for (const listener of listeners) {
      listener();
    }
  }

  function patch(next: Partial<AdminConsoleState>) {
    Object.assign(state, next);
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
    state.pageId = pageId;

    return withRequest(async () => {
      if (pageId === "providers") {
        const providers = await options.apiClient.listProviders();
        patch({ providers });
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
    return withRequest(async () => {
      const created = await options.apiClient.createProvider(payload);
      const listed = await options.apiClient.listProviders();
      const hasCreated = listed.items.some((item) => (item as { id?: unknown }).id === (created as { id?: unknown }).id);
      const providers = hasCreated
        ? listed
        : { items: [...listed.items, created] };
      patch({ providers, pageId: "providers" });
      return providers;
    }, "服务商已创建");
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

  async function testProvider(providerId: string, input: string) {
    return withRequest(async () => {
      const result = await options.apiClient.testProvider(providerId, input);
      const logs = await options.apiClient.listLogs();
      patch({
        logs,
        pageId: "logs",
        lastProviderTest: result,
      });
      return result;
    }, "服务商测试已完成");
  }

  return {
    state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    loadPage,
    createProvider,
    createModelBinding,
    createPromptTemplate,
    testProvider,
  };
}
