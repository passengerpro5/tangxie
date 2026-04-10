import { createMiniProgramApiClient } from "../../services/api.js";
import { resolveMiniProgramRuntimeConfig, setMiniProgramRuntimeConfig } from "../../config/runtime.js";
import { createWeChatRequestTransport } from "../../services/wechat-request.js";
import { createArrangeFlow, createArrangeSheet } from "../../components/arrange-sheet/index.js";
import { buildHomePage, openArrangeSheet, refreshHomePage, switchHomeTab } from "./index.js";

function createInitialState(runtimeConfig, initialHome) {
  return {
    home: initialHome ?? buildHomePage(),
    loading: false,
    error: null,
    notice: null,
    runtimeConfig: {
      apiBaseUrl: runtimeConfig.apiBaseUrl,
      apiBaseUrlDraft: runtimeConfig.apiBaseUrl,
    },
    sheetOpen: false,
    arrangeTab: "arrange",
    attachmentPickerOpen: false,
    draftText: "",
    answerText: "",
    stage: "idle",
    nextQuestion: null,
    confirmedBlocks: [],
    currentConversationId: null,
    arrangeMessages: [],
    arrangeSnapshot: null,
  };
}

function supportsArrangeChat(apiClient) {
  return (
    typeof apiClient.createArrangeConversation === "function" &&
    typeof apiClient.listArrangeConversations === "function" &&
    typeof apiClient.getArrangeConversation === "function" &&
    typeof apiClient.sendArrangeConversationMessage === "function" &&
    typeof apiClient.confirmArrangeConversation === "function"
  );
}

function mapHistoryEntry(record) {
  return {
    id: record.id,
    title: record.title,
    summary: record.summary ?? "继续这段任务安排对话。",
    updatedAt: record.updatedAt.replace("T", " ").slice(0, 16),
  };
}

function buildThreadItemsFromMessages(messages, snapshot) {
  if (!messages.length) {
    return [
      {
        id: "thread-hero",
        kind: "hero",
        title: "开始规划",
        body: "直接像和 Codex 一样说出你的任务，糖蟹会持续理解、拆分和调整安排。",
        accent: "soft",
      },
    ];
  }

  const threadItems = messages.map((message) => ({
    id: message.id,
    kind:
      message.role === "assistant"
        ? "assistant_message"
        : message.role === "system"
          ? "system_question"
          : "user_input",
    title: message.role === "assistant" ? "糖蟹" : message.role === "system" ? "系统" : "你",
    body: message.content,
  }));

  if (snapshot?.readyToConfirm) {
    threadItems.push({
      id: "thread-ready",
      kind: "ready",
      title: snapshot.title ?? "可以确认安排",
      body: snapshot.summary ?? "当前安排已经整理完成，可以继续修改或直接确认。",
    });
  }

  if (snapshot?.proposedBlocks?.some((block) => block.status === "confirmed")) {
    threadItems.push({
      id: "thread-confirmed",
      kind: "confirmed",
      title: "已确认排期",
      body: snapshot.proposedBlocks
        .filter((block) => block.status === "confirmed")
        .map((block) => `${block.title} ${block.startAt} - ${block.endAt}`)
        .join("\n"),
    });
  }

  return threadItems;
}

function buildPendingThreadItems(messages, snapshot, pendingDraft) {
  return [
    ...buildThreadItemsFromMessages(messages, snapshot),
    {
      id: `pending-user-${messages.length + 1}`,
      kind: "user_input",
      title: "你",
      body: pendingDraft,
    },
    {
      id: `pending-assistant-${messages.length + 2}`,
      kind: "assistant_message",
      title: "糖蟹",
      body: "正在思考你的安排...",
    },
  ];
}

export function createHomePageRuntime(options = {}) {
  const runtimeConfig = resolveMiniProgramRuntimeConfig(options.runtimeConfig);
  const state = createInitialState(runtimeConfig, options.initialHome);
  const transport =
    typeof globalThis.wx?.request === "function"
      ? createWeChatRequestTransport()
      : undefined;
  let apiClient =
    options.apiClient ??
    createMiniProgramApiClient({
      baseUrl: runtimeConfig.apiBaseUrl,
      transport,
    });

  function rebuildApiClient(nextBaseUrl) {
    if (options.apiClient) {
      return;
    }

    apiClient = createMiniProgramApiClient({
      baseUrl: nextBaseUrl,
      transport,
    });
  }

  const flow = createArrangeFlow({
    apiClient: {
      intakeTask(payload) {
        return apiClient.intakeTask(payload);
      },
      replyClarification(payload) {
        return apiClient.replyClarification(payload);
      },
      proposeSchedule(payload) {
        return apiClient.proposeSchedule(payload);
      },
      confirmSchedule(payload) {
        return apiClient.confirmSchedule(payload);
      },
      generateReminders(payload) {
        return apiClient.generateReminders(payload);
      },
    },
    home: {
      refresh(blocks) {
        refreshHomePage(state.home, blocks);
      },
    },
  });

  function setState(patch) {
    Object.assign(state, patch);
  }

  function syncArrangeSheet(
    threadItems,
    attachments = state.home.arrangeSheet.attachments,
    history = state.home.arrangeSheet.history,
  ) {
    state.home.arrangeSheet = createArrangeSheet({
      draftText: state.draftText,
      attachments,
      history,
      threadItems,
    });
  }

  function syncArrangeSheetFromConversation(history) {
    syncArrangeSheet(
      buildThreadItemsFromMessages(state.arrangeMessages, state.arrangeSnapshot),
      state.home.arrangeSheet.attachments,
      history,
    );
  }

  async function loadConversationHistory() {
    if (!supportsArrangeChat(apiClient)) {
      return state.home.arrangeSheet.history;
    }

    const result = await apiClient.listArrangeConversations();
    return result.items.map(mapHistoryEntry);
  }

  async function ensureConversation() {
    if (!supportsArrangeChat(apiClient)) {
      return null;
    }

    if (state.currentConversationId) {
      return state.currentConversationId;
    }

    const created = await apiClient.createArrangeConversation();
    state.currentConversationId = created.conversation.id;
    state.arrangeMessages = created.messages;
    state.arrangeSnapshot = created.snapshot;
    return created.conversation.id;
  }

  async function createFreshConversation() {
    if (!supportsArrangeChat(apiClient)) {
      return null;
    }

    const created = await apiClient.createArrangeConversation();
    state.currentConversationId = created.conversation.id;
    state.arrangeMessages = created.messages;
    state.arrangeSnapshot = created.snapshot;
    state.draftText = "";
    state.answerText = "";
    state.nextQuestion = null;
    state.confirmedBlocks = [];
    state.stage = created.snapshot.readyToConfirm ? "ready_to_schedule" : "idle";
    state.attachmentPickerOpen = false;
    return created.conversation.id;
  }

  async function run(work) {
    setState({ loading: true, error: null, notice: null });
    try {
      const result = await work();
      setState({ loading: false });
      return result;
    } catch (error) {
      setState({
        loading: false,
        error: error instanceof Error ? error.message : "Request failed",
      });
      throw error;
    }
  }

  function buildLegacyThreadItems(input) {
    const threadItems = [];

    if (input.stage === "idle" && !input.draftText && !input.attachment) {
      threadItems.push({
        id: "thread-hero",
        kind: "hero",
        title: "开始规划",
        body: "把任务丢给糖蟹，它会自动追问 deadline、时长和开始时间。",
        accent: "soft",
      });
    }

    if (input.draftText) {
      threadItems.push({
        id: "thread-user-input",
        kind: "user_input",
        title: "当前输入",
        body: input.draftText,
      });
    }

    if (input.attachment) {
      threadItems.push({
        id: `thread-attachment-${input.attachment.name}`,
        kind: "extracted_attachment",
        title: "帮我拆解这个任务",
        body: "已经读取文件内容。",
        attachmentName: input.attachment.name,
      });
    }

    if (input.nextQuestion) {
      threadItems.push({
        id: "thread-system-question",
        kind: "system_question",
        title: "系统追问",
        body: input.nextQuestion,
      });
    }

    if (input.stage === "ready_to_schedule") {
      threadItems.push({
        id: "thread-ready",
        kind: "ready",
        title: "信息已齐",
        body: "可以确认排期并生成提醒了。",
      });
    }

    if (input.confirmedBlocks?.length) {
      threadItems.push({
        id: "thread-confirmed",
        kind: "confirmed",
        title: "已确认排期",
        body: input.confirmedBlocks.map((block) => `${block.title} ${block.startAt} - ${block.endAt}`).join("\n"),
      });
    }

    return threadItems;
  }

  return {
    state,
    clearFeedback() {
      state.error = null;
      state.notice = null;
    },
    setDraftText(value) {
      state.draftText = value;
    },
    setAnswerText(value) {
      state.answerText = value;
    },
    setRuntimeApiBaseUrlDraft(value) {
      state.runtimeConfig.apiBaseUrlDraft = value;
    },
    saveRuntimeApiBaseUrl() {
      const nextBaseUrl = state.runtimeConfig.apiBaseUrlDraft.trim();
      if (!nextBaseUrl) {
        state.error = "API 地址不能为空";
        return;
      }

      setMiniProgramRuntimeConfig({ apiBaseUrl: nextBaseUrl });
      rebuildApiClient(nextBaseUrl);
      state.runtimeConfig.apiBaseUrl = nextBaseUrl;
      state.notice = "API 地址已保存，后续请求将使用新地址";
      state.error = null;
    },
    switchTab(tabId) {
      switchHomeTab(state.home, tabId);
    },
    switchArrangeTab(tabId) {
      state.arrangeTab = tabId;
    },
    async openArrangeSheet() {
      openArrangeSheet(state.home);
      state.sheetOpen = true;
      state.arrangeTab = "arrange";

      if (supportsArrangeChat(apiClient)) {
        const history = await loadConversationHistory();
        await ensureConversation();
        syncArrangeSheetFromConversation(history);
        return;
      }

      syncArrangeSheet(buildLegacyThreadItems({ stage: state.stage }));
    },
    async startNewArrangeConversation() {
      if (!supportsArrangeChat(apiClient)) {
        state.notice = "当前模式暂不支持新建会话";
        return;
      }

      await run(async () => {
        await createFreshConversation();
        const history = await loadConversationHistory();
        state.sheetOpen = true;
        state.arrangeTab = "arrange";
        state.notice = "已切换到新会话";
        syncArrangeSheetFromConversation(history);
      });
    },
    async openArrangeConversation(conversationId) {
      if (!supportsArrangeChat(apiClient)) {
        return;
      }

      await run(async () => {
        const detail = await apiClient.getArrangeConversation(conversationId);
        const history = await loadConversationHistory();
        state.currentConversationId = detail.conversation.id;
        state.arrangeMessages = detail.messages;
        state.arrangeSnapshot = detail.snapshot;
        state.arrangeTab = "arrange";
        state.stage = detail.snapshot.readyToConfirm ? "ready_to_schedule" : "idle";
        syncArrangeSheetFromConversation(history);
      });
    },
    closeArrangeSheet() {
      state.sheetOpen = false;
      state.attachmentPickerOpen = false;
    },
    openAttachmentPicker() {
      state.attachmentPickerOpen = true;
    },
    closeAttachmentPicker() {
      state.attachmentPickerOpen = false;
    },
    async submitAttachment(attachment) {
      return run(async () => {
        const result = await flow.submitAttachment(attachment);
        state.sheetOpen = true;
        state.attachmentPickerOpen = false;
        state.stage = result.stage;
        state.nextQuestion = result.nextQuestion;
        state.confirmedBlocks = result.confirmedBlocks;
        state.notice = "已读取附件并进入追问";
        syncArrangeSheet(
          buildLegacyThreadItems({
            attachment,
            nextQuestion: result.nextQuestion,
            stage: result.stage,
            confirmedBlocks: result.confirmedBlocks,
          }),
          result.attachments,
        );
        return { stage: result.stage };
      });
    },
    async submitDraft() {
      if (state.loading) {
        return { stage: state.stage };
      }

      if (supportsArrangeChat(apiClient)) {
        const pendingDraft = state.draftText.trim();

        return run(async () => {
          state.sheetOpen = true;
          state.draftText = "";
          const history = state.home.arrangeSheet.history;
          syncArrangeSheet(
            buildPendingThreadItems(state.arrangeMessages, state.arrangeSnapshot, pendingDraft),
            state.home.arrangeSheet.attachments,
            history,
          );

          const conversationId = await ensureConversation();
          if (!conversationId) {
            throw new Error("No conversation available");
          }

          const result = await apiClient.sendArrangeConversationMessage(conversationId, {
            content: pendingDraft,
          });
          const refreshedHistory = await loadConversationHistory();
          state.currentConversationId = result.conversation.id;
          state.arrangeMessages = [...state.arrangeMessages, result.userMessage, result.assistantMessage];
          state.arrangeSnapshot = result.snapshot;
          state.stage = result.snapshot.readyToConfirm ? "ready_to_schedule" : "idle";
          state.notice = "糖蟹已回复";
          syncArrangeSheetFromConversation(refreshedHistory);
          return { stage: state.stage };
        });
      }

      return run(async () => {
        const result = await flow.submitRawText(state.draftText);
        state.sheetOpen = true;
        state.stage = result.stage;
        state.nextQuestion = result.nextQuestion;
        state.confirmedBlocks = result.confirmedBlocks;
        state.notice = result.stage === "clarifying" ? "已进入追问" : "任务已进入排期";
        syncArrangeSheet(
          buildLegacyThreadItems({
            draftText: state.draftText,
            nextQuestion: result.nextQuestion,
            stage: result.stage,
            confirmedBlocks: result.confirmedBlocks,
          }),
        );
        return { stage: result.stage };
      });
    },
    async submitClarification(answerText = state.answerText) {
      return run(async () => {
        const result = await flow.reply(answerText);
        state.stage = result.stage;
        state.nextQuestion = result.nextQuestion;
        state.notice = "补充信息已提交";
        syncArrangeSheet(
          buildLegacyThreadItems({
            draftText: state.draftText,
            nextQuestion: result.nextQuestion,
            stage: result.stage,
            confirmedBlocks: result.confirmedBlocks,
          }),
          result.attachments,
        );
        return { stage: result.stage };
      });
    },
    async proposeSchedule() {
      if (supportsArrangeChat(apiClient)) {
        return run(async () => {
          if (!state.currentConversationId) {
            throw new Error("No conversation available");
          }

          const result = await apiClient.confirmArrangeConversation(state.currentConversationId);
          const history = await loadConversationHistory();
          state.stage = "confirmed";
          state.confirmedBlocks = result.confirmedBlocks;
          state.arrangeSnapshot = result.snapshot;
          refreshHomePage(state.home, result.confirmedBlocks);
          state.notice = "排期已确认并已刷新首页";
          syncArrangeSheetFromConversation(history);
          return { stage: state.stage };
        });
      }

      return run(async () => {
        const result = await flow.propose();
        state.stage = result.stage;
        state.nextQuestion = result.nextQuestion;
        state.confirmedBlocks = result.confirmedBlocks;
        state.sheetOpen = false;
        state.notice = "排期已确认并已刷新首页";
        syncArrangeSheet(
          buildLegacyThreadItems({
            draftText: state.draftText,
            stage: result.stage,
            confirmedBlocks: result.confirmedBlocks,
          }),
          result.attachments,
        );
        return { stage: result.stage };
      });
    },
  };
}
