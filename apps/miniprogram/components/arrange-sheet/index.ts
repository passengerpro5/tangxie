import type {
  ClarificationReplyResponse,
  ScheduleProposalResponse,
  ScheduleConfirmResponse,
  TaskIntakeResponse,
} from "../../services/api.ts";

export interface ArrangeHistoryEntry {
  id: string;
  title: string;
  summary: string;
  updatedAt: string;
}

export interface ArrangeAttachment {
  name: string;
  kind: "image" | "doc" | "text";
  fileName?: string;
  fileUrl?: string;
}

export interface ArrangeSheetModel {
  title: string;
  subtitle: string;
  inputPlaceholder: string;
  primaryActionText: string;
  draftText: string;
  attachments: ArrangeAttachment[];
  history: ArrangeHistoryEntry[];
  tabs: ArrangeSheetTab[];
  threadItems: ArrangeThreadItem[];
  attachmentActions: ArrangeAttachmentAction[];
  canSubmit: boolean;
}

export interface ArrangeSheetTab {
  id: "arrange" | "history";
  label: string;
}

export interface ArrangeThreadItem {
  id: string;
  kind: "hero" | "user_input" | "extracted_attachment" | "system_question" | "ready" | "confirmed";
  title: string;
  body?: string;
  accent?: string;
  attachmentName?: string;
}

export interface ArrangeAttachmentAction {
  id: "doc" | "image" | "text";
  label: string;
  kind: ArrangeAttachment["kind"];
}

export interface ArrangeFlowConfirmedBlock {
  id: string;
  taskId: string;
  title: string;
  startAt: string;
  endAt: string;
  durationMinutes: number;
  status: "confirmed";
}

export type ArrangeFlowStage = "idle" | "clarifying" | "ready_to_schedule" | "confirmed";

export interface ArrangeFlowSnapshot {
  stage: ArrangeFlowStage;
  taskId: string | null;
  sessionId: string | null;
  taskStatus: string | null;
  nextQuestion: string | null;
  attachments: ArrangeAttachment[];
  confirmedBlocks: ArrangeFlowConfirmedBlock[];
}

export interface ArrangeFlowApiClient {
  intakeTask(payload: { rawText: string; sourceType?: "text" | "image" | "doc"; fileName?: string; fileUrl?: string }): Promise<TaskIntakeResponse>;
  replyClarification(payload: { sessionId: string; answerText: string }): Promise<ClarificationReplyResponse>;
  proposeSchedule(payload: { taskIds: string[] }): Promise<ScheduleProposalResponse>;
  confirmSchedule(payload: { taskIds: string[] }): Promise<ScheduleConfirmResponse>;
  generateReminders(payload?: {
    confirmedBlocks?: Array<{
      id: string;
      taskId: string;
      title: string;
      startAt: string;
      endAt: string;
      durationMinutes: number;
      status: "confirmed";
    }>;
  }): Promise<unknown>;
}

export interface ArrangeFlowState {
  stage: ArrangeFlowStage;
  taskId: string | null;
  sessionId: string | null;
  taskStatus: string | null;
  nextQuestion: string | null;
  attachments: ArrangeAttachment[];
  confirmedBlocks: ArrangeFlowConfirmedBlock[];
}

export interface ArrangeFlowOptions {
  apiClient: ArrangeFlowApiClient;
  home?: { refresh?: (blocks: ArrangeFlowConfirmedBlock[]) => void };
}

export interface ArrangeFlowResult {
  stage: ArrangeFlowStage;
  taskStatus: string | null;
  nextQuestion: string | null;
  attachments: ArrangeAttachment[];
  confirmedBlocks: ArrangeFlowConfirmedBlock[];
}

export interface ArrangeFlow {
  readonly state: ArrangeFlowState;
  submitRawText(rawText: string): Promise<ArrangeFlowResult>;
  submitAttachment(attachment: ArrangeAttachment): Promise<ArrangeFlowResult>;
  reply(answerText: string): Promise<ArrangeFlowResult>;
  propose(): Promise<ArrangeFlowResult>;
}

function cloneBlocks(blocks: ArrangeFlowConfirmedBlock[]) {
  return blocks.map((block) => ({ ...block }));
}

function cloneAttachments(attachments: ArrangeAttachment[]) {
  return attachments.map((attachment) => ({ ...attachment }));
}

function buildAttachmentDraft(attachment: ArrangeAttachment) {
  const fileName = attachment.fileName ?? attachment.name;
  const rawText =
    attachment.kind === "image"
      ? `图片附件：${fileName ?? "未命名图片"}`
      : attachment.kind === "doc"
        ? `文档附件：${fileName ?? "未命名文档"}`
        : `附件：${fileName ?? "未命名附件"}`;

  return {
    rawText,
    sourceType: attachment.kind === "text" ? "text" : attachment.kind,
    fileName,
    fileUrl: attachment.fileUrl,
  } as const;
}

export function createArrangeSheet(
  input: {
    draftText?: string;
    attachments?: ArrangeAttachment[];
    history?: ArrangeHistoryEntry[];
    threadItems?: ArrangeThreadItem[];
  } = {},
): ArrangeSheetModel {
  const draftText = input.draftText ?? "";
  const attachments = input.attachments ?? [];

  return {
    title: "安排任务",
    subtitle: "输入任务、补齐 deadline，再交给系统排期",
    inputPlaceholder: "例如：周五前交论文初稿，补齐 deadline 和时长",
    primaryActionText: "安排",
    draftText,
    attachments,
    history: input.history ?? [
      {
        id: "history_1",
        title: "帮我拆解这个任务",
        summary: "上传了一个文档，已提取出 3 个任务。",
        updatedAt: "2026-04-08 09:20",
      },
    ],
    tabs: [
      { id: "arrange", label: "安排任务" },
      { id: "history", label: "历史记录" },
    ],
    threadItems: input.threadItems ?? [
      {
        id: "thread-hero",
        kind: "hero",
        title: "开始规划",
        body: "把任务丢给糖蟹，它会自动追问 deadline、时长和开始时间。",
        accent: "soft",
      },
    ],
    attachmentActions: [
      { id: "doc", label: "上传文档", kind: "doc" },
      { id: "image", label: "上传图片", kind: "image" },
      { id: "text", label: "粘贴文本", kind: "text" },
    ],
    canSubmit: draftText.trim().length > 0 || attachments.length > 0,
  };
}

function createInitialFlowState(): ArrangeFlowState {
  return {
    stage: "idle",
    taskId: null,
    sessionId: null,
    taskStatus: null,
    nextQuestion: null,
    attachments: [],
    confirmedBlocks: [],
  };
}

export function createArrangeFlow(options: ArrangeFlowOptions): ArrangeFlow {
  const state = createInitialFlowState();

  return {
    get state() {
      return state;
    },
    async submitRawText(rawText: string) {
      const intake = await options.apiClient.intakeTask({
        rawText,
        sourceType: "text",
      });

      state.taskId = intake.task.id;
      state.sessionId = intake.clarificationSession.id;
      state.taskStatus = intake.task.status;
      state.nextQuestion = intake.nextQuestion;
      state.stage = intake.missingFields.length > 0 ? "clarifying" : "ready_to_schedule";
      state.attachments = [];
      state.confirmedBlocks = [];

      return {
        stage: state.stage,
        taskStatus: state.taskStatus,
        nextQuestion: state.nextQuestion,
        attachments: cloneAttachments(state.attachments),
        confirmedBlocks: cloneBlocks(state.confirmedBlocks),
      };
    },
    async submitAttachment(attachment: ArrangeAttachment) {
      const intake = await options.apiClient.intakeTask(buildAttachmentDraft(attachment));

      state.taskId = intake.task.id;
      state.sessionId = intake.clarificationSession.id;
      state.taskStatus = intake.task.status;
      state.nextQuestion = intake.nextQuestion;
      state.stage = intake.missingFields.length > 0 ? "clarifying" : "ready_to_schedule";
      state.attachments = [attachment];
      state.confirmedBlocks = [];

      return {
        stage: state.stage,
        taskStatus: state.taskStatus,
        nextQuestion: state.nextQuestion,
        attachments: cloneAttachments(state.attachments),
        confirmedBlocks: cloneBlocks(state.confirmedBlocks),
      };
    },
    async reply(answerText: string) {
      if (!state.sessionId) {
        throw new Error("No clarification session available");
      }

      const reply = await options.apiClient.replyClarification({
        sessionId: state.sessionId,
        answerText,
      });

      state.taskId = reply.task.id;
      state.taskStatus = reply.task.status;
      state.nextQuestion = reply.nextQuestion;
      state.stage = reply.missingFields.length > 0 ? "clarifying" : "ready_to_schedule";

      return {
        stage: state.stage,
        taskStatus: state.taskStatus,
        nextQuestion: state.nextQuestion,
        attachments: cloneAttachments(state.attachments),
        confirmedBlocks: cloneBlocks(state.confirmedBlocks),
      };
    },
    async propose() {
      if (!state.taskId) {
        throw new Error("No task available for scheduling");
      }

      const proposal = await options.apiClient.proposeSchedule({
        taskIds: [state.taskId],
      });

      const confirmed = await options.apiClient.confirmSchedule({
        taskIds: proposal.orderedTaskIds,
      });

      const confirmedBlocks = confirmed.blocks.filter((block) => block.status === "confirmed");
      state.stage = "confirmed";
      state.taskStatus = "scheduled";
      state.nextQuestion = null;
      state.confirmedBlocks = confirmedBlocks.map((block) => ({ ...block }));

      await options.apiClient.generateReminders({
        confirmedBlocks: state.confirmedBlocks,
      });

      options.home?.refresh?.(cloneBlocks(state.confirmedBlocks));

      return {
        stage: state.stage,
        taskStatus: state.taskStatus,
        nextQuestion: state.nextQuestion,
        attachments: cloneAttachments(state.attachments),
        confirmedBlocks: cloneBlocks(state.confirmedBlocks),
      };
    },
  };
}
