import assert from "node:assert/strict";
import test from "node:test";

import { createArrangeSheet } from "../components/arrange-sheet/index.ts";
import { createKanbanView } from "../components/kanban-view/index.ts";
import { createScheduleView } from "../components/schedule-view/index.ts";
import { createMiniProgramApiClient } from "../services/api.ts";
import {
  buildHomePage,
  clampTimelineBlockEditRange,
  extendHomePlanningWindow,
  openArrangeSheet,
  refreshHomePage,
  switchHomePlanningPeriod,
  switchHomeTab,
  switchHomeTimelineVisibleDayCount,
} from "../pages/home/index.ts";
import { createTaskDetailPage } from "../pages/task-detail/index.ts";
import { createMiniProgramApp } from "../app.ts";

function withFrozenSystemTime<T>(isoTimestamp: string, run: () => T): T {
  const RealDate = Date;
  const frozenTime = new RealDate(isoTimestamp).getTime();

  class FrozenDate extends RealDate {
    constructor(...args: ConstructorParameters<DateConstructor>) {
      if (args.length === 0) {
        super(frozenTime);
        return;
      }

      super(...args);
    }

    static now() {
      return frozenTime;
    }
  }

  globalThis.Date = FrozenDate as DateConstructor;
  try {
    return run();
  } finally {
    globalThis.Date = RealDate;
  }
}

test("home shell exposes schedule and kanban tabs with the arrange task entry", () => {
  const home = buildHomePage();

  assert.deepEqual(home.tabs.map((tab) => tab.label), ["日程", "事项", "排期"]);
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
  assert.equal(home.timelineView.days[3]?.blocks[0]?.heightRpx, 240);
  assert.equal(home.timelineView.days[3]?.blocks[0]?.leftRpx, 0);
  assert.equal(home.timelineView.days[3]?.blocks[0]?.rightRpx, 0);
  assert.equal(home.timelineView.days[3]?.blocks[1]?.title, "论文初稿");
  assert.equal(home.timelineView.days[3]?.blocks[1]?.topRpx, 720);
  assert.equal(home.timelineView.days[3]?.blocks[1]?.heightRpx, 300);
  assert.equal(home.timelineView.days[3]?.blocks[2]?.title, "整理资料");
  assert.equal(home.timelineView.days[3]?.blocks[2]?.topRpx, 840);
  assert.equal(home.timelineView.days[3]?.blocks[2]?.heightRpx, 120);
  assert.equal(home.timelineView.days.at(-1)?.isPast, false);
  assert.equal(home.surfaceStates.schedule.header.title, "日程");
  assert.equal(home.surfaceStates.schedule.scheduleSummary?.expandable, true);
  assert.equal(home.surfaceStates.schedule.scheduleSummary?.expanded, false);
  assert.equal(home.surfaceStates.schedule.scheduleSummary?.metrics.length, 4);
  assert.equal(home.surfaceStates.kanban.header.title, "事项");
  assert.equal(home.surfaceStates.kanban.scheduleSummary, null);
  assert.equal(home.surfaceStates.planning.header.title, "排期");
  assert.equal(home.surfaceStates.planning.scheduleSummary, null);

  switchHomeTab(home, "kanban");
  assert.equal(home.activeTab, "kanban");

  switchHomeTab(home, "planning");
  assert.equal(home.activeTab, "planning");
  assert.equal(home.planningView.activePeriod, "day");
  assert.equal(home.planningView.rangeLabel, "2026年4月8日");
  assert.deepEqual(home.planningView.periods.map((item) => item.label), ["日", "周", "月", "季", "年"]);
  assert.equal(home.planningView.taskColumns.length, 2);
  assert.equal(home.planningView.taskColumns[0]?.title, "论文初稿");
  assert.equal(home.planningView.timeSlots[0]?.label, "00:00");
  assert.equal(home.planningView.timeSlots.at(-1)?.label, "24:00");
  assert.equal(home.planningView.viewportSlotCount, 24);

  switchHomePlanningPeriod(home, "week");
  assert.equal(home.planningView.activePeriod, "week");
  assert.equal(home.planningView.rangeLabel, "2026年4月8日 - 2026年4月14日");
  assert.equal(home.planningView.timeSlots.length, 7);
  assert.equal(home.planningView.viewportSlotCount, 7);

  switchHomePlanningPeriod(home, "month");
  assert.equal(home.planningView.activePeriod, "month");
  assert.equal(home.planningView.rangeLabel, "2026年4月8日 - 2026年5月7日");
  assert.equal(home.planningView.timeSlots.length, 30);
  assert.equal(home.planningView.viewportSlotCount, 30);

  switchHomePlanningPeriod(home, "quarter");
  assert.equal(home.planningView.activePeriod, "quarter");
  assert.equal(home.planningView.rangeLabel, "2026年4月8日 - 2026年7月6日");
  assert.equal(home.planningView.timeSlots.length, 90);
  assert.equal(home.planningView.viewportSlotCount, 90);

  switchHomePlanningPeriod(home, "year");
  assert.equal(home.planningView.activePeriod, "year");
  assert.equal(home.planningView.rangeLabel, "2026年4月1日 - 2027年3月31日");
  assert.equal(home.planningView.timeSlots.length, 12);
  assert.equal(home.planningView.viewportSlotCount, 12);

  openArrangeSheet(home);
  assert.equal(home.arrangeSheet.primaryActionText, "安排");
});

test("planning view extends forward and backward by one viewport window for lazy loading", () => {
  const home = buildHomePage();
  switchHomePlanningPeriod(home, "month");

  assert.equal(home.planningView.timeSlots.length, 30);
  const initialFirstSlot = home.planningView.timeSlots[0]?.label;

  const appended = extendHomePlanningWindow(home, "after");
  assert.equal(appended.addedSlotCount, 30);
  assert.equal(home.planningView.timeSlots.length, 60);
  assert.equal(home.planningView.viewportSlotCount, 30);

  const prepended = extendHomePlanningWindow(home, "before");
  assert.equal(prepended.addedSlotCount, 30);
  assert.equal(home.planningView.timeSlots.length, 90);
  assert.notEqual(home.planningView.timeSlots[0]?.label, initialFirstSlot);
  assert.equal(home.surfaceStates.planning.header.subtitle, home.planningView.rangeLabel);
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

test("timeline renders one block per schedule segment so each block can be edited independently", () => {
  const home = buildHomePage({
    tasks: [
      {
        id: "task-segmented",
        title: "分段任务",
        summary: "上午和下午各有一段。",
        startAt: "2026-04-08T01:00:00.000Z",
        endAt: "2026-04-08T08:00:00.000Z",
        deadlineAt: "2026-04-08T12:00:00.000Z",
        status: "scheduled",
        deadlineLabel: "今天",
        durationLabel: "3 小时",
        priorityLabel: "P1",
        importanceReason: "test",
        categoryId: "write",
        categoryTitle: "论文写作",
        sourceLabel: "文本输入",
        executionPlan: [],
        suggestions: [],
        scheduleSegments: [
          {
            id: "block-morning",
            startAt: "2026-04-08T01:00:00.000Z",
            endAt: "2026-04-08T02:00:00.000Z",
            label: "09:00-10:00",
          },
          {
            id: "block-afternoon",
            startAt: "2026-04-08T07:00:00.000Z",
            endAt: "2026-04-08T08:00:00.000Z",
            label: "15:00-16:00",
          },
        ],
      },
    ],
  });

  const activeDay = home.timelineView.days.find((day) => day.id === home.timelineView.activeDateId);
  assert.equal(activeDay?.blocks.length, 2);
  assert.equal(activeDay?.blocks[0]?.id, "timeline-block-morning");
  assert.equal(activeDay?.blocks[0]?.taskId, "task-segmented");
  assert.equal(activeDay?.blocks[0]?.topRpx, 120);
  assert.equal(activeDay?.blocks[0]?.leftRpx, 0);
  assert.equal(activeDay?.blocks[0]?.rightRpx, 0);
  assert.equal(activeDay?.blocks[1]?.id, "timeline-block-afternoon");
  assert.equal(activeDay?.blocks[1]?.topRpx, 840);
  assert.equal(activeDay?.blocks[1]?.leftRpx, 0);
  assert.equal(activeDay?.blocks[1]?.rightRpx, 0);
});

test("timeline defaults to a 3-day viewport and resizes columns when the visible day count changes", () => {
  const home = buildHomePage();

  assert.equal(home.timelineView.visibleDayCount, 3);
  assert.deepEqual(
    home.timelineView.visibleDayCountOptions.map((option) => option.label),
    ["1天", "2天", "3天", "5天", "7天"],
  );
  assert.equal(home.timelineView.visibleDayCountOptions.find((option) => option.value === 3)?.isActive, true);
  assert.equal(home.timelineView.dayColumnWidthRpx, 176);
  assert.equal(home.timelineView.initialScrollLeftPx, 264);

  switchHomeTimelineVisibleDayCount(home, 5);
  assert.equal(home.timelineView.visibleDayCount, 5);
  assert.equal(home.timelineView.visibleDayCountOptions.find((option) => option.value === 5)?.isActive, true);
  assert.equal(home.timelineView.visibleDayCountOptions.find((option) => option.value === 3)?.isActive, false);
  assert.equal(home.timelineView.dayColumnWidthRpx, 106);
  assert.equal(home.timelineView.initialScrollLeftPx, 159);
  assert.equal(home.timelineView.days[3]?.id, home.timelineView.activeDateId);
});

test("timeline edit preview stays within adjacent block boundaries", () => {
  const home = buildHomePage({
    tasks: [
      {
        id: "task-prev",
        title: "前一个块",
        startAt: "2026-04-08T08:00:00.000Z",
        endAt: "2026-04-08T09:00:00.000Z",
        deadlineAt: "2026-04-08T12:00:00.000Z",
        status: "scheduled",
        deadlineLabel: "今天",
        durationLabel: "1 小时",
        priorityLabel: "P1",
        importanceReason: "test",
        scheduleSegments: [
          {
            id: "block-prev",
            startAt: "2026-04-08T08:00:00.000Z",
            endAt: "2026-04-08T09:00:00.000Z",
            label: "08:00-09:00",
          },
        ],
      },
      {
        id: "task-current",
        title: "当前块",
        startAt: "2026-04-08T09:30:00.000Z",
        endAt: "2026-04-08T10:30:00.000Z",
        deadlineAt: "2026-04-08T12:00:00.000Z",
        status: "scheduled",
        deadlineLabel: "今天",
        durationLabel: "1 小时",
        priorityLabel: "P1",
        importanceReason: "test",
        scheduleSegments: [
          {
            id: "block-current",
            startAt: "2026-04-08T09:30:00.000Z",
            endAt: "2026-04-08T10:30:00.000Z",
            label: "09:30-10:30",
          },
        ],
      },
      {
        id: "task-next",
        title: "后一个块",
        startAt: "2026-04-08T11:00:00.000Z",
        endAt: "2026-04-08T12:00:00.000Z",
        deadlineAt: "2026-04-08T12:30:00.000Z",
        status: "scheduled",
        deadlineLabel: "今天",
        durationLabel: "1 小时",
        priorityLabel: "P1",
        importanceReason: "test",
        scheduleSegments: [
          {
            id: "block-next",
            startAt: "2026-04-08T11:00:00.000Z",
            endAt: "2026-04-08T12:00:00.000Z",
            label: "11:00-12:00",
          },
        ],
      },
    ],
  });

  const clampedBody = clampTimelineBlockEditRange(
    home.tasks,
    "task-current",
    "block-current",
    "body",
    "2026-04-08T08:30:00.000Z",
    "2026-04-08T09:30:00.000Z",
  );
  assert.deepEqual(clampedBody, {
    startAt: "2026-04-08T09:00:00.000Z",
    endAt: "2026-04-08T10:00:00.000Z",
  });

  const clampedBottom = clampTimelineBlockEditRange(
    home.tasks,
    "task-current",
    "block-current",
    "bottom",
    "2026-04-08T09:30:00.000Z",
    "2026-04-08T11:30:00.000Z",
  );
  assert.deepEqual(clampedBottom, {
    startAt: "2026-04-08T09:30:00.000Z",
    endAt: "2026-04-08T11:00:00.000Z",
  });
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
    {
      id: "1",
      title: "Need info",
      status: "needs_info",
      summary: "补充 deadline",
      deadlineAt: "2026-04-08T18:00:00.000Z",
      deadlineLabel: "今天",
      priorityLabel: "P2",
      categoryId: "collect",
      categoryTitle: "资料整理",
      scheduleSegments: [],
    },
    {
      id: "2",
      title: "Scheduled",
      status: "scheduled",
      summary: "补完正文",
      deadlineAt: "2026-04-09T18:00:00.000Z",
      deadlineLabel: "明天",
      priorityLabel: "P1",
      categoryId: "write",
      categoryTitle: "论文写作",
      scheduleSegments: [
        {
          id: "seg_1",
          startAt: "2026-04-08T09:00:00.000Z",
          endAt: "2026-04-08T10:00:00.000Z",
          label: "09:00-10:00",
        },
      ],
    },
    {
      id: "3",
      title: "Done",
      status: "done",
      summary: "完成复盘",
      deadlineAt: "2026-04-11T18:00:00.000Z",
      deadlineLabel: "4.11",
      priorityLabel: "P3",
      categoryId: "review",
      categoryTitle: "复盘整理",
      scheduleSegments: [],
    },
  ]);

  assert.equal(kanbanView.title, "事项");
  assert.equal(Object.hasOwn(kanbanView, "gantt"), false);
  assert.equal(kanbanView.groups[0]?.title, "资料整理");
  assert.equal(kanbanView.groups[0]?.tasks[0]?.deadlineLabel, "今天");
  assert.equal(kanbanView.groups[1]?.title, "论文写作");
  assert.equal(kanbanView.groups[1]?.tasks[0]?.id, "2");
  assert.equal(kanbanView.groups[2]?.title, "复盘整理");
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
    summary: "补齐论文初稿并在今晚前交付。",
    timeRangeLabel: "今天 09:00 - 12:00",
    parentTaskTitle: "论文写作",
    categoryTitle: "论文写作",
    statusLabel: "已安排",
    deadlineLabel: "周五 18:00",
    durationLabel: "2 小时",
    priorityLabel: "P1",
    sourceLabel: "文档导入",
    executionPlan: [
      { id: "plan_1", label: "今天 09:00 - 10:30", statusLabel: "已排期" },
      { id: "plan_2", label: "今天 14:00 - 15:00", statusLabel: "待执行" },
    ],
    suggestions: ["先补正文段落，再统一润色摘要。", "如果时间不够，优先保证提纲和主结论完整。"],
  });

  assert.equal(taskDetail.title, "论文初稿");
  assert.equal(taskDetail.summary.includes("今晚前"), true);
  assert.equal(taskDetail.timeRangeLabel, "今天 09:00 - 12:00");
  assert.equal(taskDetail.parentTaskTitle, "论文写作");
  assert.equal(taskDetail.categoryTitle, "论文写作");
  assert.equal("actions" in taskDetail, false);
  assert.equal(taskDetail.meta.statusLabel, "已安排");
  assert.equal(taskDetail.meta.deadlineLabel, "周五 18:00");
  assert.equal(taskDetail.sections.length, 3);
  assert.deepEqual(taskDetail.sections.map((section) => section.id), [
    "overview",
    "execution-plan",
    "ai-suggestions",
  ]);
  assert.equal(taskDetail.executionPlan.length, 2);
  assert.equal(taskDetail.suggestions.length, 2);
  assert.equal(taskDetail.sourceLabel, "文档导入");
});

test("home refresh derives relative labels from the current system date", () => {
  withFrozenSystemTime("2026-04-11T09:00:00.000Z", () => {
    const home = buildHomePage({ tasks: [] });

    refreshHomePage(home, [
      {
        id: "block-today",
        taskId: "task-today",
        title: "今天任务",
        startAt: "2026-04-11T09:00:00.000Z",
        endAt: "2026-04-11T10:00:00.000Z",
        durationMinutes: 60,
        status: "confirmed",
      },
      {
        id: "block-tomorrow",
        taskId: "task-tomorrow",
        title: "明天任务",
        startAt: "2026-04-12T09:00:00.000Z",
        endAt: "2026-04-12T10:00:00.000Z",
        durationMinutes: 60,
        status: "confirmed",
      },
      {
        id: "block-next-year",
        taskId: "task-next-year",
        title: "明年任务",
        startAt: "2027-01-06T09:00:00.000Z",
        endAt: "2027-01-06T10:00:00.000Z",
        durationMinutes: 60,
        status: "confirmed",
      },
    ]);

    assert.equal(home.tasks.find((task) => task.id === "task-today")?.deadlineLabel, "今天");
    assert.equal(home.tasks.find((task) => task.id === "task-tomorrow")?.deadlineLabel, "明天");
    assert.equal(home.tasks.find((task) => task.id === "task-next-year")?.deadlineLabel, "明年");
    assert.equal(home.tasks.find((task) => task.id === "task-today")?.executionPlan[0]?.label.startsWith("今天 "), true);
  });
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
  await client.listTasks();
  await client.getTask("task_1");
  await client.updateTaskScheduleBlock("task_1", "block_1", {
    startAt: "2026-04-08T09:30:00.000Z",
    endAt: "2026-04-08T11:30:00.000Z",
  });

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
      ["GET", "https://api.tangxie.test/tasks"],
      ["GET", "https://api.tangxie.test/tasks/task_1"],
      ["PATCH", "https://api.tangxie.test/tasks/task_1/schedule-blocks/block_1"],
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
