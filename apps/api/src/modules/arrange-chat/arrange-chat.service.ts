import type { OpenAICompatibleProviderClient } from "../ai-gateway/provider-client.ts";
import type { OpenAICompatibleResponse } from "../ai-gateway/provider-client.ts";
import type { AdminAiRepository } from "../../persistence/admin-ai-repository.ts";
import {
  createInMemoryArrangeConversationsRepository,
  type ArrangeConversationBlockSnapshot,
  type ArrangeConversationMessageRecord,
  type ArrangeConversationRecord,
  type ArrangeConversationSnapshot,
  type ArrangeConversationsRepository,
} from "../../persistence/arrange-conversations-repository.ts";
import { z } from "zod";

export interface ArrangeChatServiceOptions {
  conversationsRepository?: ArrangeConversationsRepository;
  adminAiRepository: AdminAiRepository;
  providerClient: OpenAICompatibleProviderClient;
  now?: () => Date;
}

export interface ArrangeConversationDetail {
  conversation: ArrangeConversationRecord;
  messages: ArrangeConversationMessageRecord[];
  snapshot: ArrangeConversationSnapshot;
}

const arrangeTaskSchema = z.object({
  title: z.string().min(1),
  estimatedMinutes: z.number().int().positive().nullable(),
  priority: z.string().min(1).nullable(),
});

const arrangeBlockSchema = z.object({
  id: z.string().min(1),
  taskId: z.string().min(1),
  title: z.string().min(1),
  startAt: z.string().min(1),
  endAt: z.string().min(1),
  durationMinutes: z.number().int().positive(),
  status: z.enum(["proposed", "confirmed"]),
});

export const arrangeStructuredOutputSchema = z.object({
  assistantMessage: z.string().min(1),
  title: z.string().nullable(),
  summary: z.string().nullable(),
  tasks: z.array(arrangeTaskSchema),
  proposedBlocks: z.array(arrangeBlockSchema),
  readyToConfirm: z.boolean(),
});

type ArrangeStructuredOutput = z.infer<typeof arrangeStructuredOutputSchema>;

const arrangeStructuredOutputNormalizationSchema = z.object({
  assistantMessage: z.string().min(1),
  title: z.string().nullable(),
  summary: z.string().nullable(),
  tasks: z.array(z.unknown()),
  proposedBlocks: z.array(z.unknown()),
  readyToConfirm: z.boolean(),
});

function normalizeTasks(tasks: unknown[]): ArrangeConversationSnapshot["tasks"] {
  return tasks
    .map((item) => arrangeTaskSchema.safeParse(item))
    .filter((result) => result.success)
    .map((result) => ({
      title: result.data.title,
      estimatedMinutes: result.data.estimatedMinutes ?? undefined,
      priority: result.data.priority ?? undefined,
    }));
}

function normalizeBlocks(blocks: unknown[]): ArrangeConversationBlockSnapshot[] {
  return blocks
    .map((item) => arrangeBlockSchema.safeParse(item))
    .filter((result) => result.success)
    .map((result) => result.data);
}

function decryptApiKey(apiKeyEncrypted: string) {
  if (!apiKeyEncrypted.startsWith("enc:")) {
    return apiKeyEncrypted;
  }

  return Buffer.from(apiKeyEncrypted.slice(4), "base64").toString("utf8");
}

function createEmptySnapshot(): ArrangeConversationSnapshot {
  return {
    title: null,
    summary: null,
    tasks: [],
    proposedBlocks: [],
    readyToConfirm: false,
  };
}

function parseSnapshot(content: string): {
  assistantMessage: string;
  snapshot: ArrangeConversationSnapshot;
} {
  const fallback = {
    assistantMessage: content,
    snapshot: createEmptySnapshot(),
  };

  try {
    const parsed = JSON.parse(content) as {
      assistantMessage?: unknown;
      title?: unknown;
      summary?: unknown;
      tasks?: unknown;
      proposedBlocks?: unknown;
      readyToConfirm?: unknown;
    };

    return {
      assistantMessage:
        typeof parsed.assistantMessage === "string" && parsed.assistantMessage.trim()
          ? parsed.assistantMessage
          : content,
      snapshot: {
        title: typeof parsed.title === "string" ? parsed.title : null,
        summary: typeof parsed.summary === "string" ? parsed.summary : null,
        tasks: Array.isArray(parsed.tasks) ? normalizeTasks(parsed.tasks) : [],
        proposedBlocks: Array.isArray(parsed.proposedBlocks)
          ? normalizeBlocks(parsed.proposedBlocks)
          : [],
        readyToConfirm: Boolean(parsed.readyToConfirm),
      },
    };
  } catch {
    return fallback;
  }
}

function normalizeStructuredOutput(
  structuredOutput: unknown,
): {
  assistantMessage: string;
  snapshot: ArrangeConversationSnapshot;
} | null {
  const parsed = arrangeStructuredOutputNormalizationSchema.safeParse(structuredOutput);
  if (!parsed.success) {
    return null;
  }

  const output = parsed.data;
  return {
    assistantMessage: output.assistantMessage,
    snapshot: {
      title: output.title ?? null,
      summary: output.summary ?? null,
      tasks: normalizeTasks(output.tasks),
      proposedBlocks: normalizeBlocks(output.proposedBlocks),
      readyToConfirm: output.readyToConfirm,
    },
  };
}

function normalizePriorityLabel(priority?: string) {
  if (!priority) {
    return null;
  }

  const normalized = priority.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (normalized === "high" || normalized === "p1" || normalized === "高") {
    return "高";
  }

  if (normalized === "medium" || normalized === "p2" || normalized === "中") {
    return "中";
  }

  if (normalized === "low" || normalized === "p3" || normalized === "低") {
    return "低";
  }

  return priority;
}

function formatUserFacingTimeRange(startAt: string, endAt: string) {
  const start = new Date(startAt);
  const end = new Date(endAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return `${startAt} - ${endAt}`;
  }

  const dateLabel = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "numeric",
    day: "numeric",
  }).format(start);
  const startTimeLabel = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(start);
  const endTimeLabel = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(end);

  return `${dateLabel} ${startTimeLabel} - ${endTimeLabel}`;
}

function buildAssistantMessageFromSnapshot(snapshot: ArrangeConversationSnapshot) {
  const parts: string[] = [];

  if (snapshot.summary) {
    parts.push(snapshot.summary);
  }

  if (snapshot.tasks.length > 0) {
    parts.push(
      [
        "我先帮你拆成这些任务：",
        ...snapshot.tasks.map((task, index) => {
          const extras = [
            normalizePriorityLabel(task.priority) ? `优先级 ${normalizePriorityLabel(task.priority)}` : null,
            typeof task.estimatedMinutes === "number" ? `约 ${task.estimatedMinutes} 分钟` : null,
          ].filter(Boolean);
          return `${index + 1}. ${task.title}${extras.length ? `（${extras.join("，")}）` : ""}`;
        }),
      ].join("\n"),
    );
  }

  if (snapshot.proposedBlocks.length > 0) {
    parts.push(
      [
        "当前建议安排：",
        ...snapshot.proposedBlocks.map(
          (block, index) => `${index + 1}. ${block.title} ${formatUserFacingTimeRange(block.startAt, block.endAt)}`,
        ),
      ].join("\n"),
    );
  }

  return parts.join("\n\n").trim();
}

function shouldExpandAssistantMessage(
  assistantMessage: string,
  snapshot: ArrangeConversationSnapshot,
) {
  const trimmed = assistantMessage.trim();
  if (!trimmed) {
    return true;
  }

  const hasStructuredDetails = snapshot.tasks.length > 0 || snapshot.proposedBlocks.length > 0;
  if (!hasStructuredDetails) {
    return false;
  }

  const mentionsTaskTitle = snapshot.tasks.some((task) => trimmed.includes(task.title));
  return trimmed.length < 60 || !mentionsTaskTitle;
}

function parseProviderResponse(response: OpenAICompatibleResponse) {
  const structured = normalizeStructuredOutput(response.structuredOutput);
  if (structured) {
    if (shouldExpandAssistantMessage(structured.assistantMessage, structured.snapshot)) {
      return {
        assistantMessage:
          buildAssistantMessageFromSnapshot(structured.snapshot) || structured.assistantMessage,
        snapshot: structured.snapshot,
      };
    }
    return structured;
  }

  return parseSnapshot(response.outputText);
}

function getConversationTitle(
  currentTitle: string,
  snapshot: ArrangeConversationSnapshot,
  firstUserMessage?: string,
) {
  if (snapshot.title) {
    return snapshot.title;
  }

  if (currentTitle !== "新对话") {
    return currentTitle;
  }

  const trimmed = firstUserMessage?.trim();
  if (!trimmed) {
    return currentTitle;
  }

  return trimmed.length <= 18 ? trimmed : `${trimmed.slice(0, 18)}...`;
}

function buildTimeContextMessage(now: Date) {
  const iso = now.toISOString();
  const shanghaiDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

  return [
    "当前时间上下文：",
    `- 当前时间（UTC）：${iso}`,
    `- 当前日期（Asia/Shanghai）：${shanghaiDate}`,
    "- 默认时区：Asia/Shanghai",
    "- 处理“今天/今晚/明早”等相对时间时，必须以上述当前日期为基准推算。",
    "- proposedBlocks.startAt 和 proposedBlocks.endAt 不要编造历史日期。",
  ].join("\n");
}

export class ArrangeChatService {
  private readonly conversationsRepository: ArrangeConversationsRepository;
  private readonly adminAiRepository: AdminAiRepository;
  private readonly providerClient: OpenAICompatibleProviderClient;
  private readonly clock: () => Date;

  constructor(options: ArrangeChatServiceOptions) {
    this.conversationsRepository =
      options.conversationsRepository ??
      createInMemoryArrangeConversationsRepository({ now: options.now });
    this.adminAiRepository = options.adminAiRepository;
    this.providerClient = options.providerClient;
    this.clock = options.now ?? (() => new Date());
  }

  async createConversation() {
    const conversation = await this.conversationsRepository.createConversation();
    return {
      conversation,
      messages: [],
      snapshot: conversation.snapshot,
    };
  }

  async listConversations() {
    return this.conversationsRepository.listConversations();
  }

  async getConversation(conversationId: string): Promise<ArrangeConversationDetail> {
    const conversation = await this.conversationsRepository.findConversationById(conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    const messages = await this.conversationsRepository.listMessages(conversationId);
    return {
      conversation,
      messages,
      snapshot: conversation.snapshot,
    };
  }

  async sendMessage(conversationId: string, content: string) {
    const detail = await this.getConversation(conversationId);
    const userMessage = await this.conversationsRepository.appendMessage({
      conversationId,
      role: "user",
      content,
    });

    const providers = await this.adminAiRepository.listProviders();
    const bindings = await this.adminAiRepository.listModelBindings();
    const prompts = await this.adminAiRepository.listPromptTemplates();
    const binding = bindings.find((item) => item.scene === "arrange_chat" && item.enabled && item.isDefault)
      ?? bindings.find((item) => item.scene === "arrange_chat" && item.enabled);
    if (!binding) {
      throw new Error("No active model binding found for scene: arrange_chat");
    }

    const provider = providers.find((item) => item.id === binding.providerId);
    if (!provider) {
      throw new Error("No provider found for scene: arrange_chat");
    }

    const prompt = prompts.find((item) => item.scene === "arrange_chat" && item.isActive);
    if (!prompt) {
      throw new Error("No active prompt template found for scene: arrange_chat");
    }

    const response = await this.providerClient.chatCompletion({
      baseUrl: provider.baseUrl,
      apiKey: decryptApiKey(provider.apiKeyEncrypted),
      model: binding.modelName || provider.defaultModel,
      temperature: binding.temperature,
      maxTokens: binding.maxTokens,
      timeoutSeconds: binding.timeoutSeconds,
      structuredOutput: {
        schema: arrangeStructuredOutputSchema,
        name: "arrange_conversation_reply",
        description:
          "Return the assistant reply text plus a structured scheduling snapshot with tasks and proposed time blocks.",
      },
      messages: [
        { role: "system", content: prompt.systemPrompt },
        { role: "system", content: buildTimeContextMessage(this.clock()) },
        ...(prompt.developerPrompt ? [{ role: "developer" as const, content: prompt.developerPrompt }] : []),
        ...detail.messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
        { role: "user", content },
      ],
    });

    const parsed = parseProviderResponse(response);
    const assistantMessage = await this.conversationsRepository.appendMessage({
      conversationId,
      role: "assistant",
      content: parsed.assistantMessage,
    });
    const updatedConversation = await this.conversationsRepository.updateConversation(conversationId, {
      title: getConversationTitle(detail.conversation.title, parsed.snapshot, userMessage.content),
      summary: parsed.snapshot.summary,
      snapshot: parsed.snapshot,
      lastMessageAt: this.clock(),
    });

    if (!updatedConversation) {
      throw new Error("Conversation not found");
    }

    return {
      conversation: updatedConversation,
      userMessage,
      assistantMessage,
      snapshot: updatedConversation.snapshot,
    };
  }

  async confirmConversation(conversationId: string) {
    const detail = await this.getConversation(conversationId);
    if (!detail.snapshot.proposedBlocks.length) {
      throw new Error("No proposed blocks available");
    }

    const confirmedBlocks = detail.snapshot.proposedBlocks.map((block) => ({
      ...block,
      status: "confirmed" as const,
    }));
    const updatedConversation = await this.conversationsRepository.updateConversation(conversationId, {
      status: "confirmed",
      snapshot: {
        ...detail.snapshot,
        proposedBlocks: confirmedBlocks,
        readyToConfirm: true,
      },
      lastMessageAt: this.clock(),
    });

    if (!updatedConversation) {
      throw new Error("Conversation not found");
    }

    return {
      conversation: updatedConversation,
      confirmedBlocks,
      snapshot: updatedConversation.snapshot,
    };
  }
}
