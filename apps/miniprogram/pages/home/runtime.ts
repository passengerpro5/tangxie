import { createMiniProgramApiClient } from "../../services/api.ts";
import { resolveMiniProgramRuntimeConfig, type MiniProgramRuntimeConfig } from "../../config/runtime.ts";
import { createWeChatRequestTransport } from "../../services/wechat-request.ts";
import { createArrangeFlow, type ArrangeFlowApiClient, type ArrangeFlowConfirmedBlock, type ArrangeFlowStage } from "../../components/arrange-sheet/index.ts";
import { buildHomePage, openArrangeSheet, refreshHomePage, switchHomeTab, type HomePageModel, type HomeTabId } from "./index.ts";

export interface HomePageRuntimeState {
  home: HomePageModel;
  loading: boolean;
  error: string | null;
  notice: string | null;
  sheetOpen: boolean;
  draftText: string;
  answerText: string;
  stage: ArrangeFlowStage;
  nextQuestion: string | null;
  confirmedBlocks: ArrangeFlowConfirmedBlock[];
}

export interface HomePageRuntimeOptions {
  apiClient?: ArrangeFlowApiClient;
  runtimeConfig?: Partial<MiniProgramRuntimeConfig>;
  initialHome?: HomePageModel;
}

export interface HomePageRuntime {
  state: HomePageRuntimeState;
  setDraftText(value: string): void;
  setAnswerText(value: string): void;
  switchTab(tabId: HomeTabId): void;
  openArrangeSheet(): void;
  closeArrangeSheet(): void;
  submitDraft(): Promise<{ stage: ArrangeFlowStage }>;
  submitClarification(answerText?: string): Promise<{ stage: ArrangeFlowStage }>;
  proposeSchedule(): Promise<{ stage: ArrangeFlowStage }>;
}

function createInitialState(initialHome?: HomePageModel): HomePageRuntimeState {
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

export function createHomePageRuntime(options: HomePageRuntimeOptions = {}): HomePageRuntime {
  const state = createInitialState(options.initialHome);
  const runtimeConfig = resolveMiniProgramRuntimeConfig(options.runtimeConfig);
  const apiClient =
    options.apiClient ??
    createMiniProgramApiClient({
      baseUrl: runtimeConfig.apiBaseUrl,
      transport:
        typeof (globalThis as typeof globalThis & { wx?: { request?: unknown } }).wx?.request ===
        "function"
          ? createWeChatRequestTransport()
          : undefined,
    });

  const flow = createArrangeFlow({
    apiClient,
    home: {
      refresh(blocks) {
        refreshHomePage(state.home, blocks);
      },
    },
  });

  function setState(patch: Partial<HomePageRuntimeState>) {
    Object.assign(state, patch);
  }

  async function run<T>(work: () => Promise<T>) {
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
    setDraftText(value: string) {
      state.draftText = value;
    },
    setAnswerText(value: string) {
      state.answerText = value;
    },
    switchTab(tabId: HomeTabId) {
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
