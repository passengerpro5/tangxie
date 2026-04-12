import assert from "node:assert/strict";
import test from "node:test";

import { createAppHandler } from "../src/app.module.ts";
import { createInMemoryAdminAiRepository } from "../src/persistence/admin-ai-repository.ts";
import { createClarificationHandler } from "../src/modules/clarification/clarification.controller.ts";
import { ClarificationService } from "../src/modules/clarification/clarification.service.ts";
import { createTasksHandler } from "../src/modules/tasks/tasks.controller.ts";
import { TasksService } from "../src/modules/tasks/tasks.service.ts";
import { getPrismaClient } from "../src/persistence/prisma-client.ts";
import { PrismaTasksRepository } from "../src/persistence/prisma-tasks-repository.ts";

function createRequest(method: string, url: string, body?: unknown) {
  return { method, url, body };
}

function createResponse() {
  const state = {
    statusCode: 0,
    headers: {} as Record<string, string>,
    bodyText: "",
  };

  const res = {
    writeHead(statusCode: number, headers: Record<string, string>) {
      state.statusCode = statusCode;
      state.headers = { ...state.headers, ...headers };
      return res;
    },
    end(chunk?: string) {
      state.bodyText = typeof chunk === "string" ? chunk : "";
    },
  };

  return { response: res, state };
}

async function invoke(
  handler:
    | ReturnType<typeof createTasksHandler>
    | ReturnType<typeof createClarificationHandler>
    | ReturnType<typeof createAppHandler>,
  method: string,
  url: string,
  body?: unknown,
) {
  const request = createRequest(method, url, body);
  const { response, state } = createResponse();
  await handler(request as never, response as never);

  return {
    statusCode: state.statusCode,
    headers: state.headers,
    body: state.bodyText ? JSON.parse(state.bodyText) : null,
  };
}

const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);

test(
  "prisma tasks repository persists intake and clarification reply",
  { skip: !hasDatabaseUrl },
  async () => {
    const prisma = getPrismaClient();
    const suffix = Date.now().toString(36);
    const rawText = `周五前写完论文初稿 ${suffix}`;

    const repository = new PrismaTasksRepository(prisma);
    const tasksHandler = createTasksHandler(new TasksService({ repository }));
    const clarificationHandler = createClarificationHandler(
      new ClarificationService(new TasksService({ repository })),
    );

    const intakeRes = await invoke(tasksHandler, "POST", "/tasks/intake", {
      rawText,
    });

    assert.equal(intakeRes.statusCode, 201);
    assert.equal(intakeRes.body.task.status, "needs_info");
    assert.equal(intakeRes.body.clarificationSession.currentMissingFields[0], "estimatedDurationMinutes");

    const replyRes = await invoke(clarificationHandler, "POST", "/clarification/reply", {
      sessionId: intakeRes.body.clarificationSession.id,
      answerText: "大概 2 小时",
    });

    assert.equal(replyRes.statusCode, 200);
    assert.equal(replyRes.body.task.status, "schedulable");
    assert.equal(replyRes.body.clarificationSession.status, "resolved");

    const persistedTask = await prisma.task.findUnique({
      where: { id: intakeRes.body.task.id },
    });
    const persistedSource = await prisma.taskInputSource.findFirst({
      where: { taskId: intakeRes.body.task.id },
    });
    const persistedSession = await prisma.clarificationSession.findUnique({
      where: { id: intakeRes.body.clarificationSession.id },
    });

    assert.equal(persistedTask?.status, "schedulable");
    assert.equal(persistedSource?.taskId, intakeRes.body.task.id);
    assert.equal(persistedSession?.status, "resolved");
  },
);

test(
  "app handler uses Prisma-backed tasks and clarification persistence across handler instances",
  { skip: !hasDatabaseUrl },
  async () => {
    const suffix = `${Date.now().toString(36)}-reply`;

    const firstHandler = createAppHandler();

    const intakeRes = await invoke(firstHandler, "POST", "/tasks/intake", {
      rawText: `周五前写完论文初稿 ${suffix}`,
    });

    assert.equal(intakeRes.statusCode, 201);

    const secondHandler = createAppHandler();

    const replyRes = await invoke(secondHandler, "POST", "/clarification/reply", {
      sessionId: intakeRes.body.clarificationSession.id,
      answerText: "大概 2 小时",
    });

    assert.equal(replyRes.statusCode, 200);
    assert.equal(replyRes.body.task.status, "schedulable");

    const getSessionRes = await invoke(
      secondHandler,
      "GET",
      `/clarification/sessions/${intakeRes.body.clarificationSession.id}`,
    );

    assert.equal(getSessionRes.statusCode, 200);
    assert.equal(getSessionRes.body.clarificationSession.status, "resolved");
    assert.equal(getSessionRes.body.clarificationSession.nextQuestion, null);
  },
);

test(
  "app handler persists arrange chat confirmations into Prisma tasks and schedule blocks",
  { skip: !hasDatabaseUrl },
  async () => {
    const prisma = getPrismaClient();
    const adminAiRepository = createInMemoryAdminAiRepository();
    const provider = await adminAiRepository.createProvider({
      name: `AiHubMix-${Date.now().toString(36)}`,
      providerType: "openai_compatible",
      baseUrl: "https://api.aihubmix.com/v1",
      apiKeyEncrypted: "enc:c2VjcmV0",
      defaultModel: "gpt-4o-mini",
      enabled: true,
    });
    await adminAiRepository.createModelBinding({
      providerId: provider.id,
      scene: "arrange_chat",
      modelName: "gpt-4o-mini",
      temperature: 0.2,
      maxTokens: 4096,
      timeoutSeconds: 60,
      enabled: true,
      isDefault: true,
    });
    await adminAiRepository.createPromptTemplate({
      scene: "arrange_chat",
      templateName: "安排任务总模板",
      systemPrompt: "你是糖蟹的任务安排助手。",
      developerPrompt: "必须输出 JSON。",
      version: `v-${Date.now().toString(36)}`,
      isActive: true,
    });

    const firstHandler = createAppHandler({
      adminAiRepository,
      providerClient: {
        async chatCompletion() {
          return {
            id: "resp_prisma_arrange_1",
            model: "gpt-4o-mini",
            outputText: JSON.stringify({
              assistantMessage: "我已经拆成两段，并安排到明天下午。",
              title: "论文初稿安排",
              summary: "完成论文初稿提纲和正文。",
              tasks: [
                { title: "整理提纲", estimatedMinutes: 60, priority: "P1" },
                { title: "完成正文", estimatedMinutes: 120, priority: "P1" },
              ],
              proposedBlocks: [
                {
                  id: "block_1",
                  taskId: "task_1",
                  title: "整理提纲",
                  startAt: "2026-04-10T06:00:00.000Z",
                  endAt: "2026-04-10T07:00:00.000Z",
                  durationMinutes: 60,
                  status: "proposed",
                },
                {
                  id: "block_2",
                  taskId: "task_2",
                  title: "完成正文",
                  startAt: "2026-04-10T07:30:00.000Z",
                  endAt: "2026-04-10T09:30:00.000Z",
                  durationMinutes: 120,
                  status: "proposed",
                },
              ],
              readyToConfirm: true,
            }),
            raw: { choices: [{ message: { content: "ok" } }] },
          };
        },
      },
    });

    const created = await invoke(firstHandler, "POST", "/arrange/conversations");
    assert.equal(created.statusCode, 201);

    const replied = await invoke(
      firstHandler,
      "POST",
      `/arrange/conversations/${created.body.conversation.id}/messages`,
      { content: "周五前交论文初稿，优先级最高" },
    );
    assert.equal(replied.statusCode, 201);

    const confirmed = await invoke(
      firstHandler,
      "POST",
      `/arrange/conversations/${created.body.conversation.id}/confirm`,
    );
    assert.equal(confirmed.statusCode, 200);

    const secondHandler = createAppHandler({
      adminAiRepository,
      providerClient: {
        async chatCompletion() {
          throw new Error("should not call provider in read path");
        },
      },
    });

    const tasksRes = await invoke(secondHandler, "GET", "/tasks");
    assert.equal(tasksRes.statusCode, 200);
    assert.equal(tasksRes.body.items.length >= 2, true);

    const arrangedTasks = tasksRes.body.items.filter(
      (task: { importanceReason: string | null }) =>
        task.importanceReason === `arrange_conversation:${created.body.conversation.id}`,
    );
    assert.equal(arrangedTasks.length, 2);
    assert.equal(arrangedTasks.every((task: { status: string }) => task.status === "scheduled"), true);

    const scheduleBlocks = await prisma.scheduleBlock.findMany({
      where: {
        taskId: {
          in: arrangedTasks.map((task: { id: string }) => task.id),
        },
      },
      orderBy: { startAt: "asc" },
    });

    assert.equal(scheduleBlocks.length, 2);
    assert.equal(scheduleBlocks.every((block) => block.status === "confirmed"), true);
  },
);

test(
  "app handler updates a confirmed schedule block and exposes the edited time via tasks read endpoints",
  { skip: !hasDatabaseUrl },
  async () => {
    const prisma = getPrismaClient();
    const suffix = `${Date.now().toString(36)}-edit`;
    const uniqueMinuteOffset = Date.now() % (24 * 60 - 180);
    const initialStartAt = new Date(Date.UTC(2040, 0, 1, 0, uniqueMinuteOffset, 0, 0));
    const initialEndAt = new Date(initialStartAt.getTime() + 120 * 60000);
    const updatedStartAt = new Date(initialStartAt.getTime() + 30 * 60000);
    const updatedEndAt = new Date(initialEndAt.getTime() + 30 * 60000);
    const task = await prisma.task.create({
      data: {
        title: `拖拽编辑任务 ${suffix}`,
        description: "用于验证时间块拖拽编辑后的持久化。",
        sourceType: "text",
        status: "scheduled",
        deadlineAt: new Date(updatedEndAt.getTime() + 60 * 60000),
        estimatedDurationMinutes: 120,
        priorityScore: 90,
        priorityRank: 1,
        importanceReason: "test",
        createdByAI: true,
        userConfirmed: true,
      },
    });
    const block = await prisma.scheduleBlock.create({
      data: {
        taskId: task.id,
        startAt: initialStartAt,
        endAt: initialEndAt,
        blockType: "focus",
        status: "confirmed",
        createdBy: "test",
      },
    });

    const handler = createAppHandler();
    const updated = await invoke(
      handler,
      "PATCH",
      `/tasks/${task.id}/schedule-blocks/${block.id}`,
      {
        startAt: updatedStartAt.toISOString(),
        endAt: updatedEndAt.toISOString(),
      },
    );

    assert.equal(updated.statusCode, 200);
    assert.equal(updated.body.task.id, task.id);
    assert.equal(updated.body.scheduleBlocks[0].id, block.id);
    assert.equal(updated.body.scheduleBlocks[0].startAt, updatedStartAt.toISOString());
    assert.equal(updated.body.scheduleBlocks[0].endAt, updatedEndAt.toISOString());

    const persistedBlock = await prisma.scheduleBlock.findUnique({
      where: { id: block.id },
    });
    assert.equal(persistedBlock?.startAt.toISOString(), updatedStartAt.toISOString());
    assert.equal(persistedBlock?.endAt.toISOString(), updatedEndAt.toISOString());

    const listRes = await invoke(handler, "GET", "/tasks");
    const detailRes = await invoke(handler, "GET", `/tasks/${task.id}`);
    const listedTask = listRes.body.items.find((item: { id: string }) => item.id === task.id);

    assert.equal(listRes.statusCode, 200);
    assert.equal(detailRes.statusCode, 200);
    assert.equal(listedTask.scheduleBlocks[0].startAt, updatedStartAt.toISOString());
    assert.equal(detailRes.body.scheduleBlocks[0].endAt, updatedEndAt.toISOString());
  },
);

test(
  "app handler updates a confirmed schedule block and read models reflect the new time range",
  { skip: !hasDatabaseUrl },
  async () => {
    const prisma = getPrismaClient();
    const uniqueMinuteOffset = Date.now() % (24 * 60 - 120);
    const initialStartAt = new Date(Date.UTC(2041, 0, 1, 0, uniqueMinuteOffset, 0, 0));
    const initialEndAt = new Date(initialStartAt.getTime() + 60 * 60000);
    const updatedStartAt = new Date(initialStartAt.getTime() + 90 * 60000);
    const updatedEndAt = new Date(initialEndAt.getTime() + 90 * 60000);
    const task = await prisma.task.create({
      data: {
        title: "排期验证：拖动确认块",
        description: "验证单个 confirmed schedule block 的更新链路。",
        sourceType: "text",
        status: "scheduled",
        deadlineAt: new Date(updatedEndAt.getTime() + 60 * 60000),
        estimatedDurationMinutes: 60,
        priorityScore: 80,
        priorityRank: 1,
        importanceReason: "manual-test",
        createdByAI: true,
        userConfirmed: true,
      },
    });

    const confirmedBlock = await prisma.scheduleBlock.create({
      data: {
        taskId: task.id,
        startAt: initialStartAt,
        endAt: initialEndAt,
        blockType: "focus",
        status: "confirmed",
        createdBy: "system",
      },
    });

    const handler = createAppHandler();

    const patchRes = await invoke(handler, "PATCH", `/tasks/${task.id}/schedule-blocks/${confirmedBlock.id}`, {
      startAt: updatedStartAt.toISOString(),
      endAt: updatedEndAt.toISOString(),
    });

    assert.equal(patchRes.statusCode, 200);
    assert.equal(patchRes.body.task.id, task.id);
    assert.equal(patchRes.body.scheduleBlocks.length, 1);
    assert.equal(patchRes.body.scheduleBlocks[0].id, confirmedBlock.id);
    assert.equal(patchRes.body.scheduleBlocks[0].startAt, updatedStartAt.toISOString());
    assert.equal(patchRes.body.scheduleBlocks[0].endAt, updatedEndAt.toISOString());

    const tasksRes = await invoke(handler, "GET", "/tasks");
    assert.equal(tasksRes.statusCode, 200);
    assert.equal(tasksRes.body.items.length >= 1, true);

    const updatedTask = tasksRes.body.items.find((item: { id: string }) => item.id === task.id);
    assert.equal(updatedTask.scheduleBlocks.length, 1);
    assert.equal(updatedTask.scheduleBlocks[0].startAt, updatedStartAt.toISOString());
    assert.equal(updatedTask.scheduleBlocks[0].endAt, updatedEndAt.toISOString());

    const detailRes = await invoke(handler, "GET", `/tasks/${task.id}`);
    assert.equal(detailRes.statusCode, 200);
    assert.equal(detailRes.body.scheduleBlocks.length, 1);
    assert.equal(detailRes.body.scheduleBlocks[0].startAt, updatedStartAt.toISOString());
    assert.equal(detailRes.body.scheduleBlocks[0].endAt, updatedEndAt.toISOString());
  },
);

test(
  "app handler rejects confirmed schedule block updates that overlap another confirmed block",
  { skip: !hasDatabaseUrl },
  async () => {
    const prisma = getPrismaClient();
    const firstTask = await prisma.task.create({
      data: {
        title: "排期验证：第一个 confirmed 块",
        description: "验证 confirmed block 冲突保护。",
        sourceType: "text",
        status: "scheduled",
        deadlineAt: new Date("2026-04-12T12:00:00.000Z"),
        estimatedDurationMinutes: 60,
        priorityScore: 90,
        priorityRank: 1,
        importanceReason: "manual-test",
        createdByAI: true,
        userConfirmed: true,
      },
    });

    const secondTask = await prisma.task.create({
      data: {
        title: "排期验证：第二个 confirmed 块",
        description: "验证 confirmed block 冲突保护。",
        sourceType: "text",
        status: "scheduled",
        deadlineAt: new Date("2026-04-12T12:30:00.000Z"),
        estimatedDurationMinutes: 60,
        priorityScore: 80,
        priorityRank: 2,
        importanceReason: "manual-test",
        createdByAI: true,
        userConfirmed: true,
      },
    });

    const firstBlock = await prisma.scheduleBlock.create({
      data: {
        taskId: firstTask.id,
        startAt: new Date("2026-04-12T01:00:00.000Z"),
        endAt: new Date("2026-04-12T02:00:00.000Z"),
        blockType: "focus",
        status: "confirmed",
        createdBy: "system",
      },
    });

    const secondBlock = await prisma.scheduleBlock.create({
      data: {
        taskId: secondTask.id,
        startAt: new Date("2026-04-12T02:30:00.000Z"),
        endAt: new Date("2026-04-12T03:30:00.000Z"),
        blockType: "focus",
        status: "confirmed",
        createdBy: "system",
      },
    });

    const handler = createAppHandler();
    const patchRes = await invoke(handler, "PATCH", `/tasks/${firstTask.id}/schedule-blocks/${firstBlock.id}`, {
      startAt: secondBlock.startAt.toISOString(),
      endAt: secondBlock.endAt.toISOString(),
    });

    assert.equal(patchRes.statusCode, 400);
    assert.equal(patchRes.body.message, "Updated schedule block overlaps an existing confirmed block");

    const persistedFirstBlock = await prisma.scheduleBlock.findUnique({
      where: { id: firstBlock.id },
    });
    assert.equal(persistedFirstBlock?.startAt.toISOString(), "2026-04-12T01:00:00.000Z");
    assert.equal(persistedFirstBlock?.endAt.toISOString(), "2026-04-12T02:00:00.000Z");
  },
);
