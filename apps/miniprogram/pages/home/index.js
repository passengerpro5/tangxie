import { createArrangeSheet } from "../../components/arrange-sheet/index.js";
import { createKanbanView } from "../../components/kanban-view/index.js";
import { createScheduleView } from "../../components/schedule-view/index.js";
import { createHomePageRuntime } from "./runtime.js";

const DEFAULT_TASKS = [
  {
    id: "task-1",
    title: "论文初稿",
    startAt: "2026-04-08T02:00:00.000Z",
    endAt: "2026-04-08T06:30:00.000Z",
    status: "scheduled",
    deadlineLabel: "周五 18:00",
    durationLabel: "2 小时",
    priorityLabel: "P1",
    importanceReason: "deadline=2026-04-10T18:00:00.000Z, duration=120m",
  },
  {
    id: "task-2",
    title: "整理资料",
    startAt: "2026-04-08T07:00:00.000Z",
    endAt: "2026-04-08T08:00:00.000Z",
    status: "needs_info",
    deadlineLabel: "待确认",
    durationLabel: "待估算",
    priorityLabel: "P2",
    importanceReason: "需要补充 deadline 和时长",
  },
  {
    id: "task-3",
    title: "已完成的复盘",
    startAt: "2026-04-07T09:00:00.000Z",
    endAt: "2026-04-07T09:30:00.000Z",
    status: "done",
    deadlineLabel: "已完成",
    durationLabel: "30 分钟",
    priorityLabel: "P3",
    importanceReason: "已完成",
  },
];

const TIMELINE_DAY_MINUTES = 24 * 60;
const TIMELINE_MINUTE_HEIGHT_RPX = 2;
const TIMELINE_DAY_COLUMN_WIDTH_RPX = 176;
const TIMELINE_PAST_DAYS = 3;
const TIMELINE_FUTURE_DAYS = 6;
const DEFAULT_DEVICE_WIDTH_PX = 375;
const WEEKDAY_LABELS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

function createTabs() {
  return [
    { id: "schedule", label: "日程" },
    { id: "kanban", label: "任务看板" },
  ];
}

function parseUtcDate(value) {
  return new Date(value);
}

function toUtcDateId(value) {
  const date = parseUtcDate(value);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function minutesSinceUtcMidnight(value) {
  const date = parseUtcDate(value);
  return date.getUTCHours() * 60 + date.getUTCMinutes();
}

function formatMinutesLabel(minutes) {
  if (minutes === TIMELINE_DAY_MINUTES) {
    return "24:00";
  }
  const normalized = ((minutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours = Math.floor(normalized / 60);
  const minute = normalized % 60;
  return `${String(hours).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function createFallbackDateId(tasks) {
  return tasks[0] ? toUtcDateId(tasks[0].startAt) : "2026-04-08";
}

function resolveDeviceWidthPx() {
  const maybeWx = globalThis;

  if (typeof maybeWx.wx?.getWindowInfo === "function") {
    return maybeWx.wx.getWindowInfo().windowWidth;
  }

  if (typeof maybeWx.wx?.getSystemInfoSync === "function") {
    return maybeWx.wx.getSystemInfoSync().windowWidth;
  }

  return DEFAULT_DEVICE_WIDTH_PX;
}

function convertRpxToPx(valueRpx) {
  return Math.round((valueRpx * resolveDeviceWidthPx()) / 750);
}

function resolveActiveDateId(tasks) {
  const validTasks = tasks.filter((task) => task.startAt && task.endAt);
  const activeCandidates = validTasks.filter((task) => task.status !== "done");
  const source = activeCandidates.length > 0 ? activeCandidates : validTasks;
  const earliest = [...source].sort((left, right) => left.startAt.localeCompare(right.startAt))[0];
  return earliest ? toUtcDateId(earliest.startAt) : createFallbackDateId(tasks);
}

function addUtcDays(dateId, offsetDays) {
  const [year, month, day] = dateId.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function buildTimelineDays(activeDateId) {
  const dayOffsets = Array.from(
    { length: TIMELINE_PAST_DAYS + TIMELINE_FUTURE_DAYS + 1 },
    (_, index) => index - TIMELINE_PAST_DAYS,
  );

  return dayOffsets.map((offset) => {
    const dateId = addUtcDays(activeDateId, offset);
    const [year, month, day] = dateId.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return {
      id: dateId,
      weekLabel: WEEKDAY_LABELS[date.getUTCDay()],
      dateLabel: String(date.getUTCDate()),
      isActive: offset === 0,
      isPast: offset < 0,
      blocks: [],
    };
  });
}

function buildTimelineView(tasks) {
  const activeDateId = resolveActiveDateId(tasks);
  const days = buildTimelineDays(activeDateId);
  const tasksForActiveDate = [...tasks]
    .filter((task) => toUtcDateId(task.startAt) === activeDateId)
    .sort((left, right) => left.startAt.localeCompare(right.startAt));

  const viewportStartMinutes = 0;
  const totalHeightRpx = TIMELINE_DAY_MINUTES * TIMELINE_MINUTE_HEIGHT_RPX;
  const activeDayIndex = days.findIndex((day) => day.id === activeDateId);
  const initialScrollTopPx =
    tasksForActiveDate.length > 0
      ? convertRpxToPx(minutesSinceUtcMidnight(tasksForActiveDate[0].startAt) * TIMELINE_MINUTE_HEIGHT_RPX)
      : 0;

  const blocks = tasks
    .filter((task) => days.some((day) => day.id === toUtcDateId(task.startAt)))
    .sort((left, right) => left.startAt.localeCompare(right.startAt))
    .map((task) => {
      const startMinutes = minutesSinceUtcMidnight(task.startAt);
      const endMinutes = minutesSinceUtcMidnight(task.endAt);
      return {
        id: `timeline-${task.id}`,
        dayId: toUtcDateId(task.startAt),
        taskId: task.id,
        title: task.title,
        status: task.status,
        startLabel: formatMinutesLabel(startMinutes),
        endLabel: formatMinutesLabel(endMinutes),
        topRpx: (startMinutes - viewportStartMinutes) * TIMELINE_MINUTE_HEIGHT_RPX,
        heightRpx: Math.max((endMinutes - startMinutes) * TIMELINE_MINUTE_HEIGHT_RPX, 72),
        deadlineLabel: task.deadlineLabel,
      };
    });

  const daysWithBlocks = days.map((day) => ({
    ...day,
    blocks: blocks.filter((block) => block.dayId === day.id),
  }));

  return {
    timezoneLabel: "GMT+8",
    activeDateId,
    activeDayAnchorId: `timeline-day-${activeDateId}`,
    activeDayIndex,
    viewportStartLabel: formatMinutesLabel(viewportStartMinutes),
    viewportEndLabel: formatMinutesLabel(TIMELINE_DAY_MINUTES),
    viewportStartMinutes,
    viewportDurationMinutes: TIMELINE_DAY_MINUTES,
    totalHeightRpx,
    initialScrollLeftPx: convertRpxToPx(activeDayIndex * TIMELINE_DAY_COLUMN_WIDTH_RPX),
    initialScrollTopPx,
    days: daysWithBlocks,
    timeSlots: Array.from({ length: Math.floor(TIMELINE_DAY_MINUTES / 60) + 1 }, (_, index) => ({
      id: `slot-${index}`,
      label: formatMinutesLabel(index * 60),
      topRpx: index * 60 * TIMELINE_MINUTE_HEIGHT_RPX,
    })),
    blocks,
  };
}

export function buildHomePage(input = {}) {
  const tasks = input.tasks ?? DEFAULT_TASKS;
  const home = {
    brand: "Time Sheet",
    title: "糖蟹",
    subtitle: "自动排期和按时提醒",
    tabs: createTabs(),
    activeTab: input.activeTab ?? "schedule",
    primaryActionText: "安排任务",
    scheduleView: createScheduleView(tasks),
    kanbanView: createKanbanView(tasks),
    timelineView: buildTimelineView(tasks),
    arrangeSheet: createArrangeSheet({
      history: [
        {
          id: "home-history-1",
          title: "帮我拆解这个任务",
          summary: "系统会先追问 deadline 和时长。",
          updatedAt: "2026-04-08 09:40",
        },
      ],
    }),
    tasks,
  };
  home.refresh = (confirmedBlocks) => refreshHomePage(home, confirmedBlocks);
  return home;
}

function toHomeTaskCard(block) {
  return {
    id: block.taskId,
    title: block.title,
    startAt: block.startAt,
    endAt: block.endAt,
    status: "scheduled",
    deadlineLabel: "已确认",
    durationLabel: `${Math.max(1, Math.round(block.durationMinutes / 60))} 小时`,
    priorityLabel: "P1",
    importanceReason: `confirmed-block=${block.id}`,
  };
}

export function refreshHomePage(home, confirmedBlocks) {
  const refreshedTasks = [...home.tasks];

  for (const block of confirmedBlocks) {
    const nextTask = toHomeTaskCard(block);
    const existingIndex = refreshedTasks.findIndex((task) => task.id === nextTask.id);

    if (existingIndex >= 0) {
      refreshedTasks[existingIndex] = nextTask;
      continue;
    }

    refreshedTasks.unshift(nextTask);
  }

  home.tasks = refreshedTasks;
  home.scheduleView = createScheduleView(refreshedTasks);
  home.kanbanView = createKanbanView(refreshedTasks);
  home.timelineView = buildTimelineView(refreshedTasks);
  home.arrangeSheet = createArrangeSheet({
    draftText: home.arrangeSheet.draftText,
    attachments: home.arrangeSheet.attachments,
    history: [
      {
        id: `refresh-${confirmedBlocks.length || 1}`,
        title: confirmedBlocks[0]?.title ?? "任务已安排",
        summary: "任务已确认排期，首页已刷新。",
        updatedAt: "2026-04-08 10:00",
      },
      ...home.arrangeSheet.history,
    ],
  });

  return home;
}

export function switchHomeTab(home, tabId) {
  home.activeTab = tabId;
  return home;
}

export function openArrangeSheet(home) {
  home.arrangeSheet = createArrangeSheet({
    draftText: home.arrangeSheet.draftText,
    attachments: home.arrangeSheet.attachments,
    history: home.arrangeSheet.history,
  });
  return home;
}

function buildRegisteredPageData(runtime) {
  return {
    home: runtime.state.home,
    activeTab: runtime.state.home.activeTab,
    timelineScrollLeft: runtime.state.home.timelineView.initialScrollLeftPx,
    timelineHeaderOffsetPx: runtime.state.home.timelineView.initialScrollLeftPx,
    scheduleEmptyState: runtime.state.home.scheduleView.emptyState,
    kanbanEmptyState: runtime.state.home.kanbanView.subtitle,
    loading: runtime.state.loading,
    error: runtime.state.error,
    notice: runtime.state.notice,
    sheetOpen: runtime.state.sheetOpen,
    arrangeTab: runtime.state.arrangeTab,
    attachmentPickerOpen: runtime.state.attachmentPickerOpen,
    draftText: runtime.state.draftText,
    answerText: runtime.state.answerText,
    runtimeApiBaseUrl: runtime.state.runtimeConfig.apiBaseUrl,
    runtimeApiBaseUrlDraft: runtime.state.runtimeConfig.apiBaseUrlDraft,
    stage: runtime.state.stage,
    nextQuestion: runtime.state.nextQuestion,
    confirmedBlocks: runtime.state.confirmedBlocks,
  };
}

function syncRuntimeToPage(page, runtime) {
  const currentData = page.data ?? {};
  page.setData({
    ...buildRegisteredPageData(runtime),
    timelineScrollLeft:
      typeof currentData.timelineScrollLeft === "number"
        ? currentData.timelineScrollLeft
        : runtime.state.home.timelineView.initialScrollLeftPx,
  });
}

function syncTimelineViewport(page, runtime) {
  page.setData({
    timelineScrollLeft: runtime.state.home.timelineView.initialScrollLeftPx,
    timelineScrollTop: runtime.state.home.timelineView.initialScrollTopPx,
  });
}

async function runPageAction(page, runtime, action) {
  try {
    syncRuntimeToPage(page, runtime);
    await action();
  } catch {
  } finally {
    syncRuntimeToPage(page, runtime);
  }
}

export { createHomePageRuntime };

registerHomePage();

function registerHomePage() {
  if (typeof globalThis.Page !== "function") {
    return;
  }

  const runtime = createHomePageRuntime();

  globalThis.Page({
    data: buildRegisteredPageData(runtime),
    _arrangeHandleTouchStartY: 0,
    _arrangeHandleDragging: false,
    onLoad() {
      syncRuntimeToPage(this, runtime);
    },
    onReady() {
      syncRuntimeToPage(this, runtime);
      syncTimelineViewport(this, runtime);
      setTimeout(() => syncTimelineViewport(this, runtime), 0);
    },
    onShow() {
      syncRuntimeToPage(this, runtime);
      syncTimelineViewport(this, runtime);
    },
    onTapTab(event) {
      const tabId = event.currentTarget?.dataset?.tabId;
      if (!tabId) {
        return;
      }
      runtime.switchTab(tabId);
      syncRuntimeToPage(this, runtime);
    },
    async onOpenArrange() {
      await runPageAction(this, runtime, () => Promise.resolve(runtime.openArrangeSheet()));
    },
    onCloseArrange() {
      runtime.closeArrangeSheet();
      syncRuntimeToPage(this, runtime);
    },
    onArrangeHandleTouchStart(event) {
      this._arrangeHandleTouchStartY = Number(event.touches?.[0]?.clientY ?? 0);
      this._arrangeHandleDragging = true;
    },
    onArrangeHandleTouchMove(event) {
      if (!this._arrangeHandleDragging) {
        return;
      }

      const currentY = Number(event.touches?.[0]?.clientY ?? 0);
      if (currentY < this._arrangeHandleTouchStartY) {
        this._arrangeHandleTouchStartY = currentY;
      }
    },
    onArrangeHandleTouchEnd(event) {
      if (!this._arrangeHandleDragging) {
        return;
      }

      const endY = Number(event.changedTouches?.[0]?.clientY ?? this._arrangeHandleTouchStartY);
      const dragDistance = endY - this._arrangeHandleTouchStartY;
      this._arrangeHandleDragging = false;
      if (dragDistance >= 48) {
        runtime.closeArrangeSheet();
        syncRuntimeToPage(this, runtime);
      }
    },
    onSwitchArrangeTab(event) {
      const arrangeTab = event.currentTarget?.dataset?.arrangeTab;
      if (!arrangeTab) {
        return;
      }
      runtime.switchArrangeTab(arrangeTab);
      syncRuntimeToPage(this, runtime);
    },
    async onStartNewArrangeConversation() {
      await runPageAction(this, runtime, () => runtime.startNewArrangeConversation());
    },
    async onOpenArrangeConversation(event) {
      const conversationId = event.currentTarget?.dataset?.conversationId;
      if (!conversationId) {
        return;
      }
      await runPageAction(this, runtime, () => runtime.openArrangeConversation(conversationId));
    },
    onOpenAttachmentPicker() {
      runtime.openAttachmentPicker();
      syncRuntimeToPage(this, runtime);
    },
    onCloseAttachmentPicker() {
      runtime.closeAttachmentPicker();
      syncRuntimeToPage(this, runtime);
    },
    async onSelectAttachmentAction(event) {
      const attachmentKind = event.currentTarget?.dataset?.attachmentKind;
      if (!attachmentKind) {
        return;
      }

      const attachment =
        attachmentKind === "doc"
          ? { name: "纤维瘤提取.docx", kind: "doc", fileName: "纤维瘤提取.docx" }
          : attachmentKind === "image"
            ? { name: "任务截图.png", kind: "image", fileName: "任务截图.png" }
            : { name: "粘贴文本", kind: "text", fileName: "粘贴文本" };

      await runPageAction(this, runtime, () => runtime.submitAttachment(attachment));
    },
    onDraftInput(event) {
      runtime.setDraftText(event.detail?.value ?? "");
      syncRuntimeToPage(this, runtime);
    },
    onAnswerInput(event) {
      runtime.setAnswerText(event.detail?.value ?? "");
      syncRuntimeToPage(this, runtime);
    },
    onRuntimeApiBaseUrlInput(event) {
      runtime.setRuntimeApiBaseUrlDraft(event.detail?.value ?? "");
      syncRuntimeToPage(this, runtime);
    },
    onSaveRuntimeApiBaseUrl() {
      runtime.saveRuntimeApiBaseUrl();
      syncRuntimeToPage(this, runtime);
    },
    onTimelineHorizontalScroll(event) {
      this.setData({
        timelineHeaderOffsetPx: Number(event.detail?.scrollLeft ?? 0),
      });
    },
    async onSubmitDraft() {
      await runPageAction(this, runtime, () => runtime.submitDraft());
    },
    async onSubmitClarification() {
      await runPageAction(this, runtime, () => runtime.submitClarification());
    },
    async onProposeSchedule() {
      await runPageAction(this, runtime, () => runtime.proposeSchedule());
    },
  });
}
