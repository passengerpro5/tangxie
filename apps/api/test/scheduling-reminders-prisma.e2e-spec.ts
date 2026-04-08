import assert from "node:assert/strict";
import test from "node:test";

import { createAppHandler } from "../src/app.module.ts";
import { getPrismaClient } from "../src/persistence/prisma-client.ts";

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
  handler: ReturnType<typeof createAppHandler>,
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
  "app handler persists scheduling confirmations and reminder generation across handler instances",
  { skip: !hasDatabaseUrl },
  async () => {
    const prisma = getPrismaClient();
    const suffix = Date.now().toString(36);

    await prisma.reminder.deleteMany();
    await prisma.scheduleBlock.deleteMany();
    await prisma.clarificationSession.deleteMany();
    await prisma.taskInputSource.deleteMany();
    await prisma.task.deleteMany();

    const firstHandler = createAppHandler();

    const intakeRes = await invoke(firstHandler, "POST", "/tasks/intake", {
      rawText: `周五前交论文初稿，预计 2 小时完成 ${suffix}`,
    });
    assert.equal(intakeRes.statusCode, 201);

    const confirmRes = await invoke(firstHandler, "POST", "/scheduling/confirm", {
      taskIds: [intakeRes.body.task.id],
    });
    assert.equal(confirmRes.statusCode, 201);
    assert.equal(confirmRes.body.blocks.length, 1);

    const secondHandler = createAppHandler();

    const remindersRes = await invoke(secondHandler, "POST", "/reminders/generate", {});
    assert.equal(remindersRes.statusCode, 201);
    assert.equal(remindersRes.body.reminders.length, 2);
    assert.equal(remindersRes.body.reminders[0].taskId, intakeRes.body.task.id);

    const listRes = await invoke(secondHandler, "GET", "/reminders");
    assert.equal(listRes.statusCode, 200);
    assert.equal(
      listRes.body.items.filter((item: { taskId: string }) => item.taskId === intakeRes.body.task.id).length,
      2,
    );

    const summaryRes = await invoke(
      createAppHandler(),
      "GET",
      `/reminders/daily-summary?date=${confirmRes.body.blocks[0].startAt.slice(0, 10)}`,
    );
    assert.equal(summaryRes.statusCode, 200);
    assert.equal(
      summaryRes.body.items.filter((item: { taskId: string }) => item.taskId === intakeRes.body.task.id).length,
      2,
    );

    const scheduleBlockCount = await prisma.scheduleBlock.count({
      where: { taskId: intakeRes.body.task.id },
    });
    const reminderCount = await prisma.reminder.count({
      where: { taskId: intakeRes.body.task.id },
    });

    assert.equal(scheduleBlockCount, 1);
    assert.equal(reminderCount, 2);
  },
);
