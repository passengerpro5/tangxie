import type { MiniProgramTransport } from "./wechat-request.ts";

export type TaskSourceType = "text" | "image" | "doc";
export type ReminderType = "start" | "deadline" | "daily_summary";

export interface ArrangeConversationTaskSnapshot {
  title: string;
  estimatedMinutes?: number;
  priority?: string;
}

export interface ArrangeConversationBlockSnapshot {
  id: string;
  taskId: string;
  title: string;
  startAt: string;
  endAt: string;
  durationMinutes: number;
  status: "proposed" | "confirmed";
}

export interface ArrangeConversationSnapshot {
  title: string | null;
  summary: string | null;
  tasks: ArrangeConversationTaskSnapshot[];
  proposedBlocks: ArrangeConversationBlockSnapshot[];
  readyToConfirm: boolean;
}

export interface ArrangeConversationRecord {
  id: string;
  title: string;
  summary: string | null;
  status: "active" | "confirmed";
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
}

export interface ArrangeConversationMessageRecord {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
}

export interface MiniProgramApiClientOptions {
  baseUrl: string;
  fetchImpl?: typeof fetch;
  transport?: MiniProgramTransport;
}

export interface TaskIntakePayload {
  rawText: string;
  sourceType?: TaskSourceType;
  fileName?: string;
  fileUrl?: string;
}

export interface TaskIntakeResponse {
  task: { id: string; status: string };
  clarificationSession: { id: string; status: string };
  missingFields: string[];
  nextQuestion: string | null;
}

export interface ClarificationReplyPayload {
  sessionId: string;
  answerText: string;
}

export interface ClarificationReplyResponse {
  task: { id: string; status: string };
  clarificationSession: { id: string; status: string };
  missingFields: string[];
  nextQuestion: string | null;
}

export interface ScheduleProposePayload {
  taskIds: string[];
}

export interface ScheduleBlockResponse {
  id: string;
  taskId: string;
  title: string;
  startAt: string;
  endAt: string;
  durationMinutes: number;
  status: "proposed" | "confirmed";
}

export interface ScheduleProposalResponse {
  orderedTaskIds: string[];
  blocks: ScheduleBlockResponse[];
}

export interface ScheduleConfirmPayload {
  taskIds: string[];
}

export type ScheduleConfirmResponse = ScheduleProposalResponse;

export interface ReminderGeneratePayload {
  confirmedBlocks?: Array<{
    id: string;
    taskId: string;
    title: string;
    startAt: string;
    endAt: string;
    durationMinutes: number;
    status: "confirmed";
  }>;
}

export interface ReminderRecordResponse {
  id: string;
  blockId: string;
  taskId: string;
  title: string;
  reminderType: ReminderType;
  remindAt: string;
  status: string;
  message: string;
  createdAt: string;
}

export interface ReminderSummaryResponse {
  date: string;
  totalCount: number;
  startCount?: number;
  deadlineCount?: number;
  items: ReminderRecordResponse[];
}

export interface ArrangeConversationDetailResponse {
  conversation: ArrangeConversationRecord;
  messages: ArrangeConversationMessageRecord[];
  snapshot: ArrangeConversationSnapshot;
}

export interface ArrangeConversationSendResponse {
  conversation: ArrangeConversationRecord;
  userMessage: ArrangeConversationMessageRecord;
  assistantMessage: ArrangeConversationMessageRecord;
  snapshot: ArrangeConversationSnapshot;
}

export interface ArrangeConversationConfirmResponse {
  conversation: ArrangeConversationRecord;
  snapshot: ArrangeConversationSnapshot;
  confirmedBlocks: Array<ArrangeConversationBlockSnapshot & { status: "confirmed" }>;
}

export interface TaskRecordResponse {
  id: string;
  title: string;
  description: string;
  sourceType: TaskSourceType;
  status: string;
  deadlineAt: string | null;
  estimatedDurationMinutes: number | null;
  priorityScore: number | null;
  priorityRank: number | null;
  importanceReason: string | null;
  createdByAI: boolean;
  userConfirmed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TaskScheduleBlockResponse {
  id: string;
  taskId: string;
  title: string;
  startAt: string;
  endAt: string;
  durationMinutes: number;
  status: "confirmed";
}

export interface TasksListResponse {
  items: Array<TaskRecordResponse & { scheduleBlocks: TaskScheduleBlockResponse[] }>;
}

export interface TaskDetailResponse {
  task: TaskRecordResponse;
  scheduleBlocks: TaskScheduleBlockResponse[];
}

export interface UpdateTaskScheduleBlockPayload {
  startAt: string;
  endAt: string;
}

export interface DailyRecapMetric {
  id: string;
  label: string;
  value: string;
}

export interface DailyRecapScorecardResponse {
  title: string;
  tags: string[];
  metrics: DailyRecapMetric[];
  summary: string;
  shareTitle: string;
  shareSubtitle: string;
}

export interface DailyRecapTaskState {
  taskId: string;
  completed: boolean;
}

export interface DailyRecapPendingTaskPayload {
  taskId: string;
  progressState: "not_started" | "partial" | "almost_done";
  action: "keep" | "move_tomorrow" | "move_later_this_week" | "pause";
}

export interface DailyRecapPendingChangeResponse {
  taskId: string;
  kind: "move_block" | "pause_task";
  label: string;
}

export interface DailyRecapReviewPayload {
  completedTaskIds: string[];
  pendingTasks: DailyRecapPendingTaskPayload[];
}

export interface DailyRecapRecord {
  id: string;
  dateKey: string;
  status: "draft" | "reviewed" | "confirmed";
  tasks: DailyRecapTaskState[];
  completedTaskIds: string[];
  pendingTasks: DailyRecapPendingTaskPayload[];
  requiresScheduleConfirmation: boolean;
  pendingChanges: DailyRecapPendingChangeResponse[];
  confirmedAt: string | null;
  scorecard: DailyRecapScorecardResponse | null;
}

export type DailyRecapTodayRecord = DailyRecapRecord;

export interface DailyRecapReviewRecord {
  recap: DailyRecapRecord;
}

export interface DailyRecapConfirmPayload {
  recapId: string;
  acceptScheduleChanges: boolean;
}

export interface DailyRecapConfirmRecord {
  recap: DailyRecapRecord & {
    status: "confirmed";
    confirmedAt: string;
    scorecard: DailyRecapScorecardResponse;
  };
  scorecard: DailyRecapScorecardResponse;
  updatedTasks: Array<{ id: string; status: string }>;
  updatedScheduleBlocks: Array<{
    id: string;
    taskId: string;
    title: string;
    startAt: string;
    endAt: string;
    durationMinutes: number;
    status: "confirmed";
  }>;
}

function buildUrl(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/$/, "")}${path}`;
}

async function readJsonResponse(response: Response) {
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

function readJsonText(text: string) {
  return text ? JSON.parse(text) : null;
}

async function requestJson<TResponse>(
  fetchImpl: typeof fetch | undefined,
  transport: MiniProgramTransport | undefined,
  baseUrl: string,
  path: string,
  init?: RequestInit,
): Promise<TResponse> {
  const url = buildUrl(baseUrl, path);
  const headers = {
    "Content-Type": "application/json",
    ...(init?.headers ?? {}),
  };

  if (transport) {
    const response = await transport.request({
      url,
      method: init?.method ?? "GET",
      headers,
      body: typeof init?.body === "string" ? init.body : undefined,
    });

    const payload = readJsonText(response.body);
    if (response.status < 200 || response.status >= 300) {
      const message =
        payload && typeof payload === "object" && "message" in payload
          ? String((payload as { message?: unknown }).message ?? "Request failed")
          : `Request failed with ${response.status}`;
      throw new Error(message);
    }

    return payload as TResponse;
  }

  if (!fetchImpl) {
    throw new Error("No request transport available");
  }

  const response = await fetchImpl(url, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const payload = await readJsonResponse(response);
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String((payload as { message?: unknown }).message ?? "Request failed")
        : `Request failed with ${response.status}`;
    throw new Error(message);
  }

  return (await readJsonResponse(response)) as TResponse;
}

export function createMiniProgramApiClient(options: MiniProgramApiClientOptions) {
  const transport = options.transport;
  const fetchImpl = options.fetchImpl ?? globalThis.fetch?.bind(globalThis);

  return {
    intakeTask(payload: TaskIntakePayload) {
      return requestJson<TaskIntakeResponse>(fetchImpl, transport, options.baseUrl, "/tasks/intake", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    replyClarification(payload: ClarificationReplyPayload) {
      return requestJson<ClarificationReplyResponse>(fetchImpl, transport, options.baseUrl, "/clarification/reply", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    proposeSchedule(payload: ScheduleProposePayload) {
      return requestJson<ScheduleProposalResponse>(fetchImpl, transport, options.baseUrl, "/scheduling/propose", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    confirmSchedule(payload: ScheduleConfirmPayload) {
      return requestJson<ScheduleConfirmResponse>(fetchImpl, transport, options.baseUrl, "/scheduling/confirm", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    getTodayDailyRecap() {
      return requestJson<DailyRecapTodayRecord>(
        fetchImpl,
        transport,
        options.baseUrl,
        "/daily-recaps/today",
        {
          method: "GET",
        },
      );
    },
    reviewTodayDailyRecap(payload: DailyRecapReviewPayload) {
      return requestJson<DailyRecapReviewRecord>(
        fetchImpl,
        transport,
        options.baseUrl,
        "/daily-recaps/today/review",
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      );
    },
    confirmTodayDailyRecap(payload: DailyRecapConfirmPayload) {
      return requestJson<DailyRecapConfirmRecord>(
        fetchImpl,
        transport,
        options.baseUrl,
        "/daily-recaps/today/confirm",
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      );
    },
    generateReminders(payload: ReminderGeneratePayload = {}) {
      return requestJson<{ reminders: ReminderRecordResponse[]; summary: ReminderSummaryResponse }>(
        fetchImpl,
        transport,
        options.baseUrl,
        "/reminders/generate",
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      );
    },
    getDailySummary(date?: string) {
      const suffix = date ? `?date=${encodeURIComponent(date)}` : "";
      return requestJson<ReminderSummaryResponse>(
        fetchImpl,
        transport,
        options.baseUrl,
        `/reminders/daily-summary${suffix}`,
        {
          method: "GET",
        },
      );
    },
    createArrangeConversation() {
      return requestJson<ArrangeConversationDetailResponse>(
        fetchImpl,
        transport,
        options.baseUrl,
        "/arrange/conversations",
        {
          method: "POST",
        },
      );
    },
    listArrangeConversations() {
      return requestJson<{ items: ArrangeConversationRecord[] }>(
        fetchImpl,
        transport,
        options.baseUrl,
        "/arrange/conversations",
        {
          method: "GET",
        },
      );
    },
    getArrangeConversation(conversationId: string) {
      return requestJson<ArrangeConversationDetailResponse>(
        fetchImpl,
        transport,
        options.baseUrl,
        `/arrange/conversations/${conversationId}`,
        {
          method: "GET",
        },
      );
    },
    sendArrangeConversationMessage(conversationId: string, payload: { content: string }) {
      return requestJson<ArrangeConversationSendResponse>(
        fetchImpl,
        transport,
        options.baseUrl,
        `/arrange/conversations/${conversationId}/messages`,
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      );
    },
    confirmArrangeConversation(conversationId: string) {
      return requestJson<ArrangeConversationConfirmResponse>(
        fetchImpl,
        transport,
        options.baseUrl,
        `/arrange/conversations/${conversationId}/confirm`,
        {
          method: "POST",
        },
      );
    },
    listTasks() {
      return requestJson<TasksListResponse>(
        fetchImpl,
        transport,
        options.baseUrl,
        "/tasks",
        {
          method: "GET",
        },
      );
    },
    getTask(taskId: string) {
      return requestJson<TaskDetailResponse>(
        fetchImpl,
        transport,
        options.baseUrl,
        `/tasks/${taskId}`,
        {
          method: "GET",
        },
      );
    },
    updateTaskScheduleBlock(taskId: string, blockId: string, payload: UpdateTaskScheduleBlockPayload) {
      return requestJson<TaskDetailResponse>(
        fetchImpl,
        transport,
        options.baseUrl,
        `/tasks/${taskId}/schedule-blocks/${blockId}`,
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        },
      );
    },
  };
}
