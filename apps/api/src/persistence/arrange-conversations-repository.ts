export type ArrangeConversationStatus = "active" | "confirmed";
export type ArrangeConversationMessageRole = "user" | "assistant" | "system";

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
  status: ArrangeConversationStatus;
  snapshot: ArrangeConversationSnapshot;
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt: Date;
}

export interface ArrangeConversationMessageRecord {
  id: string;
  conversationId: string;
  role: ArrangeConversationMessageRole;
  content: string;
  createdAt: Date;
}

export interface ArrangeConversationsRepository {
  createConversation(input?: {
    title?: string;
    summary?: string | null;
    snapshot?: Partial<ArrangeConversationSnapshot>;
  }): Promise<ArrangeConversationRecord>;
  listConversations(): Promise<ArrangeConversationRecord[]>;
  findConversationById(conversationId: string): Promise<ArrangeConversationRecord | null>;
  updateConversation(
    conversationId: string,
    input: {
      title?: string;
      summary?: string | null;
      status?: ArrangeConversationStatus;
      snapshot?: ArrangeConversationSnapshot;
      lastMessageAt?: Date;
    },
  ): Promise<ArrangeConversationRecord | null>;
  listMessages(conversationId: string): Promise<ArrangeConversationMessageRecord[]>;
  appendMessage(input: {
    conversationId: string;
    role: ArrangeConversationMessageRole;
    content: string;
  }): Promise<ArrangeConversationMessageRecord>;
}

export interface InMemoryArrangeConversationsRepositoryOptions {
  now?: () => Date;
}

function createId(prefix: string, seed: number) {
  return `${prefix}_${seed.toString(36)}`;
}

function cloneDate(date: Date) {
  return new Date(date.getTime());
}

function createEmptySnapshot(
  input: Partial<ArrangeConversationSnapshot> = {},
): ArrangeConversationSnapshot {
  return {
    title: input.title ?? null,
    summary: input.summary ?? null,
    tasks: input.tasks ? input.tasks.map((task) => ({ ...task })) : [],
    proposedBlocks: input.proposedBlocks
      ? input.proposedBlocks.map((block) => ({ ...block }))
      : [],
    readyToConfirm: input.readyToConfirm ?? false,
  };
}

function cloneConversation(
  conversation: ArrangeConversationRecord,
): ArrangeConversationRecord {
  return {
    ...conversation,
    snapshot: createEmptySnapshot(conversation.snapshot),
    createdAt: cloneDate(conversation.createdAt),
    updatedAt: cloneDate(conversation.updatedAt),
    lastMessageAt: cloneDate(conversation.lastMessageAt),
  };
}

function cloneMessage(
  message: ArrangeConversationMessageRecord,
): ArrangeConversationMessageRecord {
  return {
    ...message,
    createdAt: cloneDate(message.createdAt),
  };
}

export function createInMemoryArrangeConversationsRepository(
  options: InMemoryArrangeConversationsRepositoryOptions = {},
): ArrangeConversationsRepository {
  const now = options.now ?? (() => new Date());
  let conversationSeq = 0;
  let messageSeq = 0;
  const conversations: ArrangeConversationRecord[] = [];
  const messages: ArrangeConversationMessageRecord[] = [];

  return {
    async createConversation(input = {}) {
      const timestamp = now();
      const conversation: ArrangeConversationRecord = {
        id: createId("conv", ++conversationSeq),
        title: input.title ?? "新对话",
        summary: input.summary ?? null,
        status: "active",
        snapshot: createEmptySnapshot(input.snapshot),
        createdAt: cloneDate(timestamp),
        updatedAt: cloneDate(timestamp),
        lastMessageAt: cloneDate(timestamp),
      };
      conversations.push(conversation);
      return cloneConversation(conversation);
    },
    async listConversations() {
      return conversations
        .slice()
        .sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime())
        .map(cloneConversation);
    },
    async findConversationById(conversationId) {
      const conversation = conversations.find((item) => item.id === conversationId);
      return conversation ? cloneConversation(conversation) : null;
    },
    async updateConversation(conversationId, input) {
      const conversation = conversations.find((item) => item.id === conversationId);
      if (!conversation) {
        return null;
      }

      if (input.title !== undefined) {
        conversation.title = input.title;
      }
      if (input.summary !== undefined) {
        conversation.summary = input.summary;
      }
      if (input.status !== undefined) {
        conversation.status = input.status;
      }
      if (input.snapshot !== undefined) {
        conversation.snapshot = createEmptySnapshot(input.snapshot);
      }
      conversation.updatedAt = cloneDate(now());
      conversation.lastMessageAt = cloneDate(input.lastMessageAt ?? conversation.updatedAt);

      return cloneConversation(conversation);
    },
    async listMessages(conversationId) {
      return messages
        .filter((item) => item.conversationId === conversationId)
        .map(cloneMessage);
    },
    async appendMessage(input) {
      const conversation = conversations.find((item) => item.id === input.conversationId);
      if (!conversation) {
        throw new Error("Conversation not found");
      }

      const timestamp = now();
      const message: ArrangeConversationMessageRecord = {
        id: createId("msg", ++messageSeq),
        conversationId: input.conversationId,
        role: input.role,
        content: input.content,
        createdAt: cloneDate(timestamp),
      };
      messages.push(message);
      conversation.updatedAt = cloneDate(timestamp);
      conversation.lastMessageAt = cloneDate(timestamp);
      return cloneMessage(message);
    },
  };
}
