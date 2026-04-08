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

  switchHomeTab(home, "kanban");
  assert.equal(home.activeTab, "kanban");

  openArrangeSheet(home);
  assert.equal(home.arrangeSheet.primaryActionText, "安排");
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

  assert.deepEqual(
    calls.map((call) => [call.method, call.url]),
    [
      ["POST", "https://api.tangxie.test/tasks/intake"],
      ["POST", "https://api.tangxie.test/clarification/reply"],
      ["POST", "https://api.tangxie.test/scheduling/propose"],
      ["POST", "https://api.tangxie.test/scheduling/confirm"],
      ["POST", "https://api.tangxie.test/reminders/generate"],
      ["GET", "https://api.tangxie.test/reminders/daily-summary?date=2026-04-08"],
    ],
  );
  assert.equal(calls[0]?.body?.includes("论文初稿"), true);
  assert.equal(calls[1]?.body?.includes("session_1"), true);
});

test("mini program app shell exposes the expected routes", () => {
  const app = createMiniProgramApp();

  assert.equal(app.brand, "糖蟹");
  assert.deepEqual(app.pages, ["pages/home/index", "pages/task-detail/index"]);
  assert.equal(app.defaultRoute, "pages/home/index");
});
