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

  return {
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
