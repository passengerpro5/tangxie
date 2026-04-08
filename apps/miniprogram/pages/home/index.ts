import { createArrangeSheet, type ArrangeSheetModel } from "../../components/arrange-sheet/index.ts";
import { createKanbanView, type KanbanTask, type KanbanViewModel } from "../../components/kanban-view/index.ts";
import { createScheduleView, type ScheduleViewItem, type ScheduleViewModel } from "../../components/schedule-view/index.ts";

export type HomeTabId = "schedule" | "kanban";

export interface HomeTabModel {
  id: HomeTabId;
  label: string;
}

export interface HomeTaskCard extends ScheduleViewItem, KanbanTask {
  deadlineLabel: string;
  durationLabel: string;
  priorityLabel: string;
  importanceReason: string;
}

export interface HomePageModel {
  brand: string;
  title: string;
  subtitle: string;
  tabs: HomeTabModel[];
  activeTab: HomeTabId;
  primaryActionText: string;
  scheduleView: ScheduleViewModel;
  kanbanView: KanbanViewModel;
  arrangeSheet: ArrangeSheetModel;
  tasks: HomeTaskCard[];
  refresh?: (confirmedBlocks: Array<{
    id: string;
    taskId: string;
    title: string;
    startAt: string;
    endAt: string;
    durationMinutes: number;
    status: "confirmed";
  }>) => HomePageModel;
}

const DEFAULT_TASKS: HomeTaskCard[] = [
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

function createTabs(): HomeTabModel[] {
  return [
    { id: "schedule", label: "日程" },
    { id: "kanban", label: "任务看板" },
  ];
}

export function buildHomePage(input: { tasks?: HomeTaskCard[]; activeTab?: HomeTabId } = {}): HomePageModel {
  const tasks = input.tasks ?? DEFAULT_TASKS;
  const home: HomePageModel = {
    brand: "Time Sheet",
    title: "糖蟹",
    subtitle: "自动排期和按时提醒",
    tabs: createTabs(),
    activeTab: input.activeTab ?? "schedule",
    primaryActionText: "安排任务",
    scheduleView: createScheduleView(tasks),
    kanbanView: createKanbanView(tasks),
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

function toHomeTaskCard(block: {
  id: string;
  taskId: string;
  title: string;
  startAt: string;
  endAt: string;
  durationMinutes: number;
  status: "confirmed";
}): HomeTaskCard {
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

export function refreshHomePage(
  home: HomePageModel,
  confirmedBlocks: Array<{
    id: string;
    taskId: string;
    title: string;
    startAt: string;
    endAt: string;
    durationMinutes: number;
    status: "confirmed";
  }>,
) {
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

export function switchHomeTab(home: HomePageModel, tabId: HomeTabId) {
  home.activeTab = tabId;
  return home;
}

export function openArrangeSheet(home: HomePageModel) {
  home.arrangeSheet = createArrangeSheet({
    draftText: home.arrangeSheet.draftText,
    attachments: home.arrangeSheet.attachments,
    history: home.arrangeSheet.history,
  });
  return home;
}
