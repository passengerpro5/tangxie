export type TaskStatus =
  | "draft"
  | "needs_info"
  | "schedulable"
  | "scheduled"
  | "done"
  | "overdue";

export interface TaskInput {
  rawText: string;
  sourceType?: "text" | "image" | "doc";
  fileName?: string;
  fileUrl?: string;
}

export interface TaskInputSourceRecord {
  id: string;
  taskId: string;
  sourceType: "text" | "image" | "doc";
  rawText: string;
  fileName: string | null;
  fileUrl: string | null;
  createdAt: Date;
}

export interface TaskRecord {
  id: string;
  title: string;
  description: string;
  sourceType: "text" | "image" | "doc";
  status: TaskStatus;
  deadlineAt: Date | null;
  estimatedDurationMinutes: number | null;
  priorityScore: number | null;
  priorityRank: number | null;
  importanceReason: string | null;
  createdByAI: boolean;
  userConfirmed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClarificationMessageRecord {
  role: "system" | "assistant" | "user";
  content: string;
  createdAt: Date;
}

export interface ClarificationSessionRecord {
  id: string;
  taskId: string;
  currentMissingFields: string[];
  messages: ClarificationMessageRecord[];
  aiExtractedFields: Record<string, unknown>;
  userConfirmedFields: Record<string, unknown>;
  status: "active" | "resolved" | "closed";
  nextQuestion: string | null;
  createdAt: Date;
  updatedAt: Date;
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

interface TaskStoreState {
  tasks: TaskRecord[];
  sources: TaskInputSourceRecord[];
  sessions: ClarificationSessionRecord[];
}

function createId(prefix: string, seed: number) {
  return `${prefix}_${seed.toString(36)}`;
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

function buildClarificationMessage(question: string | null, now: Date) {
  if (!question) {
    return [];
  }

  return [
    {
      role: "assistant" as const,
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

export class TasksService {
  private readonly clock: () => Date;
  private taskSeq = 0;
  private sourceSeq = 0;
  private sessionSeq = 0;
  private readonly state: TaskStoreState = {
    tasks: [],
    sources: [],
    sessions: [],
  };

  constructor(options: { now?: () => Date } = {}) {
    this.clock = options.now ?? (() => new Date());
  }

  intakeTask(input: TaskInput): IntakeTaskResult {
    const now = this.clock();
    const rawText = stripText(input.rawText);
    if (!rawText) {
      throw new Error("rawText is required");
    }

    const taskId = createId("task", ++this.taskSeq);
    const title = truncateTitle(rawText);
    const sourceType = input.sourceType ?? "text";
    const deadlineAt = parseDeadline(rawText, now);
    const estimatedDurationMinutes = parseDurationMinutes(rawText);
    const missingFields = this.computeMissingFields(deadlineAt, estimatedDurationMinutes);
    const nextQuestion = buildNextQuestion(missingFields);

    const task: TaskRecord = {
      id: taskId,
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
      createdAt: cloneDate(now),
      updatedAt: cloneDate(now),
    };

    const source: TaskInputSourceRecord = {
      id: createId("source", ++this.sourceSeq),
      taskId,
      sourceType,
      rawText,
      fileName: input.fileName ?? null,
      fileUrl: input.fileUrl ?? null,
      createdAt: cloneDate(now),
    };

    const clarificationSession: ClarificationSessionRecord = {
      id: createId("session", ++this.sessionSeq),
      taskId,
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
      createdAt: cloneDate(now),
      updatedAt: cloneDate(now),
    };

    this.state.tasks.push(task);
    this.state.sources.push(source);
    this.state.sessions.push(clarificationSession);

    return {
      task,
      source,
      clarificationSession,
      missingFields,
      nextQuestion,
    };
  }

  replyToClarification(input: ClarificationReplyInput): ClarificationReplyResult {
    const session = this.requireSession(input.sessionId);
    const task = this.requireTask(session.taskId);
    const now = this.clock();
    const userAnswer = stripText(input.answerText);

    session.messages.push({
      role: "user",
      content: userAnswer,
      createdAt: cloneDate(now),
    });

    const resolvedValues = this.applyClarificationAnswer(task, session.currentMissingFields, userAnswer, now);

    if (resolvedValues.deadlineAt) {
      task.deadlineAt = resolvedValues.deadlineAt;
    }
    if (resolvedValues.estimatedDurationMinutes !== null) {
      task.estimatedDurationMinutes = resolvedValues.estimatedDurationMinutes;
    }

    task.status = this.computeMissingFields(task.deadlineAt, task.estimatedDurationMinutes).length === 0 ? "schedulable" : "needs_info";
    task.importanceReason = toReason(task.deadlineAt, task.estimatedDurationMinutes);
    task.updatedAt = cloneDate(now);

    session.currentMissingFields = this.computeMissingFields(task.deadlineAt, task.estimatedDurationMinutes);
    session.nextQuestion = buildNextQuestion(session.currentMissingFields);
    session.status = session.currentMissingFields.length === 0 ? "resolved" : "active";
    session.updatedAt = cloneDate(now);

    if (session.nextQuestion) {
      session.messages.push({
        role: "assistant",
        content: session.nextQuestion,
        createdAt: cloneDate(now),
      });
    } else {
      session.messages.push({
        role: "assistant",
        content: "信息已补全，可以开始安排任务。",
        createdAt: cloneDate(now),
      });
    }

    return {
      task,
      clarificationSession: session,
      missingFields: [...session.currentMissingFields],
      nextQuestion: session.nextQuestion,
    };
  }

  listTasks() {
    return [...this.state.tasks];
  }

  listSessions() {
    return [...this.state.sessions];
  }

  getSession(sessionId: string) {
    return this.state.sessions.find((session) => session.id === sessionId);
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
      resolved.estimatedDurationMinutes = parseDurationMinutes(answerText) ?? task.estimatedDurationMinutes;
    }

    return resolved;
  }

  private requireTask(taskId: string) {
    const task = this.state.tasks.find((item) => item.id === taskId);
    if (!task) {
      throw new Error("Task not found");
    }
    return task;
  }

  private requireSession(sessionId: string) {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new Error("Clarification session not found");
    }
    return session;
  }
}
