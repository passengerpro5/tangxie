import type { FormEvent } from "react";
import { startTransition, useEffect, useSyncExternalStore } from "react";

import { getActivePage, type AdminShell } from "../App.ts";
import type { AdminPageModel } from "../pages/providers-page.ts";
import type { AdminConsoleState } from "../runtime/admin-console.ts";
import type { createAdminConsoleController } from "../runtime/admin-console.ts";
import { formDataToRecord } from "./form-data.ts";
import { Layout } from "./layout.tsx";
import { PagePanel } from "./page-panel.tsx";

type AdminConsoleController = ReturnType<typeof createAdminConsoleController>;

function useControllerState(controller: AdminConsoleController) {
  return useSyncExternalStore(
    (listener) => controller.subscribe(listener),
    () => controller.state,
    () => controller.state,
  );
}

function formatValue(value: unknown) {
  if (value == null || value === "") {
    return "—";
  }

  if (typeof value === "boolean") {
    return value ? "是" : "否";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function fieldLabel(field: string) {
  const labels: Record<string, string> = {
    name: "名称",
    providerType: "服务商类型",
    baseUrl: "Base URL",
    apiKey: "API Key",
    defaultModel: "默认模型",
    providerId: "服务商 ID",
    scene: "场景",
    modelName: "模型名",
    temperature: "温度",
    maxTokens: "最大 Token",
    timeoutSeconds: "超时秒数",
    templateName: "模板名",
    systemPrompt: "系统提示词",
    developerPrompt: "开发提示词",
    version: "版本",
    promptVersion: "提示词版本",
    providerName: "服务商",
    statusCode: "状态码",
    durationMs: "耗时",
  };

  return labels[field] ?? field;
}

function createEmptyRecord(page: AdminPageModel) {
  return Object.fromEntries(page.fields.map((field) => [field, ""]));
}

function withPageDefaults(page: AdminPageModel, defaults: Record<string, string>) {
  if (page.id === "providers") {
    return {
      ...defaults,
      name: defaults.name || "AiHubMix",
      providerType: defaults.providerType || "openai_compatible",
      baseUrl: defaults.baseUrl || "https://api.aihubmix.com/v1",
      defaultModel: defaults.defaultModel || "gpt-4o-mini",
    };
  }

  if (page.id === "models") {
    return {
      ...defaults,
      scene: defaults.scene || "arrange_chat",
      modelName: defaults.modelName || "gpt-4o-mini",
      temperature: defaults.temperature || "0.2",
      maxTokens: defaults.maxTokens || "4096",
      timeoutSeconds: defaults.timeoutSeconds || "60",
    };
  }

  if (page.id === "prompts") {
    return {
      ...defaults,
      scene: defaults.scene || "arrange_chat",
      templateName: defaults.templateName || "arrange-chat-v1",
      systemPrompt:
        defaults.systemPrompt ||
        "你是糖蟹的任务安排助手。你需要通过多轮对话理解任务、补齐关键信息、拆分子任务，并给出可执行的时间安排。",
      developerPrompt:
        defaults.developerPrompt ||
        "优先返回自然语言回复，并尽量保持输出可被前端解析为结构化安排结果。",
      version: defaults.version || "v1",
    };
  }

  return defaults;
}

function getFieldOptions(
  field: string,
  pageId: AdminPageModel["id"],
  providers: Record<string, unknown>[],
) {
  if (field === "providerType") {
    return [
      { value: "openai_compatible", label: "OpenAI Compatible" },
      { value: "custom", label: "Custom" },
    ];
  }

  if (field === "scene") {
    return [
      { value: "arrange_chat", label: "arrange_chat" },
      { value: "task_extract", label: "task_extract" },
      { value: "clarification", label: "clarification" },
      { value: "priority_rank", label: "priority_rank" },
      { value: "schedule_generate", label: "schedule_generate" },
      { value: "reminder_copy", label: "reminder_copy" },
    ];
  }

  if (field === "providerId" && pageId === "models" && providers.length > 0) {
    return providers.map((provider) => ({
      value: String(provider.id ?? ""),
      label: `${String(provider.name ?? "Unknown")} (${String(provider.id ?? "")})`,
    }));
  }

  return null;
}

function getPageItems(state: AdminConsoleState, pageId: AdminPageModel["id"]) {
  if (pageId === "providers") return state.providers.items;
  if (pageId === "models") return state.models.items;
  if (pageId === "prompts") return state.prompts.items;
  return state.logs.items;
}

export function AdminShellApp(props: {
  shell: AdminShell;
  controller: AdminConsoleController;
}) {
  const state = useControllerState(props.controller);
  const activePage = getActivePage(props.shell, state.pageId);
  const items = getPageItems(state, activePage.id);

  useEffect(() => {
    void props.controller.loadPage(state.pageId);
  }, [props.controller, state.pageId]);

  const form = withPageDefaults(activePage, createEmptyRecord(activePage));

  return (
    <Layout
      sidebar={
        <>
          <div className="brand-block">
            <p className="brand-kicker">{props.shell.brand}</p>
            <h1>{props.shell.title}</h1>
            <p>{props.shell.description}</p>
          </div>
          <nav className="nav-list" aria-label="管理导航">
            {props.shell.navigation.map((item) => (
              <button
                key={item.id}
                className={item.id === state.pageId ? "nav-item is-active" : "nav-item"}
                onClick={() => {
                  startTransition(() => {
                    void props.controller.loadPage(item.id as typeof state.pageId);
                  });
                }}
                type="button"
              >
                <span>{item.label}</span>
                <small>{item.id}</small>
              </button>
            ))}
          </nav>
        </>
      }
      header={
        <div className="header-copy">
          <div>
            <p className="header-kicker">Admin Console</p>
            <h2>{activePage.title}</h2>
          </div>
          <div className="header-status">
            <span className={state.loading ? "badge badge-live" : "badge"}>{state.loading ? "同步中" : "已连接"}</span>
            <span className="header-endpoint">{activePage.fetchEndpoint}</span>
          </div>
        </div>
      }
      main={
        <>
          {state.error ? <div className="message error">{state.error}</div> : null}
          {state.message ? <div className="message success">{state.message}</div> : null}
          <PagePanel title={activePage.title} description={activePage.description} eyebrow="实时数据">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    {activePage.fields.map((field) => (
                      <th key={field}>{fieldLabel(field)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={activePage.fields.length}>当前没有数据。</td>
                    </tr>
                  ) : (
                    items.map((item, index) => (
                      <tr key={String((item as { id?: string }).id ?? index)}>
                        {activePage.fields.map((field) => (
                          <td key={field}>{formatValue((item as Record<string, unknown>)[field])}</td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </PagePanel>
        </>
      }
      aside={
        <Inspector
          activePage={activePage}
          defaults={form}
          controller={props.controller}
          providers={state.providers.items}
          items={items}
          lastProviderTest={state.lastProviderTest}
        />
      }
    />
  );
}

function Inspector(props: {
  activePage: AdminPageModel;
  defaults: Record<string, string>;
  controller: AdminConsoleController;
  providers: Record<string, unknown>[];
  items: Record<string, unknown>[];
  lastProviderTest: unknown;
}) {
  if (props.activePage.id === "logs") {
    return (
      <PagePanel title="日志说明" description="日志页目前只提供只读审计视图。">
        <p className="inspector-copy">服务商测试成功后，会自动刷新调用日志面板。</p>
      </PagePanel>
    );
  }

  return (
    <>
      <ActionForm
        key={props.activePage.id}
        title={props.activePage.id === "prompts" && props.items[0] ? "编辑当前提示词" : props.activePage.primaryAction}
        fields={props.activePage.fields}
        defaults={
          props.activePage.id === "prompts" && props.items[0]
            ? withPageDefaults(props.activePage, {
                ...props.defaults,
                id: String(props.items[0].id ?? ""),
                scene: String(props.items[0].scene ?? ""),
                templateName: String(props.items[0].templateName ?? ""),
                systemPrompt: String(props.items[0].systemPrompt ?? ""),
                developerPrompt: String(props.items[0].developerPrompt ?? ""),
                version: String(props.items[0].version ?? ""),
              })
            : props.defaults
        }
        pageId={props.activePage.id}
        providers={props.providers}
        onSubmit={async (values) => {
          if (props.activePage.id === "providers") {
            await props.controller.createProvider({
              name: values.name,
              providerType: values.providerType as "openai_compatible" | "custom",
              baseUrl: values.baseUrl,
              apiKey: values.apiKey || undefined,
              defaultModel: values.defaultModel,
              enabled: true,
            });
            return;
          }

          if (props.activePage.id === "models") {
            await props.controller.createModelBinding({
              providerId: values.providerId,
              scene: values.scene as "task_extract" | "clarification" | "priority_rank" | "schedule_generate" | "reminder_copy" | "arrange_chat",
              modelName: values.modelName,
              temperature: values.temperature ? Number(values.temperature) : undefined,
              maxTokens: values.maxTokens ? Number(values.maxTokens) : undefined,
              timeoutSeconds: values.timeoutSeconds ? Number(values.timeoutSeconds) : undefined,
              enabled: true,
              isDefault: true,
            });
            return;
          }

          if (values.id) {
            await props.controller.updatePromptTemplate(values.id, {
              scene: values.scene as "task_extract" | "clarification" | "priority_rank" | "schedule_generate" | "reminder_copy" | "arrange_chat",
              templateName: values.templateName,
              systemPrompt: values.systemPrompt,
              developerPrompt: values.developerPrompt || undefined,
              version: values.version,
              isActive: true,
            });
            return;
          }

          await props.controller.createPromptTemplate({
            scene: values.scene as "task_extract" | "clarification" | "priority_rank" | "schedule_generate" | "reminder_copy" | "arrange_chat",
            templateName: values.templateName,
            systemPrompt: values.systemPrompt,
            developerPrompt: values.developerPrompt || undefined,
            version: values.version,
            isActive: true,
          });
        }}
      />
      <ProviderTestPanel controller={props.controller} providers={props.providers} />
      <ProviderTestResult result={props.lastProviderTest} />
    </>
  );
}

function ActionForm(props: {
  title: string;
  fields: string[];
  defaults: Record<string, string>;
  pageId: AdminPageModel["id"];
  providers: Record<string, unknown>[];
  onSubmit: (values: Record<string, string>) => Promise<void>;
}) {
  async function submit(formData: FormData) {
    const values = formDataToRecord(formData);
    await props.onSubmit(values);
  }

  return (
    <PagePanel title={props.title} description="表单会直接调用当前 API。">
      <form
        className="stack-form"
        onSubmit={async (event: FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          await submit(new FormData(event.currentTarget));
        }}
      >
        {"id" in props.defaults ? <input type="hidden" name="id" value={props.defaults.id} /> : null}
        {props.fields.map((field) => (
          <label key={field} className="field">
            <span>{fieldLabel(field)}</span>
            {getFieldOptions(field, props.pageId, props.providers) ? (
              <select defaultValue={props.defaults[field]} name={field}>
                {getFieldOptions(field, props.pageId, props.providers)?.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : field.includes("Prompt") ? (
              <textarea defaultValue={props.defaults[field]} name={field} rows={4} />
            ) : (
              <input defaultValue={props.defaults[field]} name={field} placeholder={fieldLabel(field)} />
            )}
          </label>
        ))}
        <button className="submit-button" type="submit">
          保存
        </button>
      </form>
    </PagePanel>
  );
}

function ProviderTestPanel(props: {
  controller: AdminConsoleController;
  providers: Record<string, unknown>[];
}) {
  if (props.providers.length === 0) {
    return (
      <PagePanel title="连通性测试" description="选中服务商后会触发 `/admin/ai/providers/:id/test`。">
        <p className="inspector-copy">当前还没有可测试的服务商。请先在“服务商配置”里创建一个 AiHubMix provider，再回来测试。</p>
        <button className="secondary-button" type="button" disabled>
          先创建服务商
        </button>
      </PagePanel>
    );
  }

  return (
    <PagePanel title="连通性测试" description="选中服务商后会触发 `/admin/ai/providers/:id/test`。">
      <form
        className="stack-form"
        onSubmit={async (event: FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          await props.controller.testProvider(
            String(new FormData(event.currentTarget).get("providerId") ?? ""),
            String(new FormData(event.currentTarget).get("input") ?? "ping"),
          );
        }}
      >
        <label className="field">
          <span>服务商</span>
          <select defaultValue={String(props.providers[0]?.id ?? "")} name="providerId">
            {props.providers.map((provider) => (
              <option key={String(provider.id)} value={String(provider.id)}>
                {String(provider.name)}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>测试输入</span>
          <input defaultValue="hello" name="input" />
        </label>
        <button className="secondary-button" type="submit">
          测试 Provider
        </button>
      </form>
    </PagePanel>
  );
}

function ProviderTestResult(props: { result: unknown }) {
  if (!props.result || typeof props.result !== "object") {
    return null;
  }

  const result = props.result as Record<string, unknown>;
  const provider =
    result.provider && typeof result.provider === "object"
      ? (result.provider as Record<string, unknown>)
      : null;

  return (
    <PagePanel title="最近一次测试结果" description="保留当前页并展示最新一次 provider 测试摘要。">
      <p className="inspector-copy">服务商：{formatValue(provider?.name)}</p>
      <p className="inspector-copy">模型：{formatValue(result.modelName)}</p>
      <p className="inspector-copy">输出：{formatValue(result.outputText)}</p>
    </PagePanel>
  );
}
