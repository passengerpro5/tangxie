export interface ArrangeHistoryEntry {
  id: string;
  title: string;
  summary: string;
  updatedAt: string;
}

export interface ArrangeAttachment {
  name: string;
  kind: "image" | "doc" | "text";
}

export interface ArrangeSheetModel {
  title: string;
  subtitle: string;
  inputPlaceholder: string;
  primaryActionText: string;
  draftText: string;
  attachments: ArrangeAttachment[];
  history: ArrangeHistoryEntry[];
  canSubmit: boolean;
}

export function createArrangeSheet(
  input: {
    draftText?: string;
    attachments?: ArrangeAttachment[];
    history?: ArrangeHistoryEntry[];
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
    canSubmit: draftText.trim().length > 0 || attachments.length > 0,
  };
}
