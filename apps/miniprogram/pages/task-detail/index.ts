import type { ArrangeHistoryEntry } from "../../components/arrange-sheet/index.ts";

export interface TaskDetailModel {
  title: string;
  subtitle: string;
  statusLabel: string;
  deadlineLabel: string;
  durationLabel: string;
  priorityLabel: string;
  sourceLabel: string;
  history: ArrangeHistoryEntry[];
  actions: Array<{ id: string; label: string }>;
}

export function createTaskDetailPage(task: {
  title: string;
  statusLabel?: string;
  deadlineLabel?: string;
  durationLabel?: string;
  priorityLabel?: string;
  sourceLabel?: string;
}): TaskDetailModel {
  return {
    title: task.title,
    subtitle: "查看任务来源、排期和提醒",
    statusLabel: task.statusLabel ?? "待安排",
    deadlineLabel: task.deadlineLabel ?? "未设置 deadline",
    durationLabel: task.durationLabel ?? "未估算时长",
    priorityLabel: task.priorityLabel ?? "未排序",
    sourceLabel: task.sourceLabel ?? "文本输入",
    history: [
      {
        id: "task-detail-history-1",
        title: "已抽取任务",
        summary: "系统从用户输入中提取出任务标题和内容。",
        updatedAt: "2026-04-08 09:30",
      },
    ],
    actions: [
      { id: "done", label: "标记完成" },
      { id: "reschedule", label: "重新安排" },
      { id: "edit", label: "编辑信息" },
      { id: "history", label: "查看提取记录" },
    ],
  };
}
