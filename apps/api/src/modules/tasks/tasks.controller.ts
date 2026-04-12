import type { IncomingMessage, ServerResponse } from "node:http";

import {
  TasksService,
  type ClarificationSessionRecord,
  type TaskInput,
  type TaskRecord,
  type TaskInputSourceRecord,
} from "./tasks.service.ts";
import type { ConfirmedBlockRecord } from "../../persistence/scheduling-repository.ts";

export type TasksHandler = (req: IncomingMessage, res: ServerResponse) => Promise<void> | void;

export interface TasksControllerOptions {
  listConfirmedBlocks?: () => Promise<ConfirmedBlockRecord[]>;
  updateConfirmedBlock?: (input: {
    taskId: string;
    blockId: string;
    startAt: Date;
    endAt: Date;
  }) => Promise<ConfirmedBlockRecord>;
}

type AttachmentKind = "image" | "doc" | "text";

interface AttachmentStub {
  kind?: AttachmentKind;
  name?: string;
  fileName?: string;
  fileUrl?: string;
}

interface TaskIntakeBody extends Partial<TaskInput> {
  attachments?: AttachmentStub[];
}

function sendJson(res: ServerResponse, statusCode: number, payload: unknown) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

async function readJsonBody(req: IncomingMessage) {
  const preloaded = (req as IncomingMessage & { body?: unknown }).body;
  if (preloaded !== undefined) {
    return preloaded;
  }

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return undefined;
  }

  const text = Buffer.concat(chunks).toString("utf8").trim();
  if (!text) {
    return undefined;
  }

  return JSON.parse(text);
}

function buildAttachmentText(kind: AttachmentKind, fileName?: string, fileUrl?: string) {
  const label = fileName ?? fileUrl ?? "未命名附件";

  if (kind === "image") {
    return `图片附件：${label}`;
  }

  if (kind === "doc") {
    return `文档附件：${label}`;
  }

  return `附件：${label}`;
}

function buildIntakeInput(body: TaskIntakeBody): TaskInput {
  const firstAttachment = Array.isArray(body.attachments) ? body.attachments[0] : undefined;
  const sourceType = body.sourceType ?? firstAttachment?.kind ?? "text";
  const fileName = body.fileName ?? firstAttachment?.fileName ?? firstAttachment?.name;
  const fileUrl = body.fileUrl ?? firstAttachment?.fileUrl;
  const trimmedRawText = typeof body.rawText === "string" ? body.rawText.trim() : "";

  return {
    rawText:
      trimmedRawText ||
      buildAttachmentText(sourceType, fileName, fileUrl),
    sourceType,
    fileName,
    fileUrl,
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

function serializeSource(source: TaskInputSourceRecord) {
  return {
    ...source,
    createdAt: source.createdAt.toISOString(),
  };
}

function serializeSession(session: ClarificationSessionRecord) {
  return {
    ...session,
    messages: session.messages.map((message) => ({
      ...message,
      createdAt: message.createdAt.toISOString(),
    })),
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
  };
}

function serializeBlock(block: ConfirmedBlockRecord) {
  return {
    ...block,
    startAt: block.startAt.toISOString(),
    endAt: block.endAt.toISOString(),
  };
}

export class TasksController {
  private readonly service: TasksService;
  private readonly listConfirmedBlocks?: () => Promise<ConfirmedBlockRecord[]>;
  private readonly updateConfirmedBlock?: TasksControllerOptions["updateConfirmedBlock"];

  constructor(service: TasksService, options: TasksControllerOptions = {}) {
    this.service = service;
    this.listConfirmedBlocks = options.listConfirmedBlocks;
    this.updateConfirmedBlock = options.updateConfirmedBlock;
  }

  async handle(req: IncomingMessage, res: ServerResponse) {
    const url = new URL(req.url ?? "/", "http://localhost");

    try {
      if (req.method === "GET" && url.pathname === "/tasks") {
        const [tasks, confirmedBlocks] = await Promise.all([
          this.service.listTasks(),
          this.listConfirmedBlocks?.() ?? Promise.resolve([]),
        ]);

        sendJson(res, 200, {
          items: tasks.map((task) => ({
            ...serializeTask(task),
            scheduleBlocks: confirmedBlocks
              .filter((block) => block.taskId === task.id)
              .map(serializeBlock),
          })),
        });
        return;
      }

      if (req.method === "GET" && url.pathname.startsWith("/tasks/")) {
        const taskId = url.pathname.slice("/tasks/".length);
        if (!taskId || taskId === "intake") {
          sendJson(res, 404, { message: "Not Found" });
          return;
        }

        const [task, confirmedBlocks] = await Promise.all([
          this.service.getTask(taskId),
          this.listConfirmedBlocks?.() ?? Promise.resolve([]),
        ]);

        if (!task) {
          sendJson(res, 404, { message: "Task not found" });
          return;
        }

        sendJson(res, 200, {
          task: serializeTask(task),
          scheduleBlocks: confirmedBlocks
            .filter((block) => block.taskId === task.id)
            .map(serializeBlock),
        });
        return;
      }

      if (
        req.method === "PATCH" &&
        url.pathname.startsWith("/tasks/") &&
        url.pathname.includes("/schedule-blocks/")
      ) {
        const match = url.pathname.match(/^\/tasks\/([^/]+)\/schedule-blocks\/([^/]+)$/);
        if (!match) {
          sendJson(res, 404, { message: "Not Found" });
          return;
        }

        const [, taskId, blockId] = match;
        const body = (await readJsonBody(req)) as { startAt?: string; endAt?: string } | undefined;
        if (typeof body?.startAt !== "string" || typeof body?.endAt !== "string") {
          sendJson(res, 400, { message: "startAt and endAt are required" });
          return;
        }

        const startAt = new Date(body.startAt);
        const endAt = new Date(body.endAt);
        if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
          sendJson(res, 400, { message: "Invalid startAt or endAt" });
          return;
        }

        const task = await this.service.getTask(taskId);
        if (!task) {
          sendJson(res, 404, { message: "Task not found" });
          return;
        }

        if (!this.updateConfirmedBlock || !this.listConfirmedBlocks) {
          sendJson(res, 501, { message: "Schedule block update is not available" });
          return;
        }

        await this.updateConfirmedBlock({
          taskId,
          blockId,
          startAt,
          endAt,
        });

        const confirmedBlocks = await this.listConfirmedBlocks();
        sendJson(res, 200, {
          task: serializeTask(task),
          scheduleBlocks: confirmedBlocks
            .filter((block) => block.taskId === task.id)
            .map(serializeBlock),
        });
        return;
      }

      if (req.method === "POST" && url.pathname === "/tasks/intake") {
        const body = ((await readJsonBody(req)) ?? {}) as TaskIntakeBody;
        const result = await this.service.intakeTask(buildIntakeInput(body));

        sendJson(res, 201, {
          task: serializeTask(result.task),
          source: serializeSource(result.source),
          clarificationSession: serializeSession(result.clarificationSession),
          missingFields: result.missingFields,
          nextQuestion: result.nextQuestion,
        });
        return;
      }

      sendJson(res, 404, { message: "Not Found" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      sendJson(res, 400, { message });
    }
  }
}

export function createTasksHandler(
  service = new TasksService(),
  options: TasksControllerOptions = {},
): TasksHandler {
  const controller = new TasksController(service, options);
  return (req, res) => controller.handle(req, res);
}
