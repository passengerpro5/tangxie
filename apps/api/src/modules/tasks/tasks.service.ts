import {
  createInMemoryTasksRepository,
  type ClarificationMessageRecord,
  type ClarificationSessionRecord,
  type TaskInputSourceRecord,
  type TaskRecord,
  type TasksRepository,
} from "../../persistence/tasks-repository.ts";

export type { ClarificationMessageRecord, ClarificationSessionRecord, TaskInputSourceRecord, TaskRecord };
export type TaskStatus = TaskRecord["status"];

export interface TaskInput {
  rawText: string;
  sourceType?: "text" | "image" | "doc";
  fileName?: string;
  fileUrl?: string;
}

export interface IntakeTaskResult {
  task: TaskRecord;
  source: TaskInputSourceRecord;
  clarificationSession: ClarificationSessionRecord;
  missingFields: string[];
  nextQuestion: string | null;
}

export interface ClarificationReplyInput {
  sessionId: string;
  answerText: string;
}

export interface ClarificationReplyResult {
  task: TaskRecord;
  clarificationSession: ClarificationSessionRecord;
  missingFields: string[];
  nextQuestion: string | null;
}

function cloneDate(date: Date) {
  return new Date(date.getTime());
}

function createUtcDate(
  year: number,
  monthIndex: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
  millisecond = 0,
) {
  return new Date(Date.UTC(year, monthIndex, day, hour, minute, second, millisecond));
}

function stripText(text: string) {
  return text.trim().replace(/\s+/g, " ");
}

function truncateTitle(text: string) {
  const cleaned = stripText(text).replace(/[。！？!?]$/, "");
  return cleaned.slice(0, 32);
}

function parseDurationMinutes(text: string) {
  const durationMatches = [
    /(\d+(?:\.\d+)?)\s*(?:小时|h|H)/i,
    /(\d+(?:\.\d+)?)\s*(?:分钟|min|mins|m)/i,
  ];

  for (const pattern of durationMatches) {
    const match = text.match(pattern);
    if (!match) continue;

    const value = Number(match[1]);
    if (Number.isNaN(value)) continue;

    if (pattern.source.includes("小时") || pattern.source.includes("h")) {
      return Math.max(1, Math.round(value * 60));
    }

    return Math.max(1, Math.round(value));
  }

  if (text.includes("半小时")) {
    return 30;
  }

  return null;
}

function parseDeadline(text: string, now: Date) {
  const normalized = text.replace(/\s+/g, "");
  const directDateMatch = normalized.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (directDateMatch) {
    const [, year, month, day] = directDateMatch;
    return createUtcDate(Number(year), Number(month) - 1, Number(day), 18, 0, 0, 0);
  }

  const weekdayMap: Record<string, number> = {
    "周日": 0,
    "星期日": 0,
    "周天": 0,
    "星期天": 0,
    "周一": 1,
    "星期一": 1,
    "周二": 2,
    "星期二": 2,
    "周三": 3,
    "星期三": 3,
    "周四": 4,
    "星期四": 4,
    "周五": 5,
    "星期五": 5,
    "周六": 6,
    "星期六": 6,
  };

  for (const [pattern, targetDay] of Object.entries(weekdayMap)) {
    if (!normalized.includes(pattern)) continue;

    const current = new Date(now.getTime());
    const currentDay = current.getUTCDay();
    const daysAhead = (targetDay - currentDay + 7) % 7 || 7;
    current.setUTCDate(current.getUTCDate() + daysAhead);
    return createUtcDate(
      current.getUTCFullYear(),
      current.getUTCMonth(),
      current.getUTCDate(),
      18,
      0,
      0,
      0,
    );
  }

  if (normalized.includes("今天")) {
    const current = new Date(now.getTime());
    return createUtcDate(
      current.getUTCFullYear(),
      current.getUTCMonth(),
      current.getUTCDate(),
      18,
      0,
      0,
      0,
    );
  }

  if (normalized.includes("明天")) {
    const current = new Date(now.getTime());
    current.setUTCDate(current.getUTCDate() + 1);
    return createUtcDate(
      current.getUTCFullYear(),
      current.getUTCMonth(),
      current.getUTCDate(),
      18,
      0,
      0,
      0,
    );
  }

  if (normalized.includes("后天")) {
    const current = new Date(now.getTime());
    current.setUTCDate(current.getUTCDate() + 2);
    return createUtcDate(
      current.getUTCFullYear(),
      current.getUTCMonth(),
      current.getUTCDate(),
      18,
      0,
      0,
      0,
    );
  }

  return null;
}

function buildNextQuestion(missingFields: string[]) {
  if (missingFields.includes("deadlineAt")) {
    return "这个任务最晚什么时候要完成？";
  }

  if (missingFields.includes("estimatedDurationMinutes")) {
    return "这个任务大概需要多久完成？";
  }

  return null;
}

function buildClarificationMessage(question: string | null, now: Date): ClarificationMessageRecord[] {
  if (!question) {
    return [];
  }

  return [
    {
      role: "assistant",
      content: question,
      createdAt: cloneDate(now),
    },
  ];
}

function toReason(deadlineAt: Date | null, estimatedDurationMinutes: number | null) {
  const reasonParts: string[] = [];
  if (deadlineAt) {
    reasonParts.push(`deadline=${deadlineAt.toISOString()}`);
  }
  if (estimatedDurationMinutes !== null) {
    reasonParts.push(`duration=${estimatedDurationMinutes}m`);
  }
  return reasonParts.length > 0 ? reasonParts.join(", ") : null;
}

export interface TasksServiceOptions {
  now?: () => Date;
  repository?: TasksRepository;
}

export class TasksService {
  private readonly clock: () => Date;
  private readonly repository: TasksRepository;

  constructor(options: TasksServiceOptions = {}) {
    this.clock = options.now ?? (() => new Date());
    this.repository =
      options.repository ??
      createInMemoryTasksRepository({
        now: this.clock,
      });
  }

  async intakeTask(input: TaskInput): Promise<IntakeTaskResult> {
    const now = this.clock();
    const rawText = stripText(input.rawText);
    if (!rawText) {
      throw new Error("rawText is required");
    }

    const title = truncateTitle(rawText);
    const sourceType = input.sourceType ?? "text";
    const deadlineAt = parseDeadline(rawText, now);
    const estimatedDurationMinutes = parseDurationMinutes(rawText);
    const missingFields = this.computeMissingFields(deadlineAt, estimatedDurationMinutes);
    const nextQuestion = buildNextQuestion(missingFields);

    const created = await this.repository.createTaskWithSourceAndSession({
      task: {
        title,
        description: rawText,
        sourceType,
        status: missingFields.length === 0 ? "schedulable" : "needs_info",
        deadlineAt,
        estimatedDurationMinutes,
        priorityScore: missingFields.length === 0 ? 80 : 40,
        priorityRank: null,
        importanceReason: toReason(deadlineAt, estimatedDurationMinutes),
        createdByAI: true,
        userConfirmed: false,
      },
      source: {
        sourceType,
        rawText,
        fileName: input.fileName ?? null,
        fileUrl: input.fileUrl ?? null,
      },
      clarificationSession: {
        currentMissingFields: [...missingFields],
        messages: [
          {
            role: "system",
            content: `Extracted task "${title}" from ${sourceType} input.`,
            createdAt: cloneDate(now),
          },
          ...buildClarificationMessage(nextQuestion, now),
        ],
        aiExtractedFields: {
          title,
          deadlineAt: deadlineAt ? deadlineAt.toISOString() : null,
          estimatedDurationMinutes,
        },
        userConfirmedFields: {},
        status: missingFields.length === 0 ? "resolved" : "active",
        nextQuestion,
      },
    });

    return {
      ...created,
      missingFields,
      nextQuestion,
    };
  }

  async replyToClarification(input: ClarificationReplyInput): Promise<ClarificationReplyResult> {
    const session = await this.requireSession(input.sessionId);
    const task = await this.requireTask(session.taskId);
    const now = this.clock();
    const userAnswer = stripText(input.answerText);

    const nextMessages = [
      ...session.messages,
      {
        role: "user" as const,
        content: userAnswer,
        createdAt: cloneDate(now),
      },
    ];

    const resolvedValues = this.applyClarificationAnswer(task, session.currentMissingFields, userAnswer, now);

    const nextTask: TaskRecord = {
      ...task,
      deadlineAt: resolvedValues.deadlineAt ?? task.deadlineAt,
      estimatedDurationMinutes:
        resolvedValues.estimatedDurationMinutes ?? task.estimatedDurationMinutes,
      updatedAt: cloneDate(now),
    };

    nextTask.status =
      this.computeMissingFields(nextTask.deadlineAt, nextTask.estimatedDurationMinutes).length === 0
        ? "schedulable"
        : "needs_info";
    nextTask.importanceReason = toReason(
      nextTask.deadlineAt,
      nextTask.estimatedDurationMinutes,
    );

    const nextMissingFields = this.computeMissingFields(
      nextTask.deadlineAt,
      nextTask.estimatedDurationMinutes,
    );
    const nextQuestion = buildNextQuestion(nextMissingFields);

    const nextSession: ClarificationSessionRecord = {
      ...session,
      currentMissingFields: nextMissingFields,
      nextQuestion,
      status: nextMissingFields.length === 0 ? "resolved" : "active",
      updatedAt: cloneDate(now),
      messages: [
        ...nextMessages,
        {
          role: "assistant",
          content: nextQuestion ?? "信息已补全，可以开始安排任务。",
          createdAt: cloneDate(now),
        },
      ],
    };

    const updated = await this.repository.updateTaskAndSession({
      task: nextTask,
      clarificationSession: nextSession,
    });

    return {
      ...updated,
      missingFields: [...nextMissingFields],
      nextQuestion,
    };
  }

  async listTasks() {
    return this.repository.listTasks();
  }

  async listSessions() {
    return this.repository.listSessions();
  }

  async getSession(sessionId: string) {
    return this.repository.findSessionById(sessionId);
  }

  private computeMissingFields(deadlineAt: Date | null, estimatedDurationMinutes: number | null) {
    const missingFields: string[] = [];
    if (!deadlineAt) missingFields.push("deadlineAt");
    if (estimatedDurationMinutes === null) missingFields.push("estimatedDurationMinutes");
    return missingFields;
  }

  private applyClarificationAnswer(
    task: TaskRecord,
    missingFields: string[],
    answerText: string,
    now: Date,
  ) {
    const resolved: {
      deadlineAt: Date | null;
      estimatedDurationMinutes: number | null;
    } = {
      deadlineAt: null,
      estimatedDurationMinutes: null,
    };

    if (missingFields.includes("deadlineAt")) {
      resolved.deadlineAt = parseDeadline(answerText, now) ?? task.deadlineAt;
    }

    if (missingFields.includes("estimatedDurationMinutes")) {
      resolved.estimatedDurationMinutes =
        parseDurationMinutes(answerText) ?? task.estimatedDurationMinutes;
    }

    return resolved;
  }

  private async requireTask(taskId: string) {
    const task = await this.repository.findTaskById(taskId);
    if (!task) {
      throw new Error("Task not found");
    }
    return task;
  }

  private async requireSession(sessionId: string) {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error("Clarification session not found");
    }
    return session;
  }
}
