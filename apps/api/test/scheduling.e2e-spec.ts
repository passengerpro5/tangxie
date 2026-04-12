import assert from "node:assert/strict";
import test from "node:test";

import { createAppHandler } from "../src/app.module.ts";
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

async function invokeApp(handler: ReturnType<typeof createAppHandler>, method: string, url: string, body?: unknown) {
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

test("confirmed schedule blocks can be updated and read back through task endpoints", async () => {
  const handler = createAppHandler({
    now: () => new Date("2026-04-12T00:00:00.000Z"),
  });

  const intakeRes = await invokeApp(handler, "POST", "/tasks/intake", {
    rawText: "2026-04-12 1小时 排期验证：编辑块",
  });

  assert.equal(intakeRes.statusCode, 201);
  assert.equal(intakeRes.body.task.status, "schedulable");

  const confirmRes = await invokeApp(handler, "POST", "/scheduling/confirm", {
    taskIds: [intakeRes.body.task.id],
  });

  assert.equal(confirmRes.statusCode, 201);
  assert.equal(confirmRes.body.blocks.length, 1);
  assert.equal(confirmRes.body.blocks[0].status, "confirmed");

  const blockId = confirmRes.body.blocks[0].id;
  const patchRes = await invokeApp(handler, "PATCH", `/tasks/${intakeRes.body.task.id}/schedule-blocks/${blockId}`, {
    startAt: "2026-04-12T03:00:00.000Z",
    endAt: "2026-04-12T04:00:00.000Z",
  });

  assert.equal(patchRes.statusCode, 200);
  assert.equal(patchRes.body.task.id, intakeRes.body.task.id);
  assert.equal(patchRes.body.scheduleBlocks.length, 1);
  assert.equal(patchRes.body.scheduleBlocks[0].id, blockId);
  assert.equal(patchRes.body.scheduleBlocks[0].startAt, "2026-04-12T03:00:00.000Z");
  assert.equal(patchRes.body.scheduleBlocks[0].endAt, "2026-04-12T04:00:00.000Z");

  const tasksRes = await invokeApp(handler, "GET", "/tasks");
  assert.equal(tasksRes.statusCode, 200);
  assert.equal(tasksRes.body.items.length, 1);
  assert.equal(tasksRes.body.items[0].scheduleBlocks.length, 1);
  assert.equal(tasksRes.body.items[0].scheduleBlocks[0].startAt, "2026-04-12T03:00:00.000Z");
  assert.equal(tasksRes.body.items[0].scheduleBlocks[0].endAt, "2026-04-12T04:00:00.000Z");

  const detailRes = await invokeApp(handler, "GET", `/tasks/${intakeRes.body.task.id}`);
  assert.equal(detailRes.statusCode, 200);
  assert.equal(detailRes.body.scheduleBlocks.length, 1);
  assert.equal(detailRes.body.scheduleBlocks[0].startAt, "2026-04-12T03:00:00.000Z");
  assert.equal(detailRes.body.scheduleBlocks[0].endAt, "2026-04-12T04:00:00.000Z");
});

test("confirmed schedule block updates reject overlaps with existing blocks", async () => {
  const handler = createAppHandler({
    now: () => new Date("2026-04-12T00:00:00.000Z"),
  });

  const firstIntake = await invokeApp(handler, "POST", "/tasks/intake", {
    rawText: "2026-04-12 1小时 排期验证：第一个块",
  });
  const secondIntake = await invokeApp(handler, "POST", "/tasks/intake", {
    rawText: "2026-04-12 1小时 排期验证：第二个块",
  });

  const confirmRes = await invokeApp(handler, "POST", "/scheduling/confirm", {
    taskIds: [firstIntake.body.task.id, secondIntake.body.task.id],
  });

  assert.equal(confirmRes.statusCode, 201);
  assert.equal(confirmRes.body.blocks.length, 2);

  const firstBlockId = confirmRes.body.blocks[0].id;
  const secondBlock = confirmRes.body.blocks[1];

  const patchRes = await invokeApp(
    handler,
    "PATCH",
    `/tasks/${firstIntake.body.task.id}/schedule-blocks/${firstBlockId}`,
    {
      startAt: secondBlock.startAt,
      endAt: secondBlock.endAt,
    },
  );

  assert.equal(patchRes.statusCode, 400);
  assert.equal(patchRes.body.message, "Updated schedule block overlaps an existing confirmed block");
});
