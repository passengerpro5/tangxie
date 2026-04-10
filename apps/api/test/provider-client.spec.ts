import assert from "node:assert/strict";
import test from "node:test";

import { z } from "zod";

import { createOpenAICompatibleProviderClient } from "../src/modules/ai-gateway/provider-client.ts";

test("provider client keeps text completion behavior through AI SDK", async () => {
  const requests: Array<{ url: string; body: Record<string, unknown> }> = [];
  const client = createOpenAICompatibleProviderClient(async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    requests.push({
      url,
      body: init?.body ? JSON.parse(String(init.body)) : {},
    });

    return new Response(
      JSON.stringify({
        id: "chatcmpl_text_1",
        choices: [
          {
            message: {
              role: "assistant",
              content: "请告诉我截止时间。",
            },
          },
        ],
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  });

  const response = await client.chatCompletion({
    baseUrl: "https://api.aihubmix.com/v1",
    apiKey: "secret-key",
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "你是助理" },
      { role: "developer", content: "回答简洁" },
      { role: "user", content: "帮我安排论文" },
    ],
    temperature: 0.2,
    maxTokens: 256,
  });

  assert.equal(response.id, "chatcmpl_text_1");
  assert.equal(response.model, "gpt-4o-mini");
  assert.equal(response.outputText, "请告诉我截止时间。");
  assert.equal(response.structuredOutput, undefined);
  assert.equal(requests.length, 1);
  assert.equal(requests[0]?.url, "https://api.aihubmix.com/v1/chat/completions");
  assert.equal(requests[0]?.body.model, "gpt-4o-mini");
});

test("provider client returns structured output when schema is provided", async () => {
  const client = createOpenAICompatibleProviderClient(async () => {
    return new Response(
      JSON.stringify({
        id: "chatcmpl_structured_1",
        choices: [
          {
            message: {
              role: "assistant",
              content: JSON.stringify({
                assistantMessage: "今晚整理周报，明早准备汇报。",
                title: "周报与汇报安排",
                summary: "先写周报，再准备汇报。",
                tasks: [{ title: "整理周报" }],
                proposedBlocks: [],
                readyToConfirm: false,
              }),
            },
          },
        ],
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  });

  const response = await client.chatCompletion({
    baseUrl: "https://api.aihubmix.com/v1",
    apiKey: "secret-key",
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: "今晚整理周报，明早开会" }],
    structuredOutput: {
      schema: z.object({
        assistantMessage: z.string(),
        title: z.string(),
        summary: z.string(),
        tasks: z.array(z.object({ title: z.string() })),
        proposedBlocks: z.array(z.object({}).catchall(z.unknown())),
        readyToConfirm: z.boolean(),
      }),
      name: "arrange_conversation_reply",
    },
  });

  assert.equal(response.id, "chatcmpl_structured_1");
  assert.equal(response.outputText.includes("今晚整理周报"), true);
  assert.deepEqual(response.structuredOutput, {
    assistantMessage: "今晚整理周报，明早准备汇报。",
    title: "周报与汇报安排",
    summary: "先写周报，再准备汇报。",
    tasks: [{ title: "整理周报" }],
    proposedBlocks: [],
    readyToConfirm: false,
  });
});
