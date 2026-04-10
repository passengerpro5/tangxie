import type { PrismaClient } from "@prisma/client";
import type {
  ArrangeConversationMessageRecord,
  ArrangeConversationRecord,
  ArrangeConversationsRepository,
  ArrangeConversationSnapshot,
  ArrangeConversationStatus,
} from "./arrange-conversations-repository.ts";

function normalizeSnapshot(snapshot: unknown): ArrangeConversationSnapshot {
  const value = (snapshot ?? {}) as Partial<ArrangeConversationSnapshot>;
  return {
    title: typeof value.title === "string" ? value.title : null,
    summary: typeof value.summary === "string" ? value.summary : null,
    tasks: Array.isArray(value.tasks) ? value.tasks.map((item) => ({ ...(item as object) })) as ArrangeConversationSnapshot["tasks"] : [],
    proposedBlocks: Array.isArray(value.proposedBlocks)
      ? value.proposedBlocks.map((item) => ({ ...(item as object) })) as ArrangeConversationSnapshot["proposedBlocks"]
      : [],
    readyToConfirm: Boolean(value.readyToConfirm),
  };
}

function toConversationRecord(record: {
  id: string;
  title: string;
  summary: string | null;
  status: string;
  snapshot: unknown;
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt: Date;
}): ArrangeConversationRecord {
  return {
    id: record.id,
    title: record.title,
    summary: record.summary,
    status: record.status as ArrangeConversationStatus,
    snapshot: normalizeSnapshot(record.snapshot),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    lastMessageAt: record.lastMessageAt,
  };
}

function toMessageRecord(record: {
  id: string;
  conversationId: string;
  role: string;
  content: string;
  createdAt: Date;
}): ArrangeConversationMessageRecord {
  return {
    id: record.id,
    conversationId: record.conversationId,
    role: record.role as ArrangeConversationMessageRecord["role"],
    content: record.content,
    createdAt: record.createdAt,
  };
}

export class PrismaArrangeConversationsRepository
  implements ArrangeConversationsRepository
{
  private readonly prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async createConversation(input = {}) {
    const record = await this.prisma.arrangeConversation.create({
      data: {
        title: input.title ?? "新对话",
        summary: input.summary ?? null,
        status: "active",
        snapshot: input.snapshot ?? {},
      },
    });
    return toConversationRecord(record);
  }

  async listConversations() {
    const records = await this.prisma.arrangeConversation.findMany({
      orderBy: { lastMessageAt: "desc" },
    });
    return records.map(toConversationRecord);
  }

  async findConversationById(conversationId: string) {
    const record = await this.prisma.arrangeConversation.findUnique({
      where: { id: conversationId },
    });
    return record ? toConversationRecord(record) : null;
  }

  async updateConversation(conversationId: string, input: {
    title?: string;
    summary?: string | null;
    status?: ArrangeConversationStatus;
    snapshot?: ArrangeConversationSnapshot;
    lastMessageAt?: Date;
  }) {
    const existing = await this.findConversationById(conversationId);
    if (!existing) {
      return null;
    }

    const record = await this.prisma.arrangeConversation.update({
      where: { id: conversationId },
      data: {
        title: input.title,
        summary: input.summary,
        status: input.status,
        snapshot: input.snapshot,
        lastMessageAt: input.lastMessageAt,
      },
    });
    return toConversationRecord(record);
  }

  async listMessages(conversationId: string) {
    const records = await this.prisma.arrangeConversationMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
    });
    return records.map(toMessageRecord);
  }

  async appendMessage(input: {
    conversationId: string;
    role: "user" | "assistant" | "system";
    content: string;
  }) {
    const record = await this.prisma.arrangeConversationMessage.create({
      data: input,
    });
    await this.prisma.arrangeConversation.update({
      where: { id: input.conversationId },
      data: { lastMessageAt: record.createdAt },
    });
    return toMessageRecord(record);
  }
}
