import assert from "node:assert/strict";
import test from "node:test";

import { createAppHandler } from "../src/app.module.ts";
import { createClarificationHandler } from "../src/modules/clarification/clarification.controller.ts";
import { ClarificationService } from "../src/modules/clarification/clarification.service.ts";
import { createTasksHandler } from "../src/modules/tasks/tasks.controller.ts";
import { TasksService } from "../src/modules/tasks/tasks.service.ts";
import { getPrismaClient } from "../src/persistence/prisma-client.ts";
import { PrismaTasksRepository } from "../src/persistence/prisma-tasks-repository.ts";

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
  handler:
    | ReturnType<typeof createTasksHandler>
    | ReturnType<typeof createClarificationHandler>
    | ReturnType<typeof createAppHandler>,
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
  "prisma tasks repository persists intake and clarification reply",
  { skip: !hasDatabaseUrl },
  async () => {
    const prisma = getPrismaClient();
    const suffix = Date.now().toString(36);
    const rawText = `周五前写完论文初稿 ${suffix}`;

    const repository = new PrismaTasksRepository(prisma);
    const tasksHandler = createTasksHandler(new TasksService({ repository }));
    const clarificationHandler = createClarificationHandler(
      new ClarificationService(new TasksService({ repository })),
    );

    const intakeRes = await invoke(tasksHandler, "POST", "/tasks/intake", {
      rawText,
    });

    assert.equal(intakeRes.statusCode, 201);
    assert.equal(intakeRes.body.task.status, "needs_info");
    assert.equal(intakeRes.body.clarificationSession.currentMissingFields[0], "estimatedDurationMinutes");

    const replyRes = await invoke(clarificationHandler, "POST", "/clarification/reply", {
      sessionId: intakeRes.body.clarificationSession.id,
      answerText: "大概 2 小时",
    });

    assert.equal(replyRes.statusCode, 200);
    assert.equal(replyRes.body.task.status, "schedulable");
    assert.equal(replyRes.body.clarificationSession.status, "resolved");

    const persistedTask = await prisma.task.findUnique({
      where: { id: intakeRes.body.task.id },
    });
    const persistedSource = await prisma.taskInputSource.findFirst({
      where: { taskId: intakeRes.body.task.id },
    });
    const persistedSession = await prisma.clarificationSession.findUnique({
      where: { id: intakeRes.body.clarificationSession.id },
    });

    assert.equal(persistedTask?.status, "schedulable");
    assert.equal(persistedSource?.taskId, intakeRes.body.task.id);
    assert.equal(persistedSession?.status, "resolved");
  },
);

test(
  "app handler uses Prisma-backed tasks and clarification persistence across handler instances",
  { skip: !hasDatabaseUrl },
  async () => {
    const suffix = `${Date.now().toString(36)}-reply`;

    const firstHandler = createAppHandler();

    const intakeRes = await invoke(firstHandler, "POST", "/tasks/intake", {
      rawText: `周五前写完论文初稿 ${suffix}`,
    });

    assert.equal(intakeRes.statusCode, 201);

    const secondHandler = createAppHandler();

    const replyRes = await invoke(secondHandler, "POST", "/clarification/reply", {
      sessionId: intakeRes.body.clarificationSession.id,
      answerText: "大概 2 小时",
    });

    assert.equal(replyRes.statusCode, 200);
    assert.equal(replyRes.body.task.status, "schedulable");

    const getSessionRes = await invoke(
      secondHandler,
      "GET",
      `/clarification/sessions/${intakeRes.body.clarificationSession.id}`,
    );

    assert.equal(getSessionRes.statusCode, 200);
    assert.equal(getSessionRes.body.clarificationSession.status, "resolved");
    assert.equal(getSessionRes.body.clarificationSession.nextQuestion, null);
  },
);
