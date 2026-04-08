import assert from "node:assert/strict";
import test from "node:test";

import { createAdminAiHandler } from "../src/modules/admin-ai/admin-ai.controller.ts";
import { AdminAiService } from "../src/modules/admin-ai/admin-ai.service.ts";

function createRequest(method: string, url: string, body?: unknown) {
  return { method, url, body };
}

function createResponse() {
  const state = {
    statusCode: 0,
    headers: {} as Record<string, string>,
    bodyText: "",
  };

  const res = {
    writeHead(statusCode: number, headers: Record<string, string>) {
      state.statusCode = statusCode;
      state.headers = { ...state.headers, ...headers };
      return res;
    },
    end(chunk?: string) {
      state.bodyText = typeof chunk === "string" ? chunk : "";
    },
  };

  return {
    response: res,
    state,
  };
}

async function invoke(
  handler: ReturnType<typeof createAdminAiHandler>,
  method: string,
  url: string,
  body?: unknown,
) {
  const request = createRequest(method, url, body);
  const { response, state } = createResponse();
  await handler(request as never, response as never);

  return {
    statusCode: state.statusCode,
    headers: state.headers,
    body: state.bodyText ? JSON.parse(state.bodyText) : null,
  };
}

test("provider, model, and prompt admin APIs work with masked secrets", async () => {
  const service = new AdminAiService({
    providerClient: {
      async chatCompletion(request) {
        return {
          id: "resp-1",
          model: request.model,
          outputText: "ok",
          raw: { choices: [{ message: { content: "ok" } }] },
        };
      },
    },
  });
  const handler = createAdminAiHandler(service);

  const providerRes = await invoke(handler, "POST", "/admin/ai/providers", {
    name: "AiHubMix",
    providerType: "openai_compatible",
    baseUrl: "https://api.aihubmix.com/v1",
    apiKey: "secret-key",
    defaultModel: "gpt-4o-mini",
    enabled: true,
  });

  assert.equal(providerRes.statusCode, 201);
  assert.equal(providerRes.body.name, "AiHubMix");
  assert.equal(providerRes.body.apiKeyMasked.includes("***"), true);
  assert.equal(providerRes.body.apiKey, undefined);

  const listProvidersRes = await invoke(handler, "GET", "/admin/ai/providers");
  assert.equal(listProvidersRes.statusCode, 200);
  assert.equal(listProvidersRes.body.items.length, 1);
  assert.equal(listProvidersRes.body.items[0].apiKeyMasked, providerRes.body.apiKeyMasked);

  const modelRes = await invoke(handler, "POST", "/admin/ai/models", {
    providerId: providerRes.body.id,
    scene: "clarification",
    modelName: "gpt-4o-mini",
    temperature: 0.2,
    maxTokens: 2048,
    timeoutSeconds: 60,
    enabled: true,
    isDefault: true,
  });

  assert.equal(modelRes.statusCode, 201);
  assert.equal(modelRes.body.scene, "clarification");

  const promptRes = await invoke(handler, "POST", "/admin/ai/prompts", {
    scene: "clarification",
    templateName: "default",
    systemPrompt: "You are a task planning assistant.",
    developerPrompt: "Ask concise follow-up questions.",
    version: "v1",
    isActive: true,
  });

  assert.equal(promptRes.statusCode, 201);
  assert.equal(promptRes.body.version, "v1");

  const modelListRes = await invoke(handler, "GET", "/admin/ai/models");
  assert.equal(modelListRes.statusCode, 200);
  assert.equal(modelListRes.body.items.length, 1);

  const promptListRes = await invoke(handler, "GET", "/admin/ai/prompts");
  assert.equal(promptListRes.statusCode, 200);
  assert.equal(promptListRes.body.items.length, 1);

  const testRes = await invoke(handler, "POST", `/admin/ai/providers/${providerRes.body.id}/test`, {
    input: "请帮我确认 deadline",
  });

  assert.equal(testRes.statusCode, 200);
  assert.equal(testRes.body.ok, true);
  assert.equal(testRes.body.outputText, "ok");
  assert.equal(testRes.body.provider.apiKeyMasked.includes("***"), true);

  const logsRes = await invoke(handler, "GET", "/admin/ai/logs");
  assert.equal(logsRes.statusCode, 200);
  assert.ok(logsRes.body.items.length >= 4);
  assert.equal(logsRes.body.items[0].action, "provider.test");
});

test("provider test returns a 404 for missing providers", async () => {
  const service = new AdminAiService();
  const handler = createAdminAiHandler(service);

  const response = await invoke(handler, "POST", "/admin/ai/providers/missing/test", {
    input: "ping",
  });

  assert.equal(response.statusCode, 404);
  assert.equal(response.body.message, "Provider not found");
});
