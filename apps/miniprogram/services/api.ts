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

export interface ClarificationReplyPayload {
  sessionId: string;
  answerText: string;
}

export interface ScheduleProposePayload {
  taskIds: string[];
}

export interface ScheduleConfirmPayload {
  taskIds: string[];
}

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
      return requestJson<unknown>(fetchImpl, options.baseUrl, "/tasks/intake", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    replyClarification(payload: ClarificationReplyPayload) {
      return requestJson<unknown>(fetchImpl, options.baseUrl, "/clarification/reply", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    proposeSchedule(payload: ScheduleProposePayload) {
      return requestJson<unknown>(fetchImpl, options.baseUrl, "/scheduling/propose", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    confirmSchedule(payload: ScheduleConfirmPayload) {
      return requestJson<unknown>(fetchImpl, options.baseUrl, "/scheduling/confirm", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    generateReminders(payload: ReminderGeneratePayload = {}) {
      return requestJson<unknown>(fetchImpl, options.baseUrl, "/reminders/generate", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    getDailySummary(date?: string) {
      const suffix = date ? `?date=${encodeURIComponent(date)}` : "";
      return requestJson<unknown>(fetchImpl, options.baseUrl, `/reminders/daily-summary${suffix}`, {
        method: "GET",
      });
    },
  };
}
