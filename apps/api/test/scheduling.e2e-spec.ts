import assert from "node:assert/strict";
import test from "node:test";

import { createSchedulingHandler } from "../src/modules/scheduling/scheduling.controller.ts";
import { SchedulingService } from "../src/modules/scheduling/scheduling.service.ts";

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

async function invoke(handler: ReturnType<typeof createSchedulingHandler>, method: string, url: string, body?: unknown) {
  const request = createRequest(method, url, body);
  const { response, state } = createResponse();
  await handler(request as never, response as never);

  return {
    statusCode: state.statusCode,
    headers: state.headers,
    body: state.bodyText ? JSON.parse(state.bodyText) : null,
  };
}

test("scheduling proposes blocks in priority order before deadlines", async () => {
  const now = () => new Date("2026-04-08T09:00:00.000Z");
  const service = new SchedulingService({ now });
  service.seedTasks([
    {
      id: "task-1",
      title: "Final review",
      deadlineAt: new Date("2026-04-08T13:00:00.000Z"),
      estimatedDurationMinutes: 60,
      priorityScore: 90,
      priorityRank: 1,
      userConfirmed: true,
      createdAt: new Date("2026-04-08T08:00:00.000Z"),
    },
    {
      id: "task-2",
      title: "Draft outline",
      deadlineAt: new Date("2026-04-08T15:00:00.000Z"),
      estimatedDurationMinutes: 120,
      priorityScore: 70,
      priorityRank: 2,
      userConfirmed: true,
      createdAt: new Date("2026-04-08T08:30:00.000Z"),
    },
  ]);

  const handler = createSchedulingHandler(service);
  const response = await invoke(handler, "POST", "/scheduling/propose", {
    taskIds: ["task-1", "task-2"],
  });

  assert.equal(response.statusCode, 201);
  assert.deepEqual(response.body.orderedTaskIds, ["task-1", "task-2"]);
  assert.equal(response.body.blocks.length, 2);
  assert.equal(response.body.blocks[0].taskId, "task-1");
  assert.equal(response.body.blocks[0].startAt, "2026-04-08T09:00:00.000Z");
  assert.equal(response.body.blocks[0].endAt, "2026-04-08T10:00:00.000Z");
  assert.equal(response.body.blocks[1].taskId, "task-2");
  assert.equal(response.body.blocks[1].startAt, "2026-04-08T10:00:00.000Z");
  assert.equal(response.body.blocks[1].endAt, "2026-04-08T12:00:00.000Z");
});

test("scheduling rejects tasks missing deadline or duration", async () => {
  const service = new SchedulingService({
    now: () => new Date("2026-04-08T09:00:00.000Z"),
  });
  service.seedTasks([
    {
      id: "task-missing",
      title: "Missing deadline",
      deadlineAt: null,
      estimatedDurationMinutes: 60,
      priorityScore: 50,
      priorityRank: null,
      userConfirmed: false,
      createdAt: new Date("2026-04-08T08:00:00.000Z"),
    },
  ]);

  const handler = createSchedulingHandler(service);
  const response = await invoke(handler, "POST", "/scheduling/propose", {
    taskIds: ["task-missing"],
  });

  assert.equal(response.statusCode, 422);
  assert.equal(response.body.reason, "missing-fields");
  assert.deepEqual(response.body.missingTaskIds, ["task-missing"]);
});

test("scheduling returns a failure when the work does not fit before the deadline", async () => {
  const service = new SchedulingService({
    now: () => new Date("2026-04-08T09:00:00.000Z"),
  });
  service.seedTasks([
    {
      id: "task-1",
      title: "Long task",
      deadlineAt: new Date("2026-04-08T10:00:00.000Z"),
      estimatedDurationMinutes: 90,
      priorityScore: 80,
      priorityRank: 1,
      userConfirmed: true,
      createdAt: new Date("2026-04-08T08:00:00.000Z"),
    },
  ]);

  const handler = createSchedulingHandler(service);
  const response = await invoke(handler, "POST", "/scheduling/propose", {
    taskIds: ["task-1"],
  });

  assert.equal(response.statusCode, 422);
  assert.equal(response.body.reason, "does-not-fit");
  assert.deepEqual(response.body.unscheduledTaskIds, ["task-1"]);
});
