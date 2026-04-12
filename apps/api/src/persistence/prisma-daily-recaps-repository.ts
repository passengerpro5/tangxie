import type { PrismaClient } from "@prisma/client";
import type {
  DailyRecapPendingChangeRecord,
  DailyRecapPendingTaskRecord,
  DailyRecapRecord,
  DailyRecapScorecardMetricRecord,
  DailyRecapScorecardRecord,
  DailyRecapsRepository,
  DailyRecapConfirmInput,
  DailyRecapReviewInput,
} from "./daily-recaps-repository.ts";

type DailyRecapSnapshotRecord = {
  tasks: DailyRecapRecord["tasks"];
  completedTaskIds: string[];
  pendingTasks: DailyRecapPendingTaskRecord[];
  pendingChanges: DailyRecapPendingChangeRecord[];
  requiresScheduleConfirmation: boolean;
};

function cloneDate(date: Date) {
  return new Date(date.getTime());
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cloneTasks(tasks: DailyRecapRecord["tasks"]) {
  return tasks.map((task) => ({ ...task }));
}

function clonePendingTasks(tasks: DailyRecapPendingTaskRecord[]) {
  return tasks.map((task) => ({ ...task }));
}

function clonePendingChanges(changes: DailyRecapPendingChangeRecord[]) {
  return changes.map((change) => ({ ...change }));
}

function cloneScorecardMetrics(metrics: DailyRecapScorecardMetricRecord[]) {
  return metrics.map((metric) => ({ ...metric }));
}

function cloneScorecard(scorecard: DailyRecapScorecardRecord | null) {
  if (!scorecard) {
    return null;
  }

  return {
    ...scorecard,
    tags: [...scorecard.tags],
    metrics: cloneScorecardMetrics(scorecard.metrics),
  };
}

function createSnapshot(): DailyRecapSnapshotRecord {
  return {
    tasks: [],
    completedTaskIds: [],
    pendingTasks: [],
    pendingChanges: [],
    requiresScheduleConfirmation: false,
  };
}

function buildSnapshotTasks(input: DailyRecapReviewInput): DailyRecapSnapshotRecord["tasks"] {
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

function normalizeSnapshot(value: unknown): DailyRecapSnapshotRecord {
  if (!isObject(value)) {
    return createSnapshot();
  }

  const tasks = Array.isArray(value.tasks)
    ? value.tasks.flatMap((item) =>
        isObject(item) && typeof item.taskId === "string"
          ? [
              {
                taskId: item.taskId,
                completed: Boolean(item.completed),
              },
            ]
          : [],
      )
    : [];

  const completedTaskIds = Array.isArray(value.completedTaskIds)
    ? value.completedTaskIds.filter((item): item is string => typeof item === "string")
    : [];

  const pendingTasks = Array.isArray(value.pendingTasks)
    ? value.pendingTasks.flatMap((item) =>
        isObject(item) &&
        typeof item.taskId === "string" &&
        typeof item.progressState === "string" &&
        typeof item.action === "string"
          ? [
              {
                taskId: item.taskId,
                progressState: item.progressState,
                action: item.action,
              },
            ]
          : [],
      )
    : [];

  const pendingChanges = Array.isArray(value.pendingChanges)
    ? value.pendingChanges.flatMap((item) =>
        isObject(item) &&
        typeof item.taskId === "string" &&
        typeof item.kind === "string" &&
        typeof item.label === "string"
          ? [
              {
                taskId: item.taskId,
                kind: item.kind,
                label: item.label,
              },
            ]
          : [],
      )
    : [];

  return {
    tasks,
    completedTaskIds,
    pendingTasks,
    pendingChanges,
    requiresScheduleConfirmation: Boolean(value.requiresScheduleConfirmation),
  };
}

function normalizeScorecard(value: unknown): DailyRecapScorecardRecord | null {
  if (!isObject(value)) {
    return null;
  }

  if (
    typeof value.title !== "string" ||
    !Array.isArray(value.tags) ||
    typeof value.summary !== "string" ||
    typeof value.shareTitle !== "string" ||
    typeof value.shareSubtitle !== "string"
  ) {
    return null;
  }

  const tags = value.tags.filter((item): item is string => typeof item === "string");
  const metrics = Array.isArray(value.metrics)
    ? value.metrics.flatMap((item) =>
        isObject(item) &&
        typeof item.id === "string" &&
        typeof item.label === "string" &&
        typeof item.value === "string"
          ? [
              {
                id: item.id as DailyRecapScorecardMetricRecord["id"],
                label: item.label,
                value: item.value,
              },
            ]
          : [],
      )
    : [];

  return {
    title: value.title,
    tags,
    metrics,
    summary: value.summary,
    shareTitle: value.shareTitle,
    shareSubtitle: value.shareSubtitle,
  };
}

function toDailyRecapRecord(record: {
  id: string;
  dateKey: string;
  status: "draft" | "reviewed" | "confirmed";
  snapshot: unknown;
  scorecard: unknown;
  streakCount: number;
  confirmedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): DailyRecapRecord {
  const snapshot = normalizeSnapshot(record.snapshot);

  return {
    id: record.id,
    dateKey: record.dateKey,
    status: record.status,
    tasks: snapshot.tasks,
    completedTaskIds: snapshot.completedTaskIds,
    pendingTasks: snapshot.pendingTasks,
    pendingChanges: snapshot.pendingChanges,
    requiresScheduleConfirmation: snapshot.requiresScheduleConfirmation,
    scorecard: cloneScorecard(normalizeScorecard(record.scorecard)),
    streakCount: record.streakCount,
    confirmedAt: record.confirmedAt ? cloneDate(record.confirmedAt) : null,
    reviewedAt: record.status === "draft" ? null : cloneDate(record.updatedAt),
    createdAt: cloneDate(record.createdAt),
    updatedAt: cloneDate(record.updatedAt),
  };
}

function serializeSnapshot(record: DailyRecapRecord): DailyRecapSnapshotRecord {
  return {
    tasks: cloneTasks(record.tasks),
    completedTaskIds: [...record.completedTaskIds],
    pendingTasks: clonePendingTasks(record.pendingTasks),
    pendingChanges: clonePendingChanges(record.pendingChanges),
    requiresScheduleConfirmation: record.requiresScheduleConfirmation,
  };
}

export class PrismaDailyRecapsRepository implements DailyRecapsRepository {
  private readonly prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async findByDateKey(dateKey: string) {
    const record = await this.prisma.dailyRecap.findUnique({
      where: { dateKey },
    });

    return record ? toDailyRecapRecord(record) : null;
  }

  async ensureDraft(dateKey: string) {
    const existing = await this.prisma.dailyRecap.findUnique({
      where: { dateKey },
    });

    if (existing) {
      return toDailyRecapRecord(existing);
    }

    const record = await this.prisma.dailyRecap.upsert({
      where: { dateKey },
      create: {
        dateKey,
        status: "draft",
        snapshot: createSnapshot(),
        scorecard: null,
      },
      update: {
        status: "draft",
      },
    });

    return toDailyRecapRecord(record);
  }

  async review(dateKey: string, input: DailyRecapReviewInput) {
    const existing = await this.prisma.dailyRecap.findUnique({
      where: { dateKey },
    });

    if (existing?.status === "confirmed") {
      return toDailyRecapRecord(existing);
    }

    const snapshot: DailyRecapSnapshotRecord = {
      tasks: buildSnapshotTasks(input),
      completedTaskIds: [...input.completedTaskIds],
      pendingTasks: input.pendingTasks.map((task) => ({ ...task })),
      pendingChanges: input.pendingChanges.map((change) => ({ ...change })),
      requiresScheduleConfirmation: input.requiresScheduleConfirmation,
    };

    const record = await this.prisma.dailyRecap.upsert({
      where: { dateKey },
      create: {
        dateKey,
        status: "reviewed",
        snapshot,
        scorecard: null,
      },
      update: {
        status: "reviewed",
        snapshot,
        scorecard: null,
      },
    });

    return toDailyRecapRecord(record);
  }

  async confirm(dateKey: string, input: DailyRecapConfirmInput) {
    const record = await this.prisma.dailyRecap.update({
      where: { dateKey },
      data: {
        status: "confirmed",
        streakCount: input.streakCount,
        scorecard: input.scorecard,
        confirmedAt: input.confirmedAt ?? new Date(),
      },
    });

    return toDailyRecapRecord(record);
  }

  async listConfirmedBefore(dateKey: string) {
    const records = await this.prisma.dailyRecap.findMany({
      where: {
        status: "confirmed",
        dateKey: {
          lt: dateKey,
        },
      },
      orderBy: {
        dateKey: "desc",
      },
    });

    return records.map((record) => toDailyRecapRecord(record));
  }
}
