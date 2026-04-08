import assert from "node:assert/strict";
import test from "node:test";

import { buildHomePage, openArrangeSheet, refreshHomePage } from "../pages/home/index.ts";
import { createArrangeFlow } from "../components/arrange-sheet/index.ts";

test("mini program smoke covers tabs, arrange entry, and refresh wiring", async () => {
  const home = buildHomePage();

  assert.deepEqual(
    home.tabs.map((tab) => tab.label),
    ["日程", "任务看板"],
  );
  assert.equal(home.primaryActionText, "安排任务");

  const flow = createArrangeFlow({
    apiClient: {
      async intakeTask() {
        return {
          task: { id: "task-1", status: "schedulable" },
          clarificationSession: { id: "session-1" },
          missingFields: [],
          nextQuestion: null,
        } as never;
      },
      async replyClarification() {
        return {
          task: { id: "task-1", status: "schedulable" },
          clarificationSession: { id: "session-1" },
          missingFields: [],
          nextQuestion: null,
        } as never;
      },
      async proposeSchedule() {
        return {
          orderedTaskIds: ["task-1"],
          blocks: [
            {
              id: "block-1",
              taskId: "task-1",
              title: "论文初稿",
              startAt: "2026-04-08T09:00:00.000Z",
              endAt: "2026-04-08T11:00:00.000Z",
              durationMinutes: 120,
              status: "confirmed",
            },
          ],
        } as never;
      },
      async confirmSchedule() {
        return {
          orderedTaskIds: ["task-1"],
          blocks: [
            {
              id: "block-1",
              taskId: "task-1",
              title: "论文初稿",
              startAt: "2026-04-08T09:00:00.000Z",
              endAt: "2026-04-08T11:00:00.000Z",
              durationMinutes: 120,
              status: "confirmed",
            },
          ],
        } as never;
      },
      async generateReminders() {
        return {};
      },
    },
    home: {
      refresh: (blocks) => refreshHomePage(home, blocks),
    },
  });

  await flow.submitRawText("周五前交论文初稿");
  await flow.propose();

  const refreshed = openArrangeSheet(home);
  assert.equal(refreshed.tasks[0]?.status, "scheduled");
  assert.equal(refreshed.arrangeSheet.title, "安排任务");
  assert.equal(refreshed.arrangeSheet.history[0]?.title.includes("论文初稿"), true);
});
