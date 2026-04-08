import type { PrismaClient } from "@prisma/client";
import type {
  AdminAiRepository,
  AuditLogRecord,
  CreateAuditLogRecordInput,
  CreateModelBindingRecordInput,
  CreatePromptTemplateRecordInput,
  CreateProviderRecordInput,
  ModelBindingRecord,
  PromptTemplateRecord,
  ProviderRecord,
  UpdateModelBindingRecordInput,
  UpdatePromptTemplateRecordInput,
  UpdateProviderRecordInput,
} from "./admin-ai-repository.ts";

function toProviderRecord(record: {
  id: string;
  name: string;
  providerType: ProviderRecord["providerType"];
  baseUrl: string;
  apiKeyEncrypted: string;
  defaultModel: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}): ProviderRecord {
  return { ...record };
}

function toModelBindingRecord(record: {
  id: string;
  providerId: string;
  scene: ModelBindingRecord["scene"];
  modelName: string;
  temperature: number;
  maxTokens: number;
  timeoutSeconds: number;
  enabled: boolean;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}): ModelBindingRecord {
  return { ...record };
}

function toPromptTemplateRecord(record: {
  id: string;
  scene: PromptTemplateRecord["scene"];
  templateName: string;
  systemPrompt: string;
  developerPrompt: string | null;
  version: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): PromptTemplateRecord {
  return { ...record };
}

function toAuditLogRecord(record: {
  id: string;
  action: string;
  entityType: AuditLogRecord["entityType"];
  entityId: string;
  scene: AuditLogRecord["scene"] | null;
  message: string;
  createdAt: Date;
}): AuditLogRecord {
  return {
    ...record,
    scene: record.scene ?? undefined,
  };
}

export class PrismaAdminAiRepository implements AdminAiRepository {
  private readonly prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async listProviders() {
    const records = await this.prisma.aIProviderConfig.findMany({
      orderBy: { createdAt: "asc" },
    });
    return records.map(toProviderRecord);
  }

  async findProviderById(providerId: string) {
    const record = await this.prisma.aIProviderConfig.findUnique({
      where: { id: providerId },
    });
    return record ? toProviderRecord(record) : null;
  }

  async createProvider(input: CreateProviderRecordInput) {
    const record = await this.prisma.aIProviderConfig.create({
      data: input,
    });
    return toProviderRecord(record);
  }

  async updateProvider(providerId: string, input: UpdateProviderRecordInput) {
    const exists = await this.findProviderById(providerId);
    if (!exists) {
      return null;
    }

    const record = await this.prisma.aIProviderConfig.update({
      where: { id: providerId },
      data: input,
    });
    return toProviderRecord(record);
  }

  async listModelBindings() {
    const records = await this.prisma.aIModelBinding.findMany({
      orderBy: { createdAt: "asc" },
    });
    return records.map(toModelBindingRecord);
  }

  async findModelBindingById(bindingId: string) {
    const record = await this.prisma.aIModelBinding.findUnique({
      where: { id: bindingId },
    });
    return record ? toModelBindingRecord(record) : null;
  }

  async createModelBinding(input: CreateModelBindingRecordInput) {
    const record = await this.prisma.aIModelBinding.create({
      data: input,
    });
    return toModelBindingRecord(record);
  }

  async updateModelBinding(bindingId: string, input: UpdateModelBindingRecordInput) {
    const exists = await this.findModelBindingById(bindingId);
    if (!exists) {
      return null;
    }

    const record = await this.prisma.aIModelBinding.update({
      where: { id: bindingId },
      data: input,
    });
    return toModelBindingRecord(record);
  }

  async listPromptTemplates() {
    const records = await this.prisma.promptTemplate.findMany({
      orderBy: { createdAt: "asc" },
    });
    return records.map(toPromptTemplateRecord);
  }

  async findPromptTemplateById(promptId: string) {
    const record = await this.prisma.promptTemplate.findUnique({
      where: { id: promptId },
    });
    return record ? toPromptTemplateRecord(record) : null;
  }

  async createPromptTemplate(input: CreatePromptTemplateRecordInput) {
    const record = await this.prisma.promptTemplate.create({
      data: input,
    });
    return toPromptTemplateRecord(record);
  }

  async updatePromptTemplate(promptId: string, input: UpdatePromptTemplateRecordInput) {
    const exists = await this.findPromptTemplateById(promptId);
    if (!exists) {
      return null;
    }

    const record = await this.prisma.promptTemplate.update({
      where: { id: promptId },
      data: input,
    });
    return toPromptTemplateRecord(record);
  }

  async listLogs() {
    const records = await this.prisma.adminAiAuditLog.findMany({
      orderBy: { createdAt: "desc" },
    });
    return records.map(toAuditLogRecord);
  }

  async createLog(input: CreateAuditLogRecordInput) {
    const record = await this.prisma.adminAiAuditLog.create({
      data: {
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        scene: input.scene ?? null,
        message: input.message,
      },
    });
    return toAuditLogRecord(record);
  }
}
