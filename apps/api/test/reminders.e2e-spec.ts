import assert from "node:assert/strict";
import test from "node:test";

import { createRemindersHandler } from "../src/modules/reminders/reminders.controller.ts";
import { RemindersService } from "../src/modules/reminders/reminders.service.ts";

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
  handler: ReturnType<typeof createRemindersHandler>,
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

test("reminders are generated only from confirmed schedule blocks", async () => {
  const service = new RemindersService({
    now: () => new Date("2026-04-08T09:00:00.000Z"),
  });
  const handler = createRemindersHandler(service);

  const response = await invoke(handler, "POST", "/reminders/generate", {
    confirmedBlocks: [
      {
        id: "block-1",
        taskId: "task-1",
        title: "Final review",
        startAt: "2026-04-08T10:00:00.000Z",
        endAt: "2026-04-08T11:00:00.000Z",
        durationMinutes: 60,
        status: "confirmed",
      },
    ],
  });

  assert.equal(response.statusCode, 201);
  assert.equal(response.body.reminders.length, 2);
  assert.deepEqual(
    response.body.reminders.map((item: { reminderType: string }) => item.reminderType),
    ["start", "deadline"],
  );
  assert.equal(response.body.summary.totalCount, 2);
  assert.equal(response.body.summary.startCount, 1);
  assert.equal(response.body.summary.deadlineCount, 1);
});

test("daily summary returns reminders for the requested date", async () => {
  const service = new RemindersService({
    now: () => new Date("2026-04-08T09:00:00.000Z"),
  });
  const handler = createRemindersHandler(service);

  await invoke(handler, "POST", "/reminders/generate", {
    confirmedBlocks: [
      {
        id: "block-2",
        taskId: "task-2",
        title: "Write outline",
        startAt: "2026-04-08T14:00:00.000Z",
        endAt: "2026-04-08T15:00:00.000Z",
        durationMinutes: 60,
        status: "confirmed",
      },
    ],
  });

  const summaryRes = await invoke(handler, "GET", "/reminders/daily-summary?date=2026-04-08");

  assert.equal(summaryRes.statusCode, 200);
  assert.equal(summaryRes.body.date, "2026-04-08");
  assert.equal(summaryRes.body.totalCount, 2);
  assert.equal(summaryRes.body.items[0].blockId, "block-2");
});

test("rejects non-confirmed blocks", async () => {
  const service = new RemindersService();

  await assert.rejects(
    () =>
      service.generateFromConfirmedBlocks({
        confirmedBlocks: [
          {
            id: "block-draft",
            taskId: "task-draft",
            title: "Draft block",
            startAt: new Date("2026-04-08T10:00:00.000Z"),
            endAt: new Date("2026-04-08T11:00:00.000Z"),
            durationMinutes: 60,
            status: "draft",
          } as never,
        ],
      }),
    /Only confirmed schedule blocks can generate reminders/,
  );
});
