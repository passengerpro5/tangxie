import assert from "node:assert/strict";
import test from "node:test";

import { createAppHandler } from "../src/app.module.ts";
import { createAdminAiHandler } from "../src/modules/admin-ai/admin-ai.controller.ts";
import { AdminAiService } from "../src/modules/admin-ai/admin-ai.service.ts";
import { getPrismaClient } from "../src/persistence/prisma-client.ts";
import { PrismaAdminAiRepository } from "../src/persistence/prisma-admin-ai-repository.ts";

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
  handler: ReturnType<typeof createAdminAiHandler> | ReturnType<typeof createAppHandler>,
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

const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);

test(
  "prisma admin-ai repository persists provider, model, prompt, and logs",
  { skip: !hasDatabaseUrl },
  async () => {
    const prisma = getPrismaClient();

    await prisma.adminAiAuditLog.deleteMany();
    await prisma.promptTemplate.deleteMany();
    await prisma.aIModelBinding.deleteMany();
    await prisma.aIProviderConfig.deleteMany();

    const repository = new PrismaAdminAiRepository(prisma);
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

    const handler = createAdminAiHandler(
      new AdminAiService({
        repository,
        providerClient,
      }),
    );

    const provider = await invoke(handler, "POST", "/admin/ai/providers", {
      name: "AiHubMix",
      providerType: "openai_compatible",
      baseUrl: "https://api.aihubmix.com/v1",
      apiKey: "secret-key",
      defaultModel: "gpt-4o-mini",
      enabled: true,
    });
    assert.equal(provider.statusCode, 201);

    const model = await invoke(handler, "POST", "/admin/ai/models", {
      providerId: provider.body.id,
      scene: "clarification",
      modelName: "gpt-4o-mini",
      temperature: 0.2,
      maxTokens: 2048,
      timeoutSeconds: 60,
      enabled: true,
      isDefault: true,
    });
    assert.equal(model.statusCode, 201);

    const prompt = await invoke(handler, "POST", "/admin/ai/prompts", {
      scene: "clarification",
      templateName: "default",
      systemPrompt: "You are a task planning assistant.",
      developerPrompt: "Ask concise follow-up questions.",
      version: "v1",
      isActive: true,
    });
    assert.equal(prompt.statusCode, 201);

    const testRes = await invoke(handler, "POST", `/admin/ai/providers/${provider.body.id}/test`, {
      input: "ping",
    });
    assert.equal(testRes.statusCode, 200);

    const logsRes = await invoke(handler, "GET", "/admin/ai/logs");
    assert.equal(logsRes.statusCode, 200);
    assert.ok(logsRes.body.items.length >= 4);
    assert.ok(
      logsRes.body.items.some((item: { action: string }) => item.action === "provider.test"),
    );

    const providerCount = await prisma.aIProviderConfig.count();
    const modelCount = await prisma.aIModelBinding.count();
    const promptCount = await prisma.promptTemplate.count();
    const logCount = await prisma.adminAiAuditLog.count();

    assert.equal(providerCount, 1);
    assert.equal(modelCount, 1);
    assert.equal(promptCount, 1);
    assert.ok(logCount >= 4);
  },
);

test(
  "app handler uses Prisma-backed admin-ai persistence across handler instances",
  { skip: !hasDatabaseUrl },
  async () => {
    const prisma = getPrismaClient();

    await prisma.adminAiAuditLog.deleteMany();
    await prisma.promptTemplate.deleteMany();
    await prisma.aIModelBinding.deleteMany();
    await prisma.aIProviderConfig.deleteMany();

    const firstHandler = createAppHandler();

    const provider = await invoke(firstHandler, "POST", "/admin/ai/providers", {
      name: "OpenRouter",
      providerType: "openai_compatible",
      baseUrl: "https://openrouter.ai/api/v1",
      apiKey: "secret-key",
      defaultModel: "openai/gpt-4o-mini",
      enabled: true,
    });
    assert.equal(provider.statusCode, 201);

    const model = await invoke(firstHandler, "POST", "/admin/ai/models", {
      providerId: provider.body.id,
      scene: "clarification",
      modelName: "openai/gpt-4o-mini",
      temperature: 0.1,
      maxTokens: 1024,
      timeoutSeconds: 45,
      enabled: true,
      isDefault: true,
    });
    assert.equal(model.statusCode, 201);

    const prompt = await invoke(firstHandler, "POST", "/admin/ai/prompts", {
      scene: "clarification",
      templateName: "clarify-default",
      systemPrompt: "Ask only for the missing scheduling fields.",
      developerPrompt: "Stay concise.",
      version: "v1",
      isActive: true,
    });
    assert.equal(prompt.statusCode, 201);

    const secondHandler = createAppHandler();

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
  },
);
