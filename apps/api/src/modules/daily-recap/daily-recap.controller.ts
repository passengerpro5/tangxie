import type { IncomingMessage, ServerResponse } from "node:http";

import {
  DailyRecapService,
  type DailyRecapConfirmInput,
  type DailyRecapReviewInput,
} from "./daily-recap.service.ts";

export type DailyRecapHandler = (req: IncomingMessage, res: ServerResponse) => Promise<void> | void;

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

function parseReviewInput(body: unknown): DailyRecapReviewInput {
  const candidate = body as Partial<DailyRecapReviewInput> | undefined;

  return {
    completedTaskIds: Array.isArray(candidate?.completedTaskIds)
      ? candidate.completedTaskIds.filter((value): value is string => typeof value === "string")
      : [],
    pendingTasks: Array.isArray(candidate?.pendingTasks)
      ? candidate.pendingTasks.flatMap((item) => {
          if (!item || typeof item !== "object") {
            return [];
          }

          const pending = item as Partial<DailyRecapReviewInput["pendingTasks"][number]>;
          if (
            typeof pending.taskId !== "string" ||
            typeof pending.progressState !== "string" ||
            typeof pending.action !== "string"
          ) {
            return [];
          }

          return [
            {
              taskId: pending.taskId,
              progressState: pending.progressState,
              action: pending.action,
            },
          ];
        })
      : [],
  };
}

function parseConfirmInput(body: unknown): DailyRecapConfirmInput {
  const candidate = body as Partial<DailyRecapConfirmInput> | undefined;

  return {
    recapId: typeof candidate?.recapId === "string" ? candidate.recapId : "",
    acceptScheduleChanges:
      typeof candidate?.acceptScheduleChanges === "boolean"
        ? candidate.acceptScheduleChanges
        : true,
  };
}

export class DailyRecapController {
  private readonly service: DailyRecapService;

  constructor(service: DailyRecapService) {
    this.service = service;
  }

  async handle(req: IncomingMessage, res: ServerResponse) {
    const url = new URL(req.url ?? "/", "http://localhost");

    try {
      if (req.method === "GET" && url.pathname === "/daily-recaps/today") {
        const recap = await this.service.getToday();
        sendJson(res, 200, recap);
        return;
      }

      if (req.method === "POST" && url.pathname === "/daily-recaps/today/review") {
        const body = await readJsonBody(req);
        const recap = await this.service.reviewToday(parseReviewInput(body));
        sendJson(res, 200, recap);
        return;
      }

      if (req.method === "POST" && url.pathname === "/daily-recaps/today/confirm") {
        const body = await readJsonBody(req);
        const input = parseConfirmInput(body);
        if (!input.recapId) {
          sendJson(res, 400, { message: "recapId is required" });
          return;
        }

        const recap = await this.service.confirmToday(input);
        sendJson(res, 200, recap);
        return;
      }

      sendJson(res, 404, { message: "Not Found" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      sendJson(res, 400, { message });
    }
  }
}

export function createDailyRecapHandler(
  service = new DailyRecapService(),
): DailyRecapHandler {
  const controller = new DailyRecapController(service);
  return (req, res) => controller.handle(req, res);
}
