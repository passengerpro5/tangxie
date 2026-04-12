import {
  createMiniProgramApiClient,
  type ArrangeConversationDetailResponse,
  type ArrangeConversationMessageRecord,
  type ArrangeConversationRecord,
  type ArrangeConversationSnapshot,
  type TaskDetailResponse,
  type TaskRecordResponse,
  type TaskScheduleBlockResponse,
  type TasksListResponse,
} from "../../services/api.ts";
import {
  resolveMiniProgramRuntimeConfig,
  setMiniProgramRuntimeConfig,
  type MiniProgramRuntimeConfig,
} from "../../config/runtime.ts";
import { createWeChatRequestTransport } from "../../services/wechat-request.ts";
import {
  createArrangeFlow,
  createArrangeSheet,
  type ArrangeAttachment,
  type ArrangeFlowApiClient,
  type ArrangeFlowConfirmedBlock,
  type ArrangeFlowStage,
  type ArrangeHistoryEntry,
  type ArrangeThreadItem,
} from "../../components/arrange-sheet/index.ts";
import {
  buildHomePage,
  openArrangeSheet,
  patchHomeTaskScheduleBlock,
  refreshHomePage,
  replaceHomeTasks,
  switchHomeTab,
  type HomePageModel,
  type HomeTabId,
  type HomeTaskCard,
} from "./index.ts";

type ArrangeChatApiClient = {
  createArrangeConversation(): Promise<ArrangeConversationDetailResponse>;
  listArrangeConversations(): Promise<{ items: ArrangeConversationRecord[] }>;
  getArrangeConversation(conversationId: string): Promise<ArrangeConversationDetailResponse>;
  sendArrangeConversationMessage(
    conversationId: string,
    payload: { content: string },
  ): Promise<{
    conversation: ArrangeConversationRecord;
    userMessage: ArrangeConversationMessageRecord;
    assistantMessage: ArrangeConversationMessageRecord;
    snapshot: ArrangeConversationSnapshot;
  }>;
  confirmArrangeConversation(conversationId: string): Promise<{
    conversation: ArrangeConversationRecord;
    snapshot: ArrangeConversationSnapshot;
    confirmedBlocks: ArrangeFlowConfirmedBlock[];
  }>;
};

type TasksReadApiClient = {
  listTasks(): Promise<TasksListResponse>;
  getTask(taskId: string): Promise<TaskDetailResponse>;
  updateTaskScheduleBlock(
    taskId: string,
    blockId: string,
    payload: { startAt: string; endAt: string },
  ): Promise<TaskDetailResponse>;
};

type HomePageApiClient = ArrangeFlowApiClient & Partial<ArrangeChatApiClient & TasksReadApiClient>;

export interface HomePageRuntimeState {
  home: HomePageModel;
  loading: boolean;
  error: string | null;
  notice: string | null;
  runtimeConfig: {
    apiBaseUrl: string;
    apiBaseUrlDraft: string;
  };
  sheetOpen: boolean;
  arrangeTab: "arrange" | "history";
  attachmentPickerOpen: boolean;
  draftText: string;
  answerText: string;
  stage: ArrangeFlowStage;
  nextQuestion: string | null;
  confirmedBlocks: ArrangeFlowConfirmedBlock[];
  currentConversationId: string | null;
  arrangeMessages: ArrangeConversationMessageRecord[];
  arrangeSnapshot: ArrangeConversationSnapshot | null;
  taskDetailVisible: boolean;
  selectedTaskId: string | null;
}

export interface HomePageRuntimeOptions {
  apiClient?: HomePageApiClient;
  runtimeConfig?: Partial<MiniProgramRuntimeConfig>;
  initialHome?: HomePageModel;
}

export interface HomePageRuntime {
  state: HomePageRuntimeState;
  loadTasks(): Promise<void>;
  clearFeedback(): void;
  setDraftText(value: string): void;
  setAnswerText(value: string): void;
  setRuntimeApiBaseUrlDraft(value: string): void;
  saveRuntimeApiBaseUrl(): void;
  switchTab(tabId: HomeTabId): void;
  switchArrangeTab(tabId: "arrange" | "history"): void;
  openArrangeSheet(): Promise<void> | void;
  startNewArrangeConversation(): Promise<void>;
  openArrangeConversation(conversationId: string): Promise<void>;
  closeArrangeSheet(): void;
  openAttachmentPicker(): void;
  closeAttachmentPicker(): void;
  openTaskDetail(taskId: string): Promise<void> | void;
  closeTaskDetail(): void;
  previewTaskScheduleBlock(taskId: string, blockId: string, payload: { startAt: string; endAt: string }): void;
  updateTaskScheduleBlock(
    taskId: string,
    blockId: string,
    payload: { startAt: string; endAt: string },
  ): Promise<TaskDetailResponse>;
  submitAttachment(attachment: ArrangeAttachment): Promise<{ stage: ArrangeFlowStage }>;
  submitDraft(): Promise<{ stage: ArrangeFlowStage }>;
  submitClarification(answerText?: string): Promise<{ stage: ArrangeFlowStage }>;
  proposeSchedule(): Promise<{ stage: ArrangeFlowStage }>;
}

function createInitialState(
  runtimeConfig: MiniProgramRuntimeConfig,
  initialHome?: HomePageModel,
): HomePageRuntimeState {
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
    taskDetailVisible: false,
    selectedTaskId: null,
  };
}

function supportsArrangeChat(apiClient: HomePageApiClient): apiClient is HomePageApiClient & ArrangeChatApiClient {
  return (
    typeof apiClient.createArrangeConversation === "function" &&
    typeof apiClient.listArrangeConversations === "function" &&
    typeof apiClient.getArrangeConversation === "function" &&
    typeof apiClient.sendArrangeConversationMessage === "function" &&
    typeof apiClient.confirmArrangeConversation === "function"
  );
}

function supportsTasksList(apiClient: HomePageApiClient): apiClient is HomePageApiClient & Pick<TasksReadApiClient, "listTasks"> {
  return typeof apiClient.listTasks === "function";
}

function supportsTaskDetail(apiClient: HomePageApiClient): apiClient is HomePageApiClient & Pick<TasksReadApiClient, "getTask"> {
  return typeof apiClient.getTask === "function";
}

function supportsTaskScheduleBlockUpdate(
  apiClient: HomePageApiClient,
): apiClient is HomePageApiClient & Pick<TasksReadApiClient, "updateTaskScheduleBlock"> {
  return typeof apiClient.updateTaskScheduleBlock === "function";
}

function mapHistoryEntry(record: ArrangeConversationRecord): ArrangeHistoryEntry {
  return {
    id: record.id,
    title: record.title,
    summary: record.summary ?? "继续这段任务安排对话。",
    updatedAt: record.updatedAt.replace("T", " ").slice(0, 16),
  };
}

function normalizeRuntimeErrorMessage(error: unknown, apiBaseUrl: string) {
  const fallbackMessage = error instanceof Error ? error.message : "Request failed";
  if (!fallbackMessage.includes("request:fail")) {
    return fallbackMessage;
  }

  let hostname = "";
  try {
    hostname = new URL(apiBaseUrl).hostname;
  } catch {
    hostname = "";
  }

  if (hostname === "127.0.0.1" || hostname === "localhost" || hostname === "::1") {
    return `无法连接本地 API（${apiBaseUrl}）。请确认开发服务已启动；如果当前运行在手机或独立模拟环境，请改成电脑的局域网地址。`;
  }

  return `无法连接 API（${apiBaseUrl}）。请检查服务是否已启动，以及当前网络是否可以访问该地址。`;
}

function buildThreadItemsFromMessages(
  messages: ArrangeConversationMessageRecord[],
  snapshot: ArrangeConversationSnapshot | null,
): ArrangeThreadItem[] {
  const confirmedBlocks = snapshot?.proposedBlocks.filter((block) => block.status === "confirmed") ?? [];

  if (!messages.length && !snapshot?.readyToConfirm && !confirmedBlocks.length) {
    return [];
  }

  const threadItems = messages.map<ArrangeThreadItem>((message) => ({
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

  if (snapshot?.readyToConfirm && !confirmedBlocks.length) {
    threadItems.push({
      id: "thread-ready",
      kind: "ready",
      title: snapshot.title ?? "可以确认安排",
      body: snapshot.summary ?? "当前安排已经整理完成，可以继续修改或直接确认。",
      actionLabel: "安排",
    });
  }

  if (confirmedBlocks.length) {
    threadItems.push({
      id: "thread-arranged-divider",
      kind: "status_divider",
      title: "已安排",
    });
  }

  return threadItems;
}

function buildPendingThreadItems(
  messages: ArrangeConversationMessageRecord[],
  snapshot: ArrangeConversationSnapshot | null,
  pendingDraft: string,
): ArrangeThreadItem[] {
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

function resolveArrangeStageFromSnapshot(snapshot: ArrangeConversationSnapshot | null): ArrangeFlowStage {
  if (snapshot?.proposedBlocks.some((block) => block.status === "confirmed")) {
    return "confirmed";
  }

  if (snapshot?.readyToConfirm) {
    return "ready_to_schedule";
  }

  return "idle";
}

function toSystemDateId(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatRelativeDeadlineLabel(value: string | null) {
  if (!value) {
    return "待确认";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "待确认";
  }

  const current = new Date();
  const currentDayId = toSystemDateId(current);
  const targetDayId = toSystemDateId(date);
  const tomorrow = new Date(current.getFullYear(), current.getMonth(), current.getDate() + 1);
  const tomorrowDayId = toSystemDateId(tomorrow);

  if (targetDayId === currentDayId) {
    return "今天";
  }

  if (targetDayId === tomorrowDayId) {
    return "明天";
  }

  if (date.getFullYear() > current.getFullYear()) {
    return "明年";
  }

  return `${date.getMonth() + 1}.${date.getDate()}`;
}

function formatMinutesLabel(value: string) {
  const date = new Date(value);
  return `${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}`;
}

function formatDurationLabel(minutes: number | null, scheduleBlocks: TaskScheduleBlockResponse[]) {
  const scheduledMinutes = scheduleBlocks.reduce((total, block) => total + Math.max(0, block.durationMinutes), 0);
  if (scheduledMinutes > 0) {
    if (scheduledMinutes >= 60 && scheduledMinutes % 60 === 0) {
      return `${Math.round(scheduledMinutes / 60)} 小时`;
    }
    return `${scheduledMinutes} 分钟`;
  }

  if (typeof minutes === "number" && minutes > 0) {
    if (minutes >= 60 && minutes % 60 === 0) {
      return `${Math.round(minutes / 60)} 小时`;
    }
    return `${minutes} 分钟`;
  }

  return "待估算";
}

function formatPriorityLabel(task: TaskRecordResponse) {
  if (typeof task.priorityRank === "number" && task.priorityRank > 0) {
    return `P${task.priorityRank}`;
  }

  if (typeof task.priorityScore === "number") {
    if (task.priorityScore >= 80) {
      return "P1";
    }
    if (task.priorityScore >= 60) {
      return "P2";
    }
  }

  return "P3";
}

function mapCategory(task: TaskRecordResponse) {
  switch (task.status) {
    case "scheduled":
      return { categoryId: "scheduled", categoryTitle: "已安排" };
    case "needs_info":
      return { categoryId: "needs_info", categoryTitle: "待补信息" };
    case "done":
      return { categoryId: "done", categoryTitle: "已完成" };
    case "overdue":
      return { categoryId: "overdue", categoryTitle: "已逾期" };
    default:
      return { categoryId: "todo", categoryTitle: "待安排" };
  }
}

function mapSourceLabel(sourceType: TaskRecordResponse["sourceType"]) {
  if (sourceType === "image") {
    return "图片导入";
  }

  if (sourceType === "doc") {
    return "文档导入";
  }

  return "文本输入";
}

function mapExecutionPlan(scheduleBlocks: TaskScheduleBlockResponse[]) {
  if (!scheduleBlocks.length) {
    return [{ id: "task-plan-pending", label: "等待生成具体排期", statusLabel: "待安排" }];
  }

  return scheduleBlocks
    .slice()
    .sort((left, right) => left.startAt.localeCompare(right.startAt))
    .map((block) => ({
      id: `${block.id}-plan`,
      label: `${formatRelativeDeadlineLabel(block.startAt)} ${formatMinutesLabel(block.startAt)} - ${formatMinutesLabel(block.endAt)}`,
      statusLabel: "已排期",
    }));
}

function mapSuggestions(task: TaskRecordResponse, scheduleBlocks: TaskScheduleBlockResponse[]) {
  if (task.status === "needs_info") {
    return ["先补充 deadline 和预计时长，再生成更稳定的排期。"];
  }

  if (task.status === "done") {
    return ["保留这次执行记录，后续复盘时直接复用。"];
  }

  if (scheduleBlocks.length > 0) {
    return ["先按当前排期推进，如有冲突再重新安排。"];
  }

  return ["先确认优先级和截止时间，再安排时间块。"];
}

function mapScheduleSegments(scheduleBlocks: TaskScheduleBlockResponse[]) {
  return scheduleBlocks
    .slice()
    .sort((left, right) => left.startAt.localeCompare(right.startAt))
    .map((block) => ({
      id: block.id,
      startAt: block.startAt,
      endAt: block.endAt,
      label: `${formatMinutesLabel(block.startAt)}-${formatMinutesLabel(block.endAt)}`,
    }));
}

function mapTaskRecordToHomeTask(
  task: TaskRecordResponse,
  scheduleBlocks: TaskScheduleBlockResponse[],
): HomeTaskCard {
  const scheduleSegments = mapScheduleSegments(scheduleBlocks);
  const firstSegment = scheduleSegments[0];
  const lastSegment = scheduleSegments[scheduleSegments.length - 1];
  const anchorTime = task.deadlineAt ?? task.updatedAt;
  const category = mapCategory(task);

  return {
    id: task.id,
    title: task.title,
    summary: task.description?.trim() || "这是一个待补充的任务说明。",
    startAt: firstSegment?.startAt ?? anchorTime,
    endAt: lastSegment?.endAt ?? anchorTime,
    deadlineAt: task.deadlineAt ?? anchorTime,
    status: task.status as HomeTaskCard["status"],
    deadlineLabel: formatRelativeDeadlineLabel(task.deadlineAt),
    durationLabel: formatDurationLabel(task.estimatedDurationMinutes, scheduleBlocks),
    priorityLabel: formatPriorityLabel(task),
    importanceReason: task.importanceReason ?? "待补充优先级原因",
    categoryId: category.categoryId,
    categoryTitle: category.categoryTitle,
    sourceLabel: mapSourceLabel(task.sourceType),
    executionPlan: mapExecutionPlan(scheduleBlocks),
    suggestions: mapSuggestions(task, scheduleBlocks),
    scheduleSegments,
  };
}

function sortHomeTasks(tasks: HomeTaskCard[]) {
  return tasks.slice().sort((left, right) => {
    if (left.scheduleSegments.length !== right.scheduleSegments.length) {
      return right.scheduleSegments.length - left.scheduleSegments.length;
    }

    return left.deadlineAt.localeCompare(right.deadlineAt);
  });
}

export function createHomePageRuntime(options: HomePageRuntimeOptions = {}): HomePageRuntime {
  const runtimeConfig = resolveMiniProgramRuntimeConfig(options.runtimeConfig);
  const state = createInitialState(runtimeConfig, options.initialHome);
  const transport =
    typeof (globalThis as typeof globalThis & { wx?: { request?: unknown } }).wx?.request === "function"
      ? createWeChatRequestTransport()
      : undefined;
  let apiClient: HomePageApiClient =
    options.apiClient ??
    createMiniProgramApiClient({
      baseUrl: runtimeConfig.apiBaseUrl,
      transport,
    });

  if (!options.initialHome && supportsTasksList(apiClient)) {
    state.home = buildHomePage({ tasks: [] });
  }

  function rebuildApiClient(nextBaseUrl: string) {
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

  function setState(patch: Partial<HomePageRuntimeState>) {
    Object.assign(state, patch);
  }

  function syncArrangeSheet(
    threadItems: ArrangeThreadItem[],
    attachments: ArrangeAttachment[] = state.home.arrangeSheet.attachments,
    history: ArrangeHistoryEntry[] = state.home.arrangeSheet.history,
  ) {
    state.home.arrangeSheet = createArrangeSheet({
      draftText: state.draftText,
      attachments,
      history,
      threadItems,
    });
  }

  function syncArrangeSheetFromConversation(history: ArrangeHistoryEntry[]) {
    syncArrangeSheet(
      buildThreadItemsFromMessages(state.arrangeMessages, state.arrangeSnapshot),
      state.home.arrangeSheet.attachments,
      history,
    );
  }

  function applyTaskRecords(records: Array<TaskRecordResponse & { scheduleBlocks: TaskScheduleBlockResponse[] }>) {
    replaceHomeTasks(
      state.home,
      sortHomeTasks(records.map((record) => mapTaskRecordToHomeTask(record, record.scheduleBlocks))),
    );
  }

  function mergeTaskRecord(task: TaskRecordResponse, scheduleBlocks: TaskScheduleBlockResponse[]) {
    const nextTask = mapTaskRecordToHomeTask(task, scheduleBlocks);
    const nextTasks = sortHomeTasks(
      state.home.tasks.some((item) => item.id === nextTask.id)
        ? state.home.tasks.map((item) => (item.id === nextTask.id ? nextTask : item))
        : [...state.home.tasks, nextTask],
    );
    replaceHomeTasks(state.home, nextTasks);
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
    state.stage = resolveArrangeStageFromSnapshot(created.snapshot);
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
    state.stage = resolveArrangeStageFromSnapshot(created.snapshot);
    state.attachmentPickerOpen = false;
    return created.conversation.id;
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
        error: normalizeRuntimeErrorMessage(error, state.runtimeConfig.apiBaseUrl),
      });
      throw error;
    }
  }

  async function loadTasksFromApi() {
    if (!supportsTasksList(apiClient)) {
      return;
    }

    const result = await apiClient.listTasks();
    applyTaskRecords(result.items);
  }

  function buildLegacyThreadItems(input: {
    draftText?: string;
    attachment?: ArrangeAttachment | null;
    nextQuestion?: string | null;
    stage: ArrangeFlowStage;
    confirmedBlocks?: ArrangeFlowConfirmedBlock[];
  }) {
    const threadItems: ArrangeThreadItem[] = [];

    if (input.stage === "idle" && !input.draftText && !input.attachment) {
      return threadItems;
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
        actionLabel: "安排",
      });
    }

    if (input.confirmedBlocks?.length) {
      threadItems.push({
        id: "thread-arranged-divider",
        kind: "status_divider",
        title: "已安排",
      });
    }

    return threadItems;
  }

  return {
    state,
    async loadTasks() {
      await run(async () => {
        await loadTasksFromApi();
      });
    },
    clearFeedback() {
      state.error = null;
      state.notice = null;
    },
    setDraftText(value: string) {
      state.draftText = value;
    },
    setAnswerText(value: string) {
      state.answerText = value;
    },
    setRuntimeApiBaseUrlDraft(value: string) {
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
    switchTab(tabId: HomeTabId) {
      switchHomeTab(state.home, tabId);
    },
    switchArrangeTab(tabId: "arrange" | "history") {
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
        syncArrangeSheetFromConversation(history);
      });
    },
    async openArrangeConversation(conversationId: string) {
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
        state.stage = resolveArrangeStageFromSnapshot(detail.snapshot);
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
    async openTaskDetail(taskId: string) {
      state.selectedTaskId = taskId;
      state.taskDetailVisible = true;

      if (!supportsTaskDetail(apiClient)) {
        return;
      }

      await run(async () => {
        const result = await apiClient.getTask(taskId);
        mergeTaskRecord(result.task, result.scheduleBlocks);
      });
    },
    closeTaskDetail() {
      state.taskDetailVisible = false;
      state.selectedTaskId = null;
    },
    previewTaskScheduleBlock(taskId, blockId, payload) {
      replaceHomeTasks(
        state.home,
        patchHomeTaskScheduleBlock(state.home.tasks, taskId, blockId, payload),
      );
    },
    async updateTaskScheduleBlock(taskId, blockId, payload) {
      if (!supportsTaskScheduleBlockUpdate(apiClient)) {
        throw new Error("当前模式暂不支持更新时间块");
      }

      return run(async () => {
        try {
          const result = await apiClient.updateTaskScheduleBlock(taskId, blockId, payload);
          mergeTaskRecord(result.task, result.scheduleBlocks);
          state.notice = "任务时间已更新";
          return result;
        } catch (error) {
          if (supportsTasksList(apiClient)) {
            await loadTasksFromApi();
          }
          throw error;
        }
      });
    },
    async submitAttachment(attachment: ArrangeAttachment) {
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

      const pendingDraft = state.draftText.trim();
      if (!pendingDraft) {
        return { stage: state.stage };
      }

      if (supportsArrangeChat(apiClient)) {
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
          state.stage = resolveArrangeStageFromSnapshot(result.snapshot);
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
      if (state.loading) {
        return { stage: state.stage };
      }

      const nextAnswerText = answerText.trim();
      if (!nextAnswerText) {
        return { stage: state.stage };
      }

      return run(async () => {
        const result = await flow.reply(nextAnswerText);
        state.stage = result.stage;
        state.nextQuestion = result.nextQuestion;
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
      if (state.loading) {
        return { stage: state.stage };
      }

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
          if (supportsTasksList(apiClient)) {
            await loadTasksFromApi();
          } else {
            refreshHomePage(state.home, result.confirmedBlocks);
          }
          state.notice = state.sheetOpen ? null : "排期已确认并已刷新首页";
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
