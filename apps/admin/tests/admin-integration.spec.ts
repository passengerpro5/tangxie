import assert from "node:assert/strict";
import test from "node:test";

import { createAdminApiClient } from "../src/lib/api-client.ts";
import { createAppHandler } from "../../api/src/app.module.ts";
import { getPrismaClient } from "../../api/src/persistence/prisma-client.ts";

function createResponseRecorder() {
  const state = {
    statusCode: 0,
    headers: {} as Record<string, string>,
    bodyText: "",
  };

  const response = {
    writeHead(statusCode: number, headers: Record<string, string>) {
      state.statusCode = statusCode;
      state.headers = { ...state.headers, ...headers };
      return response;
    },
    end(chunk?: string) {
      state.bodyText = typeof chunk === "string" ? chunk : "";
    },
  };

  return { response, state };
}

const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);

test(
  "admin api client works against the persisted app handler across requests",
  { skip: !hasDatabaseUrl },
  async () => {
    const prisma = getPrismaClient();

    await prisma.adminAiAuditLog.deleteMany();
    await prisma.promptTemplate.deleteMany();
    await prisma.aIModelBinding.deleteMany();
    await prisma.aIProviderConfig.deleteMany();

    const fetchImpl: typeof fetch = async (input, init) => {
      const url = new URL(String(input));
      const handler = createAppHandler();
      const { response, state } = createResponseRecorder();
      const req = {
        method: init?.method ?? "GET",
        url: `${url.pathname}${url.search}`,
        body:
          typeof init?.body === "string" && init.body.length > 0
            ? JSON.parse(init.body)
            : undefined,
      };

      await handler(req as never, response as never);

      return new Response(state.bodyText, {
        status: state.statusCode,
        headers: state.headers,
      });
    };

    const client = createAdminApiClient({
      baseUrl: "http://admin.local.test",
      fetchImpl,
    });

    const provider = await client.createProvider({
      name: "Moonshot",
      providerType: "openai_compatible",
      baseUrl: "https://api.moonshot.cn/v1",
      apiKey: "secret-key",
      defaultModel: "kimi-k2",
      enabled: true,
    });

    await client.createModelBinding({
      providerId: provider.id,
      scene: "clarification",
      modelName: "kimi-k2",
      temperature: 0.1,
      maxTokens: 1024,
      timeoutSeconds: 45,
      enabled: true,
      isDefault: true,
    });

    await client.createPromptTemplate({
      scene: "clarification",
      templateName: "clarification-default",
      systemPrompt: "Ask only what is still missing.",
      developerPrompt: "Be brief.",
      version: "v1",
      isActive: true,
    });

    const providers = await client.listProviders();
    const models = await client.listModelBindings();
    const prompts = await client.listPromptTemplates();
    const logs = await client.listLogs();

    assert.equal(providers.items.length, 1);
    assert.equal(models.items.length, 1);
    assert.equal(prompts.items.length, 1);
    assert.ok(logs.items.length >= 3);
  },
);
