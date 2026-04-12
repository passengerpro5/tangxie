export type TaskStatus =
  | "draft"
  | "needs_info"
  | "schedulable"
  | "scheduled"
  | "done"
  | "overdue";

export interface ClarificationMessageRecord {
  role: "system" | "assistant" | "user";
  content: string;
  createdAt: Date;
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

export interface CreateTaskRecordInput {
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
}

export interface CreateTaskInputSourceRecordInput {
  sourceType: "text" | "image" | "doc";
  rawText: string;
  fileName: string | null;
  fileUrl: string | null;
}

export interface CreateClarificationSessionRecordInput {
  currentMissingFields: string[];
  messages: ClarificationMessageRecord[];
  aiExtractedFields: Record<string, unknown>;
  userConfirmedFields: Record<string, unknown>;
  status: "active" | "resolved" | "closed";
  nextQuestion: string | null;
}

export interface TasksRepository {
  createTask(input: CreateTaskRecordInput): Promise<TaskRecord>;
  createTaskWithSourceAndSession(input: {
    task: CreateTaskRecordInput;
    source: CreateTaskInputSourceRecordInput;
    clarificationSession: CreateClarificationSessionRecordInput;
  }): Promise<{
    task: TaskRecord;
    source: TaskInputSourceRecord;
    clarificationSession: ClarificationSessionRecord;
  }>;
  listTasks(): Promise<TaskRecord[]>;
  listSessions(): Promise<ClarificationSessionRecord[]>;
  findTaskById(taskId: string): Promise<TaskRecord | null>;
  findSessionById(sessionId: string): Promise<ClarificationSessionRecord | null>;
  updateTaskAndSession(input: {
    task: TaskRecord;
    clarificationSession: ClarificationSessionRecord;
  }): Promise<{
    task: TaskRecord;
    clarificationSession: ClarificationSessionRecord;
  }>;
}

export interface InMemoryTasksRepositoryOptions {
  now?: () => Date;
}

function createId(prefix: string, seed: number) {
  return `${prefix}_${seed.toString(36)}`;
}

function cloneDate(date: Date) {
  return new Date(date.getTime());
}

function cloneMessage(message: ClarificationMessageRecord): ClarificationMessageRecord {
  return {
    ...message,
    createdAt: cloneDate(message.createdAt),
  };
}

function cloneTask(task: TaskRecord): TaskRecord {
  return {
    ...task,
    deadlineAt: task.deadlineAt ? cloneDate(task.deadlineAt) : null,
    createdAt: cloneDate(task.createdAt),
    updatedAt: cloneDate(task.updatedAt),
  };
}

function cloneSource(source: TaskInputSourceRecord): TaskInputSourceRecord {
  return {
    ...source,
    createdAt: cloneDate(source.createdAt),
  };
}

function cloneSession(session: ClarificationSessionRecord): ClarificationSessionRecord {
  return {
    ...session,
    currentMissingFields: [...session.currentMissingFields],
    messages: session.messages.map(cloneMessage),
    aiExtractedFields: { ...session.aiExtractedFields },
    userConfirmedFields: { ...session.userConfirmedFields },
    createdAt: cloneDate(session.createdAt),
    updatedAt: cloneDate(session.updatedAt),
  };
}

export function createInMemoryTasksRepository(
  options: InMemoryTasksRepositoryOptions = {},
): TasksRepository {
  const now = options.now ?? (() => new Date());
  let taskSeq = 0;
  let sourceSeq = 0;
  let sessionSeq = 0;
  const tasks: TaskRecord[] = [];
  const sources: TaskInputSourceRecord[] = [];
  const sessions: ClarificationSessionRecord[] = [];

  return {
    async createTask(input) {
      const timestamp = now();
      const task: TaskRecord = {
        id: createId("task", ++taskSeq),
        createdAt: cloneDate(timestamp),
        updatedAt: cloneDate(timestamp),
        ...input,
      };

      tasks.push(task);
      return cloneTask(task);
    },
    async createTaskWithSourceAndSession(input) {
      const timestamp = now();
      const task: TaskRecord = {
        id: createId("task", ++taskSeq),
        createdAt: cloneDate(timestamp),
        updatedAt: cloneDate(timestamp),
        ...input.task,
      };
      const source: TaskInputSourceRecord = {
        id: createId("source", ++sourceSeq),
        taskId: task.id,
        createdAt: cloneDate(timestamp),
        ...input.source,
      };
      const clarificationSession: ClarificationSessionRecord = {
        id: createId("session", ++sessionSeq),
        taskId: task.id,
        createdAt: cloneDate(timestamp),
        updatedAt: cloneDate(timestamp),
        currentMissingFields: [...input.clarificationSession.currentMissingFields],
        messages: input.clarificationSession.messages.map(cloneMessage),
        aiExtractedFields: { ...input.clarificationSession.aiExtractedFields },
        userConfirmedFields: { ...input.clarificationSession.userConfirmedFields },
        status: input.clarificationSession.status,
        nextQuestion: input.clarificationSession.nextQuestion,
      };

      tasks.push(task);
      sources.push(source);
      sessions.push(clarificationSession);

      return {
        task: cloneTask(task),
        source: cloneSource(source),
        clarificationSession: cloneSession(clarificationSession),
      };
    },
    async listTasks() {
      return tasks.map(cloneTask);
    },
    async listSessions() {
      return sessions.map(cloneSession);
    },
    async findTaskById(taskId) {
      const task = tasks.find((item) => item.id === taskId);
      return task ? cloneTask(task) : null;
    },
    async findSessionById(sessionId) {
      const session = sessions.find((item) => item.id === sessionId);
      return session ? cloneSession(session) : null;
    },
    async updateTaskAndSession(input) {
      const taskIndex = tasks.findIndex((item) => item.id === input.task.id);
      const sessionIndex = sessions.findIndex((item) => item.id === input.clarificationSession.id);

      if (taskIndex < 0 || sessionIndex < 0) {
        throw new Error("Task or clarification session not found");
      }

      tasks[taskIndex] = cloneTask(input.task);
      sessions[sessionIndex] = cloneSession(input.clarificationSession);

      return {
        task: cloneTask(tasks[taskIndex]),
        clarificationSession: cloneSession(sessions[sessionIndex]),
      };
    },
  };
}
