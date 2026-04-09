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
      return new Response(JSON.stringify({ items: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (path === "/admin/ai/prompts" && (init?.method ?? "GET") === "POST") {
      return new Response(JSON.stringify({ id: "prompt_1" }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
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

  await controller.loadPage("providers");
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
  assert.equal(controller.state.prompts.items.length, 0);

  await controller.testProvider("provider_1", "hello");
  assert.equal(controller.state.logs.items.length, 0);

  assert.deepEqual(calls, [
    "GET /admin/ai/providers",
    "POST /admin/ai/providers",
    "GET /admin/ai/providers",
    "GET /admin/ai/models",
    "GET /admin/ai/prompts",
    "POST /admin/ai/providers/provider_1/test",
    "GET /admin/ai/logs",
  ]);
});
