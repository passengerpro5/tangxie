import assert from "node:assert/strict";
import test from "node:test";

import { createAppHandler } from "../src/app.module.ts";

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

  handler(req as never, res as never);

  assert.equal(statusCode, 200);
  assert.equal(headers["Content-Type"], "application/json; charset=utf-8");
  assert.deepEqual(JSON.parse(bodyText), { ok: true });
});

test("GET /admin/ai/providers returns an empty list from the app handler", async () => {
  const handler = createAppHandler();
  const headers: Record<string, string> = {};
  let statusCode = 0;
  let bodyText = "";

  const req = {
    method: "GET",
    url: "/admin/ai/providers",
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
  assert.deepEqual(JSON.parse(bodyText), { items: [] });
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
