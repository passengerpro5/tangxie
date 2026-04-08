import type { AIScene } from "../modules/ai-gateway/provider-client.ts";
import type { AdminProviderType } from "../modules/admin-ai/dto/provider.dto.ts";

export interface ProviderRecord {
  id: string;
  name: string;
  providerType: AdminProviderType;
  baseUrl: string;
  apiKeyEncrypted: string;
  defaultModel: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ModelBindingRecord {
  id: string;
  providerId: string;
  scene: AIScene;
  modelName: string;
  temperature: number;
  maxTokens: number;
  timeoutSeconds: number;
  enabled: boolean;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PromptTemplateRecord {
  id: string;
  scene: AIScene;
  templateName: string;
  systemPrompt: string;
  developerPrompt: string | null;
  version: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditLogRecord {
  id: string;
  action: string;
  entityType: "provider" | "model" | "prompt" | "provider_test";
  entityId: string;
  scene?: AIScene;
  message: string;
  createdAt: Date;
}

export interface CreateProviderRecordInput {
  name: string;
  providerType: AdminProviderType;
  baseUrl: string;
  apiKeyEncrypted: string;
  defaultModel: string;
  enabled: boolean;
}

export interface UpdateProviderRecordInput {
  name?: string;
  providerType?: AdminProviderType;
  baseUrl?: string;
  apiKeyEncrypted?: string;
  defaultModel?: string;
  enabled?: boolean;
}

export interface CreateModelBindingRecordInput {
  providerId: string;
  scene: AIScene;
  modelName: string;
  temperature: number;
  maxTokens: number;
  timeoutSeconds: number;
  enabled: boolean;
  isDefault: boolean;
}

export interface UpdateModelBindingRecordInput {
  providerId?: string;
  scene?: AIScene;
  modelName?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutSeconds?: number;
  enabled?: boolean;
  isDefault?: boolean;
}

export interface CreatePromptTemplateRecordInput {
  scene: AIScene;
  templateName: string;
  systemPrompt: string;
  developerPrompt: string | null;
  version: string;
  isActive: boolean;
}

export interface UpdatePromptTemplateRecordInput {
  scene?: AIScene;
  templateName?: string;
  systemPrompt?: string;
  developerPrompt?: string | null;
  version?: string;
  isActive?: boolean;
}

export interface CreateAuditLogRecordInput {
  action: string;
  entityType: AuditLogRecord["entityType"];
  entityId: string;
  scene?: AIScene;
  message: string;
}

export interface AdminAiRepository {
  listProviders(): Promise<ProviderRecord[]>;
  findProviderById(providerId: string): Promise<ProviderRecord | null>;
  createProvider(input: CreateProviderRecordInput): Promise<ProviderRecord>;
  updateProvider(providerId: string, input: UpdateProviderRecordInput): Promise<ProviderRecord | null>;
  listModelBindings(): Promise<ModelBindingRecord[]>;
  findModelBindingById(bindingId: string): Promise<ModelBindingRecord | null>;
  createModelBinding(input: CreateModelBindingRecordInput): Promise<ModelBindingRecord>;
  updateModelBinding(bindingId: string, input: UpdateModelBindingRecordInput): Promise<ModelBindingRecord | null>;
  listPromptTemplates(): Promise<PromptTemplateRecord[]>;
  findPromptTemplateById(promptId: string): Promise<PromptTemplateRecord | null>;
  createPromptTemplate(input: CreatePromptTemplateRecordInput): Promise<PromptTemplateRecord>;
  updatePromptTemplate(promptId: string, input: UpdatePromptTemplateRecordInput): Promise<PromptTemplateRecord | null>;
  listLogs(): Promise<AuditLogRecord[]>;
  createLog(input: CreateAuditLogRecordInput): Promise<AuditLogRecord>;
}

export interface InMemoryAdminAiRepositoryOptions {
  now?: () => Date;
}

function createId(prefix: string, seed: number) {
  return `${prefix}_${seed.toString(36)}`;
}

export function createInMemoryAdminAiRepository(
  options: InMemoryAdminAiRepositoryOptions = {},
): AdminAiRepository {
  const now = options.now ?? (() => new Date());
  let providerSeq = 0;
  let modelSeq = 0;
  let promptSeq = 0;
  let logSeq = 0;
  const providers: ProviderRecord[] = [];
  const modelBindings: ModelBindingRecord[] = [];
  const promptTemplates: PromptTemplateRecord[] = [];
  const logs: AuditLogRecord[] = [];

  return {
    async listProviders() {
      return [...providers];
    },
    async findProviderById(providerId) {
      return providers.find((item) => item.id === providerId) ?? null;
    },
    async createProvider(input) {
      const timestamp = now();
      const provider: ProviderRecord = {
        id: createId("provider", ++providerSeq),
        createdAt: timestamp,
        updatedAt: timestamp,
        ...input,
      };
      providers.push(provider);
      return provider;
    },
    async updateProvider(providerId, input) {
      const provider = providers.find((item) => item.id === providerId);
      if (!provider) {
        return null;
      }

      Object.assign(provider, input);
      provider.updatedAt = now();
      return provider;
    },
    async listModelBindings() {
      return [...modelBindings];
    },
    async findModelBindingById(bindingId) {
      return modelBindings.find((item) => item.id === bindingId) ?? null;
    },
    async createModelBinding(input) {
      const timestamp = now();
      const binding: ModelBindingRecord = {
        id: createId("model", ++modelSeq),
        createdAt: timestamp,
        updatedAt: timestamp,
        ...input,
      };
      modelBindings.push(binding);
      return binding;
    },
    async updateModelBinding(bindingId, input) {
      const binding = modelBindings.find((item) => item.id === bindingId);
      if (!binding) {
        return null;
      }

      Object.assign(binding, input);
      binding.updatedAt = now();
      return binding;
    },
    async listPromptTemplates() {
      return [...promptTemplates];
    },
    async findPromptTemplateById(promptId) {
      return promptTemplates.find((item) => item.id === promptId) ?? null;
    },
    async createPromptTemplate(input) {
      const timestamp = now();
      const prompt: PromptTemplateRecord = {
        id: createId("prompt", ++promptSeq),
        createdAt: timestamp,
        updatedAt: timestamp,
        ...input,
      };
      promptTemplates.push(prompt);
      return prompt;
    },
    async updatePromptTemplate(promptId, input) {
      const prompt = promptTemplates.find((item) => item.id === promptId);
      if (!prompt) {
        return null;
      }

      Object.assign(prompt, input);
      prompt.updatedAt = now();
      return prompt;
    },
    async listLogs() {
      return [...logs];
    },
    async createLog(input) {
      const log: AuditLogRecord = {
        id: createId("log", ++logSeq),
        createdAt: now(),
        ...input,
      };
      logs.unshift(log);
      return log;
    },
  };
}
