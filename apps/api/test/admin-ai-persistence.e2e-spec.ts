import assert from "node:assert/strict";
import test from "node:test";

import { createAdminAiHandler } from "../src/modules/admin-ai/admin-ai.controller.ts";
import { AdminAiService } from "../src/modules/admin-ai/admin-ai.service.ts";
import { createInMemoryAdminAiRepository } from "../src/persistence/admin-ai-repository.ts";

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

  return { response: res, state };
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

test("shared admin-ai repository persists provider, model, and prompt data across handler instances", async () => {
  const repository = createInMemoryAdminAiRepository();
  const providerClient = {
    async chatCompletion(request: { model: string }) {
      return {
        id: "resp-1",
        model: request.model,
        outputText: "ok",
        raw: { choices: [{ message: { content: "ok" } }] },
      };
    },
  };

  const firstHandler = createAdminAiHandler(
    new AdminAiService({
      repository,
      providerClient,
    }),
  );

  const provider = await invoke(firstHandler, "POST", "/admin/ai/providers", {
    name: "AiHubMix",
    providerType: "openai_compatible",
    baseUrl: "https://api.aihubmix.com/v1",
    apiKey: "secret-key",
    defaultModel: "gpt-4o-mini",
    enabled: true,
  });
  assert.equal(provider.statusCode, 201);

  await invoke(firstHandler, "POST", "/admin/ai/models", {
    providerId: provider.body.id,
    scene: "clarification",
    modelName: "gpt-4o-mini",
    enabled: true,
    isDefault: true,
  });

  await invoke(firstHandler, "POST", "/admin/ai/prompts", {
    scene: "clarification",
    templateName: "default",
    systemPrompt: "You are a task planning assistant.",
    developerPrompt: "Ask concise follow-up questions.",
    version: "v1",
    isActive: true,
  });

  const secondHandler = createAdminAiHandler(
    new AdminAiService({
      repository,
      providerClient,
    }),
  );

  const providerList = await invoke(secondHandler, "GET", "/admin/ai/providers");
  const modelList = await invoke(secondHandler, "GET", "/admin/ai/models");
  const promptList = await invoke(secondHandler, "GET", "/admin/ai/prompts");
  const logList = await invoke(secondHandler, "GET", "/admin/ai/logs");

  assert.equal(providerList.statusCode, 200);
  assert.equal(modelList.statusCode, 200);
  assert.equal(promptList.statusCode, 200);
  assert.equal(logList.statusCode, 200);
  assert.equal(providerList.body.items.length, 1);
  assert.equal(modelList.body.items.length, 1);
  assert.equal(promptList.body.items.length, 1);
  assert.equal(logList.body.items.length, 3);
  assert.equal(logList.body.items[0].action, "prompt.create");
  assert.equal(logList.body.items[1].action, "model.create");
  assert.equal(logList.body.items[2].action, "provider.create");
});
