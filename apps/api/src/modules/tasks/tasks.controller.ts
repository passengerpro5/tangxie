import type { IncomingMessage, ServerResponse } from "node:http";

import {
  TasksService,
  type ClarificationSessionRecord,
  type TaskInput,
  type TaskInputSourceRecord,
  type TaskRecord,
} from "./tasks.service.ts";

export type TasksHandler = (req: IncomingMessage, res: ServerResponse) => Promise<void> | void;

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

export class TasksController {
  private readonly service: TasksService;

  constructor(service: TasksService) {
    this.service = service;
  }

  async handle(req: IncomingMessage, res: ServerResponse) {
    const url = new URL(req.url ?? "/", "http://localhost");

    try {
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

export function createTasksHandler(service = new TasksService()): TasksHandler {
  const controller = new TasksController(service);
  return (req, res) => controller.handle(req, res);
}
