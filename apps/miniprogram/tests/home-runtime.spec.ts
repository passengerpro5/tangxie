import assert from "node:assert/strict";
import test from "node:test";

import { createHomePageRuntime } from "../pages/home/runtime.ts";

test("home runtime exposes loading, error, and sheet state for the core flow", async () => {
  const runtime = createHomePageRuntime({
    apiClient: {
      async intakeTask() {
        return {
          task: { id: "task_1", status: "needs_info" },
          clarificationSession: { id: "session_1", status: "active" },
          missingFields: ["estimatedDurationMinutes"],
          nextQuestion: "这个任务大概需要多久完成？",
        } as never;
      },
      async replyClarification() {
        return {
          task: { id: "task_1", status: "schedulable" },
          clarificationSession: { id: "session_1", status: "resolved" },
          missingFields: [],
          nextQuestion: null,
        } as never;
      },
      async proposeSchedule() {
        return {
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
        } as never;
      },
      async confirmSchedule() {
        return {
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
        } as never;
      },
      async generateReminders() {
        return {} as never;
      },
    },
  });

  assert.equal(runtime.state.loading, false);
  assert.equal(runtime.state.error, null);
  assert.equal(runtime.state.sheetOpen, false);
  assert.equal(runtime.state.home.activeTab, "schedule");

  runtime.openArrangeSheet();
  assert.equal(runtime.state.sheetOpen, true);

  runtime.setDraftText("周五前交论文初稿");
  assert.equal(runtime.state.draftText.includes("论文初稿"), true);

  const afterDraft = await runtime.submitDraft();
  assert.equal(afterDraft.stage, "clarifying");
  assert.equal(runtime.state.nextQuestion, "这个任务大概需要多久完成？");
  assert.equal(runtime.state.loading, false);

  const afterReply = await runtime.submitClarification("2小时");
  assert.equal(afterReply.stage, "ready_to_schedule");
  assert.equal(runtime.state.stage, "ready_to_schedule");

  const afterPropose = await runtime.proposeSchedule();
  assert.equal(afterPropose.stage, "confirmed");
  assert.equal(runtime.state.home.tasks[0]?.status, "scheduled");
  assert.equal(runtime.state.notice?.includes("已确认"), true);
  assert.equal(runtime.state.home.timelineView.days[3]?.id, runtime.state.home.timelineView.activeDateId);
  assert.equal(runtime.state.home.timelineView.initialScrollLeftPx, 264);
  assert.equal(runtime.state.home.timelineView.initialScrollTopPx, 120);
  assert.equal(runtime.state.home.timelineView.days[3]?.blocks.some((block) => block.title === "论文初稿"), true);
  assert.equal(
    runtime.state.home.timelineView.days[3]?.blocks.some(
      (block) => block.title === "论文初稿" && block.topRpx === 1080,
    ),
    true,
  );
  assert.equal(runtime.state.home.timelineView.viewportDurationMinutes, 24 * 60);
});
