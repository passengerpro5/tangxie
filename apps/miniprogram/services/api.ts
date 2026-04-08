export type TaskSourceType = "text" | "image" | "doc";
export type ReminderType = "start" | "deadline" | "daily_summary";

export interface MiniProgramApiClientOptions {
  baseUrl: string;
  fetchImpl?: typeof fetch;
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

function buildUrl(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/$/, "")}${path}`;
}

async function readJsonResponse(response: Response) {
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function requestJson<TResponse>(
  fetchImpl: typeof fetch,
  baseUrl: string,
  path: string,
  init?: RequestInit,
): Promise<TResponse> {
  const response = await fetchImpl(buildUrl(baseUrl, path), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
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
  const fetchImpl = options.fetchImpl ?? fetch;

  return {
    intakeTask(payload: TaskIntakePayload) {
      return requestJson<TaskIntakeResponse>(fetchImpl, options.baseUrl, "/tasks/intake", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    replyClarification(payload: ClarificationReplyPayload) {
      return requestJson<ClarificationReplyResponse>(fetchImpl, options.baseUrl, "/clarification/reply", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    proposeSchedule(payload: ScheduleProposePayload) {
      return requestJson<ScheduleProposalResponse>(fetchImpl, options.baseUrl, "/scheduling/propose", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    confirmSchedule(payload: ScheduleConfirmPayload) {
      return requestJson<ScheduleConfirmResponse>(fetchImpl, options.baseUrl, "/scheduling/confirm", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    generateReminders(payload: ReminderGeneratePayload = {}) {
      return requestJson<{ reminders: ReminderRecordResponse[]; summary: ReminderSummaryResponse }>(
        fetchImpl,
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
      return requestJson<ReminderSummaryResponse>(fetchImpl, options.baseUrl, `/reminders/daily-summary${suffix}`, {
        method: "GET",
      });
    },
  };
}
