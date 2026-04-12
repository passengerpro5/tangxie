export function createTaskDetailPage(task) {
  const content = task.content ?? task.summary ?? "这是一个待进一步补充的任务说明。";
  const aiSuggestions = task.aiSuggestions ?? task.suggestions ?? [
    "先补充 deadline 和预计时长，再生成更稳定的执行计划。",
  ];
  const executionPlan = task.executionPlan ?? [
    { id: "task-plan-1", label: "等待生成具体排期", statusLabel: "待安排" },
  ];
  const sections = [
    {
      id: "overview",
      title: "任务概览",
      summary: content,
      items: [
        { id: "overview-task-name", label: "任务名称", value: task.taskName ?? task.title },
        { id: "overview-time-range", label: "时间范围", value: task.timeRangeLabel ?? "未设置时间段" },
        { id: "overview-category", label: "分类", value: task.categoryTitle ?? "未分类" },
      ],
    },
    {
      id: "execution-plan",
      title: "执行计划",
      items: executionPlan.map((item) => ({
        id: item.id,
        label: item.label,
        value: item.statusLabel,
      })),
    },
    {
      id: "ai-suggestions",
      title: "AI 建议",
      items: aiSuggestions.map((suggestion, index) => ({
        id: `ai-suggestion-${index + 1}`,
        label: `建议 ${index + 1}`,
        value: suggestion,
      })),
    },
  ];

  return {
    title: task.title,
    taskName: task.taskName ?? task.title,
    subtitle: "查看任务详情、执行计划和建议",
    summary: content,
    content,
    timeRangeLabel: task.timeRangeLabel ?? "未设置时间段",
    parentTaskTitle: task.parentTaskTitle,
    categoryTitle: task.categoryTitle ?? "未分类",
    statusLabel: task.statusLabel ?? "待安排",
    deadlineLabel: task.deadlineLabel ?? "未设置 deadline",
    durationLabel: task.durationLabel ?? "未估算时长",
    priorityLabel: task.priorityLabel ?? "未排序",
    sourceLabel: task.sourceLabel ?? "文本输入",
    meta: {
      timeRangeLabel: task.timeRangeLabel ?? "未设置时间段",
      parentTaskTitle: task.parentTaskTitle,
      categoryTitle: task.categoryTitle ?? "未分类",
      statusLabel: task.statusLabel ?? "待安排",
      deadlineLabel: task.deadlineLabel ?? "未设置 deadline",
      durationLabel: task.durationLabel ?? "未估算时长",
      priorityLabel: task.priorityLabel ?? "未排序",
      sourceLabel: task.sourceLabel ?? "文本输入",
    },
    sections,
    history: [
      {
        id: "task-detail-history-1",
        title: "已抽取任务",
        summary: "系统从用户输入中提取出任务标题和内容。",
        updatedAt: "2026-04-08 09:30",
      },
    ],
    executionPlan,
    suggestions: aiSuggestions,
    aiSuggestions,
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
