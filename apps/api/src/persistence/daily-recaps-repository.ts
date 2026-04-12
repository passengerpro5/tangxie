export type DailyRecapStatus = "draft" | "reviewed";

export type DailyRecapTaskProgressState = "not_started" | "partial" | "almost_done";

export type DailyRecapTaskAction =
  | "keep"
  | "move_tomorrow"
  | "move_later_this_week"
  | "pause";

export interface DailyRecapTaskRecord {
  taskId: string;
  completed: boolean;
}

export interface DailyRecapPendingTaskRecord {
  taskId: string;
  progressState: DailyRecapTaskProgressState;
  action: DailyRecapTaskAction;
}

export interface DailyRecapPendingChangeRecord {
  taskId: string;
  kind: "move_block" | "pause_task";
  label: string;
}

export interface DailyRecapRecord {
  id: string;
  dateKey: string;
  status: DailyRecapStatus;
  tasks: DailyRecapTaskRecord[];
  completedTaskIds: string[];
  pendingTasks: DailyRecapPendingTaskRecord[];
  pendingChanges: DailyRecapPendingChangeRecord[];
  requiresScheduleConfirmation: boolean;
  scorecard: null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DailyRecapReviewInput {
  completedTaskIds: string[];
  pendingTasks: DailyRecapPendingTaskRecord[];
  pendingChanges: DailyRecapPendingChangeRecord[];
  requiresScheduleConfirmation: boolean;
}

export interface DailyRecapsRepository {
  ensureDraft(dateKey: string): Promise<DailyRecapRecord>;
  findByDateKey(dateKey: string): Promise<DailyRecapRecord | null>;
  review(dateKey: string, input: DailyRecapReviewInput): Promise<DailyRecapRecord>;
}

export interface InMemoryDailyRecapsRepositoryOptions {
  now?: () => Date;
}

function createId(prefix: string, seed: number) {
  return `${prefix}_${seed.toString(36)}`;
}

function cloneDate(date: Date) {
  return new Date(date.getTime());
}

function cloneTask(task: DailyRecapTaskRecord): DailyRecapTaskRecord {
  return {
    ...task,
  };
}

function clonePendingTask(task: DailyRecapPendingTaskRecord): DailyRecapPendingTaskRecord {
  return {
    ...task,
  };
}

function clonePendingChange(change: DailyRecapPendingChangeRecord): DailyRecapPendingChangeRecord {
  return {
    ...change,
  };
}

function cloneRecap(recap: DailyRecapRecord): DailyRecapRecord {
  return {
    ...recap,
    tasks: recap.tasks.map(cloneTask),
    completedTaskIds: [...recap.completedTaskIds],
    pendingTasks: recap.pendingTasks.map(clonePendingTask),
    pendingChanges: recap.pendingChanges.map(clonePendingChange),
    reviewedAt: recap.reviewedAt ? cloneDate(recap.reviewedAt) : null,
    createdAt: cloneDate(recap.createdAt),
    updatedAt: cloneDate(recap.updatedAt),
  };
}

function buildTasksFromInput(input: DailyRecapReviewInput): DailyRecapTaskRecord[] {
  const completed = new Set(input.completedTaskIds);
  const tasks = input.completedTaskIds.map((taskId) => ({
    taskId,
    completed: true,
  }));

  for (const task of input.pendingTasks) {
    if (completed.has(task.taskId)) {
      continue;
    }

    tasks.push({
      taskId: task.taskId,
      completed: false,
    });
  }

  return tasks;
}

export function createInMemoryDailyRecapsRepository(
  options: InMemoryDailyRecapsRepositoryOptions = {},
): DailyRecapsRepository {
  const now = options.now ?? (() => new Date());
  let recapSeq = 0;
  const recaps = new Map<string, DailyRecapRecord>();

  return {
    async ensureDraft(dateKey) {
      const existing = recaps.get(dateKey);
      if (existing) {
        return cloneRecap(existing);
      }

      const timestamp = now();
      const recap: DailyRecapRecord = {
        id: createId("daily_recap", ++recapSeq),
        dateKey,
        status: "draft",
        tasks: [],
        completedTaskIds: [],
        pendingTasks: [],
        pendingChanges: [],
        requiresScheduleConfirmation: false,
        scorecard: null,
        reviewedAt: null,
        createdAt: cloneDate(timestamp),
        updatedAt: cloneDate(timestamp),
      };

      recaps.set(dateKey, recap);
      return cloneRecap(recap);
    },
    async findByDateKey(dateKey) {
      const recap = recaps.get(dateKey);
      return recap ? cloneRecap(recap) : null;
    },
    async review(dateKey, input) {
      const timestamp = now();
      const recap: DailyRecapRecord = {
        id: recaps.get(dateKey)?.id ?? createId("daily_recap", ++recapSeq),
        dateKey,
        status: "reviewed",
        tasks: buildTasksFromInput(input),
        completedTaskIds: [...input.completedTaskIds],
        pendingTasks: input.pendingTasks.map(clonePendingTask),
        pendingChanges: input.pendingChanges.map(clonePendingChange),
        requiresScheduleConfirmation: input.requiresScheduleConfirmation,
        scorecard: null,
        reviewedAt: cloneDate(timestamp),
        createdAt: recaps.get(dateKey)?.createdAt ? cloneDate(recaps.get(dateKey)!.createdAt) : cloneDate(timestamp),
        updatedAt: cloneDate(timestamp),
      };

      recaps.set(dateKey, recap);
      return cloneRecap(recap);
    },
  };
}
