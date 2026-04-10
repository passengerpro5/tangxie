import assert from "node:assert/strict";
import test from "node:test";

import { createHomePageRuntime } from "../pages/home/runtime.ts";
import { DEFAULT_MINIPROGRAM_API_BASE_URL } from "../config/runtime.ts";

test("home runtime exposes loading, error, and sheet state for the core flow", async () => {
  const runtime = createHomePageRuntime({
    apiClient: {
      async intakeTask() {
        return {
          task: { id: "task_1", status: "needs_info" },
          clarificationSession: { id: "session_1", status: "active" },
          missingFields: ["estimatedDurationMinutes"],
          nextQuestion: "这个任务大概需要多久完成？",
        } as never;
      },
      async replyClarification() {
        return {
          task: { id: "task_1", status: "schedulable" },
          clarificationSession: { id: "session_1", status: "resolved" },
          missingFields: [],
          nextQuestion: null,
        } as never;
      },
      async proposeSchedule() {
        return {
          orderedTaskIds: ["task_1"],
          blocks: [
            {
              id: "block_1",
              taskId: "task_1",
              title: "论文初稿",
              startAt: "2026-04-08T09:00:00.000Z",
              endAt: "2026-04-08T11:00:00.000Z",
              durationMinutes: 120,
              status: "confirmed",
            },
          ],
        } as never;
      },
      async confirmSchedule() {
        return {
          orderedTaskIds: ["task_1"],
          blocks: [
            {
              id: "block_1",
              taskId: "task_1",
              title: "论文初稿",
              startAt: "2026-04-08T09:00:00.000Z",
              endAt: "2026-04-08T11:00:00.000Z",
              durationMinutes: 120,
              status: "confirmed",
            },
          ],
        } as never;
      },
      async generateReminders() {
        return {} as never;
      },
    },
  });

  assert.equal(runtime.state.loading, false);
  assert.equal(runtime.state.error, null);
  assert.equal(runtime.state.sheetOpen, false);
  assert.equal(runtime.state.home.activeTab, "schedule");

  runtime.openArrangeSheet();
  assert.equal(runtime.state.sheetOpen, true);
  assert.equal(runtime.state.arrangeTab, "arrange");
  assert.equal(runtime.state.home.arrangeSheet.threadItems[0]?.kind, "hero");
  assert.equal(runtime.state.home.arrangeSheet.threadItems[0]?.title, "开始规划");

  runtime.setDraftText("周五前交论文初稿");
  assert.equal(runtime.state.draftText.includes("论文初稿"), true);

  const afterDraft = await runtime.submitDraft();
  assert.equal(afterDraft.stage, "clarifying");
  assert.equal(runtime.state.nextQuestion, "这个任务大概需要多久完成？");
  assert.equal(runtime.state.loading, false);

  const afterReply = await runtime.submitClarification("2小时");
  assert.equal(afterReply.stage, "ready_to_schedule");
  assert.equal(runtime.state.stage, "ready_to_schedule");

  const afterPropose = await runtime.proposeSchedule();
  assert.equal(afterPropose.stage, "confirmed");
  assert.equal(runtime.state.home.tasks[0]?.status, "scheduled");
  assert.equal(runtime.state.notice?.includes("已确认"), true);
  assert.equal(runtime.state.home.timelineView.days[3]?.id, runtime.state.home.timelineView.activeDateId);
  assert.equal(runtime.state.home.timelineView.initialScrollLeftPx, 264);
  assert.equal(runtime.state.home.timelineView.initialScrollTopPx, 120);
  assert.equal(runtime.state.home.timelineView.days[3]?.blocks.some((block) => block.title === "论文初稿"), true);
  assert.equal(
    runtime.state.home.timelineView.days[3]?.blocks.some(
      (block) => block.title === "论文初稿" && block.topRpx === 1080,
    ),
    true,
  );
  assert.equal(runtime.state.home.timelineView.viewportDurationMinutes, 24 * 60);
});

test("home runtime keeps history in a dedicated arrange-sheet tab", async () => {
  const runtime = createHomePageRuntime({
    apiClient: {
      async createArrangeConversation() {
        return {
          conversation: {
            id: "conv_1",
            title: "新对话",
            summary: null,
            status: "active",
            createdAt: "2026-04-09T00:00:00.000Z",
            updatedAt: "2026-04-09T00:00:00.000Z",
            lastMessageAt: "2026-04-09T00:00:00.000Z",
          },
          messages: [],
          snapshot: {
            title: null,
            summary: null,
            tasks: [],
            proposedBlocks: [],
            readyToConfirm: false,
          },
        } as never;
      },
      async listArrangeConversations() {
        return {
          items: [
            {
              id: "conv_1",
              title: "论文初稿安排",
              summary: "完成论文初稿并安排明天下午处理。",
              status: "active",
              createdAt: "2026-04-09T00:00:00.000Z",
              updatedAt: "2026-04-09T00:01:00.000Z",
              lastMessageAt: "2026-04-09T00:01:00.000Z",
            },
          ],
        } as never;
      },
      async getArrangeConversation() {
        throw new Error("not used");
      },
      async sendArrangeConversationMessage() {
        throw new Error("not used");
      },
      async confirmArrangeConversation() {
        throw new Error("not used");
      },
      async intakeTask() {
        throw new Error("not used");
      },
      async replyClarification() {
        throw new Error("not used");
      },
      async proposeSchedule() {
        throw new Error("not used");
      },
      async confirmSchedule() {
        throw new Error("not used");
      },
      async generateReminders() {
        throw new Error("not used");
      },
    },
  });

  await runtime.openArrangeSheet();
  assert.equal(runtime.state.arrangeTab, "arrange");
  assert.equal(runtime.state.home.arrangeSheet.history.length > 0, true);
  assert.equal(runtime.state.home.arrangeSheet.threadItems.some((item) => item.kind === "history_entry"), false);

  runtime.switchArrangeTab("history");
  assert.equal(runtime.state.arrangeTab, "history");
});

test("home runtime creates an arrange conversation, sends chat messages, and reopens history entries", async () => {
  let createdConversation = false;
  const runtime = createHomePageRuntime({
    apiClient: {
      async createArrangeConversation() {
        createdConversation = true;
        return {
          conversation: {
            id: "conv_1",
            title: "新对话",
            summary: null,
            status: "active",
            createdAt: "2026-04-09T00:00:00.000Z",
            updatedAt: "2026-04-09T00:00:00.000Z",
            lastMessageAt: "2026-04-09T00:00:00.000Z",
          },
          messages: [],
          snapshot: {
            title: null,
            summary: null,
            tasks: [],
            proposedBlocks: [],
            readyToConfirm: false,
          },
        } as never;
      },
      async listArrangeConversations() {
        return {
          items: [
            {
              id: "conv_1",
              title: "论文初稿安排",
              summary: "完成论文初稿并安排明天下午处理。",
              status: "active",
              createdAt: "2026-04-09T00:00:00.000Z",
              updatedAt: "2026-04-09T00:01:00.000Z",
              lastMessageAt: "2026-04-09T00:01:00.000Z",
            },
          ],
        } as never;
      },
      async getArrangeConversation(conversationId) {
        assert.equal(conversationId, "conv_1");
        return {
          conversation: {
            id: "conv_1",
            title: "论文初稿安排",
            summary: "完成论文初稿并安排明天下午处理。",
            status: "active",
            createdAt: "2026-04-09T00:00:00.000Z",
            updatedAt: "2026-04-09T00:01:00.000Z",
            lastMessageAt: "2026-04-09T00:01:00.000Z",
          },
          messages: [
            {
              id: "msg_1",
              conversationId: "conv_1",
              role: "user",
              content: "周五前交论文初稿",
              createdAt: "2026-04-09T00:00:00.000Z",
            },
            {
              id: "msg_2",
              conversationId: "conv_1",
              role: "assistant",
              content: "我已经拆成提纲和正文两部分。",
              createdAt: "2026-04-09T00:00:30.000Z",
            },
          ],
          snapshot: {
            title: "论文初稿安排",
            summary: "完成论文初稿并安排明天下午处理。",
            tasks: [{ title: "整理提纲", estimatedMinutes: 60, priority: "P1" }],
            proposedBlocks: [],
            readyToConfirm: false,
          },
        } as never;
      },
      async sendArrangeConversationMessage(conversationId, payload) {
        assert.equal(conversationId, "conv_1");
        assert.equal(payload.content, "周五前交论文初稿");
        return {
          conversation: {
            id: "conv_1",
            title: "论文初稿安排",
            summary: "完成论文初稿并安排明天下午处理。",
            status: "active",
            createdAt: "2026-04-09T00:00:00.000Z",
            updatedAt: "2026-04-09T00:01:00.000Z",
            lastMessageAt: "2026-04-09T00:01:00.000Z",
          },
          userMessage: {
            id: "msg_1",
            conversationId: "conv_1",
            role: "user",
            content: "周五前交论文初稿",
            createdAt: "2026-04-09T00:00:00.000Z",
          },
          assistantMessage: {
            id: "msg_2",
            conversationId: "conv_1",
            role: "assistant",
            content: "我已经拆成提纲和正文两部分。",
            createdAt: "2026-04-09T00:00:30.000Z",
          },
          snapshot: {
            title: "论文初稿安排",
            summary: "完成论文初稿并安排明天下午处理。",
            tasks: [{ title: "整理提纲", estimatedMinutes: 60, priority: "P1" }],
            proposedBlocks: [],
            readyToConfirm: false,
          },
        } as never;
      },
      async confirmArrangeConversation() {
        throw new Error("not used");
      },
      async intakeTask() {
        throw new Error("not used");
      },
      async replyClarification() {
        throw new Error("not used");
      },
      async proposeSchedule() {
        throw new Error("not used");
      },
      async confirmSchedule() {
        throw new Error("not used");
      },
      async generateReminders() {
        throw new Error("not used");
      },
    },
  });

  await runtime.openArrangeSheet();
  assert.equal(createdConversation, true);
  assert.equal(runtime.state.sheetOpen, true);

  runtime.setDraftText("周五前交论文初稿");
  await runtime.submitDraft();
  assert.equal(runtime.state.home.arrangeSheet.threadItems.some((item) => item.body?.includes("正文两部分")), true);

  runtime.switchArrangeTab("history");
  await runtime.openArrangeConversation("conv_1");
  assert.equal(runtime.state.arrangeTab, "arrange");
  assert.equal(runtime.state.home.arrangeSheet.threadItems[0]?.body?.includes("周五前交论文初稿"), true);
});

test("home runtime can start a new arrange conversation from the arrange tab without losing history", async () => {
  let createCalls = 0;

  const runtime = createHomePageRuntime({
    apiClient: {
      async createArrangeConversation() {
        createCalls += 1;
        const id = `conv_${createCalls}`;
        return {
          conversation: {
            id,
            title: createCalls === 1 ? "旧会话" : "新会话",
            summary: null,
            status: "active",
            createdAt: "2026-04-09T00:00:00.000Z",
            updatedAt: "2026-04-09T00:00:00.000Z",
            lastMessageAt: "2026-04-09T00:00:00.000Z",
          },
          messages:
            createCalls === 1
              ? [
                  {
                    id: "msg_1",
                    conversationId: id,
                    role: "assistant",
                    content: "这是旧会话内容。",
                    createdAt: "2026-04-09T00:00:30.000Z",
                  },
                ]
              : [],
          snapshot: {
            title: createCalls === 1 ? "旧会话" : null,
            summary: null,
            tasks: [],
            proposedBlocks: [],
            readyToConfirm: false,
          },
        } as never;
      },
      async listArrangeConversations() {
        return {
          items: [
            {
              id: "conv_2",
              title: "新会话",
              summary: "继续新的安排。",
              status: "active",
              createdAt: "2026-04-09T00:02:00.000Z",
              updatedAt: "2026-04-09T00:02:00.000Z",
              lastMessageAt: "2026-04-09T00:02:00.000Z",
            },
            {
              id: "conv_1",
              title: "旧会话",
              summary: "继续之前的安排。",
              status: "active",
              createdAt: "2026-04-09T00:00:00.000Z",
              updatedAt: "2026-04-09T00:01:00.000Z",
              lastMessageAt: "2026-04-09T00:01:00.000Z",
            },
          ],
        } as never;
      },
      async getArrangeConversation() {
        throw new Error("not used");
      },
      async sendArrangeConversationMessage() {
        throw new Error("not used");
      },
      async confirmArrangeConversation() {
        throw new Error("not used");
      },
      async intakeTask() {
        throw new Error("not used");
      },
      async replyClarification() {
        throw new Error("not used");
      },
      async proposeSchedule() {
        throw new Error("not used");
      },
      async confirmSchedule() {
        throw new Error("not used");
      },
      async generateReminders() {
        throw new Error("not used");
      },
    },
  });

  await runtime.openArrangeSheet();
  assert.equal(runtime.state.currentConversationId, "conv_1");
  assert.equal(runtime.state.home.arrangeSheet.threadItems[0]?.body, "这是旧会话内容。");

  runtime.setDraftText("旧输入");
  runtime.openAttachmentPicker();
  await runtime.startNewArrangeConversation();

  assert.equal(createCalls, 2);
  assert.equal(runtime.state.arrangeTab, "arrange");
  assert.equal(runtime.state.currentConversationId, "conv_2");
  assert.equal(runtime.state.draftText, "");
  assert.equal(runtime.state.answerText, "");
  assert.equal(runtime.state.attachmentPickerOpen, false);
  assert.equal(runtime.state.stage, "idle");
  assert.equal(runtime.state.home.arrangeSheet.threadItems[0]?.kind, "hero");
  assert.equal(runtime.state.home.arrangeSheet.history[0]?.id, "conv_2");
  assert.equal(runtime.state.home.arrangeSheet.history[1]?.id, "conv_1");
});

test("home runtime shows optimistic user and thinking states while arrange chat is in flight and ignores duplicate submits", async () => {
  let resolveReply: ((value: unknown) => void) | null = null;
  let sendCalls = 0;

  const runtime = createHomePageRuntime({
    apiClient: {
      async createArrangeConversation() {
        return {
          conversation: {
            id: "conv_1",
            title: "新对话",
            summary: null,
            status: "active",
            createdAt: "2026-04-09T00:00:00.000Z",
            updatedAt: "2026-04-09T00:00:00.000Z",
            lastMessageAt: "2026-04-09T00:00:00.000Z",
          },
          messages: [],
          snapshot: {
            title: null,
            summary: null,
            tasks: [],
            proposedBlocks: [],
            readyToConfirm: false,
          },
        } as never;
      },
      async listArrangeConversations() {
        return { items: [] } as never;
      },
      async getArrangeConversation() {
        throw new Error("not used");
      },
      async sendArrangeConversationMessage(conversationId, payload) {
        sendCalls += 1;
        assert.equal(conversationId, "conv_1");
        assert.equal(payload.content, "我周五要交论文，帮我拆解一下任务");
        return await new Promise((resolve) => {
          resolveReply = resolve;
        });
      },
      async confirmArrangeConversation() {
        throw new Error("not used");
      },
      async intakeTask() {
        throw new Error("not used");
      },
      async replyClarification() {
        throw new Error("not used");
      },
      async proposeSchedule() {
        throw new Error("not used");
      },
      async confirmSchedule() {
        throw new Error("not used");
      },
      async generateReminders() {
        throw new Error("not used");
      },
    },
  });

  await runtime.openArrangeSheet();
  runtime.setDraftText("我周五要交论文，帮我拆解一下任务");

  const pending = runtime.submitDraft();
  const duplicate = runtime.submitDraft();

  assert.equal(runtime.state.loading, true);
  assert.equal(runtime.state.draftText, "");
  assert.equal(runtime.state.home.arrangeSheet.threadItems.at(-2)?.title, "你");
  assert.equal(runtime.state.home.arrangeSheet.threadItems.at(-2)?.body, "我周五要交论文，帮我拆解一下任务");
  assert.equal(runtime.state.home.arrangeSheet.threadItems.at(-1)?.title, "糖蟹");
  assert.equal(runtime.state.home.arrangeSheet.threadItems.at(-1)?.body, "正在思考你的安排...");

  await Promise.resolve();

  resolveReply?.({
    conversation: {
      id: "conv_1",
      title: "论文安排",
      summary: "准备拆任务并安排时间。",
      status: "active",
      createdAt: "2026-04-09T00:00:00.000Z",
      updatedAt: "2026-04-09T00:01:00.000Z",
      lastMessageAt: "2026-04-09T00:01:00.000Z",
    },
    userMessage: {
      id: "msg_user_1",
      conversationId: "conv_1",
      role: "user",
      content: "我周五要交论文，帮我拆解一下任务",
      createdAt: "2026-04-09T00:00:00.000Z",
    },
    assistantMessage: {
      id: "msg_assistant_1",
      conversationId: "conv_1",
      role: "assistant",
      content: "我先帮你拆成查资料、列提纲、写正文三部分。",
      createdAt: "2026-04-09T00:00:10.000Z",
    },
    snapshot: {
      title: "论文安排",
      summary: "准备拆任务并安排时间。",
      tasks: [],
      proposedBlocks: [],
      readyToConfirm: false,
    },
  });

  const firstResult = await pending;
  const secondResult = await duplicate;
  assert.equal(firstResult.stage, "idle");
  assert.equal(secondResult.stage, "idle");
  assert.equal(sendCalls, 1);
  assert.equal(runtime.state.loading, false);
  assert.equal(
    runtime.state.home.arrangeSheet.threadItems.some(
      (item) => item.body === "我先帮你拆成查资料、列提纲、写正文三部分。",
    ),
    true,
  );
});

test("home runtime supports attachment intake and moves into clarification with extracted content", async () => {
  const runtime = createHomePageRuntime({
    apiClient: {
      async intakeTask(payload) {
        assert.equal(payload.sourceType, "doc");
        assert.equal(payload.fileName, "纤维瘤提取.docx");
        return {
          task: { id: "task_doc_1", status: "needs_info" },
          clarificationSession: { id: "session_doc_1", status: "active" },
          missingFields: ["deadlineAt", "startAt"],
          nextQuestion: "请问你需要在什么时间之前完成这个任务，什么时候开始？",
        } as never;
      },
      async replyClarification() {
        throw new Error("not used");
      },
      async proposeSchedule() {
        throw new Error("not used");
      },
      async confirmSchedule() {
        throw new Error("not used");
      },
      async generateReminders() {
        throw new Error("not used");
      },
    },
  });

  runtime.openArrangeSheet();
  runtime.openAttachmentPicker();
  assert.equal(runtime.state.attachmentPickerOpen, true);

  const result = await runtime.submitAttachment({
    name: "纤维瘤提取.docx",
    kind: "doc",
    fileName: "纤维瘤提取.docx",
  });

  assert.equal(result.stage, "clarifying");
  assert.equal(runtime.state.attachmentPickerOpen, false);
  assert.equal(runtime.state.stage, "clarifying");
  assert.equal(runtime.state.nextQuestion, "请问你需要在什么时间之前完成这个任务，什么时候开始？");
  assert.equal(runtime.state.home.arrangeSheet.attachments[0]?.name, "纤维瘤提取.docx");
  assert.equal(runtime.state.home.arrangeSheet.threadItems.some((item) => item.kind === "extracted_attachment"), true);
  assert.equal(
    runtime.state.home.arrangeSheet.threadItems.some(
      (item) =>
        item.kind === "system_question" &&
        item.body?.includes("请问你需要在什么时间之前完成这个任务"),
    ),
    true,
  );
});

test("home runtime exposes and updates the mini program api base URL override", () => {
  const previousWx = (globalThis as typeof globalThis & {
    wx?: {
      setStorageSync?: (key: string, value: string) => void;
    };
  }).wx;
  const storageWrites: Array<{ key: string; value: string }> = [];

  (globalThis as typeof globalThis & {
    wx?: {
      setStorageSync?: (key: string, value: string) => void;
    };
  }).wx = {
    setStorageSync(key: string, value: string) {
      storageWrites.push({ key, value });
    },
  };

  try {
    const runtime = createHomePageRuntime();

    assert.equal(runtime.state.runtimeConfig.apiBaseUrl, DEFAULT_MINIPROGRAM_API_BASE_URL);
    assert.equal(runtime.state.runtimeConfig.apiBaseUrlDraft, DEFAULT_MINIPROGRAM_API_BASE_URL);

    runtime.setRuntimeApiBaseUrlDraft("http://192.168.0.8:3000");
    assert.equal(runtime.state.runtimeConfig.apiBaseUrlDraft, "http://192.168.0.8:3000");

    runtime.saveRuntimeApiBaseUrl();
    assert.equal(runtime.state.runtimeConfig.apiBaseUrl, "http://192.168.0.8:3000");
    assert.deepEqual(storageWrites, [
      { key: "TANGXIE_RUNTIME_API_BASE_URL", value: "http://192.168.0.8:3000" },
    ]);
  } finally {
    (globalThis as typeof globalThis & {
      wx?: {
        setStorageSync?: (key: string, value: string) => void;
      };
    }).wx = previousWx;
  }
});
