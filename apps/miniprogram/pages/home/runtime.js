import { createMiniProgramApiClient } from "../../services/api.js";
import { resolveMiniProgramRuntimeConfig } from "../../config/runtime.js";
import { createWeChatRequestTransport } from "../../services/wechat-request.js";
import { createArrangeFlow } from "../../components/arrange-sheet/index.js";
import { buildHomePage, openArrangeSheet, refreshHomePage, switchHomeTab } from "./index.js";

function createInitialState(initialHome) {
  return {
    home: initialHome ?? buildHomePage(),
    loading: false,
    error: null,
    notice: null,
    sheetOpen: false,
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
    openArrangeSheet() {
      openArrangeSheet(state.home);
      state.sheetOpen = true;
    },
    closeArrangeSheet() {
      state.sheetOpen = false;
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
        return { stage: result.stage };
      });
    },
    async submitClarification(answerText = state.answerText) {
      return run(async () => {
        const result = await flow.reply(answerText);
        state.stage = result.stage;
        state.nextQuestion = result.nextQuestion;
        state.notice = "补充信息已提交";
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
        return { stage: result.stage };
      });
    },
  };
}
