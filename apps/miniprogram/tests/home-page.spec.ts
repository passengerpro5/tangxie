import assert from "node:assert/strict";
import test from "node:test";

import { createArrangeSheet } from "../components/arrange-sheet/index.ts";
import { createKanbanView } from "../components/kanban-view/index.ts";
import { createScheduleView } from "../components/schedule-view/index.ts";
import { createMiniProgramApiClient } from "../services/api.ts";
import { buildHomePage, openArrangeSheet, switchHomeTab } from "../pages/home/index.ts";
import { createTaskDetailPage } from "../pages/task-detail/index.ts";
import { createMiniProgramApp } from "../app.ts";

test("home shell exposes schedule and kanban tabs with the arrange task entry", () => {
  const home = buildHomePage();

  assert.deepEqual(home.tabs.map((tab) => tab.label), ["日程", "任务看板"]);
  assert.equal(home.primaryActionText, "安排任务");
  assert.equal(home.activeTab, "schedule");
  assert.equal(home.timelineView.viewportDurationMinutes, 24 * 60);
  assert.equal(home.timelineView.viewportStartLabel, "00:00");
  assert.equal(home.timelineView.viewportEndLabel, "24:00");
  assert.equal(home.timelineView.initialScrollLeftPx, 264);
  assert.equal(home.timelineView.initialScrollTopPx, 120);
  assert.equal(home.timelineView.activeDayAnchorId, `timeline-day-${home.timelineView.activeDateId}`);
  assert.equal(home.timelineView.days[0]?.isPast, true);
  assert.equal(home.timelineView.days[3]?.id, home.timelineView.activeDateId);
  assert.equal(home.timelineView.days[3]?.isActive, true);
  assert.equal(home.timelineView.days[3]?.isPast, false);
  assert.equal(home.timelineView.days[3]?.blocks[0]?.title, "论文初稿");
  assert.equal(home.timelineView.timeSlots[0]?.label, "00:00");
  assert.equal(home.timelineView.timeSlots[2]?.label, "02:00");
  assert.equal(home.timelineView.timeSlots.at(-1)?.label, "24:00");
  assert.equal(home.timelineView.days[3]?.blocks[0]?.topRpx, 240);
  assert.equal(home.timelineView.days[3]?.blocks[0]?.heightRpx, 540);
  assert.equal(home.timelineView.days[3]?.blocks[1]?.title, "整理资料");
  assert.equal(home.timelineView.days[3]?.blocks[1]?.topRpx, 840);
  assert.equal(home.timelineView.days[3]?.blocks[1]?.heightRpx, 120);
  assert.equal(home.timelineView.days.at(-1)?.isPast, false);

  switchHomeTab(home, "kanban");
  assert.equal(home.activeTab, "kanban");

  openArrangeSheet(home);
  assert.equal(home.arrangeSheet.primaryActionText, "安排");
});

test("timeline covers the full day and defaults vertical scroll near the earliest active task", () => {
  const home = buildHomePage({
    tasks: [
      {
        id: "task-early",
        title: "晨间整理",
        startAt: "2026-04-08T01:15:00.000Z",
        endAt: "2026-04-08T02:00:00.000Z",
        status: "scheduled",
        deadlineLabel: "今天",
        durationLabel: "45 分钟",
        priorityLabel: "P2",
        importanceReason: "test",
      },
      {
        id: "task-late",
        title: "深度工作",
        startAt: "2026-04-08T04:45:00.000Z",
        endAt: "2026-04-08T06:15:00.000Z",
        status: "scheduled",
        deadlineLabel: "今天",
        durationLabel: "90 分钟",
        priorityLabel: "P1",
        importanceReason: "test",
      },
    ],
  });

  assert.equal(home.timelineView.viewportStartLabel, "00:00");
  assert.equal(home.timelineView.viewportEndLabel, "24:00");
  assert.equal(home.timelineView.viewportDurationMinutes, 24 * 60);
  assert.equal(home.timelineView.initialScrollLeftPx, 264);
  assert.equal(home.timelineView.initialScrollTopPx, 75);
  assert.equal(home.timelineView.activeDayAnchorId, `timeline-day-${home.timelineView.activeDateId}`);
  assert.equal(home.timelineView.days[0]?.isPast, true);
  assert.equal(home.timelineView.days[3]?.dateLabel, "8");
  assert.equal(home.timelineView.days[3]?.isActive, true);
  assert.equal(home.timelineView.days[3]?.isPast, false);
  assert.equal(home.timelineView.days[3]?.blocks[0]?.title, "晨间整理");
  assert.equal(home.timelineView.timeSlots[0]?.label, "00:00");
  assert.equal(home.timelineView.timeSlots[1]?.label, "01:00");
  assert.equal(home.timelineView.timeSlots.at(-1)?.label, "24:00");
  assert.equal(home.timelineView.days[3]?.blocks[0]?.topRpx, 150);
  assert.equal(home.timelineView.days[3]?.blocks[0]?.heightRpx, 90);
  assert.equal(home.timelineView.days[3]?.blocks[1]?.topRpx, 570);
  assert.equal(home.timelineView.days[3]?.blocks[1]?.heightRpx, 180);
  assert.equal(home.timelineView.days.at(-1)?.isPast, false);
});

test("page models keep the schedule and kanban views aligned", () => {
  const scheduleView = createScheduleView([
    {
      id: "b",
      title: "Later task",
      startAt: "2026-04-08T10:00:00.000Z",
      endAt: "2026-04-08T11:00:00.000Z",
      status: "proposed",
    },
    {
      id: "a",
      title: "Earlier task",
      startAt: "2026-04-08T09:00:00.000Z",
      endAt: "2026-04-08T09:30:00.000Z",
      status: "confirmed",
    },
  ]);

  assert.equal(scheduleView.title, "日程");
  assert.deepEqual(scheduleView.items.map((item) => item.id), ["a", "b"]);

  const kanbanView = createKanbanView([
    { id: "1", title: "Need info", status: "needs_info" },
    { id: "2", title: "Scheduled", status: "scheduled" },
    { id: "3", title: "Done", status: "done" },
  ]);

  assert.equal(kanbanView.title, "任务看板");
  assert.deepEqual(
    kanbanView.columns.map((column) => [column.id, column.count]),
    [
      ["needs_info", 1],
      ["scheduled", 1],
      ["done", 1],
      ["overdue", 0],
    ],
  );
});

test("arrange sheet and task detail models describe the user flow", () => {
  const arrangeSheet = createArrangeSheet({
    draftText: "周五前交论文初稿",
    attachments: [{ name: "brief.docx", kind: "doc" }],
  });

  assert.equal(arrangeSheet.canSubmit, true);
  assert.equal(arrangeSheet.inputPlaceholder.includes("deadline"), true);
  assert.equal(arrangeSheet.attachments[0]?.kind, "doc");

  const taskDetail = createTaskDetailPage({
    title: "论文初稿",
    statusLabel: "已安排",
    deadlineLabel: "周五 18:00",
    durationLabel: "2 小时",
    priorityLabel: "P1",
    sourceLabel: "文档导入",
  });

  assert.equal(taskDetail.title, "论文初稿");
  assert.equal(taskDetail.actions.length, 4);
  assert.equal(taskDetail.sourceLabel, "文档导入");
});

test("mini program api client points to the backend route boundaries", async () => {
  const calls: Array<{ url: string; method: string; body: string | undefined }> = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    calls.push({
      url: String(input),
      method: init?.method ?? "GET",
      body: typeof init?.body === "string" ? init.body : undefined,
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  const client = createMiniProgramApiClient({
    baseUrl: "https://api.tangxie.test",
    fetchImpl,
  });

  await client.intakeTask({ rawText: "周五前交论文初稿" });
  await client.replyClarification({ sessionId: "session_1", answerText: "2小时" });
  await client.proposeSchedule({ taskIds: ["task-1"] });
  await client.confirmSchedule({ taskIds: ["task-1"] });
  await client.generateReminders();
  await client.getDailySummary("2026-04-08");
  await client.createArrangeConversation();
  await client.listArrangeConversations();
  await client.getArrangeConversation("conv_1");
  await client.sendArrangeConversationMessage("conv_1", { content: "周五前交论文初稿" });
  await client.confirmArrangeConversation("conv_1");

  assert.deepEqual(
    calls.map((call) => [call.method, call.url]),
    [
      ["POST", "https://api.tangxie.test/tasks/intake"],
      ["POST", "https://api.tangxie.test/clarification/reply"],
      ["POST", "https://api.tangxie.test/scheduling/propose"],
      ["POST", "https://api.tangxie.test/scheduling/confirm"],
      ["POST", "https://api.tangxie.test/reminders/generate"],
      ["GET", "https://api.tangxie.test/reminders/daily-summary?date=2026-04-08"],
      ["POST", "https://api.tangxie.test/arrange/conversations"],
      ["GET", "https://api.tangxie.test/arrange/conversations"],
      ["GET", "https://api.tangxie.test/arrange/conversations/conv_1"],
      ["POST", "https://api.tangxie.test/arrange/conversations/conv_1/messages"],
      ["POST", "https://api.tangxie.test/arrange/conversations/conv_1/confirm"],
    ],
  );
  assert.equal(calls[0]?.body?.includes("论文初稿"), true);
  assert.equal(calls[1]?.body?.includes("session_1"), true);
  assert.equal(calls[9]?.body?.includes("论文初稿"), true);
});

test("mini program app shell exposes the expected routes", () => {
  const app = createMiniProgramApp();

  assert.equal(app.brand, "糖蟹");
  assert.deepEqual(app.pages, ["pages/home/index", "pages/task-detail/index"]);
  assert.equal(app.defaultRoute, "pages/home/index");
});
