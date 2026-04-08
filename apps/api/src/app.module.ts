import type { IncomingMessage, ServerResponse } from "node:http";
import { AdminAiModule } from "./modules/admin-ai/admin-ai.module.ts";
import { createClarificationHandler } from "./modules/clarification/clarification.controller.ts";
import { ClarificationService } from "./modules/clarification/clarification.service.ts";
import { createInMemoryAdminAiRepository } from "./persistence/admin-ai-repository.ts";
import { PrismaAdminAiRepository } from "./persistence/prisma-admin-ai-repository.ts";
import { getPrismaClient } from "./persistence/prisma-client.ts";
import { createRemindersHandler } from "./modules/reminders/reminders.controller.ts";
import { RemindersService } from "./modules/reminders/reminders.service.ts";
import { createSchedulingHandler } from "./modules/scheduling/scheduling.controller.ts";
import { SchedulingService } from "./modules/scheduling/scheduling.service.ts";
import { createTasksHandler } from "./modules/tasks/tasks.controller.ts";
import { TasksService } from "./modules/tasks/tasks.service.ts";

export type ApiHandler = (req: IncomingMessage, res: ServerResponse) => void | Promise<void>;

interface AppModuleOptions {
  now?: () => Date;
}

function sendJson(res: ServerResponse, statusCode: number, payload: unknown) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function createDefaultAdminAiRepository(options: AppModuleOptions = {}) {
  if (process.env.DATABASE_URL) {
    return new PrismaAdminAiRepository(getPrismaClient());
  }

  return createInMemoryAdminAiRepository({
    now: options.now,
  });
}

export function createAppHandler(options: AppModuleOptions = {}): ApiHandler {
  const adminAiRepository = createDefaultAdminAiRepository(options);
  const tasksService = new TasksService();
  const clarificationService = new ClarificationService(tasksService);
  const remindersService = new RemindersService();
  const schedulingService = new SchedulingService();
  const adminAiModule = AdminAiModule.create({ repository: adminAiRepository });
  const tasksHandler = createTasksHandler(tasksService);
  const clarificationHandler = createClarificationHandler(clarificationService);
  const remindersHandler = createRemindersHandler(remindersService);
  const schedulingHandler = createSchedulingHandler(schedulingService);
  const adminAiHandler = adminAiModule.handler;

  function syncSchedulingTasks() {
    schedulingService.seedTasks(
      tasksService.listTasks().map((task) => ({
        id: task.id,
        title: task.title,
        deadlineAt: task.deadlineAt,
        estimatedDurationMinutes: task.estimatedDurationMinutes,
        priorityScore: task.priorityScore,
        priorityRank: task.priorityRank,
        userConfirmed: task.userConfirmed,
        createdAt: task.createdAt,
      })),
    );
  }

  function syncReminderBlocks() {
    remindersService.seedConfirmedBlocks(
      schedulingService.listConfirmedBlocks().map((block) => ({
        id: block.id,
        taskId: block.taskId,
        title: block.title,
        startAt: block.startAt,
        endAt: block.endAt,
        durationMinutes: block.durationMinutes,
        status: "confirmed" as const,
      })),
    );
  }

  return async (req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");

    if (req.method === "GET" && url.pathname === "/health") {
      sendJson(res, 200, { ok: true });
      return;
    }

    if (url.pathname === "/tasks/intake") {
      await tasksHandler(req, res);
      return;
    }

    if (
      url.pathname === "/clarification/reply" ||
      url.pathname.startsWith("/clarification/sessions/")
    ) {
      await clarificationHandler(req, res);
      return;
    }

    if (
      url.pathname === "/scheduling/propose" ||
      url.pathname === "/scheduling/confirm"
    ) {
      syncSchedulingTasks();
      await schedulingHandler(req, res);
      return;
    }

    if (
      url.pathname === "/reminders/generate" ||
      url.pathname === "/reminders/daily-summary" ||
      url.pathname === "/reminders"
    ) {
      syncReminderBlocks();
      await remindersHandler(req, res);
      return;
    }

    if (url.pathname.startsWith("/admin/ai/")) {
      await adminAiHandler(req, res);
      return;
    }

    sendJson(res, 404, { message: "Not Found" });
  };
}

export class AppModule {
  static createHandler(options: AppModuleOptions = {}) {
    return createAppHandler(options);
  }
}
