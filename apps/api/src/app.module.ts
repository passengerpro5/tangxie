import type { IncomingMessage, ServerResponse } from "node:http";
import { createClarificationHandler } from "./modules/clarification/clarification.controller.ts";
import { ClarificationService } from "./modules/clarification/clarification.service.ts";
import { createTasksHandler } from "./modules/tasks/tasks.controller.ts";
import { TasksService } from "./modules/tasks/tasks.service.ts";

export type ApiHandler = (req: IncomingMessage, res: ServerResponse) => void;

function sendJson(res: ServerResponse, statusCode: number, payload: unknown) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

export function createAppHandler(): ApiHandler {
  const tasksService = new TasksService();
  const clarificationService = new ClarificationService(tasksService);
  const tasksHandler = createTasksHandler(tasksService);
  const clarificationHandler = createClarificationHandler(clarificationService);

  return (req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");

    if (req.method === "GET" && url.pathname === "/health") {
      sendJson(res, 200, { ok: true });
      return;
    }

    if (url.pathname === "/tasks/intake") {
      void tasksHandler(req, res);
      return;
    }

    if (
      url.pathname === "/clarification/reply" ||
      url.pathname.startsWith("/clarification/sessions/")
    ) {
      void clarificationHandler(req, res);
      return;
    }

    sendJson(res, 404, { message: "Not Found" });
  };
}

export class AppModule {
  static createHandler() {
    return createAppHandler();
  }
}
