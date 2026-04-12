export function createKanbanView(tasks = []) {
  const normalizedTasks = tasks.map((task) => ({
    ...task,
    summary: task.summary ?? "",
    deadlineAt: task.deadlineAt ?? task.scheduleSegments?.[0]?.startAt ?? "9999-12-31T00:00:00.000Z",
    deadlineLabel: task.deadlineLabel ?? "待确认",
    priorityLabel: task.priorityLabel ?? "P2",
    categoryId: task.categoryId ?? task.status,
    categoryTitle: task.categoryTitle ?? "其他任务",
    scheduleSegments: task.scheduleSegments ?? [],
  }));
  const sortedTasks = [...normalizedTasks].sort((left, right) => {
    const categoryCompare = left.categoryTitle.localeCompare(right.categoryTitle, "zh-CN");
    if (categoryCompare !== 0) {
      return categoryCompare;
    }

    return left.deadlineAt.localeCompare(right.deadlineAt);
  });
  const groupMap = new Map();
  for (const task of sortedTasks) {
    const groupId = task.categoryId || task.status;
    const existing = groupMap.get(groupId);
    if (existing) {
      existing.tasks.push(task);
      existing.count += 1;
      continue;
    }

    groupMap.set(groupId, {
      id: groupId,
      title: task.categoryTitle,
      count: 1,
      tasks: [task],
    });
  }
  const groups = [...groupMap.values()].sort((left, right) => {
    const leftDeadline = left.tasks[0]?.deadlineAt ?? "";
    const rightDeadline = right.tasks[0]?.deadlineAt ?? "";
    return leftDeadline.localeCompare(rightDeadline);
  });

  return {
    title: "事项",
    subtitle: "按分类查看任务、排期和执行建议",
    emptyState: "暂无任务，先去安排一个任务。",
    groups,
  };
}
