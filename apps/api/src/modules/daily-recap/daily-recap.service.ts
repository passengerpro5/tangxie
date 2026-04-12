import {
  createInMemoryDailyRecapsRepository,
  type DailyRecapPendingChangeRecord,
  type DailyRecapPendingTaskRecord,
  type DailyRecapRecord,
  type DailyRecapsRepository,
} from "../../persistence/daily-recaps-repository.ts";

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

function normalizeStringList(values: unknown) {
  if (!Array.isArray(values)) {
    return [];
  }

  return values.filter((value): value is string => typeof value === "string" && value.length > 0);
}

function normalizePendingTasks(
  values: unknown,
): DailyRecapPendingTaskRecord[] {
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

export interface DailyRecapServiceOptions {
  now?: () => Date;
  repository?: DailyRecapsRepository;
}

export class DailyRecapService {
  private readonly clock: () => Date;
  private readonly repository: DailyRecapsRepository;

  constructor(options: DailyRecapServiceOptions = {}) {
    this.clock = options.now ?? (() => new Date());
    this.repository =
      options.repository ??
      createInMemoryDailyRecapsRepository({
        now: this.clock,
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
}
