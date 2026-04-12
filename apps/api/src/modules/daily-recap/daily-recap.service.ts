import {
  createInMemoryDailyRecapsRepository,
  type DailyRecapPendingChangeRecord,
  type DailyRecapPendingTaskRecord,
  type DailyRecapRecord,
  type DailyRecapsRepository,
} from "../../persistence/daily-recaps-repository.ts";
import {
  createInMemorySchedulingRepository,
  getCurrentInMemorySchedulingRepository,
  type ConfirmedBlockRecord,
  type SchedulingRepository,
} from "../../persistence/scheduling-repository.ts";
import {
  createInMemoryTasksRepository,
  getCurrentInMemoryTasksRepository,
  type TaskRecord,
  type TasksRepository,
} from "../../persistence/tasks-repository.ts";
import { PrismaSchedulingRepository } from "../../persistence/prisma-scheduling-repository.ts";
import { PrismaTasksRepository } from "../../persistence/prisma-tasks-repository.ts";
import { getPrismaClient } from "../../persistence/prisma-client.ts";
import { SchedulingService } from "../scheduling/scheduling.service.ts";
import { TasksService } from "../tasks/tasks.service.ts";

export interface DailyRecapDraftResponse {
  dateKey: string;
  tasks: Array<{
    taskId: string;
    completed: boolean;
  }>;
  scorecard: null;
}

export interface DailyRecapReviewInput {
  completedTaskIds: string[];
  pendingTasks: Array<{
    taskId: string;
    progressState: DailyRecapPendingTaskRecord["progressState"];
    action: DailyRecapPendingTaskRecord["action"];
  }>;
}

export interface DailyRecapReviewResponse {
  recap: {
    id: string;
    dateKey: string;
    status: DailyRecapRecord["status"];
    tasks: DailyRecapDraftResponse["tasks"];
    completedTaskIds: string[];
    pendingTasks: DailyRecapPendingTaskRecord[];
    pendingChanges: DailyRecapPendingChangeRecord[];
    requiresScheduleConfirmation: boolean;
    scorecard: null;
  };
}

export interface DailyRecapConfirmInput {
  recapId: string;
  acceptScheduleChanges: boolean;
}

export interface DailyRecapScorecardMetric {
  id: "focus_time" | "streak_days" | "closure";
  label: string;
  value: string;
}

export interface DailyRecapScorecardPayload {
  title: string;
  tags: [string, string, string];
  metrics: DailyRecapScorecardMetric[];
  summary: string;
  shareTitle: string;
  shareSubtitle: string;
}

export interface DailyRecapConfirmResponse {
  recap: {
    id: string;
    dateKey: string;
    status: "confirmed";
    tasks: DailyRecapDraftResponse["tasks"];
    completedTaskIds: string[];
    pendingTasks: DailyRecapPendingTaskRecord[];
    pendingChanges: DailyRecapPendingChangeRecord[];
    requiresScheduleConfirmation: boolean;
    confirmedAt: string;
    scorecard: DailyRecapScorecardPayload;
  };
  updatedTasks: Array<{
    id: string;
    title: string;
    description: string;
    sourceType: TaskRecord["sourceType"];
    status: TaskRecord["status"];
    deadlineAt: string | null;
    estimatedDurationMinutes: number | null;
    priorityScore: number | null;
    priorityRank: number | null;
    importanceReason: string | null;
    createdByAI: boolean;
    userConfirmed: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
  updatedScheduleBlocks: Array<{
    id: string;
    taskId: string;
    title: string;
    startAt: string;
    endAt: string;
    durationMinutes: number;
    status: ConfirmedBlockRecord["status"];
  }>;
  scorecard: DailyRecapScorecardPayload;
}

function createShanghaiDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";
  return `${year}-${month}-${day}`;
}

function createPreviousShanghaiDateKey(dateKey: string) {
  const date = new Date(`${dateKey}T00:00:00+08:00`);
  date.setUTCDate(date.getUTCDate() - 1);
  return createShanghaiDateKey(date);
}

function normalizeStringList(values: unknown) {
  if (!Array.isArray(values)) {
    return [];
  }

  return values.filter((value): value is string => typeof value === "string" && value.length > 0);
}

function normalizePendingTasks(values: unknown): DailyRecapPendingTaskRecord[] {
  if (!Array.isArray(values)) {
    return [];
  }

  return values.flatMap((value) => {
    if (!value || typeof value !== "object") {
      return [];
    }

    const candidate = value as Partial<DailyRecapPendingTaskRecord>;
    if (
      typeof candidate.taskId !== "string" ||
      typeof candidate.progressState !== "string" ||
      typeof candidate.action !== "string"
    ) {
      return [];
    }

    return [
      {
        taskId: candidate.taskId,
        progressState: candidate.progressState,
        action: candidate.action,
      },
    ];
  });
}

function buildPendingChanges(pendingTasks: DailyRecapPendingTaskRecord[]) {
  return pendingTasks.flatMap<DailyRecapPendingChangeRecord>((task) => {
    if (task.action === "keep") {
      return [];
    }

    if (task.action === "pause") {
      return [
        {
          taskId: task.taskId,
          kind: "pause_task",
          label: "暂时挂起",
        },
      ];
    }

    return [
      {
        taskId: task.taskId,
        kind: "move_block",
        label: task.action === "move_tomorrow" ? "移到明天" : "改到本周稍后",
      },
    ];
  });
}

function serializeDraft(recap: DailyRecapRecord): DailyRecapDraftResponse {
  return {
    dateKey: recap.dateKey,
    tasks: recap.tasks.map((task) => ({
      taskId: task.taskId,
      completed: task.completed,
    })),
    scorecard: null,
  };
}

function serializeRecap(recap: DailyRecapRecord): DailyRecapReviewResponse["recap"] {
  return {
    id: recap.id,
    dateKey: recap.dateKey,
    status: recap.status,
    tasks: recap.tasks.map((task) => ({
      taskId: task.taskId,
      completed: task.completed,
    })),
    completedTaskIds: [...recap.completedTaskIds],
    pendingTasks: recap.pendingTasks.map((task) => ({
      ...task,
    })),
    pendingChanges: recap.pendingChanges.map((change) => ({
      ...change,
    })),
    requiresScheduleConfirmation: recap.requiresScheduleConfirmation,
    scorecard: null,
  };
}

function serializeTask(task: TaskRecord) {
  return {
    ...task,
    deadlineAt: task.deadlineAt ? task.deadlineAt.toISOString() : null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

function serializeBlock(block: ConfirmedBlockRecord) {
  return {
    ...block,
    startAt: block.startAt.toISOString(),
    endAt: block.endAt.toISOString(),
  };
}

function formatDuration(minutes: number) {
  const safeMinutes = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safeMinutes / 60);
  const remainingMinutes = safeMinutes % 60;

  if (hours > 0 && remainingMinutes > 0) {
    return `${hours}h${remainingMinutes}m`;
  }

  if (hours > 0) {
    return `${hours}h`;
  }

  return `${remainingMinutes}m`;
}

function createDefaultTasksRepository(now: () => Date): TasksRepository {
  if (process.env.DATABASE_URL) {
    return new PrismaTasksRepository(getPrismaClient());
  }

  return getCurrentInMemoryTasksRepository() ?? createInMemoryTasksRepository({ now });
}

function createDefaultSchedulingRepository(): SchedulingRepository {
  if (process.env.DATABASE_URL) {
    return new PrismaSchedulingRepository(getPrismaClient());
  }

  return getCurrentInMemorySchedulingRepository() ?? createInMemorySchedulingRepository();
}

function createScorecard(input: {
  completedTasks: TaskRecord[];
  pendingChanges: DailyRecapPendingChangeRecord[];
  streakDays: number;
  acceptScheduleChanges: boolean;
}): DailyRecapScorecardPayload {
  const focusMinutes = input.completedTasks.reduce(
    (total, task) => total + (task.estimatedDurationMinutes ?? 0),
    0,
  );
  const focusTime = formatDuration(focusMinutes);
  const streakValue = `${input.streakDays} 天`;
  const closureValue =
    input.pendingChanges.length === 0
      ? "尾巴已收好"
      : input.acceptScheduleChanges
        ? `已处理 ${input.pendingChanges.length} 项`
        : `留有 ${input.pendingChanges.length} 项待处理`;

  const title =
    input.pendingChanges.length > 0
      ? "今日截止线驯兽师"
      : input.completedTasks.length > 1
        ? "今日稳稳收工官"
        : "今天把自己收住了";

  const metrics: DailyRecapScorecardMetric[] = [
    {
      id: "focus_time",
      label: "推进",
      value: focusTime,
    },
    {
      id: "streak_days",
      label: "连续收工",
      value: streakValue,
    },
    {
      id: "closure",
      label: "收尾力",
      value: closureValue,
    },
  ];

  const tags: [string, string, string] = [
    `推进 ${focusTime}`,
    `连续收工 ${streakValue}`,
    closureValue,
  ];

  const summary =
    input.pendingChanges.length > 0 && input.acceptScheduleChanges
      ? `今天推进了 ${focusTime}，也把 ${input.pendingChanges.length} 项安排处理好了。`
      : `今天推进了 ${focusTime}，尾巴收得很体面。`;

  return {
    title,
    tags,
    metrics,
    summary,
    shareTitle: `${title}｜${tags[0]}`,
    shareSubtitle: summary,
  };
}

function isTaskRecord(value: TaskRecord | null): value is TaskRecord {
  return value !== null;
}

export interface DailyRecapServiceOptions {
  now?: () => Date;
  repository?: DailyRecapsRepository;
}

export class DailyRecapService {
  private readonly clock: () => Date;
  private readonly repository: DailyRecapsRepository;
  private readonly tasksService: TasksService;
  private readonly schedulingService: SchedulingService;
  private readonly confirmedDateKeys = new Set<string>();

  constructor(options: DailyRecapServiceOptions = {}) {
    this.clock = options.now ?? (() => new Date());
    this.repository =
      options.repository ??
      createInMemoryDailyRecapsRepository({
        now: this.clock,
      });
    this.tasksService = new TasksService({
      now: this.clock,
      repository: createDefaultTasksRepository(this.clock),
    });
    this.schedulingService = new SchedulingService({
      now: this.clock,
      repository: createDefaultSchedulingRepository(),
    });
  }

  async getToday(): Promise<DailyRecapDraftResponse> {
    const dateKey = createShanghaiDateKey(this.clock());
    const recap = await this.repository.ensureDraft(dateKey);
    return serializeDraft(recap);
  }

  async reviewToday(input: DailyRecapReviewInput): Promise<DailyRecapReviewResponse> {
    const dateKey = createShanghaiDateKey(this.clock());
    const completedTaskIds = normalizeStringList(input.completedTaskIds);
    const pendingTasks = normalizePendingTasks(input.pendingTasks);
    const pendingChanges = buildPendingChanges(pendingTasks);
    const recap = await this.repository.review(dateKey, {
      completedTaskIds,
      pendingTasks,
      pendingChanges,
      requiresScheduleConfirmation: pendingChanges.length > 0,
    });

    return {
      recap: serializeRecap(recap),
    };
  }

  async confirmToday(input: DailyRecapConfirmInput): Promise<DailyRecapConfirmResponse> {
    const dateKey = createShanghaiDateKey(this.clock());
    const recap = await this.repository.findByDateKey(dateKey);

    if (!recap || recap.id !== input.recapId) {
      throw new Error("Daily recap not found");
    }

    if (recap.status !== "reviewed") {
      throw new Error("Daily recap must be reviewed before confirming");
    }

    const completedTasks = await Promise.all(
      recap.completedTaskIds.map(async (taskId) => {
        const task = await this.tasksService.getTask(taskId);
        if (!task) {
          return null;
        }

        return this.tasksService.updateTask({
          ...task,
          status: "done",
          updatedAt: new Date(this.clock().getTime()),
        });
      }),
    );

    if (input.acceptScheduleChanges && !this.confirmedDateKeys.has(dateKey)) {
      for (const pendingTask of recap.pendingTasks) {
        if (pendingTask.action === "keep") {
          continue;
        }

        if (pendingTask.action === "move_tomorrow") {
          await this.schedulingService.moveTaskBlockToTomorrow(pendingTask.taskId);
          continue;
        }

        if (pendingTask.action === "move_later_this_week") {
          await this.schedulingService.moveTaskBlockLaterThisWeek(pendingTask.taskId);
          continue;
        }

        if (pendingTask.action === "pause") {
          await this.schedulingService.pauseTask(pendingTask.taskId);
        }
      }
    }

    const streakDays = this.computeStreakCount(dateKey);
    const scorecard = createScorecard({
      completedTasks: completedTasks.filter(isTaskRecord),
      pendingChanges: recap.pendingChanges,
      streakDays,
      acceptScheduleChanges: input.acceptScheduleChanges,
    });

    this.confirmedDateKeys.add(dateKey);

    const updatedTasks = (await Promise.all(
      completedTasks.filter(isTaskRecord).map(async (task) => this.tasksService.getTask(task.id)),
    )).filter(isTaskRecord);

    const updatedScheduleBlocks = await this.schedulingService.listConfirmedBlocks();

    return {
      recap: {
        ...serializeRecap(recap),
        status: "confirmed",
        confirmedAt: this.clock().toISOString(),
        scorecard,
      },
      updatedTasks: updatedTasks.map(serializeTask),
      updatedScheduleBlocks: updatedScheduleBlocks.map(serializeBlock),
      scorecard,
    };
  }

  private computeStreakCount(dateKey: string) {
    let streakDays = 1;
    let cursor = createPreviousShanghaiDateKey(dateKey);

    while (this.confirmedDateKeys.has(cursor)) {
      streakDays += 1;
      cursor = createPreviousShanghaiDateKey(cursor);
    }

    return streakDays;
  }
}
