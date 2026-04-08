import type { PrismaClient } from "@prisma/client";
import type {
  ClarificationMessageRecord,
  ClarificationSessionRecord,
  CreateClarificationSessionRecordInput,
  CreateTaskInputSourceRecordInput,
  CreateTaskRecordInput,
  TaskInputSourceRecord,
  TaskRecord,
  TasksRepository,
} from "./tasks-repository.ts";

function cloneDate(date: Date) {
  return new Date(date.getTime());
}

function serializeMessages(messages: ClarificationMessageRecord[]) {
  return messages.map((message) => ({
    ...message,
    createdAt: message.createdAt.toISOString(),
  }));
}

function deserializeMessages(value: unknown): ClarificationMessageRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item) => item && typeof item === "object")
    .map((item) => {
      const record = item as {
        role?: ClarificationMessageRecord["role"];
        content?: string;
        createdAt?: string;
      };

      return {
        role: record.role ?? "assistant",
        content: record.content ?? "",
        createdAt: new Date(record.createdAt ?? new Date().toISOString()),
      };
    });
}

function toTaskRecord(record: {
  id: string;
  title: string;
  description: string | null;
  sourceType: string;
  status: TaskRecord["status"];
  deadlineAt: Date | null;
  estimatedDurationMinutes: number | null;
  priorityScore: number | null;
  priorityRank: number | null;
  importanceReason: string | null;
  createdByAI: boolean;
  userConfirmed: boolean;
  createdAt: Date;
  updatedAt: Date;
}): TaskRecord {
  return {
    id: record.id,
    title: record.title,
    description: record.description ?? "",
    sourceType: (record.sourceType as TaskRecord["sourceType"]) ?? "text",
    status: record.status,
    deadlineAt: record.deadlineAt ? cloneDate(record.deadlineAt) : null,
    estimatedDurationMinutes: record.estimatedDurationMinutes,
    priorityScore: record.priorityScore,
    priorityRank: record.priorityRank,
    importanceReason: record.importanceReason,
    createdByAI: record.createdByAI,
    userConfirmed: record.userConfirmed,
    createdAt: cloneDate(record.createdAt),
    updatedAt: cloneDate(record.updatedAt),
  };
}

function toTaskInputSourceRecord(record: {
  id: string;
  taskId: string;
  sourceType: string;
  rawText: string | null;
  fileName: string | null;
  fileUrl: string | null;
  createdAt: Date;
}): TaskInputSourceRecord {
  return {
    id: record.id,
    taskId: record.taskId,
    sourceType: (record.sourceType as TaskInputSourceRecord["sourceType"]) ?? "text",
    rawText: record.rawText ?? "",
    fileName: record.fileName,
    fileUrl: record.fileUrl,
    createdAt: cloneDate(record.createdAt),
  };
}

function toClarificationSessionRecord(record: {
  id: string;
  taskId: string;
  currentMissingFields: string[];
  messages: unknown;
  aiExtractedFields: unknown;
  userConfirmedFields: unknown;
  status: ClarificationSessionRecord["status"];
  nextQuestion: string | null;
  createdAt: Date;
  updatedAt: Date;
}): ClarificationSessionRecord {
  return {
    id: record.id,
    taskId: record.taskId,
    currentMissingFields: [...record.currentMissingFields],
    messages: deserializeMessages(record.messages),
    aiExtractedFields:
      record.aiExtractedFields && typeof record.aiExtractedFields === "object"
        ? { ...(record.aiExtractedFields as Record<string, unknown>) }
        : {},
    userConfirmedFields:
      record.userConfirmedFields && typeof record.userConfirmedFields === "object"
        ? { ...(record.userConfirmedFields as Record<string, unknown>) }
        : {},
    status: record.status,
    nextQuestion: record.nextQuestion,
    createdAt: cloneDate(record.createdAt),
    updatedAt: cloneDate(record.updatedAt),
  };
}

export class PrismaTasksRepository implements TasksRepository {
  private readonly prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async createTaskWithSourceAndSession(input: {
    task: CreateTaskRecordInput;
    source: CreateTaskInputSourceRecordInput;
    clarificationSession: CreateClarificationSessionRecordInput;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const taskRecord = await tx.task.create({
        data: {
          ...input.task,
          description: input.task.description,
        },
      });

      const sourceRecord = await tx.taskInputSource.create({
        data: {
          taskId: taskRecord.id,
          sourceType: input.source.sourceType,
          rawText: input.source.rawText,
          fileName: input.source.fileName,
          fileUrl: input.source.fileUrl,
        },
      });

      const sessionRecord = await tx.clarificationSession.create({
        data: {
          taskId: taskRecord.id,
          currentMissingFields: input.clarificationSession.currentMissingFields,
          messages: serializeMessages(input.clarificationSession.messages),
          aiExtractedFields: input.clarificationSession.aiExtractedFields,
          userConfirmedFields: input.clarificationSession.userConfirmedFields,
          status: input.clarificationSession.status,
          nextQuestion: input.clarificationSession.nextQuestion,
        },
      });

      return {
        task: toTaskRecord(taskRecord),
        source: toTaskInputSourceRecord(sourceRecord),
        clarificationSession: toClarificationSessionRecord(sessionRecord),
      };
    });
  }

  async listTasks() {
    const records = await this.prisma.task.findMany({
      orderBy: { createdAt: "asc" },
    });
    return records.map(toTaskRecord);
  }

  async listSessions() {
    const records = await this.prisma.clarificationSession.findMany({
      orderBy: { createdAt: "asc" },
    });
    return records.map(toClarificationSessionRecord);
  }

  async findTaskById(taskId: string) {
    const record = await this.prisma.task.findUnique({
      where: { id: taskId },
    });
    return record ? toTaskRecord(record) : null;
  }

  async findSessionById(sessionId: string) {
    const record = await this.prisma.clarificationSession.findUnique({
      where: { id: sessionId },
    });
    return record ? toClarificationSessionRecord(record) : null;
  }

  async updateTaskAndSession(input: {
    task: TaskRecord;
    clarificationSession: ClarificationSessionRecord;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const taskRecord = await tx.task.update({
        where: { id: input.task.id },
        data: {
          title: input.task.title,
          description: input.task.description,
          sourceType: input.task.sourceType,
          status: input.task.status,
          deadlineAt: input.task.deadlineAt,
          estimatedDurationMinutes: input.task.estimatedDurationMinutes,
          priorityScore: input.task.priorityScore,
          priorityRank: input.task.priorityRank,
          importanceReason: input.task.importanceReason,
          createdByAI: input.task.createdByAI,
          userConfirmed: input.task.userConfirmed,
        },
      });

      const sessionRecord = await tx.clarificationSession.update({
        where: { id: input.clarificationSession.id },
        data: {
          currentMissingFields: input.clarificationSession.currentMissingFields,
          messages: serializeMessages(input.clarificationSession.messages),
          aiExtractedFields: input.clarificationSession.aiExtractedFields,
          userConfirmedFields: input.clarificationSession.userConfirmedFields,
          status: input.clarificationSession.status,
          nextQuestion: input.clarificationSession.nextQuestion,
        },
      });

      return {
        task: toTaskRecord(taskRecord),
        clarificationSession: toClarificationSessionRecord(sessionRecord),
      };
    });
  }
}
