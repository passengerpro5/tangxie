import type { IncomingMessage, ServerResponse } from "node:http";
import { AdminAiModule } from "./modules/admin-ai/admin-ai.module.ts";
import { createArrangeChatHandler } from "./modules/arrange-chat/arrange-chat.controller.ts";
import { ArrangeChatService } from "./modules/arrange-chat/arrange-chat.service.ts";
import {
  createOpenAICompatibleProviderClient,
  type OpenAICompatibleProviderClient,
} from "./modules/ai-gateway/provider-client.ts";
import { createClarificationHandler } from "./modules/clarification/clarification.controller.ts";
import { ClarificationService } from "./modules/clarification/clarification.service.ts";
import { createInMemoryAdminAiRepository } from "./persistence/admin-ai-repository.ts";
import type { AdminAiRepository } from "./persistence/admin-ai-repository.ts";
import { createInMemoryArrangeConversationsRepository } from "./persistence/arrange-conversations-repository.ts";
import { createInMemoryRemindersRepository } from "./persistence/reminders-repository.ts";
import type { ArrangeConversationsRepository } from "./persistence/arrange-conversations-repository.ts";
import { PrismaArrangeConversationsRepository } from "./persistence/prisma-arrange-conversations-repository.ts";
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
  adminAiRepository?: AdminAiRepository;
  arrangeConversationsRepository?: ArrangeConversationsRepository;
  providerClient?: OpenAICompatibleProviderClient;
}

function buildCorsHeaders(req: IncomingMessage) {
  const origin = typeof req.headers?.origin === "string" ? req.headers.origin : "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
    Vary: "Origin",
  };
}

function sendJson(req: IncomingMessage, res: ServerResponse, statusCode: number, payload: unknown) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    ...buildCorsHeaders(req),
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function createDefaultAdminAiRepository(options: AppModuleOptions = {}) {
  if (options.adminAiRepository) {
    return options.adminAiRepository;
  }

  if (process.env.DATABASE_URL) {
    return new PrismaAdminAiRepository(getPrismaClient());
  }

  return createInMemoryAdminAiRepository({
    now: options.now,
  });
}

function createDefaultArrangeConversationsRepository(options: AppModuleOptions = {}) {
  if (options.arrangeConversationsRepository) {
    return options.arrangeConversationsRepository;
  }

  if (process.env.DATABASE_URL) {
    return new PrismaArrangeConversationsRepository(getPrismaClient());
  }

  return createInMemoryArrangeConversationsRepository({
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
  const arrangeConversationsRepository = createDefaultArrangeConversationsRepository(options);
  const tasksRepository = createDefaultTasksRepository(options);
  const schedulingRepository = createDefaultSchedulingRepository();
  const remindersRepository = createDefaultRemindersRepository();
  const providerClient =
    options.providerClient ?? createOpenAICompatibleProviderClient();
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
  const adminAiModule = AdminAiModule.create({
    repository: adminAiRepository,
    providerClient,
  });
  const arrangeChatService = new ArrangeChatService({
    adminAiRepository,
    conversationsRepository: arrangeConversationsRepository,
    providerClient,
    now: options.now,
  });
  const tasksHandler = createTasksHandler(tasksService);
  const arrangeChatHandler = createArrangeChatHandler(arrangeChatService);
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
    const originalWriteHead = res.writeHead.bind(res);
    res.writeHead = ((statusCode: number, ...args: unknown[]) => {
      const headers =
        args[0] && typeof args[0] === "object" && !Array.isArray(args[0])
          ? { ...buildCorsHeaders(req), ...(args[0] as Record<string, string>) }
          : buildCorsHeaders(req);

      if (typeof args[0] === "string") {
        return originalWriteHead(
          statusCode,
          args[0],
          headers,
        );
      }

      return originalWriteHead(statusCode, headers);
    }) as typeof res.writeHead;

    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        ...buildCorsHeaders(req),
      });
      res.end();
      return;
    }

    if (req.method === "GET" && url.pathname === "/health") {
      sendJson(req, res, 200, { ok: true });
      return;
    }

    if (
      url.pathname === "/arrange/conversations" ||
      url.pathname.startsWith("/arrange/conversations/")
    ) {
      await arrangeChatHandler(req, res);
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

    sendJson(req, res, 404, { message: "Not Found" });
  };
}

export class AppModule {
  static createHandler(options: AppModuleOptions = {}) {
    return createAppHandler(options);
  }
}
