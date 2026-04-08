import type { IncomingMessage, ServerResponse } from "node:http";

import { ClarificationService, type ClarificationReplyInput } from "./clarification.service.ts";

export type ClarificationHandler = (req: IncomingMessage, res: ServerResponse) => Promise<void> | void;

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

function serializeSession(session: ReturnType<ClarificationService["getSession"]>) {
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

function serializeTask(task: ReturnType<ClarificationService["reply"]>["task"]) {
  return {
    ...task,
    deadlineAt: task.deadlineAt ? task.deadlineAt.toISOString() : null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

export class ClarificationController {
  private readonly service: ClarificationService;

  constructor(service: ClarificationService) {
    this.service = service;
  }

  async handle(req: IncomingMessage, res: ServerResponse) {
    const url = new URL(req.url ?? "/", "http://localhost");

    try {
      if (req.method === "POST" && url.pathname === "/clarification/reply") {
        const body = ((await readJsonBody(req)) ?? {}) as Partial<ClarificationReplyInput>;
        const result = this.service.reply({
          sessionId: body.sessionId ?? "",
          answerText: body.answerText ?? "",
        });

        sendJson(res, 200, {
          task: serializeTask(result.task),
          clarificationSession: serializeSession(result.clarificationSession),
          missingFields: result.missingFields,
          nextQuestion: result.nextQuestion,
        });
        return;
      }

      if (req.method === "GET" && url.pathname.startsWith("/clarification/sessions/")) {
        const sessionId = url.pathname.split("/").filter(Boolean).at(-1);
        if (!sessionId) {
          sendJson(res, 400, { message: "sessionId is required" });
          return;
        }

        const session = this.service.getSession(sessionId);
        sendJson(res, 200, { clarificationSession: serializeSession(session) });
        return;
      }

      sendJson(res, 404, { message: "Not Found" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      const statusCode = message === "Clarification session not found" ? 404 : 400;
      sendJson(res, statusCode, { message });
    }
  }
}

export function createClarificationHandler(service: ClarificationService): ClarificationHandler {
  const controller = new ClarificationController(service);
  return (req, res) => controller.handle(req, res);
}
