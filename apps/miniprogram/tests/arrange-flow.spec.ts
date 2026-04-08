import assert from "node:assert/strict";
import test from "node:test";

import { createArrangeFlow } from "../components/arrange-sheet/index.ts";
import { buildHomePage, refreshHomePage } from "../pages/home/index.ts";
import { createMiniProgramApiClient } from "../services/api.ts";

test("arrange flow submits intake, clarifies missing fields, schedules, confirms, and refreshes home", async () => {
  const calls: string[] = [];
  const apiClient = createMiniProgramApiClient({
    baseUrl: "https://api.tangxie.test",
    fetchImpl: async (input, init) => {
      const url = String(input);
      calls.push(`${init?.method ?? "GET"} ${new URL(url).pathname}`);

      if (url.endsWith("/tasks/intake")) {
        return new Response(
          JSON.stringify({
            task: { id: "task_1", status: "needs_info" },
            clarificationSession: { id: "session_1", status: "active" },
            missingFields: ["estimatedDurationMinutes"],
            nextQuestion: "这个任务大概需要多久完成？",
          }),
          { status: 201, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url.endsWith("/clarification/reply")) {
        return new Response(
          JSON.stringify({
            task: { id: "task_1", status: "schedulable" },
            clarificationSession: { id: "session_1", status: "resolved" },
            missingFields: [],
            nextQuestion: null,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url.endsWith("/scheduling/propose")) {
        return new Response(
          JSON.stringify({
            orderedTaskIds: ["task_1"],
            blocks: [
              {
                id: "block_1",
                taskId: "task_1",
                title: "论文初稿",
                startAt: "2026-04-08T09:00:00.000Z",
                endAt: "2026-04-08T11:00:00.000Z",
                durationMinutes: 120,
                status: "proposed",
              },
            ],
          }),
          { status: 201, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url.endsWith("/scheduling/confirm")) {
        return new Response(
          JSON.stringify({
            orderedTaskIds: ["task_1"],
            blocks: [
              {
                id: "block_1",
                taskId: "task_1",
                title: "论文初稿",
                startAt: "2026-04-08T09:00:00.000Z",
                endAt: "2026-04-08T11:00:00.000Z",
                durationMinutes: 120,
                status: "confirmed",
              },
            ],
          }),
          { status: 201, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url.endsWith("/reminders/generate")) {
        return new Response(
          JSON.stringify({
            reminders: [{ id: "reminder_1", reminderType: "start" }],
            summary: { totalCount: 1 },
          }),
          { status: 201, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url.endsWith("/reminders/daily-summary")) {
        return new Response(JSON.stringify({ totalCount: 1, items: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ message: "Unexpected request" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    },
  });

  const home = buildHomePage();
  const flow = createArrangeFlow({
    apiClient,
    home,
  });

  const afterIntake = await flow.submitRawText("周五前交论文初稿");
  assert.equal(afterIntake.stage, "clarifying");
  assert.equal(afterIntake.nextQuestion, "这个任务大概需要多久完成？");
  assert.deepEqual(calls[0], "POST /tasks/intake");

  const afterClarification = await flow.reply("2小时");
  assert.equal(afterClarification.stage, "ready_to_schedule");
  assert.equal(afterClarification.taskStatus, "schedulable");
  assert.deepEqual(calls[1], "POST /clarification/reply");

  const afterPropose = await flow.propose();
  assert.equal(afterPropose.stage, "confirmed");
  assert.equal(afterPropose.confirmedBlocks[0]?.status, "confirmed");
  assert.deepEqual(calls[2], "POST /scheduling/propose");
  assert.deepEqual(calls[3], "POST /scheduling/confirm");
  assert.deepEqual(calls[4], "POST /reminders/generate");

  const refreshed = refreshHomePage(home, afterPropose.confirmedBlocks);
  assert.equal(refreshed.tasks[0]?.status, "scheduled");
  assert.equal(refreshed.arrangeSheet.history[0]?.title.includes("论文初稿"), true);
});
