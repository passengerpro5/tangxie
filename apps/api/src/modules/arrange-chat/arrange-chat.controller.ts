import type { IncomingMessage, ServerResponse } from "node:http";
import { ArrangeChatService } from "./arrange-chat.service.ts";

export type ArrangeChatHandler = (
  req: IncomingMessage,
  res: ServerResponse,
) => Promise<void> | void;

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
  return text ? JSON.parse(text) : undefined;
}

function serializeConversation(conversation: Awaited<ReturnType<ArrangeChatService["listConversations"]>>[number]) {
  return {
    ...conversation,
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString(),
    lastMessageAt: conversation.lastMessageAt.toISOString(),
  };
}

function serializeMessage(message: {
  id: string;
  conversationId: string;
  role: string;
  content: string;
  createdAt: Date;
}) {
  return {
    ...message,
    createdAt: message.createdAt.toISOString(),
  };
}

export class ArrangeChatController {
  private readonly service: ArrangeChatService;

  constructor(service: ArrangeChatService) {
    this.service = service;
  }

  async handle(req: IncomingMessage, res: ServerResponse) {
    const url = new URL(req.url ?? "/", "http://localhost");
    const parts = url.pathname.split("/").filter(Boolean);

    try {
      if (req.method === "POST" && url.pathname === "/arrange/conversations") {
        const result = await this.service.createConversation();
        sendJson(res, 201, {
          conversation: serializeConversation(result.conversation),
          messages: result.messages,
          snapshot: result.snapshot,
        });
        return;
      }

      if (req.method === "GET" && url.pathname === "/arrange/conversations") {
        const items = await this.service.listConversations();
        sendJson(res, 200, { items: items.map(serializeConversation) });
        return;
      }

      if (parts.length === 3 && parts[0] === "arrange" && parts[1] === "conversations") {
        const detail = await this.service.getConversation(parts[2]);
        sendJson(res, 200, {
          conversation: serializeConversation(detail.conversation),
          messages: detail.messages.map(serializeMessage),
          snapshot: detail.snapshot,
        });
        return;
      }

      if (
        req.method === "POST" &&
        parts.length === 4 &&
        parts[0] === "arrange" &&
        parts[1] === "conversations" &&
        parts[3] === "messages"
      ) {
        const body = ((await readJsonBody(req)) ?? {}) as { content?: string };
        const result = await this.service.sendMessage(parts[2], String(body.content ?? ""));
        sendJson(res, 201, {
          conversation: serializeConversation(result.conversation),
          userMessage: serializeMessage(result.userMessage),
          assistantMessage: serializeMessage(result.assistantMessage),
          snapshot: result.snapshot,
        });
        return;
      }

      if (
        req.method === "POST" &&
        parts.length === 4 &&
        parts[0] === "arrange" &&
        parts[1] === "conversations" &&
        parts[3] === "confirm"
      ) {
        const result = await this.service.confirmConversation(parts[2]);
        sendJson(res, 200, {
          conversation: serializeConversation(result.conversation),
          snapshot: result.snapshot,
          confirmedBlocks: result.confirmedBlocks,
        });
        return;
      }

      sendJson(res, 404, { message: "Not Found" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      const statusCode = message === "Conversation not found" ? 404 : 400;
      sendJson(res, statusCode, { message });
    }
  }
}

export function createArrangeChatHandler(service: ArrangeChatService): ArrangeChatHandler {
  const controller = new ArrangeChatController(service);
  return (req, res) => controller.handle(req, res);
}
