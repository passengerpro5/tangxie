import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { access } from "node:fs/promises";
import test from "node:test";

import { buildHomePage, openArrangeSheet, refreshHomePage } from "../pages/home/index.ts";
import { createArrangeFlow } from "../components/arrange-sheet/index.ts";

function setValueAtMiniProgramPath(target: Record<string, unknown>, path: string, value: unknown) {
  const segments = path.match(/[^.[\]]+/g) ?? [];
  if (!segments.length) {
    return;
  }

  let cursor: Record<string, unknown> | unknown[] = target;
  for (let index = 0; index < segments.length - 1; index += 1) {
    const segment = segments[index]!;
    const nextSegment = segments[index + 1]!;
    const key = /^\d+$/.test(segment) ? Number(segment) : segment;
    const nextValue =
      (cursor as Record<string, unknown> | unknown[])[key as keyof typeof cursor] ??
      (/^\d+$/.test(nextSegment) ? [] : {});
    (cursor as Record<string, unknown> | unknown[])[key as keyof typeof cursor] = nextValue;
    cursor = nextValue as Record<string, unknown> | unknown[];
  }

  const lastSegment = segments.at(-1)!;
  const finalKey = /^\d+$/.test(lastSegment) ? Number(lastSegment) : lastSegment;
  (cursor as Record<string, unknown> | unknown[])[finalKey as keyof typeof cursor] = value;
}

function applyMiniProgramSetData(target: Record<string, unknown>, patch: Record<string, unknown>) {
  for (const [key, value] of Object.entries(patch)) {
    setValueAtMiniProgramPath(target, key, value);
  }
}

test("mini program smoke covers tabs, arrange entry, and refresh wiring", async () => {
  const home = buildHomePage();

  assert.deepEqual(
    home.tabs.map((tab) => tab.label),
    ["日程", "事项", "排期"],
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
  assert.equal(template.includes('class="surface-shell"'), true);
  assert.equal(template.includes("planner-toast"), true);
  assert.equal(template.includes('class="primary-tabs primary-tabs-floating"'), true);
  assert.equal(template.includes('class="primary-tab {{activeTab === tab.id ? \'primary-tab-active\' : \'\'}}"'), true);
  assert.equal(template.includes('wx:if="{{activeTab === \'schedule\'}}" class="timeline-panel surface-panel"'), true);
  assert.equal(template.includes('wx:if="{{activeTab === \'kanban\'}}" class="kanban-panel surface-panel"'), true);
  assert.equal(template.includes('wx:if="{{activeTab === \'planning\'}}" class="planning-panel surface-panel"'), true);
  assert.equal(template.includes("甘特"), false);
  assert.equal(template.includes("当前窗口"), false);
  assert.equal(template.includes('class="planning-toolbar"'), true);
  assert.equal(template.includes('class="planning-range-caption"'), false);
  assert.equal(template.includes('class="planning-range-badge"'), true);
  assert.equal(template.includes('class="planning-range-label"'), true);
  assert.equal(template.includes('class="control-strip control-strip-meta-only"'), false);
  assert.equal(template.includes('class="schedule-summary'), true);
  assert.equal(template.includes('bindtap="onToggleScheduleSummary"'), true);
  assert.equal(template.includes("scheduleSummaryExpanded"), true);
  assert.equal(template.includes('home.surfaceStates.schedule.scheduleSummary.expandedMetrics.length'), true);
  assert.equal(template.includes('class="schedule-summary-toggle-icon {{scheduleSummaryExpanded ? \'schedule-summary-toggle-icon-expanded\' : \'\'}}"'), true);
  assert.equal(template.includes('home.surfaceStates.schedule.scheduleSummary.compactMetrics'), true);
  assert.equal(template.includes('home.surfaceStates.schedule.scheduleSummary.expandedMetrics'), true);
  assert.equal(template.includes('wx:for="{{home.planningView.periods}}"'), true);
  assert.equal(template.includes('data-planning-period="{{period.id}}"'), true);
  assert.equal(template.includes('bindtap="onSwitchPlanningPeriod"'), true);
  assert.equal(template.includes('class="planning-period-chip planning-period-chip-static"'), false);
  assert.equal(template.includes('wx:for="{{home.planningView.taskColumns}}"'), true);
  assert.equal(template.includes('wx:for="{{column.bars}}"'), true);
  assert.equal(template.includes('wx:for="{{home.planningView.timeSlots}}"'), true);
  assert.equal(template.includes('class="timeline-stage"'), true);
  assert.equal(template.includes("planner-sheet "), true);
  assert.equal(template.includes('class="planner-thread"'), true);
  assert.equal(template.includes('class="planner-composer"'), true);
  assert.equal(template.includes("sheetVisible"), true);
  assert.equal(template.includes("sheetAnimationState"), true);
  assert.equal(template.includes("历史记录"), true);

  assert.equal(template.includes('wx:for="{{home.tabs}}"'), true);
  assert.equal(template.includes('bindtap="onTapTab"'), true);
  assert.equal(template.includes('data-tab-id="{{tab.id}}"'), true);
  assert.equal(template.includes('class="tab-strip"'), false);

  assert.equal(template.includes('wx:for="{{home.timelineView.days}}"'), true);
  assert.equal(template.includes('wx:for="{{home.timelineView.timeSlots}}"'), true);
  assert.equal(template.includes('wx:for="{{home.timelineView.visibleDayCountOptions}}"'), true);
  assert.equal(template.includes('wx:for="{{day.blocks}}"'), true);
  assert.equal(template.includes('class="timeline-block timeline-block-{{block.status}}'), true);
  assert.equal(template.includes('data-task-id="{{block.taskId}}"'), true);
  assert.equal(template.includes('{{home.timelineView.timezoneLabel}}'), false);
  assert.equal(template.includes('bindtap="onToggleTimelineDayRangeMenu"'), true);
  assert.equal(template.includes('bindtap="onSelectTimelineDayRange"'), true);
  assert.equal(template.includes('timelineDayRangeMenuOpen'), true);
  assert.equal(template.includes('style="width: {{home.timelineView.dayColumnWidthRpx}}rpx;"'), true);
  assert.equal(template.includes('scroll-top="{{planningScrollTop}}"'), true);
  assert.equal(template.includes('bindscroll="onPlanningVerticalScroll"'), true);
  assert.equal(template.includes('bindscrolltoupper="onPlanningVerticalScrollToUpper"'), true);
  assert.equal(template.includes('bindscrolltolower="onPlanningVerticalScrollToLower"'), true);
  assert.equal(template.includes('upper-threshold="120"'), true);
  assert.equal(template.includes('lower-threshold="120"'), true);
  assert.equal(template.includes('scroll-x="{{!timelineEditingBlockId}}"'), true);
  assert.equal(template.includes('scroll-y="{{!timelineEditingBlockId}}"'), true);
  assert.equal(template.includes('scroll-left="{{timelineScrollLeft}}"'), true);
  assert.equal(template.includes('transform: translateX(-{{timelineHeaderOffsetPx}}px);'), true);
  assert.equal(template.includes('scroll-top="{{timelineScrollTop}}"'), true);
  assert.equal((template.match(/bindscroll="onTimelineHorizontalScroll"/g) ?? []).length, 2);
  assert.equal(template.includes('bindscroll="onTimelineVerticalScroll"'), false);
  assert.equal(template.includes("date-rail-day-past"), true);
  assert.equal(template.includes("timeline-day-column-past"), true);
  assert.equal(template.includes('wx:for="{{home.kanbanView.columns}}"'), false);
  assert.equal(template.includes('wx:for="{{home.kanbanView.groups}}"'), true);
  assert.equal(template.includes('wx:for="{{home.kanbanView.gantt.days}}"'), false);
  assert.equal(template.includes('wx:for="{{home.kanbanView.gantt.rows}}"'), false);
  assert.equal(template.includes('wx:for="{{group.tasks}}"'), true);
  assert.equal(template.includes("task-board-gantt"), false);
  assert.equal(template.includes('bindtap="onOpenTaskDetail"'), true);
  assert.equal(template.includes('bindtap="onCloseTaskDetail"'), true);
  assert.equal(template.includes("taskDetailVisible"), true);
  assert.equal(template.includes("selectedTaskDetail"), true);
  assert.equal(template.includes("task-detail-sheet"), true);
  assert.equal(template.includes('class="task-detail-hero"'), true);
  assert.equal(template.includes('class="task-detail-section-list"'), true);
  assert.equal(template.includes('class="task-detail-history-card"'), true);
  assert.equal(template.includes('wx:for="{{selectedTaskDetail.sections}}"'), true);
  assert.equal(template.includes('wx:for="{{selectedTaskDetail.history}}"'), true);
  assert.equal(template.includes("时间范围"), true);
  assert.equal(template.includes('bindtap="onOpenArrange"'), true);

  assert.equal(template.includes('wx:if="{{sheetOpen}}"'), false);
  assert.equal(template.includes('wx:if="{{sheetVisible}}"'), true);
  assert.equal(template.includes('class="planner-sheet-title"'), true);
  assert.equal(template.includes('bindtouchstart="onArrangeHandleTouchStart"'), true);
  assert.equal(template.includes('bindtouchmove="onArrangeHandleTouchMove"'), true);
  assert.equal(template.includes('bindtouchend="onArrangeHandleTouchEnd"'), true);
  assert.equal(template.includes('bindinput="onDraftInput"'), true);
  assert.equal(template.includes('bindinput="onAnswerInput"'), true);
  assert.equal(template.includes('bindtap="onOpenAttachmentPicker"'), true);
  assert.equal(template.includes('bindtap="onSelectAttachmentAction"'), true);
  assert.equal(template.includes('bindtap="onStartNewArrangeConversation"'), true);
  assert.equal(template.includes('bindtap="onSwitchArrangeTab"'), true);
  assert.equal(template.includes('bindtap="onOpenArrangeConversation"'), true);
  assert.equal(template.includes("新会话"), true);
  assert.equal(template.includes('data-arrange-tab="{{tab.id}}"'), true);
  assert.equal(template.includes('data-conversation-id="{{entry.id}}"'), true);
  assert.equal(template.includes('bindtap="onSubmitDraft"'), true);
  assert.equal(template.includes('bindtap="onSubmitClarification"'), true);
  assert.equal(template.includes('bindtap="onProposeSchedule"'), true);
  assert.equal(template.includes('disabled="{{loading || !canSubmitDraft}}"'), true);
  assert.equal(template.includes('disabled="{{loading || !canSubmitAnswer}}"'), true);
  assert.equal(template.includes("planner-send-inline-label-disabled"), true);
  assert.equal(template.includes('class="planner-composer-shell"'), true);
  assert.equal(template.includes("planner-input-shell-ready"), false);
  assert.equal(template.includes('class="planner-tool planner-tool-add planner-tool-inline"'), true);
  assert.equal(template.includes('class="planner-send-inline"'), true);
  assert.equal(template.includes("稍等"), false);
  assert.equal(template.includes('class="planner-attachment-menu"'), true);
  assert.equal(template.includes('class="planner-attachment-action-icon"'), true);
  assert.equal(template.includes('class="planner-attachment-action-text"'), true);
  assert.equal(template.includes('class="planner-runtime-config"'), false);
  assert.equal(template.includes('bindinput="onRuntimeApiBaseUrlInput"'), false);
  assert.equal(template.includes('bindtap="onSaveRuntimeApiBaseUrl"'), false);
  assert.equal(template.includes("当前 API"), false);
  assert.equal(template.includes('wx:for="{{home.arrangeSheet.threadItems}}"'), true);
  assert.equal(template.includes('wx:for="{{home.arrangeSheet.tabs}}"'), true);
  assert.equal(template.includes('wx:if="{{arrangeTab === \'history\'}}"'), true);
  assert.equal(template.includes('wx:if="{{arrangeTab === \'arrange\'}}"'), true);
  assert.equal(template.includes('class="planner-message planner-message-{{item.kind}}"'), true);
  assert.equal(template.includes('class="planner-thread-action"'), true);
  assert.equal(template.includes('class="planner-thread-divider"'), true);
  assert.equal(template.includes('class="planner-empty-state"'), true);
  assert.equal(template.includes('class="planner-empty-card"'), true);
  assert.equal(template.includes('class="planner-history-arrow"'), true);
  assert.equal(template.includes("告诉糖蟹你的任务，它会帮你拆解并安排时间。"), true);
  assert.equal(template.includes('wx:if="{{item.kind === \'status_divider\'}}"'), true);
  assert.equal(template.includes('wx:if="{{item.kind === \'ready\'}}" class="planner-message-head"'), true);
  assert.equal(template.includes('wx:if="{{attachmentPickerOpen && arrangeTab === \'arrange\'}}"'), true);

  assert.equal(template.includes("{{loading}}"), true);
  assert.equal(template.includes("{{toastMessage}}"), true);
  assert.equal(template.includes("{{toastVisible}}"), true);
  assert.equal(template.includes('<view wx:if="{{item.body}}" class="planner-message-body">{{item.body}}</view>'), true);
  assert.equal(template.includes('{{item.actionLabel}}'), true);
  assert.equal(template.includes("{{item.attachmentName}}"), true);
  assert.equal(template.includes("关闭"), false);
  assert.equal(template.includes("planner-sheet-close-icon"), false);
  assert.equal(template.includes("planner-sheet-close"), false);
  assert.equal(template.includes("status-banner"), false);
});

test("javascript mirrors keep WeChat DevTools runtime and API handlers in sync", async () => {
  const [apiJs, runtimeJs, indexJs] = await Promise.all([
    readFile(new URL("../services/api.js", import.meta.url), "utf8"),
    readFile(new URL("../pages/home/runtime.js", import.meta.url), "utf8"),
    readFile(new URL("../pages/home/index.js", import.meta.url), "utf8"),
  ]);

  assert.equal(apiJs.includes("updateTaskScheduleBlock("), true);
  assert.equal(apiJs.includes('`/tasks/${taskId}/schedule-blocks/${blockId}`'), true);

  assert.equal(runtimeJs.includes("previewTaskScheduleBlock(taskId, blockId, payload)"), true);
  assert.equal(runtimeJs.includes("updateTaskScheduleBlock(taskId, blockId, payload)"), true);
  assert.equal(runtimeJs.includes("patchHomeTaskScheduleBlock"), true);
  assert.equal(runtimeJs.includes("supportsTaskScheduleBlockUpdate"), true);
  assert.equal(runtimeJs.includes('actionLabel: "安排"'), true);
  assert.equal(runtimeJs.includes('kind: "status_divider"'), true);

  assert.equal(indexJs.includes("_timelineLongPressTimer"), true);
  assert.equal(indexJs.includes("TIMELINE_EDIT_LONG_PRESS_MS"), true);
  assert.equal(indexJs.includes("onTimelineBlockTouchStart"), true);
  assert.equal(indexJs.includes("onTimelineResizeHandleTouchStart"), true);
  assert.equal(indexJs.includes("finishTimelineEditGesture"), true);
  assert.equal(indexJs.includes("runtime.previewTaskScheduleBlock"), true);
  assert.equal(indexJs.includes("runtime.updateTaskScheduleBlock"), true);
  assert.equal(indexJs.includes("onShow() {"), true);
  assert.equal(indexJs.includes("await runtime.loadTasks();"), true);
  assert.equal(indexJs.includes("onToggleTimelineDayRangeMenu"), true);
  assert.equal(indexJs.includes("onSelectTimelineDayRange"), true);
  assert.equal(indexJs.includes("timelineDayRangeMenuOpen"), true);
  assert.equal(indexJs.includes("visibleDayCountOptions"), true);
});

test("home page source reloads tasks when the page becomes visible again", async () => {
  const indexTs = await readFile(new URL("../pages/home/index.ts", import.meta.url), "utf8");

  assert.equal(indexTs.includes("onShow() {"), true);
  assert.equal(indexTs.includes("await runtime.loadTasks();"), true);
});

test("home page styles preserve multi-line assistant message bodies", async () => {
  const styles = await readFile(new URL("../pages/home/index.wxss", import.meta.url), "utf8");

  assert.equal(styles.includes("white-space: pre-wrap;"), true);
  assert.equal(styles.includes("word-break: break-word;"), true);
  assert.equal(styles.includes(".planner-message-user_input"), true);
  assert.equal(styles.includes(".planner-message-assistant_message"), true);
  assert.equal(styles.includes(".planner-toast"), true);
  assert.equal(styles.includes(".planner-mask-open"), true);
  assert.equal(styles.includes(".planner-sheet-open"), true);
  assert.equal(styles.includes(".planner-sheet-closing"), true);
  assert.equal(styles.includes(".planner-empty-state"), true);
  assert.equal(styles.includes(".planner-empty-card"), true);
  assert.equal(styles.includes(".planner-tab-item-primary"), true);
  assert.equal(styles.includes(".planner-sheet-header"), true);
  assert.equal(styles.includes(".planner-history-card-top"), true);
  assert.equal(styles.includes(".planner-composer-shell"), true);
  assert.equal(styles.includes(".planner-input-shell"), true);
  assert.equal(styles.includes(".planner-input-shell-ready"), true);
  assert.equal(styles.includes(".planner-launch"), true);
  assert.equal(styles.includes(".planner-send-inline"), true);
  assert.equal(styles.includes(".planner-send-inline-button"), true);
  assert.equal(styles.includes(".planner-send-inline-label"), true);
  assert.equal(styles.includes(".planner-send-inline-label-disabled"), true);
  assert.equal(styles.includes(".planner-thread-action"), true);
  assert.equal(styles.includes(".planner-thread-divider"), true);
  assert.equal(styles.includes(".planner-tool-inline"), true);
  assert.equal(styles.includes(".planner-attachment-menu"), true);
  assert.equal(styles.includes(".planner-attachment-action-icon"), true);
  assert.equal(styles.includes(".surface-shell"), true);
  assert.equal(styles.includes(".primary-tabs"), true);
  assert.equal(styles.includes(".primary-tab-active"), true);
  assert.equal(styles.includes(".surface-panel"), true);
  assert.equal(styles.includes("width: 72rpx;"), true);
  assert.equal(styles.includes("height: 72rpx;"), true);
  assert.equal(styles.includes("background: transparent;"), true);
  assert.equal(styles.includes("box-shadow: none;"), true);
  assert.equal(styles.includes("left: 0;"), true);
  assert.equal(styles.includes("right: 0;"), true);
  assert.equal(styles.includes("transform: translateY(2px);"), true);
  assert.equal(styles.includes(".control-strip"), true);
  assert.equal(styles.includes(".control-pill"), true);
  assert.equal(styles.includes(".schedule-summary"), true);
  assert.equal(styles.includes(".summary-metric"), true);
  assert.equal(styles.includes(".planning-panel"), true);
  assert.equal(styles.includes(".planning-toolbar"), true);
  assert.equal(styles.includes(".planning-period-strip"), true);
  assert.equal(styles.includes("grid-template-columns: repeat(5, minmax(0, 1fr));"), true);
  assert.equal(styles.includes("overflow: hidden;"), true);
  assert.equal(styles.includes(".planning-range-caption"), false);
  assert.equal(
    styles.includes("background: linear-gradient(135deg, #ffb15c 0%, #ff8c68 100%);"),
    true,
  );
  assert.equal(styles.includes(".planning-period-chip-static"), false);
  assert.equal(styles.includes(".planning-gantt"), true);
  assert.equal(styles.includes(".planning-task-column"), true);
  assert.equal(styles.includes(".planning-task-bar"), true);
  assert.equal(styles.includes(".task-board-gantt"), false);
  assert.equal(styles.includes(".task-card"), true);
  assert.equal(styles.includes(".task-detail-sheet"), true);
  assert.equal(styles.includes(".tab-strip"), false);
});

test("task detail page template stays read-only and keeps the first-screen hierarchy", async () => {
  const template = await readFile(new URL("../pages/task-detail/index.wxml", import.meta.url), "utf8");

  assert.equal(template.includes('class="detail-shell"'), true);
  assert.equal(template.includes('class="detail-hero"'), true);
  assert.equal(template.includes('class="detail-title"'), true);
  assert.equal(template.includes('class="detail-summary"'), true);
  assert.equal(template.includes('class="detail-primary-meta"'), true);
  assert.equal(template.includes('class="detail-meta-grid"'), true);
  assert.equal(template.includes('class="detail-section-list"'), true);
  assert.equal(template.includes('class="detail-history-card"'), true);
  assert.equal(template.includes('wx:for="{{sections}}"'), true);
  assert.equal(template.includes('wx:for-item="section"'), true);
  assert.equal(template.includes('wx:for="{{section.items}}"'), true);
  assert.equal(template.includes('wx:for="{{history}}"'), true);
  assert.equal(template.includes("只读详情"), true);
  assert.equal(template.includes("时间范围"), true);
  assert.equal(template.includes("所属母任务"), true);
  assert.equal(template.includes("历史记录"), true);
  assert.equal(template.includes('bindtap="'), false);
});

test("task detail page styles keep warm-paper cards compact and mobile-friendly", async () => {
  const styles = await readFile(new URL("../pages/task-detail/index.wxss", import.meta.url), "utf8");

  assert.equal(styles.includes(".detail-page"), true);
  assert.equal(styles.includes(".detail-shell"), true);
  assert.equal(styles.includes(".detail-hero"), true);
  assert.equal(styles.includes(".detail-primary-meta"), true);
  assert.equal(styles.includes(".detail-meta-grid"), true);
  assert.equal(styles.includes(".detail-section-card"), true);
  assert.equal(styles.includes(".detail-history-card"), true);
  assert.equal(styles.includes(".detail-history-marker"), true);
  assert.equal(styles.includes(".detail-history-summary"), true);
  assert.equal(styles.includes("animation: detail-rise"), true);
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

test("registered page shows the arrange sheet immediately while conversation bootstrap is still in flight", async () => {
  const originalPage = (globalThis as typeof globalThis & { Page?: unknown }).Page;
  const originalWx = (globalThis as typeof globalThis & { wx?: unknown }).wx;
  let registeredPageOptions:
    | (Record<string, unknown> & {
        data: Record<string, unknown>;
        onLoad?: () => void;
        onOpenArrange?: () => Promise<void>;
      })
    | null = null;
  const pendingRequests: Array<{
    url: string;
    method?: string;
    success: (result: { statusCode: number; data: unknown }) => void;
    fail: (error: { errMsg?: string }) => void;
  }> = [];

  try {
    (globalThis as typeof globalThis & { Page?: unknown }).Page = (options: unknown) => {
      registeredPageOptions = options as typeof registeredPageOptions;
    };
    (globalThis as typeof globalThis & { wx?: unknown }).wx = {
      request(options: {
        url: string;
        method?: string;
        success: (result: { statusCode: number; data: unknown }) => void;
        fail: (error: { errMsg?: string }) => void;
      }) {
        pendingRequests.push(options);
      },
    };

    const moduleUrl = new URL("../pages/home/index.ts", import.meta.url);
    await import(`${moduleUrl.href}?page-register-test=${Date.now()}`);
    assert.ok(registeredPageOptions);

    const page = {
      ...registeredPageOptions,
      data: { ...registeredPageOptions.data },
      setData(nextData: Record<string, unknown>) {
        this.data = {
          ...this.data,
          ...nextData,
        };
      },
    };

    page.onLoad?.call(page);
    const openPromise = page.onOpenArrange?.call(page);
    await new Promise((resolve) => setTimeout(resolve, 0));

    assert.equal(page.data.sheetVisible, true);
    assert.equal(page.data.sheetAnimationState, "enter");
    assert.equal(pendingRequests.length, 2);
    assert.equal(pendingRequests[0]?.method, "GET");
    assert.match(String(pendingRequests[0]?.url ?? ""), /\/tasks$/);
    assert.equal(pendingRequests[1]?.method, "GET");
    assert.match(String(pendingRequests[1]?.url ?? ""), /\/arrange\/conversations$/);

    pendingRequests.shift()?.success({
      statusCode: 200,
      data: { items: [] },
    });
    pendingRequests.shift()?.success({
      statusCode: 200,
      data: { items: [] },
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    assert.equal(pendingRequests.length, 1);
    assert.equal(pendingRequests[0]?.method, "POST");
    assert.match(String(pendingRequests[0]?.url ?? ""), /\/arrange\/conversations$/);

    pendingRequests.shift()?.success({
      statusCode: 200,
      data: {
        conversation: {
          id: "conv_1",
          title: "新对话",
          summary: null,
          status: "active",
          createdAt: "2026-04-10T00:00:00.000Z",
          updatedAt: "2026-04-10T00:00:00.000Z",
          lastMessageAt: "2026-04-10T00:00:00.000Z",
        },
        messages: [],
        snapshot: {
          title: null,
          summary: null,
          tasks: [],
          proposedBlocks: [],
          readyToConfirm: false,
        },
      },
    });

    await openPromise;
    assert.equal(page.data.sheetVisible, true);
    assert.equal(page.data.arrangeTab, "arrange");
  } finally {
    if (originalPage === undefined) {
      delete (globalThis as typeof globalThis & { Page?: unknown }).Page;
    } else {
      (globalThis as typeof globalThis & { Page?: unknown }).Page = originalPage;
    }

    if (originalWx === undefined) {
      delete (globalThis as typeof globalThis & { wx?: unknown }).wx;
    } else {
      (globalThis as typeof globalThis & { wx?: unknown }).wx = originalWx;
    }
  }
});

test("registered page drag preview skips redundant updates and patches only the edited timeline block", async () => {
  const originalPage = (globalThis as typeof globalThis & { Page?: unknown }).Page;
  const originalWx = (globalThis as typeof globalThis & { wx?: unknown }).wx;
  let registeredPageOptions:
    | (Record<string, unknown> & {
        data: Record<string, unknown>;
        onLoad?: () => void;
        onTimelineResizeHandleTouchStart?: (event: Record<string, unknown>) => void;
        onTimelineResizeHandleTouchMove?: (event: Record<string, unknown>) => void;
      })
    | null = null;
  const pendingRequests: Array<{
    url: string;
    method?: string;
    success: (result: { statusCode: number; data: unknown }) => void;
    fail: (error: { errMsg?: string }) => void;
  }> = [];
  const setDataCalls: Array<Record<string, unknown>> = [];

  try {
    (globalThis as typeof globalThis & { Page?: unknown }).Page = (options: unknown) => {
      registeredPageOptions = options as typeof registeredPageOptions;
    };
    (globalThis as typeof globalThis & { wx?: unknown }).wx = {
      request(options: {
        url: string;
        method?: string;
        success: (result: { statusCode: number; data: unknown }) => void;
        fail: (error: { errMsg?: string }) => void;
      }) {
        pendingRequests.push(options);
      },
    };

    const moduleUrl = new URL("../pages/home/index.ts", import.meta.url);
    await import(`${moduleUrl.href}?timeline-drag-preview-test=${Date.now()}`);
    assert.ok(registeredPageOptions);

    const page = {
      ...registeredPageOptions,
      data: JSON.parse(JSON.stringify(registeredPageOptions.data)),
      setData(nextData: Record<string, unknown>) {
        setDataCalls.push(nextData);
        applyMiniProgramSetData(this.data, nextData);
      },
    };

    page.onLoad?.call(page);
    assert.equal(pendingRequests.length, 1);
    pendingRequests.shift()?.success({
      statusCode: 200,
      data: {
        items: [
          {
            id: "task_api_drag",
            title: "拖拽测试任务",
            description: "用于验证拖拽预览更新。",
            sourceType: "text",
            status: "scheduled",
            deadlineAt: "2026-04-11T12:00:00.000Z",
            estimatedDurationMinutes: 120,
            priorityScore: 90,
            priorityRank: 1,
            importanceReason: "test",
            createdByAI: true,
            userConfirmed: true,
            createdAt: "2026-04-11T08:00:00.000Z",
            updatedAt: "2026-04-11T08:30:00.000Z",
            scheduleBlocks: [
              {
                id: "block_api_drag",
                taskId: "task_api_drag",
                title: "拖拽测试任务",
                startAt: "2026-04-11T09:00:00.000Z",
                endAt: "2026-04-11T11:00:00.000Z",
                durationMinutes: 120,
                status: "confirmed",
              },
            ],
          },
        ],
      },
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    setDataCalls.length = 0;
    page.onTimelineResizeHandleTouchStart?.call(page, {
      currentTarget: {
        dataset: {
          taskId: "task_api_drag",
          blockId: "block_api_drag",
          resizeHandle: "bottom",
        },
      },
      touches: [{ clientY: 0 }],
    });
    setDataCalls.length = 0;

    page.onTimelineResizeHandleTouchMove?.call(page, {
      touches: [{ clientY: 1 }],
    });
    assert.equal(setDataCalls.length, 0);

    page.onTimelineResizeHandleTouchMove?.call(page, {
      touches: [{ clientY: 20 }],
    });
    assert.equal(setDataCalls.length, 1);
    const previewPatchKeys = Object.keys(setDataCalls[0] ?? {});
    assert.equal(previewPatchKeys.includes("home"), false);
    assert.equal(previewPatchKeys.some((key) => key.includes(".topRpx")), true);
    assert.equal(previewPatchKeys.some((key) => key.includes(".heightRpx")), true);
    assert.equal(previewPatchKeys.some((key) => key.includes(".startLabel")), true);
    assert.equal(previewPatchKeys.some((key) => key.includes(".endLabel")), true);
  } finally {
    if (originalPage === undefined) {
      delete (globalThis as typeof globalThis & { Page?: unknown }).Page;
    } else {
      (globalThis as typeof globalThis & { Page?: unknown }).Page = originalPage;
    }

    if (originalWx === undefined) {
      delete (globalThis as typeof globalThis & { wx?: unknown }).wx;
    } else {
      (globalThis as typeof globalThis & { wx?: unknown }).wx = originalWx;
    }
  }
});

test("registered page toggles the timeline day-range menu and applies the selected viewport width", async () => {
  const originalPage = (globalThis as typeof globalThis & { Page?: unknown }).Page;
  let registeredPageOptions:
    | (Record<string, unknown> & {
        data: Record<string, unknown>;
        onToggleTimelineDayRangeMenu?: () => void;
        onSelectTimelineDayRange?: (event: Record<string, unknown>) => void;
      })
    | null = null;

  try {
    (globalThis as typeof globalThis & { Page?: unknown }).Page = (options: unknown) => {
      registeredPageOptions = options as typeof registeredPageOptions;
    };

    const moduleUrl = new URL("../pages/home/index.ts", import.meta.url);
    await import(`${moduleUrl.href}?timeline-day-range-test=${Date.now()}`);
    assert.ok(registeredPageOptions);

    const page = {
      ...registeredPageOptions,
      data: JSON.parse(JSON.stringify(registeredPageOptions.data)),
      setData(nextData: Record<string, unknown>) {
        applyMiniProgramSetData(this.data, nextData);
      },
    };

    assert.equal(page.data.timelineDayRangeMenuOpen, false);
    assert.equal(page.data.home.timelineView.visibleDayCount, 3);
    assert.equal(page.data.home.timelineView.dayColumnWidthRpx, 176);

    page.onToggleTimelineDayRangeMenu?.call(page);
    assert.equal(page.data.timelineDayRangeMenuOpen, true);

    page.onSelectTimelineDayRange?.call(page, {
      currentTarget: {
        dataset: {
          dayCount: 5,
        },
      },
    });

    assert.equal(page.data.timelineDayRangeMenuOpen, false);
    assert.equal(page.data.home.timelineView.visibleDayCount, 5);
    assert.equal(page.data.home.timelineView.dayColumnWidthRpx, 106);
    assert.equal(page.data.timelineScrollLeft, page.data.home.timelineView.initialScrollLeftPx);
    assert.equal(page.data.timelineHeaderOffsetPx, page.data.home.timelineView.initialScrollLeftPx);
  } finally {
    if (originalPage === undefined) {
      delete (globalThis as typeof globalThis & { Page?: unknown }).Page;
    } else {
      (globalThis as typeof globalThis & { Page?: unknown }).Page = originalPage;
    }
  }
});

test("registered page persists schedule block updates only after drag end", async () => {
  const originalPage = (globalThis as typeof globalThis & { Page?: unknown }).Page;
  const originalWx = (globalThis as typeof globalThis & { wx?: unknown }).wx;
  let registeredPageOptions:
    | (Record<string, unknown> & {
        data: Record<string, unknown>;
        onLoad?: () => void;
        onTimelineResizeHandleTouchStart?: (event: Record<string, unknown>) => void;
        onTimelineResizeHandleTouchMove?: (event: Record<string, unknown>) => void;
        onTimelineResizeHandleTouchEnd?: () => Promise<void>;
      })
    | null = null;
  const pendingRequests: Array<{
    url: string;
    method?: string;
    success: (result: { statusCode: number; data: unknown }) => void;
    fail: (error: { errMsg?: string }) => void;
  }> = [];

  try {
    (globalThis as typeof globalThis & { Page?: unknown }).Page = (options: unknown) => {
      registeredPageOptions = options as typeof registeredPageOptions;
    };
    (globalThis as typeof globalThis & { wx?: unknown }).wx = {
      request(options: {
        url: string;
        method?: string;
        success: (result: { statusCode: number; data: unknown }) => void;
        fail: (error: { errMsg?: string }) => void;
      }) {
        pendingRequests.push(options);
      },
    };

    const moduleUrl = new URL("../pages/home/index.ts", import.meta.url);
    await import(`${moduleUrl.href}?timeline-drag-persist-test=${Date.now()}`);
    assert.ok(registeredPageOptions);

    const page = {
      ...registeredPageOptions,
      data: JSON.parse(JSON.stringify(registeredPageOptions.data)),
      setData(nextData: Record<string, unknown>) {
        applyMiniProgramSetData(this.data, nextData);
      },
    };

    page.onLoad?.call(page);
    assert.equal(pendingRequests.length, 1);
    pendingRequests.shift()?.success({
      statusCode: 200,
      data: {
        items: [
          {
            id: "task_api_drag_end",
            title: "拖拽保存任务",
            description: "用于验证拖拽结束后才持久化。",
            sourceType: "text",
            status: "scheduled",
            deadlineAt: "2026-04-11T12:00:00.000Z",
            estimatedDurationMinutes: 120,
            priorityScore: 90,
            priorityRank: 1,
            importanceReason: "test",
            createdByAI: true,
            userConfirmed: true,
            createdAt: "2026-04-11T08:00:00.000Z",
            updatedAt: "2026-04-11T08:30:00.000Z",
            scheduleBlocks: [
              {
                id: "block_api_drag_end",
                taskId: "task_api_drag_end",
                title: "拖拽保存任务",
                startAt: "2026-04-11T09:00:00.000Z",
                endAt: "2026-04-11T11:00:00.000Z",
                durationMinutes: 120,
                status: "confirmed",
              },
            ],
          },
        ],
      },
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    page.onTimelineResizeHandleTouchStart?.call(page, {
      currentTarget: {
        dataset: {
          taskId: "task_api_drag_end",
          blockId: "block_api_drag_end",
          resizeHandle: "bottom",
        },
      },
      touches: [{ clientY: 0 }],
    });
    page.onTimelineResizeHandleTouchMove?.call(page, {
      touches: [{ clientY: 20 }],
    });

    assert.equal(pendingRequests.length, 0);

    const finishPromise = page.onTimelineResizeHandleTouchEnd?.call(page);
    assert.equal(pendingRequests.length, 1);
    assert.equal(pendingRequests[0]?.method, "PATCH");
    assert.match(String(pendingRequests[0]?.url ?? ""), /\/tasks\/task_api_drag_end\/schedule-blocks\/block_api_drag_end$/);

    pendingRequests.shift()?.success({
      statusCode: 200,
      data: {
        task: {
          id: "task_api_drag_end",
          title: "拖拽保存任务",
          description: "用于验证拖拽结束后才持久化。",
          sourceType: "text",
          status: "scheduled",
          deadlineAt: "2026-04-11T12:00:00.000Z",
          estimatedDurationMinutes: 150,
          priorityScore: 90,
          priorityRank: 1,
          importanceReason: "test",
          createdByAI: true,
          userConfirmed: true,
          createdAt: "2026-04-11T08:00:00.000Z",
          updatedAt: "2026-04-11T08:45:00.000Z",
        },
        scheduleBlocks: [
          {
            id: "block_api_drag_end",
            taskId: "task_api_drag_end",
            title: "拖拽保存任务",
            startAt: "2026-04-11T09:00:00.000Z",
            endAt: "2026-04-11T11:30:00.000Z",
            durationMinutes: 150,
            status: "confirmed",
          },
        ],
      },
    });

    await finishPromise;
  } finally {
    if (originalPage === undefined) {
      delete (globalThis as typeof globalThis & { Page?: unknown }).Page;
    } else {
      (globalThis as typeof globalThis & { Page?: unknown }).Page = originalPage;
    }

    if (originalWx === undefined) {
      delete (globalThis as typeof globalThis & { wx?: unknown }).wx;
    } else {
      (globalThis as typeof globalThis & { wx?: unknown }).wx = originalWx;
    }
  }
});
