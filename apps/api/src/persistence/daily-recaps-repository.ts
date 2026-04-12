export type DailyRecapStatus = "draft" | "reviewed" | "confirmed";

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

export type DailyRecapScorecardMetricId = "focus_time" | "streak_days" | "closure";

export interface DailyRecapScorecardMetricRecord {
  id: DailyRecapScorecardMetricId;
  label: string;
  value: string;
}

export interface DailyRecapScorecardRecord {
  title: string;
  tags: string[];
  metrics: DailyRecapScorecardMetricRecord[];
  summary: string;
  shareTitle: string;
  shareSubtitle: string;
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
  scorecard: DailyRecapScorecardRecord | null;
  streakCount: number;
  confirmedAt: Date | null;
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

export interface DailyRecapConfirmInput {
  streakCount: number;
  scorecard: DailyRecapScorecardRecord;
  confirmedAt?: Date;
}

export interface DailyRecapsRepository {
  ensureDraft(dateKey: string): Promise<DailyRecapRecord>;
  findByDateKey(dateKey: string): Promise<DailyRecapRecord | null>;
  review(dateKey: string, input: DailyRecapReviewInput): Promise<DailyRecapRecord>;
  confirm(dateKey: string, input: DailyRecapConfirmInput): Promise<DailyRecapRecord>;
  listConfirmedBefore(dateKey: string): Promise<DailyRecapRecord[]>;
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

function cloneScorecardMetric(metric: DailyRecapScorecardMetricRecord): DailyRecapScorecardMetricRecord {
  return {
    ...metric,
  };
}

function cloneScorecard(scorecard: DailyRecapScorecardRecord | null): DailyRecapScorecardRecord | null {
  if (!scorecard) {
    return null;
  }

  return {
    ...scorecard,
    tags: [...scorecard.tags],
    metrics: scorecard.metrics.map(cloneScorecardMetric),
  };
}

function cloneRecap(recap: DailyRecapRecord): DailyRecapRecord {
  return {
    ...recap,
    tasks: recap.tasks.map(cloneTask),
    completedTaskIds: [...recap.completedTaskIds],
    pendingTasks: recap.pendingTasks.map(clonePendingTask),
    pendingChanges: recap.pendingChanges.map(clonePendingChange),
    scorecard: cloneScorecard(recap.scorecard),
    streakCount: recap.streakCount,
    confirmedAt: recap.confirmedAt ? cloneDate(recap.confirmedAt) : null,
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
        streakCount: 0,
        confirmedAt: null,
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
      const existing = recaps.get(dateKey);
      if (existing?.status === "confirmed") {
        return cloneRecap(existing);
      }

      const timestamp = now();
      const recap: DailyRecapRecord = {
        id: existing?.id ?? createId("daily_recap", ++recapSeq),
        dateKey,
        status: "reviewed",
        tasks: buildTasksFromInput(input),
        completedTaskIds: [...input.completedTaskIds],
        pendingTasks: input.pendingTasks.map(clonePendingTask),
        pendingChanges: input.pendingChanges.map(clonePendingChange),
        requiresScheduleConfirmation: input.requiresScheduleConfirmation,
        scorecard: null,
        streakCount: existing?.streakCount ?? 0,
        confirmedAt: existing?.confirmedAt ? cloneDate(existing.confirmedAt) : null,
        reviewedAt: cloneDate(timestamp),
        createdAt: existing?.createdAt ? cloneDate(existing.createdAt) : cloneDate(timestamp),
        updatedAt: cloneDate(timestamp),
      };

      recaps.set(dateKey, recap);
      return cloneRecap(recap);
    },
    async confirm(dateKey, input) {
      const existing = recaps.get(dateKey);
      const timestamp = input.confirmedAt ? cloneDate(input.confirmedAt) : now();
      const recap: DailyRecapRecord = {
        id: existing?.id ?? createId("daily_recap", ++recapSeq),
        dateKey,
        status: "confirmed",
        tasks: existing?.tasks.map(cloneTask) ?? [],
        completedTaskIds: existing?.completedTaskIds ? [...existing.completedTaskIds] : [],
        pendingTasks: existing?.pendingTasks.map(clonePendingTask) ?? [],
        pendingChanges: existing?.pendingChanges.map(clonePendingChange) ?? [],
        requiresScheduleConfirmation: existing?.requiresScheduleConfirmation ?? false,
        scorecard: cloneScorecard(input.scorecard),
        streakCount: input.streakCount,
        confirmedAt: cloneDate(timestamp),
        reviewedAt: existing?.reviewedAt ? cloneDate(existing.reviewedAt) : cloneDate(timestamp),
        createdAt: existing?.createdAt ? cloneDate(existing.createdAt) : cloneDate(timestamp),
        updatedAt: cloneDate(timestamp),
      };

      recaps.set(dateKey, recap);
      return cloneRecap(recap);
    },
    async listConfirmedBefore(dateKey) {
      return [...recaps.values()]
        .filter((recap) => recap.status === "confirmed" && recap.dateKey < dateKey)
        .sort((left, right) => right.dateKey.localeCompare(left.dateKey))
        .map(cloneRecap);
    },
  };
}
