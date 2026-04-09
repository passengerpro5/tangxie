export function createScheduleView(items = []) {
  const sorted = [...items].sort((a, b) => a.startAt.localeCompare(b.startAt));

  return {
    title: "日程",
    subtitle: "把任务放到时间轴上",
    emptyState: "暂无排期，先安排一个任务。",
    items: sorted,
  };
}
