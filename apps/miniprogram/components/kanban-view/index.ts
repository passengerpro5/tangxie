export interface KanbanTask {
  id: string;
  title: string;
  status: string;
}

export interface KanbanColumn {
  id: string;
  title: string;
  count: number;
  tasks: KanbanTask[];
}

export interface KanbanViewModel {
  title: string;
  subtitle: string;
  columns: KanbanColumn[];
}

const COLUMN_DEFS = [
  { id: "needs_info", title: "待补信息" },
  { id: "scheduled", title: "已安排" },
  { id: "done", title: "已完成" },
  { id: "overdue", title: "已逾期" },
] as const;

export function createKanbanView(tasks: KanbanTask[] = []): KanbanViewModel {
  const columns = COLUMN_DEFS.map((column) => {
    const columnTasks = tasks.filter((task) => task.status === column.id);
    return {
      id: column.id,
      title: column.title,
      count: columnTasks.length,
      tasks: columnTasks,
    };
  });

  return {
    title: "任务看板",
    subtitle: "看见任务进度和阻塞点",
    columns,
  };
}
