import type { IncomingMessage, ServerResponse } from "node:http";

import { RemindersService, type ConfirmedScheduleBlockRecord } from "./reminders.service.ts";

export type RemindersHandler = (req: IncomingMessage, res: ServerResponse) => Promise<void> | void;

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

function serializeReminder(reminder: ReturnType<RemindersService["listReminders"]>[number]) {
  return {
    ...reminder,
    remindAt: reminder.remindAt.toISOString(),
    createdAt: reminder.createdAt.toISOString(),
  };
}

function serializeSummary(summary: ReturnType<RemindersService["getDailySummary"]>) {
  return {
    ...summary,
    items: summary.items.map((item) => serializeReminder(item)),
  };
}

function parseConfirmedBlocks(body: unknown): ConfirmedScheduleBlockRecord[] {
  const candidate = body as
    | {
        confirmedBlocks?: Array<
          | ConfirmedScheduleBlockRecord
          | {
              id?: string;
              taskId?: string;
              title?: string;
              startAt?: string;
              endAt?: string;
              durationMinutes?: number;
              status?: string;
            }
        >;
      }
    | undefined;

  const blocks = candidate?.confirmedBlocks ?? [];

  return blocks.map((block) => ({
    id: block.id ?? "",
    taskId: block.taskId ?? "",
    title: block.title ?? "",
    startAt: new Date(block.startAt ?? ""),
    endAt: new Date(block.endAt ?? ""),
    durationMinutes: block.durationMinutes ?? 0,
    status: block.status === "confirmed" ? "confirmed" : ("draft" as const),
  }));
}

export class RemindersController {
  private readonly service: RemindersService;

  constructor(service: RemindersService) {
    this.service = service;
  }

  async handle(req: IncomingMessage, res: ServerResponse) {
    const url = new URL(req.url ?? "/", "http://localhost");

    try {
      if (req.method === "POST" && url.pathname === "/reminders/generate") {
        const body = await readJsonBody(req);
        const result = this.service.generateFromConfirmedBlocks({
          confirmedBlocks: parseConfirmedBlocks(body),
        });

        sendJson(res, 201, {
          reminders: result.reminders.map((reminder) => serializeReminder(reminder)),
          summary: serializeSummary(result.summary),
        });
        return;
      }

      if (req.method === "GET" && url.pathname === "/reminders/daily-summary") {
        const date = url.searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
        const summary = this.service.getDailySummary(date);
        sendJson(res, 200, serializeSummary(summary));
        return;
      }

      if (req.method === "GET" && url.pathname === "/reminders") {
        sendJson(res, 200, {
          items: this.service.listReminders().map((reminder) => serializeReminder(reminder)),
        });
        return;
      }

      sendJson(res, 404, { message: "Not Found" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      const statusCode = message.includes("Only confirmed schedule blocks") ? 422 : 400;
      sendJson(res, statusCode, { message });
    }
  }
}

export function createRemindersHandler(service = new RemindersService()): RemindersHandler {
  const controller = new RemindersController(service);
  return (req, res) => controller.handle(req, res);
}
