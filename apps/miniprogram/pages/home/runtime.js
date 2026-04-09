import { createMiniProgramApiClient } from "../../services/api.js";
import { resolveMiniProgramRuntimeConfig } from "../../config/runtime.js";
import { createWeChatRequestTransport } from "../../services/wechat-request.js";
import { createArrangeFlow, createArrangeSheet } from "../../components/arrange-sheet/index.js";
import { buildHomePage, openArrangeSheet, refreshHomePage, switchHomeTab } from "./index.js";

function createInitialState(initialHome) {
  return {
    home: initialHome ?? buildHomePage(),
    loading: false,
    error: null,
    notice: null,
    sheetOpen: false,
    arrangeTab: "arrange",
    attachmentPickerOpen: false,
    draftText: "",
    answerText: "",
    stage: "idle",
    nextQuestion: null,
    confirmedBlocks: [],
  };
}

export function createHomePageRuntime(options = {}) {
  const state = createInitialState(options.initialHome);
  const runtimeConfig = resolveMiniProgramRuntimeConfig(options.runtimeConfig);
  const apiClient =
    options.apiClient ??
    createMiniProgramApiClient({
      baseUrl: runtimeConfig.apiBaseUrl,
      transport: typeof globalThis.wx?.request === "function" ? createWeChatRequestTransport() : undefined,
    });

  const flow = createArrangeFlow({
    apiClient,
    home: {
      refresh(blocks) {
        refreshHomePage(state.home, blocks);
      },
    },
  });

  function setState(patch) {
    Object.assign(state, patch);
  }

  function syncArrangeSheet(threadItems, attachments = state.home.arrangeSheet.attachments) {
    state.home.arrangeSheet = createArrangeSheet({
      draftText: state.draftText,
      attachments,
      history: state.home.arrangeSheet.history,
      threadItems,
    });
  }

  function buildThreadItems(input) {
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

  return {
    state,
    setDraftText(value) {
      state.draftText = value;
    },
    setAnswerText(value) {
      state.answerText = value;
    },
    switchTab(tabId) {
      switchHomeTab(state.home, tabId);
    },
    switchArrangeTab(tabId) {
      state.arrangeTab = tabId;
    },
    openArrangeSheet() {
      openArrangeSheet(state.home);
      state.sheetOpen = true;
      state.arrangeTab = "arrange";
      syncArrangeSheet(buildThreadItems({ stage: state.stage }));
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
          buildThreadItems({
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
      return run(async () => {
        const result = await flow.submitRawText(state.draftText);
        state.home = state.home;
        state.sheetOpen = true;
        state.stage = result.stage;
        state.nextQuestion = result.nextQuestion;
        state.confirmedBlocks = result.confirmedBlocks;
        state.notice = result.stage === "clarifying" ? "已进入追问" : "任务已进入排期";
        syncArrangeSheet(
          buildThreadItems({
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
          buildThreadItems({
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
      return run(async () => {
        const result = await flow.propose();
        state.stage = result.stage;
        state.nextQuestion = result.nextQuestion;
        state.confirmedBlocks = result.confirmedBlocks;
        state.sheetOpen = false;
        state.notice = "排期已确认并已刷新首页";
        syncArrangeSheet(
          buildThreadItems({
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
