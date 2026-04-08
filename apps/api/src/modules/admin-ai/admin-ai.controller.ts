import type { IncomingMessage, ServerResponse } from "node:http";

import { AdminAiService } from "./admin-ai.service.ts";
import type {
  CreateModelBindingInput,
  UpdateModelBindingInput,
} from "./dto/model-binding.dto.ts";
import type {
  CreatePromptTemplateInput,
  UpdatePromptTemplateInput,
} from "./dto/prompt-template.dto.ts";
import type {
  CreateProviderInput,
  UpdateProviderInput,
} from "./dto/provider.dto.ts";

export type AdminAiHandler = (req: IncomingMessage, res: ServerResponse) => Promise<void> | void;

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

function getPathParts(pathname: string) {
  return pathname.split("/").filter(Boolean);
}

export class AdminAiController {
  private readonly service: AdminAiService;

  constructor(service: AdminAiService) {
    this.service = service;
  }

  async handle(req: IncomingMessage, res: ServerResponse) {
    const url = new URL(req.url ?? "/", "http://localhost");
    const parts = getPathParts(url.pathname);

    try {
      if (req.method === "GET" && url.pathname === "/admin/ai/providers") {
        sendJson(res, 200, { items: await this.service.listProviders() });
        return;
      }

      if (req.method === "POST" && url.pathname === "/admin/ai/providers") {
        const body = (await readJsonBody(req)) as CreateProviderInput;
        sendJson(res, 201, await this.service.createProvider(body));
        return;
      }

      if (req.method === "PATCH" && parts.length === 4 && parts[0] === "admin" && parts[1] === "ai" && parts[2] === "providers") {
        const body = (await readJsonBody(req)) as UpdateProviderInput;
        sendJson(res, 200, await this.service.updateProvider(parts[3], body));
        return;
      }

      if (
        req.method === "POST" &&
        parts.length === 5 &&
        parts[0] === "admin" &&
        parts[1] === "ai" &&
        parts[2] === "providers" &&
        parts[4] === "test"
      ) {
        const body = (await readJsonBody(req)) as { input: string };
        sendJson(res, 200, await this.service.testProvider(parts[3], body));
        return;
      }

      if (req.method === "GET" && url.pathname === "/admin/ai/models") {
        sendJson(res, 200, { items: await this.service.listModelBindings() });
        return;
      }

      if (req.method === "POST" && url.pathname === "/admin/ai/models") {
        const body = (await readJsonBody(req)) as CreateModelBindingInput;
        sendJson(res, 201, await this.service.createModelBinding(body));
        return;
      }

      if (req.method === "PATCH" && parts.length === 4 && parts[0] === "admin" && parts[1] === "ai" && parts[2] === "models") {
        const body = (await readJsonBody(req)) as UpdateModelBindingInput;
        sendJson(res, 200, await this.service.updateModelBinding(parts[3], body));
        return;
      }

      if (req.method === "GET" && url.pathname === "/admin/ai/prompts") {
        sendJson(res, 200, { items: await this.service.listPromptTemplates() });
        return;
      }

      if (req.method === "POST" && url.pathname === "/admin/ai/prompts") {
        const body = (await readJsonBody(req)) as CreatePromptTemplateInput;
        sendJson(res, 201, await this.service.createPromptTemplate(body));
        return;
      }

      if (req.method === "PATCH" && parts.length === 4 && parts[0] === "admin" && parts[1] === "ai" && parts[2] === "prompts") {
        const body = (await readJsonBody(req)) as UpdatePromptTemplateInput;
        sendJson(res, 200, await this.service.updatePromptTemplate(parts[3], body));
        return;
      }

      if (req.method === "GET" && url.pathname === "/admin/ai/logs") {
        sendJson(res, 200, { items: await this.service.listLogs() });
        return;
      }

      sendJson(res, 404, { message: "Not Found" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      const statusCode = message === "Provider not found" || message === "Model binding not found" || message === "Prompt template not found" ? 404 : 400;
      sendJson(res, statusCode, { message });
    }
  }
}

export function createAdminAiHandler(service = new AdminAiService()): AdminAiHandler {
  const controller = new AdminAiController(service);
  return (req, res) => controller.handle(req, res);
}
