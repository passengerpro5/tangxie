import type { IncomingMessage, ServerResponse } from "node:http";

import { SchedulingService } from "./scheduling.service.ts";
import type { ScheduleBlockProposal } from "./scheduler-rules.ts";

export type SchedulingHandler = (req: IncomingMessage, res: ServerResponse) => Promise<void> | void;

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

function serializeBlock(block: ScheduleBlockProposal) {
  return {
    ...block,
    startAt: block.startAt.toISOString(),
    endAt: block.endAt.toISOString(),
  };
}

export class SchedulingController {
  private readonly service: SchedulingService;

  constructor(service: SchedulingService) {
    this.service = service;
  }

  async handle(req: IncomingMessage, res: ServerResponse) {
    const url = new URL(req.url ?? "/", "http://localhost");

    try {
      if (req.method === "POST" && url.pathname === "/scheduling/propose") {
        const body = (await readJsonBody(req)) as { taskIds?: string[] } | undefined;
        const result = this.service.propose({
          taskIds: Array.isArray(body?.taskIds) ? body?.taskIds : [],
        });

        if (!result.ok) {
          sendJson(res, 422, result);
          return;
        }

        sendJson(res, 201, {
          orderedTaskIds: result.orderedTaskIds,
          blocks: result.blocks.map((block) => serializeBlock(block)),
        });
        return;
      }

      if (req.method === "POST" && url.pathname === "/scheduling/confirm") {
        const body = (await readJsonBody(req)) as { taskIds?: string[] } | undefined;
        const result = this.service.confirm(Array.isArray(body?.taskIds) ? body?.taskIds : []);

        if (!result.ok) {
          sendJson(res, 422, result);
          return;
        }

        sendJson(res, 201, {
          orderedTaskIds: result.orderedTaskIds,
          blocks: result.blocks.map((block) => serializeBlock(block)),
        });
        return;
      }

      sendJson(res, 404, { message: "Not Found" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      const statusCode = message.startsWith("Task not found") ? 404 : 400;
      sendJson(res, statusCode, { message });
    }
  }
}

export function createSchedulingHandler(service = new SchedulingService()): SchedulingHandler {
  const controller = new SchedulingController(service);
  return (req, res) => controller.handle(req, res);
}
