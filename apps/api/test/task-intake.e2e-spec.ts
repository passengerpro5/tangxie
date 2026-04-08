import assert from "node:assert/strict";
import test from "node:test";

import { createClarificationHandler } from "../src/modules/clarification/clarification.controller.ts";
import { ClarificationService } from "../src/modules/clarification/clarification.service.ts";
import { createTasksHandler } from "../src/modules/tasks/tasks.controller.ts";
import { TasksService } from "../src/modules/tasks/tasks.service.ts";

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

  return {
    response: res,
    state,
  };
}

async function invoke(
  handler: ReturnType<typeof createTasksHandler> | ReturnType<typeof createClarificationHandler>,
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

test("task intake creates a draft, source record, and follow-up question", async () => {
  const now = () => new Date("2026-04-08T09:00:00+08:00");
  const tasksService = new TasksService({ now });
  const clarificationService = new ClarificationService(tasksService);
  const tasksHandler = createTasksHandler(tasksService);
  const clarificationHandler = createClarificationHandler(clarificationService);

  const intakeRes = await invoke(tasksHandler, "POST", "/tasks/intake", {
    rawText: "周五前写完论文初稿",
  });

  assert.equal(intakeRes.statusCode, 201);
  assert.equal(intakeRes.body.task.status, "needs_info");
  assert.equal(intakeRes.body.task.title, "周五前写完论文初稿");
  assert.equal(intakeRes.body.task.deadlineAt, "2026-04-10T18:00:00.000Z");
  assert.equal(intakeRes.body.source.sourceType, "text");
  assert.equal(intakeRes.body.source.rawText, "周五前写完论文初稿");
  assert.deepEqual(intakeRes.body.missingFields, ["estimatedDurationMinutes"]);
  assert.match(intakeRes.body.nextQuestion, /多久完成/);
  assert.equal(intakeRes.body.clarificationSession.currentMissingFields[0], "estimatedDurationMinutes");

  const sessionId = intakeRes.body.clarificationSession.id;
  const replyRes = await invoke(clarificationHandler, "POST", "/clarification/reply", {
    sessionId,
    answerText: "大概 2 小时",
  });

  assert.equal(replyRes.statusCode, 200);
  assert.equal(replyRes.body.task.status, "schedulable");
  assert.equal(replyRes.body.task.estimatedDurationMinutes, 120);
  assert.deepEqual(replyRes.body.missingFields, []);
  assert.equal(replyRes.body.nextQuestion, null);
  assert.equal(replyRes.body.clarificationSession.status, "resolved");
  assert.equal(replyRes.body.clarificationSession.messages.at(-1).role, "assistant");
});

test("clarification reply returns 404 for missing session", async () => {
  const tasksService = new TasksService({
    now: () => new Date("2026-04-08T09:00:00+08:00"),
  });
  const clarificationHandler = createClarificationHandler(new ClarificationService(tasksService));

  const res = await invoke(clarificationHandler, "POST", "/clarification/reply", {
    sessionId: "missing",
    answerText: "ping",
  });

  assert.equal(res.statusCode, 404);
  assert.equal(res.body.message, "Clarification session not found");
});

