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

  return {
    response: res,
    state,
  };
}

async function invokeApp(
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

test("daily recap exposes today's review draft and accepts structured review input", async () => {
  const handler = createAppHandler({
    now: () => new Date("2026-04-13T12:00:00.000Z"),
  });

  const today = await invokeApp(handler, "GET", "/daily-recaps/today");
  assert.equal(today.statusCode, 200);
  assert.equal(typeof today.body.dateKey, "string");
  assert.equal(Array.isArray(today.body.tasks), true);
  assert.equal(today.body.scorecard, null);

  const review = await invokeApp(handler, "POST", "/daily-recaps/today/review", {
    completedTaskIds: ["task_done"],
    pendingTasks: [
      {
        taskId: "task_later",
        progressState: "partial",
        action: "move_tomorrow",
      },
    ],
  });

  assert.equal(review.statusCode, 200);
  assert.equal(review.body.recap.status, "reviewed");
  assert.equal(review.body.recap.requiresScheduleConfirmation, true);
  assert.equal(review.body.recap.pendingChanges.length, 1);
});

test("confirming a daily recap marks completed tasks done, applies schedule changes, and returns a shareable scorecard", async () => {
  const handler = createAppHandler({
    now: () => new Date("2026-04-13T12:00:00.000Z"),
  });

  const firstTask = await invokeApp(handler, "POST", "/tasks/intake", {
    rawText: "2026-04-14 完成周报 1小时",
  });
  const secondTask = await invokeApp(handler, "POST", "/tasks/intake", {
    rawText: "2026-04-14 整理素材 30分钟",
  });

  const scheduled = await invokeApp(handler, "POST", "/scheduling/confirm", {
    taskIds: [firstTask.body.task.id, secondTask.body.task.id],
  });

  assert.equal(scheduled.statusCode, 201);
  assert.equal(scheduled.body.blocks.length, 2);

  const reviewed = await invokeApp(handler, "POST", "/daily-recaps/today/review", {
    completedTaskIds: [firstTask.body.task.id],
    pendingTasks: [
      {
        taskId: secondTask.body.task.id,
        progressState: "partial",
        action: "move_tomorrow",
      },
    ],
  });

  const confirmed = await invokeApp(handler, "POST", "/daily-recaps/today/confirm", {
    recapId: reviewed.body.recap.id,
    acceptScheduleChanges: true,
  });

  assert.equal(confirmed.statusCode, 200);
  assert.equal(typeof confirmed.body.scorecard.title, "string");
  assert.deepEqual(confirmed.body.scorecard.metrics.map((item: { id: string }) => item.id), [
    "focus_time",
    "streak_days",
    "closure",
  ]);
  assert.equal(
    confirmed.body.updatedTasks.some((task: { id: string; status: string }) => task.id === firstTask.body.task.id && task.status === "done"),
    true,
  );
  assert.equal(
    confirmed.body.updatedScheduleBlocks.some(
      (block: { taskId: string; startAt: string }) =>
        block.taskId === secondTask.body.task.id && block.startAt !== scheduled.body.blocks[1].startAt,
    ),
    true,
  );
});
