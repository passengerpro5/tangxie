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
  fetchImpl: typeof fetch,
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

  if (!fetchImpl && !transport) {
    throw new Error("No request transport available");
  }

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
  };
}
