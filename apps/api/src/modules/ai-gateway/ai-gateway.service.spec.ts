import assert from "node:assert/strict";
import test from "node:test";

import {
  AiGatewayService,
  InMemoryAiGatewayCatalog,
  type AIProviderConfig,
  type AIModelBinding,
  type PromptTemplate,
} from "./ai-gateway.service.ts";
import type { OpenAICompatibleProviderClient } from "./provider-client.ts";

test("routes a scene by provider, model, and prompt configuration", async () => {
  const providers: AIProviderConfig[] = [
    {
      id: "provider-1",
      name: "AiHubMix",
      providerType: "openai_compatible",
      baseUrl: "https://api.aihubmix.com/v1",
      apiKey: "secret-key",
      defaultModel: "gpt-4o-mini",
      enabled: true,
    },
  ];

  const bindings: AIModelBinding[] = [
    {
      scene: "clarification",
      providerId: "provider-1",
      modelName: "gpt-4o-mini",
      temperature: 0.2,
      maxTokens: 2048,
      timeoutSeconds: 60,
      enabled: true,
      isDefault: true,
    },
  ];

  const prompts: PromptTemplate[] = [
    {
      scene: "clarification",
      templateName: "default",
      systemPrompt: "You are a task planning assistant.",
      developerPrompt: "Ask concise follow-up questions.",
      version: "v1",
      isActive: true,
    },
  ];

  let capturedRequest: unknown;
  const providerClient: OpenAICompatibleProviderClient = {
    async chatCompletion(request) {
      capturedRequest = request;
      return {
        id: "resp-1",
        model: request.model,
        outputText: "What is the deadline?",
        raw: { choices: [{ message: { content: "What is the deadline?" } }] },
      };
    },
  };

  const service = new AiGatewayService(
    new InMemoryAiGatewayCatalog(providers, bindings, prompts),
    providerClient,
  );

  const result = await service.runScene("clarification", {
    input: "明天下午前交论文初稿",
    context: { source: "manual" },
  });

  assert.equal(result.scene, "clarification");
  assert.equal(result.providerName, "AiHubMix");
  assert.equal(result.providerId, "provider-1");
  assert.equal(result.modelName, "gpt-4o-mini");
  assert.equal(result.promptVersion, "v1");
  assert.deepEqual(capturedRequest, {
    baseUrl: "https://api.aihubmix.com/v1",
    apiKey: "secret-key",
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are a task planning assistant." },
      { role: "developer", content: "Ask concise follow-up questions." },
      { role: "developer", content: 'Context: {"source":"manual"}' },
      { role: "user", content: "明天下午前交论文初稿" },
    ],
    temperature: 0.2,
    maxTokens: 2048,
    timeoutSeconds: 60,
  });
});

test("throws when the requested scene is missing configuration", async () => {
  const service = new AiGatewayService(
    new InMemoryAiGatewayCatalog([], [], []),
    {
      async chatCompletion() {
        throw new Error("should not be called");
      },
    },
  );

  await assert.rejects(
    () =>
      service.runScene("clarification", {
        input: "test",
      }),
    /No active model binding found for scene: clarification/,
  );
});
