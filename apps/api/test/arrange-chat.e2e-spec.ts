import assert from "node:assert/strict";
import test from "node:test";
import { zodSchema } from "ai";

import { createAppHandler } from "../src/app.module.ts";
import { arrangeStructuredOutputSchema } from "../src/modules/arrange-chat/arrange-chat.service.ts";
import { createInMemoryAdminAiRepository } from "../src/persistence/admin-ai-repository.ts";

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
  handler: ReturnType<typeof createAppHandler>,
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

test("arrange chat confirm materializes real tasks and confirmed blocks that tasks endpoints can read", async () => {
  const adminAiRepository = createInMemoryAdminAiRepository();
  const provider = await adminAiRepository.createProvider({
    name: "AiHubMix",
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
    version: "v1",
    isActive: true,
  });

  const handler = createAppHandler({
    adminAiRepository,
    providerClient: {
      async chatCompletion(request) {
        assert.equal(request.model, "gpt-4o-mini");
        assert.equal(request.messages.at(-1)?.role, "user");
        return {
          id: "resp_1",
          model: request.model,
          outputText: JSON.stringify({
            assistantMessage: "我先帮你拆成两部分，并安排在明天下午。",
            title: "论文初稿安排",
            summary: "完成论文初稿，并拆成提纲与正文两段。",
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

  const created = await invoke(handler, "POST", "/arrange/conversations");
  assert.equal(created.statusCode, 201);
  assert.equal(created.body.conversation.status, "active");

  const replied = await invoke(
    handler,
    "POST",
    `/arrange/conversations/${created.body.conversation.id}/messages`,
    { content: "周五前交论文初稿，优先级最高" },
  );
  assert.equal(replied.statusCode, 201);
  assert.equal(replied.body.assistantMessage.role, "assistant");
  assert.equal(replied.body.snapshot.title, "论文初稿安排");
  assert.equal(replied.body.snapshot.proposedBlocks.length, 2);

  const listed = await invoke(handler, "GET", "/arrange/conversations");
  assert.equal(listed.statusCode, 200);
  assert.equal(listed.body.items.length, 1);
  assert.equal(listed.body.items[0].title, "论文初稿安排");

  const detail = await invoke(handler, "GET", `/arrange/conversations/${created.body.conversation.id}`);
  assert.equal(detail.statusCode, 200);
  assert.equal(detail.body.messages.length, 2);
  assert.equal(detail.body.messages[0].role, "user");
  assert.equal(detail.body.messages[1].role, "assistant");

  const confirmed = await invoke(
    handler,
    "POST",
    `/arrange/conversations/${created.body.conversation.id}/confirm`,
  );
  assert.equal(confirmed.statusCode, 200);
  assert.equal(confirmed.body.conversation.status, "confirmed");
  assert.equal(confirmed.body.confirmedBlocks[0].status, "confirmed");

  const tasks = await invoke(handler, "GET", "/tasks");
  assert.equal(tasks.statusCode, 200);
  assert.equal(tasks.body.items.length, 2);
  assert.equal(tasks.body.items[0].status, "scheduled");
  assert.equal(tasks.body.items[1].status, "scheduled");
  assert.equal(tasks.body.items[0].title, "整理提纲");
  assert.equal(tasks.body.items[0].scheduleBlocks.length, 1);
  assert.equal(tasks.body.items[1].title, "完成正文");
  assert.equal(tasks.body.items[1].scheduleBlocks.length, 1);

  const taskDetail = await invoke(handler, "GET", `/tasks/${tasks.body.items[0].id}`);
  assert.equal(taskDetail.statusCode, 200);
  assert.equal(taskDetail.body.task.id, tasks.body.items[0].id);
  assert.equal(taskDetail.body.task.status, "scheduled");
  assert.equal(taskDetail.body.scheduleBlocks.length, 1);
  assert.equal(taskDetail.body.scheduleBlocks[0].taskId, tasks.body.items[0].id);
});

test("arrange chat prefers structured provider output when text is not JSON", async () => {
  const adminAiRepository = createInMemoryAdminAiRepository();
  const provider = await adminAiRepository.createProvider({
    name: "AiHubMix",
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
    developerPrompt: "优先返回结构化结果。",
    version: "v1",
    isActive: true,
  });

  const handler = createAppHandler({
    adminAiRepository,
    providerClient: {
      async chatCompletion(request) {
        assert.equal(request.model, "gpt-4o-mini");
        return {
          id: "resp_structured_1",
          model: request.model,
          outputText: "我先帮你拆解任务，并安排在今晚和明早。",
          structuredOutput: {
            assistantMessage: "我先帮你拆解任务，并安排在今晚和明早。",
            title: "周报与汇报安排",
            summary: "今晚整理周报，明早准备汇报。",
            tasks: [
              { title: "整理周报", estimatedMinutes: 45, priority: "P1" },
              { title: "准备汇报", estimatedMinutes: 30, priority: "P1" },
            ],
            proposedBlocks: [
              {
                id: "block_evening",
                taskId: "task_weekly_report",
                title: "整理周报",
                startAt: "2026-04-10T11:00:00.000Z",
                endAt: "2026-04-10T11:45:00.000Z",
                durationMinutes: 45,
                status: "proposed",
              },
            ],
            readyToConfirm: true,
          },
          raw: { choices: [{ message: { content: "我先帮你拆解任务，并安排在今晚和明早。" } }] },
        };
      },
    },
  });

  const created = await invoke(handler, "POST", "/arrange/conversations");
  const replied = await invoke(
    handler,
    "POST",
    `/arrange/conversations/${created.body.conversation.id}/messages`,
    { content: "今晚整理周报，明早开组会汇报" },
  );

  assert.equal(replied.statusCode, 201);
  assert.equal(replied.body.assistantMessage.content.includes("整理周报"), true);
  assert.equal(replied.body.assistantMessage.content.includes("准备汇报"), true);
  assert.equal(replied.body.snapshot.title, "周报与汇报安排");
  assert.equal(replied.body.snapshot.summary, "今晚整理周报，明早准备汇报。");
  assert.equal(replied.body.snapshot.tasks.length, 2);
  assert.equal(replied.body.snapshot.proposedBlocks.length, 1);
  assert.equal(replied.body.snapshot.readyToConfirm, true);
});

test("arrange chat refuses destructive or absurd requests instead of inventing benign tasks", async () => {
  const adminAiRepository = createInMemoryAdminAiRepository();
  const provider = await adminAiRepository.createProvider({
    name: "AiHubMix",
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
    developerPrompt: "始终返回 assistantMessage、title、summary、tasks、proposedBlocks、readyToConfirm 六个字段。",
    version: "v1",
    isActive: true,
  });

  let providerCalled = false;
  const handler = createAppHandler({
    adminAiRepository,
    providerClient: {
      async chatCompletion() {
        providerCalled = true;
        throw new Error("should not call provider for destructive requests");
      },
    },
  });

  const created = await invoke(handler, "POST", "/arrange/conversations");
  const replied = await invoke(
    handler,
    "POST",
    `/arrange/conversations/${created.body.conversation.id}/messages`,
    { content: "我明天要炸地球" },
  );

  assert.equal(replied.statusCode, 201);
  assert.equal(providerCalled, false);
  assert.equal(
    replied.body.assistantMessage.content.includes("不能帮你拆解、排期或推进这个请求"),
    true,
  );
  assert.equal(replied.body.snapshot.title, null);
  assert.equal(replied.body.snapshot.summary, null);
  assert.equal(replied.body.snapshot.tasks.length, 0);
  assert.equal(replied.body.snapshot.proposedBlocks.length, 0);
  assert.equal(replied.body.snapshot.readyToConfirm, false);
});

test("arrange chat drops invalid structured task and block items instead of persisting empty objects", async () => {
  const adminAiRepository = createInMemoryAdminAiRepository();
  const provider = await adminAiRepository.createProvider({
    name: "AiHubMix",
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
    developerPrompt: "优先返回结构化结果。",
    version: "v1",
    isActive: true,
  });

  const handler = createAppHandler({
    adminAiRepository,
    providerClient: {
      async chatCompletion(request) {
        assert.equal(request.model, "gpt-4o-mini");
        return {
          id: "resp_structured_2",
          model: request.model,
          outputText: "我先给你一个初步安排。",
          structuredOutput: {
            assistantMessage: "我先给你一个初步安排。",
            title: "周报和汇报准备安排",
            summary: "今晚先做周报，明早再准备汇报。",
            tasks: [{}],
            proposedBlocks: [{}],
            readyToConfirm: false,
          },
          raw: { choices: [{ message: { content: "我先给你一个初步安排。" } }] },
        };
      },
    },
  });

  const created = await invoke(handler, "POST", "/arrange/conversations");
  const replied = await invoke(
    handler,
    "POST",
    `/arrange/conversations/${created.body.conversation.id}/messages`,
    { content: "今晚整理周报，明早准备汇报" },
  );

  assert.equal(replied.statusCode, 201);
  assert.equal(replied.body.snapshot.title, "周报和汇报准备安排");
  assert.equal(replied.body.snapshot.summary, "今晚先做周报，明早再准备汇报。");
  assert.deepEqual(replied.body.snapshot.tasks, []);
  assert.deepEqual(replied.body.snapshot.proposedBlocks, []);
});

test("arrange chat expands a terse assistantMessage using structured snapshot details", async () => {
  const adminAiRepository = createInMemoryAdminAiRepository();
  const provider = await adminAiRepository.createProvider({
    name: "AiHubMix",
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
    developerPrompt: "优先返回结构化结果。",
    version: "v1",
    isActive: true,
  });

  const handler = createAppHandler({
    adminAiRepository,
    providerClient: {
      async chatCompletion(request) {
        assert.equal(request.model, "gpt-4o-mini");
        return {
          id: "resp_structured_short_1",
          model: request.model,
          outputText: "以下是拆解建议：",
          structuredOutput: {
            assistantMessage: "以下是拆解建议：",
            title: "周报准备任务拆解",
            summary: "这是一个周报准备事项的拆解，包含资料整理和提纲输出。",
            tasks: [
              { title: "整理本周资料", estimatedMinutes: 30, priority: "高" },
              { title: "输出周报提纲", estimatedMinutes: 45, priority: "高" },
            ],
            proposedBlocks: [
              {
                id: "1",
                taskId: "task1",
                title: "整理本周资料",
                startAt: "2026-04-10T05:55:00+08:00",
                endAt: "2026-04-10T06:25:00+08:00",
                durationMinutes: 30,
                status: "proposed",
              },
            ],
            readyToConfirm: false,
          },
          raw: { choices: [{ message: { content: "以下是拆解建议：" } }] },
        };
      },
    },
  });

  const created = await invoke(handler, "POST", "/arrange/conversations");
  const replied = await invoke(
    handler,
    "POST",
    `/arrange/conversations/${created.body.conversation.id}/messages`,
    { content: "帮我拆解周报准备的任务" },
  );

  assert.equal(replied.statusCode, 201);
  assert.equal(replied.body.assistantMessage.content.includes("整理本周资料"), true);
  assert.equal(replied.body.assistantMessage.content.includes("输出周报提纲"), true);
  assert.equal(replied.body.assistantMessage.content.includes("这是一个周报准备事项的拆解"), true);
  assert.equal(replied.body.assistantMessage.content.includes("2026-04-10T05:55:00+08:00"), false);
  assert.equal(replied.body.assistantMessage.content.includes("优先级 high"), false);
  assert.equal(replied.body.assistantMessage.content.includes("优先级 medium"), false);
  assert.equal(replied.body.assistantMessage.content.includes("30 分钟"), true);
});

test("arrange chat fallback expansion formats english priorities and iso times into readable chinese", async () => {
  const adminAiRepository = createInMemoryAdminAiRepository();
  const provider = await adminAiRepository.createProvider({
    name: "AiHubMix",
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
    developerPrompt: "优先返回结构化结果。",
    version: "v1",
    isActive: true,
  });

  const handler = createAppHandler({
    adminAiRepository,
    providerClient: {
      async chatCompletion(request) {
        return {
          id: "resp_structured_short_2",
          model: request.model,
          outputText: "我先拆一下。",
          structuredOutput: {
            assistantMessage: "我先拆一下。",
            title: "当前问题安排",
            summary: "先定位问题，再推进下一步。",
            tasks: [
              { title: "识别主要问题", estimatedMinutes: 30, priority: "high" },
              { title: "概述潜在解决方案", estimatedMinutes: 60, priority: "medium" },
            ],
            proposedBlocks: [
              {
                id: "1",
                taskId: "task1",
                title: "讨论当前问题",
                startAt: "2026-04-10T08:35:00+08:00",
                endAt: "2026-04-10T09:05:00+08:00",
                durationMinutes: 30,
                status: "proposed",
              },
              {
                id: "2",
                taskId: "task2",
                title: "计划下一步",
                startAt: "2026-04-10T09:05:00+08:00",
                endAt: "2026-04-10T10:05:00+08:00",
                durationMinutes: 60,
                status: "proposed",
              },
            ],
            readyToConfirm: false,
          },
          raw: { choices: [{ message: { content: "我先拆一下。" } }] },
        };
      },
    },
  });

  const created = await invoke(handler, "POST", "/arrange/conversations");
  const replied = await invoke(
    handler,
    "POST",
    `/arrange/conversations/${created.body.conversation.id}/messages`,
    { content: "怎么回事，拆的什么玩意" },
  );

  assert.equal(replied.statusCode, 201);
  assert.equal(replied.body.assistantMessage.content.includes("优先级 高"), true);
  assert.equal(replied.body.assistantMessage.content.includes("优先级 中"), true);
  assert.equal(replied.body.assistantMessage.content.includes("2026-04-10T08:35:00+08:00"), false);
  assert.equal(replied.body.assistantMessage.content.includes("08:35 - 09:05"), true);
  assert.equal(replied.body.assistantMessage.content.includes("09:05 - 10:05"), true);
});

test("arrange chat includes current date context in model messages to avoid drifting into historical dates", async () => {
  const adminAiRepository = createInMemoryAdminAiRepository();
  const provider = await adminAiRepository.createProvider({
    name: "AiHubMix",
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
    developerPrompt: "优先返回结构化结果。",
    version: "v1",
    isActive: true,
  });

  const handler = createAppHandler({
    adminAiRepository,
    now: () => new Date("2026-04-10T12:34:56.000Z"),
    providerClient: {
      async chatCompletion(request) {
        const systemMessages = request.messages.filter((message) => message.role === "system");
        assert.equal(
          systemMessages.some((message) => message.content.includes("当前时间")),
          true,
        );
        assert.equal(
          systemMessages.some((message) => message.content.includes("2026-04-10")),
          true,
        );
        assert.equal(
          systemMessages.some((message) => message.content.includes("Asia/Shanghai")),
          true,
        );

        return {
          id: "resp_time_context_1",
          model: request.model,
          outputText: "我会根据今天和明早的时间来安排。",
          structuredOutput: {
            assistantMessage: "我会根据今天和明早的时间来安排。",
            title: "周报与汇报安排",
            summary: "按当前日期生成安排。",
            tasks: [],
            proposedBlocks: [],
            readyToConfirm: false,
          },
          raw: { choices: [{ message: { content: "我会根据今天和明早的时间来安排。" } }] },
        };
      },
    },
  });

  const created = await invoke(handler, "POST", "/arrange/conversations");
  const replied = await invoke(
    handler,
    "POST",
    `/arrange/conversations/${created.body.conversation.id}/messages`,
    { content: "我今晚要完成周报，明早9点前要准备汇报，请帮我安排。" },
  );

  assert.equal(replied.statusCode, 201);
});

test("arrange chat structured output schema marks every property as required for provider compatibility", async () => {
  const jsonSchema = zodSchema(arrangeStructuredOutputSchema).jsonSchema;

  assert.deepEqual(jsonSchema.required, [
    "assistantMessage",
    "title",
    "summary",
    "tasks",
    "proposedBlocks",
    "readyToConfirm",
  ]);
  assert.deepEqual(
    jsonSchema.properties?.tasks?.items?.required,
    ["title", "estimatedMinutes", "priority"],
  );
  assert.deepEqual(
    jsonSchema.properties?.proposedBlocks?.items?.required,
    ["id", "taskId", "title", "startAt", "endAt", "durationMinutes", "status"],
  );
});
