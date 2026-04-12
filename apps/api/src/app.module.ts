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
import { createDailyRecapHandler } from "./modules/daily-recap/daily-recap.controller.ts";
import { DailyRecapService } from "./modules/daily-recap/daily-recap.service.ts";
import { createInMemoryAdminAiRepository } from "./persistence/admin-ai-repository.ts";
import type { AdminAiRepository } from "./persistence/admin-ai-repository.ts";
import { createInMemoryArrangeConversationsRepository } from "./persistence/arrange-conversations-repository.ts";
import { createInMemoryDailyRecapsRepository } from "./persistence/daily-recaps-repository.ts";
import { PrismaDailyRecapsRepository } from "./persistence/prisma-daily-recaps-repository.ts";
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

const DEFAULT_LOCAL_AI_SCENE = "arrange_chat";
const DEFAULT_LOCAL_PROMPT_TEMPLATE_NAME = "arrange-chat-v1";
const DEFAULT_LOCAL_SYSTEM_PROMPT =
  "你是糖蟹的任务安排助手。你需要通过多轮对话理解任务、补齐关键信息、拆分子任务，并给出可执行的时间安排。";
const DEFAULT_LOCAL_DEVELOPER_PROMPT =
  "优先返回自然语言回复，并尽量保持输出可被前端解析为结构化安排结果。";

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

function createDefaultDailyRecapRepository(options: AppModuleOptions = {}) {
  if (process.env.DATABASE_URL) {
    return new PrismaDailyRecapsRepository(getPrismaClient());
  }

  return createInMemoryDailyRecapsRepository({
    now: options.now,
  });
}

function createDefaultRemindersRepository() {
  if (process.env.DATABASE_URL) {
    return new PrismaRemindersRepository(getPrismaClient());
  }

  return createInMemoryRemindersRepository();
}

function encryptLocalApiKey(apiKey: string) {
  if (!apiKey) {
    return "";
  }

  return `enc:${Buffer.from(apiKey, "utf8").toString("base64")}`;
}

function resolveLocalAiBootstrapConfig() {
  return {
    providerName: process.env.AI_DEFAULT_PROVIDER ?? "aihubmix",
    baseUrl: process.env.AI_DEFAULT_BASE_URL ?? "https://api.aihubmix.com/v1",
    model: process.env.AI_DEFAULT_MODEL ?? "gpt-4o-mini",
    apiKey: process.env.AI_DEFAULT_API_KEY ?? "",
  };
}

async function bootstrapLocalInMemoryAdminAiRepository(repository: AdminAiRepository) {
  const defaults = resolveLocalAiBootstrapConfig();
  const providers = await repository.listProviders();
  let provider =
    providers.find((item) => item.name === defaults.providerName)
    ?? providers.find((item) => item.enabled)
    ?? providers[0];

  if (!provider) {
    provider = await repository.createProvider({
      name: defaults.providerName,
      providerType: "openai_compatible",
      baseUrl: defaults.baseUrl,
      apiKeyEncrypted: encryptLocalApiKey(defaults.apiKey),
      defaultModel: defaults.model,
      enabled: true,
    });
  }

  const bindings = await repository.listModelBindings();
  const hasArrangeChatBinding = bindings.some((item) => item.scene === DEFAULT_LOCAL_AI_SCENE);
  if (!hasArrangeChatBinding) {
    await repository.createModelBinding({
      providerId: provider.id,
      scene: DEFAULT_LOCAL_AI_SCENE,
      modelName: provider.defaultModel || defaults.model,
      temperature: 0.2,
      maxTokens: 4096,
      timeoutSeconds: 60,
      enabled: true,
      isDefault: true,
    });
  }

  const prompts = await repository.listPromptTemplates();
  const hasActiveArrangeChatPrompt = prompts.some(
    (item) => item.scene === DEFAULT_LOCAL_AI_SCENE && item.isActive,
  );
  if (!hasActiveArrangeChatPrompt) {
    await repository.createPromptTemplate({
      scene: DEFAULT_LOCAL_AI_SCENE,
      templateName: DEFAULT_LOCAL_PROMPT_TEMPLATE_NAME,
      systemPrompt: DEFAULT_LOCAL_SYSTEM_PROMPT,
      developerPrompt: DEFAULT_LOCAL_DEVELOPER_PROMPT,
      version: "v1",
      isActive: true,
    });
  }
}

export function createAppHandler(options: AppModuleOptions = {}): ApiHandler {
  const adminAiRepository = createDefaultAdminAiRepository(options);
  const arrangeConversationsRepository = createDefaultArrangeConversationsRepository(options);
  const tasksRepository = createDefaultTasksRepository(options);
  const schedulingRepository = createDefaultSchedulingRepository();
  const dailyRecapRepository = createDefaultDailyRecapRepository(options);
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
  const dailyRecapService = new DailyRecapService({
    now: options.now,
    repository: dailyRecapRepository,
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
    tasksRepository,
    schedulingRepository,
    providerClient,
    now: options.now,
  });
  const tasksHandler = createTasksHandler(tasksService, {
    listConfirmedBlocks: () => schedulingService.listConfirmedBlocks(),
    updateConfirmedBlock: ({ taskId, blockId, startAt, endAt }) =>
      schedulingService.updateConfirmedBlock({
        taskId,
        blockId,
        startAt,
        endAt,
      }),
  });
  const arrangeChatHandler = createArrangeChatHandler(arrangeChatService);
  const clarificationHandler = createClarificationHandler(clarificationService);
  const dailyRecapHandler = createDailyRecapHandler(dailyRecapService);
  const remindersHandler = createRemindersHandler(remindersService);
  const schedulingHandler = createSchedulingHandler(schedulingService);
  const adminAiHandler = adminAiModule.handler;
  const adminAiBootstrap =
    !process.env.DATABASE_URL && !options.adminAiRepository
      ? bootstrapLocalInMemoryAdminAiRepository(adminAiRepository)
      : Promise.resolve();

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
    await adminAiBootstrap;

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

    if (url.pathname === "/tasks" || url.pathname === "/tasks/intake" || url.pathname.startsWith("/tasks/")) {
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

    if (url.pathname === "/daily-recaps/today" || url.pathname.startsWith("/daily-recaps/")) {
      await dailyRecapHandler(req, res);
      return;
    }

    if (url.pathname === "/scheduling/propose" || url.pathname === "/scheduling/confirm") {
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
