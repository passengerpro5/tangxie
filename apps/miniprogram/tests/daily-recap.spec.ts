import assert from "node:assert/strict";
import test from "node:test";

import { createDailyRecapScorecardModel } from "../pages/home/daily-recap.ts";
import { createMiniProgramApiClient } from "../services/api.ts";

test("daily recap helper formats scorecard tags and share copy for the home page", () => {
  const model = createDailyRecapScorecardModel({
    title: "今日截止线驯兽师",
    metrics: [
      { id: "focus_time", label: "推进", value: "3h" },
      { id: "streak_days", label: "连续收工", value: "5 天" },
      { id: "closure", label: "收尾力", value: "尾巴已收好" },
    ],
    summary: "今天推进得很稳，尾巴也收住了。",
  });

  assert.equal(model.tagline, "推进 3h · 连续收工 5 天 · 尾巴已收好");
  assert.equal(model.shareTitle, "今日截止线驯兽师｜推进 3h");
  assert.equal(model.shareSubtitle, "今天推进得很稳，尾巴也收住了。");
});

test("api client exposes daily recap endpoints", async () => {
  const calls: Array<{ url: string; method: string; body: string | undefined }> = [];
  const client = createMiniProgramApiClient({
    baseUrl: "https://api.tangxie.test",
    fetchImpl: async (input, init) => {
      calls.push({
        url: String(input),
        method: init?.method ?? "GET",
        body: typeof init?.body === "string" ? init.body : undefined,
      });

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    },
  });

  assert.equal(typeof client.getTodayDailyRecap, "function");
  assert.equal(typeof client.reviewTodayDailyRecap, "function");
  assert.equal(typeof client.confirmTodayDailyRecap, "function");

  await client.getTodayDailyRecap();
  await client.reviewTodayDailyRecap({
    completedTaskIds: ["task_done"],
    pendingTasks: [
      {
        taskId: "task_later",
        progressState: "partial",
        action: "move_tomorrow",
      },
    ],
  });
  await client.confirmTodayDailyRecap({
    recapId: "recap_1",
    acceptScheduleChanges: true,
  });

  assert.deepEqual(
    calls.map((call) => [call.method, new URL(call.url).pathname]),
    [
      ["GET", "/daily-recaps/today"],
      ["POST", "/daily-recaps/today/review"],
      ["POST", "/daily-recaps/today/confirm"],
    ],
  );
  assert.equal(calls[1]?.body?.includes("task_done"), true);
  assert.equal(calls[2]?.body?.includes("recap_1"), true);
});
