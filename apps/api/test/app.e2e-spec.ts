import assert from "node:assert/strict";
import test from "node:test";

import { createAppHandler } from "../src/app.module.ts";

function createResponse() {
  const state = {
    statusCode: 0,
    headers: {} as Record<string, string>,
    bodyText: "",
  };

  const res = {
    writeHead(code: number, nextHeaders: Record<string, string>) {
      state.statusCode = code;
      Object.assign(state.headers, nextHeaders);
      return res;
    },
    end(chunk: string) {
      state.bodyText = chunk;
    },
  };

  return { response: res, state };
}

async function invoke(
  handler: ReturnType<typeof createAppHandler>,
  method: string,
  url: string,
  body?: unknown,
) {
  const req = {
    method,
    url,
    body,
  };
  const { response, state } = createResponse();
  await handler(req as never, response as never);

  return {
    statusCode: state.statusCode,
    headers: state.headers,
    body: state.bodyText ? JSON.parse(state.bodyText) : null,
  };
}

test("GET /health returns ok", async () => {
  const handler = createAppHandler();
  const headers: Record<string, string> = {};
  let statusCode = 0;
  let bodyText = "";

  const req = {
    method: "GET",
    url: "/health",
  };

  const res = {
    writeHead(code: number, nextHeaders: Record<string, string>) {
      statusCode = code;
      Object.assign(headers, nextHeaders);
      return res;
    },
    end(chunk: string) {
      bodyText = chunk;
    },
  };

  await handler(req as never, res as never);

  assert.equal(statusCode, 200);
  assert.equal(headers["Content-Type"], "application/json; charset=utf-8");
  assert.deepEqual(JSON.parse(bodyText), { ok: true });
});

test("app handler bootstraps default arrange-chat config for in-memory local development", async () => {
  const previousDatabaseUrl = process.env.DATABASE_URL;
  const previousDefaultApiKey = process.env.AI_DEFAULT_API_KEY;

  delete process.env.DATABASE_URL;
  process.env.AI_DEFAULT_API_KEY = "seed-key";

  try {
    const handler = createAppHandler();
    const providers = await invoke(handler, "GET", "/admin/ai/providers");
    const models = await invoke(handler, "GET", "/admin/ai/models");
    const prompts = await invoke(handler, "GET", "/admin/ai/prompts");

    assert.equal(providers.statusCode, 200);
    assert.equal(providers.body.items.length, 1);
    assert.equal(providers.body.items[0].name, "aihubmix");
    assert.equal(providers.body.items[0].baseUrl, "https://api.aihubmix.com/v1");
    assert.equal(providers.body.items[0].defaultModel, "gpt-4o-mini");
    assert.equal(providers.body.items[0].hasApiKeyConfigured, true);

    assert.equal(models.statusCode, 200);
    assert.equal(models.body.items.length, 1);
    assert.equal(models.body.items[0].scene, "arrange_chat");
    assert.equal(models.body.items[0].isDefault, true);

    assert.equal(prompts.statusCode, 200);
    assert.equal(prompts.body.items.length, 1);
    assert.equal(prompts.body.items[0].scene, "arrange_chat");
    assert.equal(prompts.body.items[0].isActive, true);
  } finally {
    if (previousDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = previousDatabaseUrl;
    }

    if (previousDefaultApiKey === undefined) {
      delete process.env.AI_DEFAULT_API_KEY;
    } else {
      process.env.AI_DEFAULT_API_KEY = previousDefaultApiKey;
    }
  }
});

test("arrange chat returns an explicit missing api key error before calling the provider", async () => {
  const previousDatabaseUrl = process.env.DATABASE_URL;
  const previousDefaultApiKey = process.env.AI_DEFAULT_API_KEY;

  delete process.env.DATABASE_URL;
  delete process.env.AI_DEFAULT_API_KEY;

  try {
    let providerCalls = 0;
    const handler = createAppHandler({
      providerClient: {
        async chatCompletion() {
          providerCalls += 1;
          throw new Error("provider should not be called without an api key");
        },
      },
    });

    const created = await invoke(handler, "POST", "/arrange/conversations");
    const replied = await invoke(
      handler,
      "POST",
      `/arrange/conversations/${created.body.conversation.id}/messages`,
      { content: "周五前交论文初稿" },
    );

    assert.equal(replied.statusCode, 400);
    assert.equal(replied.body.message, "No API key configured for provider: aihubmix");
    assert.equal(providerCalls, 0);
  } finally {
    if (previousDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = previousDatabaseUrl;
    }

    if (previousDefaultApiKey === undefined) {
      delete process.env.AI_DEFAULT_API_KEY;
    } else {
      process.env.AI_DEFAULT_API_KEY = previousDefaultApiKey;
    }
  }
});

test("app handler passes the injected clock into admin-ai in-memory persistence", async () => {
  const fixedNow = new Date("2026-04-08T12:34:56.000Z");
  const handler = createAppHandler({
    now: () => fixedNow,
  });
  const headers: Record<string, string> = {};
  let statusCode = 0;
  let bodyText = "";

  const req = {
    method: "POST",
    url: "/admin/ai/providers",
    body: {
      name: "ClockTest",
      providerType: "openai_compatible",
      baseUrl: "https://example.com/v1",
      apiKey: "secret-key",
      defaultModel: "gpt-4o-mini",
      enabled: true,
    },
  };

  const res = {
    writeHead(code: number, nextHeaders: Record<string, string>) {
      statusCode = code;
      Object.assign(headers, nextHeaders);
      return res;
    },
    end(chunk: string) {
      bodyText = chunk;
    },
  };

  await handler(req as never, res as never);

  const body = JSON.parse(bodyText);
  assert.equal(statusCode, 201);
  assert.equal(headers["Content-Type"], "application/json; charset=utf-8");
  assert.equal(body.createdAt, fixedNow.toISOString());
  assert.equal(body.updatedAt, fixedNow.toISOString());
});
