export interface SchedulingTaskInput {
  id: string;
  title: string;
  deadlineAt: Date | null;
  estimatedDurationMinutes: number | null;
  priorityScore: number | null;
  priorityRank: number | null;
  userConfirmed: boolean;
  createdAt: Date;
}

export interface BusyBlockInput {
  startAt: Date;
  endAt: Date;
}

export interface ScheduleBlockProposal {
  id: string;
  taskId: string;
  title: string;
  startAt: Date;
  endAt: Date;
  durationMinutes: number;
  status: "proposed";
}

export interface ScheduleFailure {
  ok: false;
  reason: "missing-fields" | "does-not-fit" | "unknown-task";
  message: string;
  missingTaskIds?: string[];
  unscheduledTaskIds?: string[];
}

export interface ScheduleSuccess {
  ok: true;
  orderedTaskIds: string[];
  blocks: ScheduleBlockProposal[];
}

export type ScheduleProposalResult = ScheduleSuccess | ScheduleFailure;

function cloneDate(date: Date) {
  return new Date(date.getTime());
}

export function roundUpToInterval(date: Date, minutes: number) {
  const next = cloneDate(date);
  const remainder = next.getUTCMinutes() % minutes;
  if (remainder === 0 && next.getUTCSeconds() === 0 && next.getUTCMilliseconds() === 0) {
    return next;
  }

  const delta = minutes - remainder;
  next.setUTCMinutes(next.getUTCMinutes() + delta);
  next.setUTCSeconds(0, 0);
  return next;
}

export function addMinutes(date: Date, minutes: number) {
  const next = cloneDate(date);
  next.setUTCMinutes(next.getUTCMinutes() + minutes);
  return next;
}

function compareNullableNumber(a: number | null, b: number | null) {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a - b;
}

function compareTasks(a: SchedulingTaskInput, b: SchedulingTaskInput) {
  if (a.userConfirmed !== b.userConfirmed) {
    return a.userConfirmed ? -1 : 1;
  }

  const rankCompare = compareNullableNumber(a.priorityRank, b.priorityRank);
  if (rankCompare !== 0) {
    return rankCompare;
  }

  const deadlineA = a.deadlineAt ? a.deadlineAt.getTime() : Number.POSITIVE_INFINITY;
  const deadlineB = b.deadlineAt ? b.deadlineAt.getTime() : Number.POSITIVE_INFINITY;
  if (deadlineA !== deadlineB) {
    return deadlineA - deadlineB;
  }

  const scoreA = a.priorityScore ?? 0;
  const scoreB = b.priorityScore ?? 0;
  if (scoreA !== scoreB) {
    return scoreB - scoreA;
  }

  return a.createdAt.getTime() - b.createdAt.getTime();
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart.getTime() < bEnd.getTime() && bStart.getTime() < aEnd.getTime();
}

export function findEarliestAvailableSlot(
  cursor: Date,
  durationMinutes: number,
  deadlineAt: Date,
  busyBlocks: BusyBlockInput[] = [],
  intervalMinutes = 15,
) {
  let start = roundUpToInterval(cursor, intervalMinutes);
  const sortedBlocks = [...busyBlocks].sort(
    (a, b) => a.startAt.getTime() - b.startAt.getTime() || a.endAt.getTime() - b.endAt.getTime(),
  );

  while (true) {
    const end = addMinutes(start, durationMinutes);
    if (end.getTime() > deadlineAt.getTime()) {
      return null;
    }

    const conflict = sortedBlocks.find((block) =>
      overlaps(start, end, block.startAt, block.endAt),
    );

    if (!conflict) {
      return { startAt: start, endAt: end };
    }

    start = roundUpToInterval(conflict.endAt, intervalMinutes);
  }
}

export function rankSchedulingTasks(tasks: SchedulingTaskInput[]) {
  return [...tasks].sort(compareTasks);
}

export function validateSchedulingTasks(tasks: SchedulingTaskInput[]) {
  const missingTaskIds = tasks
    .filter((task) => task.deadlineAt === null || task.estimatedDurationMinutes === null)
    .map((task) => task.id);

  if (missingTaskIds.length > 0) {
    return {
      ok: false as const,
      reason: "missing-fields" as const,
      message: "Every task must have a deadline and an estimated duration before scheduling.",
      missingTaskIds,
    };
  }

  return {
    ok: true as const,
  };
}

export function proposeSequentialSchedule(
  tasks: SchedulingTaskInput[],
  busyBlocks: BusyBlockInput[] = [],
  now = new Date(),
): ScheduleProposalResult {
  const validation = validateSchedulingTasks(tasks);
  if (!validation.ok) {
    return validation;
  }

  const orderedTasks = rankSchedulingTasks(tasks);
  const blocks: ScheduleBlockProposal[] = [];
  let cursor = roundUpToInterval(now, 15);

  for (const task of orderedTasks) {
    const slot = findEarliestAvailableSlot(
      cursor,
      task.estimatedDurationMinutes ?? 0,
      task.deadlineAt ?? cursor,
      busyBlocks,
    );

    if (!slot) {
      return {
        ok: false,
        reason: "does-not-fit",
        message: `Task ${task.id} cannot be scheduled before its deadline.`,
        unscheduledTaskIds: orderedTasks.slice(blocks.length).map((item) => item.id),
      };
    }

    blocks.push({
      id: `block_${blocks.length + 1}`,
      taskId: task.id,
      title: task.title,
      startAt: slot.startAt,
      endAt: slot.endAt,
      durationMinutes: task.estimatedDurationMinutes ?? 0,
      status: "proposed",
    });

    cursor = slot.endAt;
  }

  return {
    ok: true,
    orderedTaskIds: orderedTasks.map((task) => task.id),
    blocks,
  };
}
