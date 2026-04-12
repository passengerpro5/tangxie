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

const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);

test(
  "daily recap persistence stores one record per dateKey and increments streak across consecutive days",
  { skip: !hasDatabaseUrl },
  async () => {
    const prisma = getPrismaClient();
    await prisma.dailyRecap.deleteMany();

    const firstHandler = createAppHandler({
      now: () => new Date("2026-04-13T12:00:00.000Z"),
    });

    const firstDraft = await invokeApp(firstHandler, "POST", "/daily-recaps/today/review", {
      completedTaskIds: [],
      pendingTasks: [],
    });
    const first = await invokeApp(firstHandler, "POST", "/daily-recaps/today/confirm", {
      recapId: firstDraft.body.recap.id,
      acceptScheduleChanges: true,
    });

    const secondHandler = createAppHandler({
      now: () => new Date("2026-04-14T12:00:00.000Z"),
    });

    const secondDraft = await invokeApp(secondHandler, "POST", "/daily-recaps/today/review", {
      completedTaskIds: [],
      pendingTasks: [],
    });
    const second = await invokeApp(secondHandler, "POST", "/daily-recaps/today/confirm", {
      recapId: secondDraft.body.recap.id,
      acceptScheduleChanges: true,
    });

    assert.equal(
      first.body.scorecard.metrics.find((item: { id: string }) => item.id === "streak_days").value,
      "1 天",
    );
    assert.equal(
      second.body.scorecard.metrics.find((item: { id: string }) => item.id === "streak_days").value,
      "2 天",
    );

    const records = await prisma.dailyRecap.findMany({
      orderBy: { dateKey: "asc" },
    });

    assert.equal(records.length, 2);
    assert.deepEqual(
      records.map((record) => record.dateKey),
      ["2026-04-13", "2026-04-14"],
    );
    assert.equal(records[0].status, "confirmed");
    assert.equal(records[1].status, "confirmed");
    assert.equal(records[0].streakCount, 1);
    assert.equal(records[1].streakCount, 2);
    assert.equal(records[0].confirmedAt instanceof Date, true);
    assert.equal(records[1].confirmedAt instanceof Date, true);
    assert.notEqual(records[0].scorecard, null);
    assert.notEqual(records[1].scorecard, null);
    assert.equal(first.body.recap.status, "confirmed");
    assert.equal(second.body.recap.status, "confirmed");

    const today = await invokeApp(secondHandler, "GET", "/daily-recaps/today");
    assert.equal(today.statusCode, 200);
    assert.equal(today.body.status, "confirmed");
    assert.equal(today.body.scorecard.title, second.body.scorecard.title);
  },
);
