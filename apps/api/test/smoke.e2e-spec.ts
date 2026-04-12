import assert from "node:assert/strict";
import test from "node:test";

import { createAppHandler } from "../src/app.module.ts";

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

async function invoke(method: string, url: string, body?: unknown) {
  const handler = createAppHandler();
  const request = createRequest(method, url, body);
  const { response, state } = createResponse();
  await handler(request as never, response as never);

  return {
    statusCode: state.statusCode,
    headers: state.headers,
    body: state.bodyText ? JSON.parse(state.bodyText) : null,
  };
}

test("api smoke covers the lifecycle surfaces", async () => {
  const handler = createAppHandler();

  const health = await invokeWithHandler(handler, "GET", "/health");
  assert.equal(health.statusCode, 200);
  assert.deepEqual(health.body, { ok: true });

  const dailyRecap = await invokeWithHandler(handler, "GET", "/daily-recaps/today");
  assert.equal(dailyRecap.statusCode, 200);
  assert.equal(typeof dailyRecap.body.dateKey, "string");

  const intake = await invokeWithHandler(handler, "POST", "/tasks/intake", {
    rawText: "周五前交论文初稿，预计 2 小时完成",
  });
  assert.equal(intake.statusCode, 201);
  assert.equal(intake.body.task.status, "schedulable");

  const propose = await invokeWithHandler(handler, "POST", "/scheduling/propose", {
    taskIds: [intake.body.task.id],
  });
  assert.equal(propose.statusCode, 201);
  assert.equal(propose.body.blocks.length, 1);

  const confirm = await invokeWithHandler(handler, "POST", "/scheduling/confirm", {
    taskIds: [intake.body.task.id],
  });
  assert.equal(confirm.statusCode, 201);
  assert.equal(confirm.body.blocks[0].status, "confirmed");

  const reminders = await invokeWithHandler(handler, "POST", "/reminders/generate", {});
  assert.equal(reminders.statusCode, 201);
  assert.equal(reminders.body.reminders.length >= 2, true);
});

async function invokeWithHandler(handler: ReturnType<typeof createAppHandler>, method: string, url: string, body?: unknown) {
  const request = createRequest(method, url, body);
  const { response, state } = createResponse();
  await handler(request as never, response as never);

  return {
    statusCode: state.statusCode,
    headers: state.headers,
    body: state.bodyText ? JSON.parse(state.bodyText) : null,
  };
}
