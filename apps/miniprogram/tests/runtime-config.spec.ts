import assert from "node:assert/strict";
import test from "node:test";

import { createMiniProgramApiClient } from "../services/api.ts";
import {
  DEFAULT_MINIPROGRAM_API_BASE_URL,
  resolveMiniProgramRuntimeConfig,
} from "../config/runtime.ts";
import { createWeChatRequestTransport } from "../services/wechat-request.ts";

test("runtime config defaults to the local API base URL", () => {
  const config = resolveMiniProgramRuntimeConfig();

  assert.equal(config.apiBaseUrl, DEFAULT_MINIPROGRAM_API_BASE_URL);
});

test("runtime config allows overriding the API base URL", () => {
  const config = resolveMiniProgramRuntimeConfig({
    apiBaseUrl: "https://api.example.test",
  });

  assert.equal(config.apiBaseUrl, "https://api.example.test");
});

test("runtime config reads the api base URL override from WeChat storage", () => {
  const previousWx = (globalThis as typeof globalThis & {
    wx?: {
      getStorageSync?: (key: string) => unknown;
    };
  }).wx;

  (globalThis as typeof globalThis & {
    wx?: {
      getStorageSync?: (key: string) => unknown;
    };
  }).wx = {
    getStorageSync(key: string) {
      assert.equal(key, "TANGXIE_RUNTIME_API_BASE_URL");
      return "https://api.storage.test";
    },
  };

  try {
    const config = resolveMiniProgramRuntimeConfig();
    assert.equal(config.apiBaseUrl, "https://api.storage.test");
  } finally {
    (globalThis as typeof globalThis & {
      wx?: {
        getStorageSync?: (key: string) => unknown;
      };
    }).wx = previousWx;
  }
});

test("wechat request transport powers the api client without fetch or Response globals", async () => {
  const calls: Array<{
    url: string;
    method: string;
    data: unknown;
    header: Record<string, string> | undefined;
  }> = [];
  const previousResponse = (globalThis as typeof globalThis & { Response?: typeof Response }).Response;
  delete (globalThis as typeof globalThis & { Response?: typeof Response }).Response;

  try {
    const transport = createWeChatRequestTransport({
      request(options) {
        calls.push({
          url: options.url,
          method: options.method,
          data: options.data,
          header: options.header,
        });

        options.success({
          statusCode: 200,
          data: JSON.stringify({
            task: { id: "task_1", status: "needs_info" },
            clarificationSession: { id: "session_1", status: "active" },
            missingFields: [],
            nextQuestion: null,
          }),
        } as never);
      },
    });

    const client = createMiniProgramApiClient({
      baseUrl: "http://127.0.0.1:3000",
      transport,
    });

    const response = await client.intakeTask({ rawText: "周五前交论文初稿" });

    assert.equal(response.task.id, "task_1");
    assert.equal(calls[0]?.url, "http://127.0.0.1:3000/tasks/intake");
    assert.equal(calls[0]?.method, "POST");
    assert.equal(typeof calls[0]?.data, "string");
  } finally {
    (globalThis as typeof globalThis & { Response?: typeof Response }).Response = previousResponse;
  }
});
