export function createTaskDetailPage(task) {
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

export function registerTaskDetailPage() {
  if (typeof globalThis.Page !== "function") {
    return;
  }

  globalThis.Page({
    data: createTaskDetailPage({
      title: "任务详情",
    }),
  });
}

registerTaskDetailPage();
