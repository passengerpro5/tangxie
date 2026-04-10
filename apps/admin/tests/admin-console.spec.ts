import assert from "node:assert/strict";
import test from "node:test";

import { createAdminConsoleController } from "../src/runtime/admin-console.ts";
import { createAdminApiClient } from "../src/lib/api-client.ts";

test("admin console controller loads pages and refreshes data after mutations", async () => {
  const calls: string[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    const path = url.pathname;
    calls.push(`${init?.method ?? "GET"} ${path}`);

    if (path === "/admin/ai/providers" && (init?.method ?? "GET") === "GET") {
      return new Response(
        JSON.stringify({
          items: [
            {
              id: "provider_1",
              name: "OpenAI",
              providerType: "openai_compatible",
              baseUrl: "https://api.openai.com/v1",
              defaultModel: "gpt-4o-mini",
              enabled: true,
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    if (path === "/admin/ai/providers" && (init?.method ?? "GET") === "POST") {
      return new Response(
        JSON.stringify({
          id: "provider_2",
          name: "Moonshot",
          providerType: "openai_compatible",
          baseUrl: "https://api.moonshot.cn/v1",
          defaultModel: "kimi-k2",
          enabled: true,
        }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      );
    }

    if (path === "/admin/ai/models" && (init?.method ?? "GET") === "GET") {
      return new Response(JSON.stringify({ items: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (path === "/admin/ai/models" && (init?.method ?? "GET") === "POST") {
      return new Response(JSON.stringify({ id: "binding_1" }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (path === "/admin/ai/prompts" && (init?.method ?? "GET") === "GET") {
      return new Response(
        JSON.stringify({
          items: [
            {
              id: "prompt_1",
              scene: "arrange_chat",
              templateName: "arrange-chat-v1",
              systemPrompt: "You are a task arranging assistant.",
              developerPrompt: "Return useful plan suggestions.",
              version: "v1",
            },
          ],
        }),
        {
        status: 200,
        headers: { "Content-Type": "application/json" },
        },
      );
    }

    if (path === "/admin/ai/prompts" && (init?.method ?? "GET") === "POST") {
      return new Response(JSON.stringify({ id: "prompt_1" }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (path === "/admin/ai/prompts/prompt_1" && (init?.method ?? "GET") === "PATCH") {
      return new Response(
        JSON.stringify({
          id: "prompt_1",
          scene: "arrange_chat",
          templateName: "arrange-chat-v1",
          systemPrompt: "You are a revised task arranging assistant.",
          developerPrompt: "Return useful plan suggestions.",
          version: "v2",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    if (path === "/admin/ai/logs" && (init?.method ?? "GET") === "GET") {
      return new Response(JSON.stringify({ items: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (path === "/admin/ai/providers/provider_1/test") {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ message: "Unexpected request" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  };

  const apiClient = createAdminApiClient({
    baseUrl: "http://admin.local.test",
    fetchImpl,
  });

  const controller = createAdminConsoleController({ apiClient });
  const initialStateRef = controller.state;

  await controller.loadPage("providers");
  assert.notEqual(controller.state, initialStateRef);
  assert.equal(controller.state.pageId, "providers");
  assert.equal(controller.state.providers.items.length, 1);

  await controller.createProvider({
    name: "Moonshot",
    providerType: "openai_compatible",
    baseUrl: "https://api.moonshot.cn/v1",
    defaultModel: "kimi-k2",
    enabled: true,
  });

  assert.equal(controller.state.providers.items.length, 2);

  await controller.loadPage("models");
  assert.equal(controller.state.models.items.length, 0);

  await controller.loadPage("prompts");
  assert.equal(controller.state.prompts.items.length, 1);

  await controller.updatePromptTemplate("prompt_1", {
    scene: "arrange_chat",
    templateName: "arrange-chat-v1",
    systemPrompt: "You are a revised task arranging assistant.",
    developerPrompt: "Return useful plan suggestions.",
    version: "v2",
  });
  assert.equal(controller.state.prompts.items[0]?.version, "v2");

  await controller.testProvider("provider_1", "hello");
  assert.equal(controller.state.logs.items.length, 0);

  assert.deepEqual(calls, [
    "GET /admin/ai/providers",
    "POST /admin/ai/providers",
    "GET /admin/ai/providers",
    "GET /admin/ai/models",
    "GET /admin/ai/prompts",
    "PATCH /admin/ai/prompts/prompt_1",
    "GET /admin/ai/prompts",
    "POST /admin/ai/providers/provider_1/test",
    "GET /admin/ai/logs",
  ]);
});

test("provider save updates an existing matching provider instead of creating duplicates", async () => {
  const calls: string[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    const path = url.pathname;
    calls.push(`${init?.method ?? "GET"} ${path}`);

    if (path === "/admin/ai/providers" && (init?.method ?? "GET") === "GET") {
      return new Response(
        JSON.stringify({
          items: [
            {
              id: "provider_1",
              name: "AiHubMix",
              providerType: "openai_compatible",
              baseUrl: "https://api.aihubmix.com/v1",
              defaultModel: "gpt-4o-mini",
              enabled: true,
              apiKeyMasked: "ol***ey",
              hasApiKeyConfigured: true,
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    if (path === "/admin/ai/providers/provider_1" && (init?.method ?? "GET") === "PATCH") {
      return new Response(
        JSON.stringify({
          id: "provider_1",
          name: "AiHubMix",
          providerType: "openai_compatible",
          baseUrl: "https://api.aihubmix.com/v1",
          defaultModel: "gpt-4o-mini",
          enabled: true,
          apiKeyMasked: "ne***ey",
          hasApiKeyConfigured: true,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ message: "Unexpected request" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  };

  const controller = createAdminConsoleController({
    apiClient: createAdminApiClient({
      baseUrl: "http://admin.local.test",
      fetchImpl,
    }),
  });

  await controller.loadPage("providers");
  await controller.createProvider({
    name: "AiHubMix",
    providerType: "openai_compatible",
    baseUrl: "https://api.aihubmix.com/v1",
    apiKey: "new-secret-key",
    defaultModel: "gpt-4o-mini",
    enabled: true,
  });

  assert.equal(controller.state.providers.items.length, 1);
  assert.equal(controller.state.message, "服务商已更新");
  assert.deepEqual(calls, [
    "GET /admin/ai/providers",
    "PATCH /admin/ai/providers/provider_1",
    "GET /admin/ai/providers",
  ]);
});

test("provider test exposes clearer upstream auth errors", async () => {
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    const path = url.pathname;

    if (path === "/admin/ai/providers/provider_1/test") {
      return new Response(
        JSON.stringify({ message: "Invalid token: test (tid: 123)" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    if (path === "/admin/ai/logs") {
      return new Response(JSON.stringify({ items: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ message: "Unexpected request" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  };

  const controller = createAdminConsoleController({
    apiClient: createAdminApiClient({
      baseUrl: "http://admin.local.test",
      fetchImpl,
    }),
  });

  await assert.rejects(() => controller.testProvider("provider_1", "hello"));
  assert.equal(controller.state.error, "上游 Provider 鉴权失败：Invalid token: test (tid: 123)");
});

test("provider test stays on providers page and stores the latest test result", async () => {
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    const path = url.pathname;

    if (path === "/admin/ai/providers/provider_1/test") {
      return new Response(
        JSON.stringify({
          ok: true,
          provider: {
            id: "provider_1",
            name: "AiHubMix",
            providerType: "openai_compatible",
            baseUrl: "https://api.aihubmix.com/v1",
            defaultModel: "gpt-4o-mini",
            enabled: true,
            apiKeyMasked: "sk***90",
            hasApiKeyConfigured: true,
            createdAt: "2026-04-10T00:00:00.000Z",
            updatedAt: "2026-04-10T00:00:00.000Z",
          },
          modelName: "gpt-4o-mini",
          outputText: "pong",
          logId: "log_1",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    if (path === "/admin/ai/logs") {
      return new Response(JSON.stringify({ items: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ message: "Unexpected request" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  };

  const controller = createAdminConsoleController({
    apiClient: createAdminApiClient({
      baseUrl: "http://admin.local.test",
      fetchImpl,
    }),
    initialPageId: "providers",
  });

  await controller.testProvider("provider_1", "hello");

  assert.equal(controller.state.pageId, "providers");
  assert.equal((controller.state.lastProviderTest as { outputText?: string }).outputText, "pong");
  assert.equal(controller.state.message, "服务商测试已完成");
});
