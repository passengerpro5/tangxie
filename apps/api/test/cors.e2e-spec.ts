import assert from "node:assert/strict";
import test from "node:test";

import { createAppHandler } from "../src/app.module.ts";

function createRequest(method: string, url: string, origin = "http://127.0.0.1:4173") {
  return { method, url, headers: { origin } };
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
  handler: ReturnType<typeof createAppHandler>,
  method: string,
  url: string,
  origin?: string,
) {
  const request = createRequest(method, url, origin);
  const { response, state } = createResponse();
  await handler(request as never, response as never);

  return state;
}

test("app handler responds to browser CORS preflight and includes allow-origin on API responses", async () => {
  const handler = createAppHandler();

  const preflight = await invoke(handler, "OPTIONS", "/admin/ai/providers");
  assert.equal(preflight.statusCode, 204);
  assert.equal(preflight.headers["Access-Control-Allow-Origin"], "http://127.0.0.1:4173");

  const actual = await invoke(handler, "GET", "/health");
  assert.equal(actual.statusCode, 200);
  assert.equal(actual.headers["Access-Control-Allow-Origin"], "http://127.0.0.1:4173");

  const adminProviders = await invoke(handler, "GET", "/admin/ai/providers");
  assert.equal(adminProviders.statusCode, 200);
  assert.equal(adminProviders.headers["Access-Control-Allow-Origin"], "http://127.0.0.1:4173");

  const localhostOrigin = await invoke(handler, "GET", "/health", "http://localhost:4173");
  assert.equal(localhostOrigin.statusCode, 200);
  assert.equal(localhostOrigin.headers["Access-Control-Allow-Origin"], "http://localhost:4173");
});
