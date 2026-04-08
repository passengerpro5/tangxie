import type { IncomingMessage, ServerResponse } from "node:http";
import { AdminAiModule } from "./modules/admin-ai/admin-ai.module.ts";
import { createClarificationHandler } from "./modules/clarification/clarification.controller.ts";
import { ClarificationService } from "./modules/clarification/clarification.service.ts";
import { createInMemoryAdminAiRepository } from "./persistence/admin-ai-repository.ts";
import { createInMemoryRemindersRepository } from "./persistence/reminders-repository.ts";
import { createInMemorySchedulingRepository } from "./persistence/scheduling-repository.ts";
import { createInMemoryTasksRepository } from "./persistence/tasks-repository.ts";
import { PrismaAdminAiRepository } from "./persistence/prisma-admin-ai-repository.ts";
import { getPrismaClient } from "./persistence/prisma-client.ts";
import { PrismaRemindersRepository } from "./persistence/prisma-reminders-repository.ts";
import { PrismaSchedulingRepository } from "./persistence/prisma-scheduling-repository.ts";
import { PrismaTasksRepository } from "./persistence/prisma-tasks-repository.ts";
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

function createDefaultTasksRepository(options: AppModuleOptions = {}) {
  if (process.env.DATABASE_URL) {
    return new PrismaTasksRepository(getPrismaClient());
  }

  return createInMemoryTasksRepository({
    now: options.now,
  });
}

function createDefaultSchedulingRepository() {
  if (process.env.DATABASE_URL) {
    return new PrismaSchedulingRepository(getPrismaClient());
  }

  return createInMemorySchedulingRepository();
}

function createDefaultRemindersRepository() {
  if (process.env.DATABASE_URL) {
    return new PrismaRemindersRepository(getPrismaClient());
  }

  return createInMemoryRemindersRepository();
}

export function createAppHandler(options: AppModuleOptions = {}): ApiHandler {
  const adminAiRepository = createDefaultAdminAiRepository(options);
  const tasksRepository = createDefaultTasksRepository(options);
  const schedulingRepository = createDefaultSchedulingRepository();
  const remindersRepository = createDefaultRemindersRepository();
  const tasksService = new TasksService({
    now: options.now,
    repository: tasksRepository,
  });
  const clarificationService = new ClarificationService(tasksService);
  const schedulingService = new SchedulingService({
    now: options.now,
    repository: schedulingRepository,
  });
  const remindersService = new RemindersService({
    now: options.now,
    repository: remindersRepository,
    listConfirmedBlocks: () => schedulingService.listConfirmedBlocks(),
  });
  const adminAiModule = AdminAiModule.create({ repository: adminAiRepository });
  const tasksHandler = createTasksHandler(tasksService);
  const clarificationHandler = createClarificationHandler(clarificationService);
  const remindersHandler = createRemindersHandler(remindersService);
  const schedulingHandler = createSchedulingHandler(schedulingService);
  const adminAiHandler = adminAiModule.handler;

  async function syncSchedulingTasks() {
    const tasks = await tasksService.listTasks();
    schedulingService.seedTasks(
      tasks.map((task) => ({
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
      await syncSchedulingTasks();
      await schedulingHandler(req, res);
      return;
    }

    if (
      url.pathname === "/reminders/generate" ||
      url.pathname === "/reminders/daily-summary" ||
      url.pathname === "/reminders"
    ) {
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
