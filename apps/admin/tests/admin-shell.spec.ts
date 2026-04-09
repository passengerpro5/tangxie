import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { App, getActivePage } from "../src/App.ts";
import { createAdminApiClient } from "../src/lib/api-client.ts";
import { createLogsPage } from "../src/pages/logs-page.ts";
import { createModelsPage } from "../src/pages/models-page.ts";
import { createProvidersPage } from "../src/pages/providers-page.ts";
import { createPromptsPage } from "../src/pages/prompts-page.ts";

test("admin shell exposes the four operating areas", () => {
  const shell = App();

  assert.equal(shell.brand, "糖蟹");
  assert.equal(shell.title, "AI 管理控制台");
  assert.deepEqual(shell.navigation.map((item) => item.id), [
    "providers",
    "models",
    "prompts",
    "logs",
  ]);
  assert.deepEqual(shell.pages.map((page) => page.fetchEndpoint), [
    "/admin/ai/providers",
    "/admin/ai/models",
    "/admin/ai/prompts",
    "/admin/ai/logs",
  ]);
  assert.equal(getActivePage(shell)?.id, "providers");
});

test("page models stay aligned with the admin API boundaries", () => {
  assert.equal(createProvidersPage().primaryAction, "新增服务商");
  assert.equal(createModelsPage().fields.includes("scene"), true);
  assert.equal(createPromptsPage().fields.includes("version"), true);
  assert.equal(createLogsPage().primaryAction, "刷新日志");
});

test("admin api client routes requests to the expected endpoints", async () => {
  const calls: Array<{ url: string; method: string; body: string | undefined }> = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    calls.push({
      url: String(input),
      method: init?.method ?? "GET",
      body: typeof init?.body === "string" ? init.body : undefined,
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  const client = createAdminApiClient({
    baseUrl: "https://admin.api.test",
    fetchImpl,
  });

  await client.listProviders();
  await client.createProvider({
    name: "AiHubMix",
    providerType: "openai_compatible",
    baseUrl: "https://api.aihubmix.com/v1",
    apiKey: "secret",
    defaultModel: "gpt-4o-mini",
  });
  await client.listModelBindings();
  await client.createModelBinding({
    providerId: "provider_1",
    scene: "clarification",
    modelName: "gpt-4o-mini",
  });
  await client.listPromptTemplates();
  await client.createPromptTemplate({
    scene: "clarification",
    templateName: "clarification-v1",
    systemPrompt: "You are a task assistant.",
    version: "v1",
  });
  await client.listLogs();
  await client.testProvider("provider_1", "hello");

  assert.deepEqual(
    calls.map((call) => [call.method, call.url]),
    [
      ["GET", "https://admin.api.test/admin/ai/providers"],
      ["POST", "https://admin.api.test/admin/ai/providers"],
      ["GET", "https://admin.api.test/admin/ai/models"],
      ["POST", "https://admin.api.test/admin/ai/models"],
      ["GET", "https://admin.api.test/admin/ai/prompts"],
      ["POST", "https://admin.api.test/admin/ai/prompts"],
      ["GET", "https://admin.api.test/admin/ai/logs"],
      ["POST", "https://admin.api.test/admin/ai/providers/provider_1/test"],
    ],
  );
  assert.equal(calls[1]?.body?.includes('"providerType":"openai_compatible"'), true);
  assert.equal(calls[7]?.body?.includes('"input":"hello"'), true);
});

test("admin runtime exposes browser scripts and bootstrap entry", async () => {
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  const htmlEntry = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const browserEntry = await readFile(new URL("../src/main.tsx", import.meta.url), "utf8");

  assert.equal(typeof packageJson.scripts.dev, "string");
  assert.equal(typeof packageJson.scripts.build, "string");
  assert.equal(typeof packageJson.scripts.preview, "string");
  assert.equal(htmlEntry.includes('/src/main.tsx'), true);
  assert.equal(browserEntry.includes("bootstrapAdminBrowser"), true);
});
