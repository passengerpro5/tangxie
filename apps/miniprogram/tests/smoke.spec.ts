import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { access } from "node:fs/promises";
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

test("home page template binds runtime data and interaction handlers for WeChat DevTools", async () => {
  const template = await readFile(new URL("../pages/home/index.wxml", import.meta.url), "utf8");

  assert.equal(template.includes('class="workspace"'), true);
  assert.equal(template.includes('class="workspace-card"'), true);
  assert.equal(template.includes('class="timeline-stage"'), true);
  assert.equal(template.includes('class="planner-sheet"'), true);
  assert.equal(template.includes('class="planner-thread"'), true);
  assert.equal(template.includes('class="planner-composer"'), true);
  assert.equal(template.includes("开始规划"), true);
  assert.equal(template.includes("历史记录"), true);

  assert.equal(template.includes('wx:for="{{home.tabs}}"'), true);
  assert.equal(template.includes('bindtap="onTapTab"'), true);
  assert.equal(template.includes('data-tab-id="{{tab.id}}"'), true);

  assert.equal(template.includes('wx:for="{{home.timelineView.days}}"'), true);
  assert.equal(template.includes('wx:for="{{home.timelineView.timeSlots}}"'), true);
  assert.equal(template.includes('wx:for="{{day.blocks}}"'), true);
  assert.equal(template.includes('scroll-x="true"'), true);
  assert.equal(template.includes('scroll-y="true"'), true);
  assert.equal(template.includes('scroll-left="{{timelineScrollLeft}}"'), true);
  assert.equal(template.includes('transform: translateX(-{{timelineHeaderOffsetPx}}px);'), true);
  assert.equal(template.includes('scroll-top="{{timelineScrollTop}}"'), true);
  assert.equal((template.match(/bindscroll="onTimelineHorizontalScroll"/g) ?? []).length, 1);
  assert.equal(template.includes('bindscroll="onTimelineVerticalScroll"'), false);
  assert.equal(template.includes("date-rail-day-past"), true);
  assert.equal(template.includes("timeline-day-column-past"), true);
  assert.equal(template.includes('wx:for="{{home.kanbanView.columns}}"'), true);
  assert.equal(template.includes('bindtap="onOpenArrange"'), true);

  assert.equal(template.includes('wx:if="{{sheetOpen}}"'), true);
  assert.equal(template.includes('bindinput="onDraftInput"'), true);
  assert.equal(template.includes('bindinput="onAnswerInput"'), true);
  assert.equal(template.includes('bindtap="onSubmitDraft"'), true);
  assert.equal(template.includes('bindtap="onSubmitClarification"'), true);
  assert.equal(template.includes('bindtap="onProposeSchedule"'), true);

  assert.equal(template.includes("{{loading}}"), true);
  assert.equal(template.includes("{{error}}"), true);
  assert.equal(template.includes("{{notice}}"), true);
  assert.equal(template.includes("{{nextQuestion}}"), true);
  assert.equal(template.includes("{{stage === 'idle'}}"), true);
  assert.equal(template.includes("{{stage === 'clarifying'}}"), true);
  assert.equal(template.includes("{{stage === 'ready_to_schedule'}}"), true);
});

test("devtools runtime has executable js entry files for app and declared pages", async () => {
  const appConfigText = await readFile(new URL("../app.json", import.meta.url), "utf8");
  const appConfig = JSON.parse(appConfigText) as {
    pages: string[];
  };

  const requiredFiles = [
    "../app.js",
    "../config/runtime.js",
    "../services/api.js",
    "../services/wechat-request.js",
    "../components/arrange-sheet/index.js",
    "../components/schedule-view/index.js",
    "../components/kanban-view/index.js",
    "../pages/home/index.js",
    "../pages/home/runtime.js",
    "../pages/task-detail/index.js",
    ...appConfig.pages.map((page) => `../${page}.js`),
  ];

  await Promise.all(
    requiredFiles.map(async (relativePath) => {
      await access(new URL(relativePath, import.meta.url));
    }),
  );
});
