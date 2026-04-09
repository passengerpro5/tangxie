function cloneBlocks(blocks) {
  return blocks.map((block) => ({ ...block }));
}

function cloneAttachments(attachments) {
  return attachments.map((attachment) => ({ ...attachment }));
}

function buildAttachmentDraft(attachment) {
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
  };
}

export function createArrangeSheet(input = {}) {
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
    canSubmit: draftText.trim().length > 0 || attachments.length > 0,
  };
}

function createInitialFlowState() {
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

export function createArrangeFlow(options) {
  const state = createInitialFlowState();

  return {
    get state() {
      return state;
    },
    async submitRawText(rawText) {
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
    async submitAttachment(attachment) {
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
    async reply(answerText) {
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
