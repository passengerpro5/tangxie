import type {
  AIScene,
  AIMessage,
  OpenAICompatibleProviderClient,
  OpenAICompatibleRequest,
  OpenAICompatibleResponse,
} from "../ai-gateway/provider-client.ts";
import type {
  CreateModelBindingInput,
  ModelBindingResponse,
  UpdateModelBindingInput,
} from "./dto/model-binding.dto.ts";
import type {
  CreatePromptTemplateInput,
  PromptTemplateResponse,
  UpdatePromptTemplateInput,
} from "./dto/prompt-template.dto.ts";
import type {
  CreateProviderInput,
  ProviderResponse,
  UpdateProviderInput,
  AdminProviderType,
  ProviderTestResponse,
} from "./dto/provider.dto.ts";

interface ProviderRecord {
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

interface ModelBindingRecord {
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

interface PromptTemplateRecord {
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

interface AuditLogRecord {
  id: string;
  action: string;
  entityType: "provider" | "model" | "prompt" | "provider_test";
  entityId: string;
  scene?: AIScene;
  message: string;
  createdAt: Date;
}

export interface AdminAiServiceOptions {
  providerClient?: OpenAICompatibleProviderClient;
  now?: () => Date;
}

function nowIso(date: Date) {
  return date.toISOString();
}

function createId(prefix: string, seed: number) {
  return `${prefix}_${seed.toString(36)}`;
}

function maskApiKey(apiKey: string) {
  if (!apiKey) {
    return "***";
  }

  if (apiKey.length <= 4) {
    return "***";
  }

  return `${apiKey.slice(0, 2)}***${apiKey.slice(-2)}`;
}

function encryptApiKey(apiKey: string) {
  return `enc:${Buffer.from(apiKey, "utf8").toString("base64")}`;
}

function decryptApiKey(apiKeyEncrypted: string) {
  if (!apiKeyEncrypted.startsWith("enc:")) {
    return apiKeyEncrypted;
  }

  const encoded = apiKeyEncrypted.slice(4);
  return Buffer.from(encoded, "base64").toString("utf8");
}

function buildTestMessages(providerName: string, input: string): AIMessage[] {
  return [
    { role: "system", content: `Admin test for provider ${providerName}` },
    { role: "user", content: input },
  ];
}

function createDefaultProviderClient(): OpenAICompatibleProviderClient {
  return {
    async chatCompletion(request: OpenAICompatibleRequest): Promise<OpenAICompatibleResponse> {
      return {
        id: `admin-test-${request.model}`,
        model: request.model,
        outputText: "ok",
        raw: { choices: [{ message: { content: "ok" } }] },
      };
    },
  };
}

export interface AdminAiLogResponse {
  id: string;
  action: string;
  entityType: "provider" | "model" | "prompt" | "provider_test";
  entityId: string;
  scene?: AIScene;
  message: string;
  createdAt: string;
}

export class AdminAiService {
  private readonly providerClient: OpenAICompatibleProviderClient;
  private readonly clock: () => Date;
  private providerSeq = 0;
  private modelSeq = 0;
  private promptSeq = 0;
  private logSeq = 0;
  private readonly providers: ProviderRecord[] = [];
  private readonly modelBindings: ModelBindingRecord[] = [];
  private readonly promptTemplates: PromptTemplateRecord[] = [];
  private readonly logs: AuditLogRecord[] = [];

  constructor(options: AdminAiServiceOptions = {}) {
    this.providerClient = options.providerClient ?? createDefaultProviderClient();
    this.clock = options.now ?? (() => new Date());
  }

  listProviders(): ProviderResponse[] {
    return [...this.providers]
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((provider) => this.toProviderResponse(provider));
  }

  createProvider(input: CreateProviderInput): ProviderResponse {
    const now = this.clock();
    const provider: ProviderRecord = {
      id: createId("provider", ++this.providerSeq),
      name: input.name,
      providerType: input.providerType,
      baseUrl: input.baseUrl,
      apiKeyEncrypted: encryptApiKey(input.apiKey),
      defaultModel: input.defaultModel,
      enabled: input.enabled ?? true,
      createdAt: now,
      updatedAt: now,
    };

    this.providers.push(provider);
    this.log("provider.create", "provider", provider.id, `Created provider ${provider.name}`);
    return this.toProviderResponse(provider);
  }

  updateProvider(providerId: string, input: UpdateProviderInput): ProviderResponse {
    const provider = this.requireProvider(providerId);

    if (input.name !== undefined) provider.name = input.name;
    if (input.providerType !== undefined) provider.providerType = input.providerType;
    if (input.baseUrl !== undefined) provider.baseUrl = input.baseUrl;
    if (input.defaultModel !== undefined) provider.defaultModel = input.defaultModel;
    if (input.enabled !== undefined) provider.enabled = input.enabled;
    if (input.apiKey !== undefined) provider.apiKeyEncrypted = encryptApiKey(input.apiKey);
    provider.updatedAt = this.clock();

    this.log("provider.update", "provider", provider.id, `Updated provider ${provider.name}`);
    return this.toProviderResponse(provider);
  }

  async testProvider(providerId: string, input: { input: string }): Promise<ProviderTestResponse> {
    const provider = this.requireProvider(providerId);
    if (!provider.enabled) {
      throw new Error(`Provider is disabled: ${provider.name}`);
    }

    const request: OpenAICompatibleRequest = {
      baseUrl: provider.baseUrl,
      apiKey: decryptApiKey(provider.apiKeyEncrypted),
      model: provider.defaultModel,
      messages: buildTestMessages(provider.name, input.input),
      temperature: 0,
      maxTokens: 256,
      timeoutSeconds: 30,
    };

    const startedAt = this.clock();
    const response = await this.providerClient.chatCompletion(request);
    const finishedAt = this.clock();

    return {
      ok: true,
      provider: this.toProviderResponse(provider),
      modelName: response.model || request.model,
      outputText: response.outputText,
      logId: this.log(
        "provider.test",
        "provider_test",
        provider.id,
        `Provider test for ${provider.name} (${finishedAt.getTime() - startedAt.getTime()}ms)`,
      ),
    };
  }

  listModelBindings(): ModelBindingResponse[] {
    return [...this.modelBindings]
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((binding) => this.toModelBindingResponse(binding));
  }

  createModelBinding(input: CreateModelBindingInput): ModelBindingResponse {
    this.requireProvider(input.providerId);
    const now = this.clock();
    const binding: ModelBindingRecord = {
      id: createId("model", ++this.modelSeq),
      providerId: input.providerId,
      scene: input.scene,
      modelName: input.modelName,
      temperature: input.temperature ?? 0.2,
      maxTokens: input.maxTokens ?? 2048,
      timeoutSeconds: input.timeoutSeconds ?? 60,
      enabled: input.enabled ?? true,
      isDefault: input.isDefault ?? false,
      createdAt: now,
      updatedAt: now,
    };

    if (binding.isDefault) {
      this.clearDefaultModelBindings(binding.scene);
    }

    this.modelBindings.push(binding);
    this.log("model.create", "model", binding.id, `Created model binding for ${binding.scene}`, binding.scene);
    return this.toModelBindingResponse(binding);
  }

  updateModelBinding(bindingId: string, input: UpdateModelBindingInput): ModelBindingResponse {
    const binding = this.requireModelBinding(bindingId);
    if (input.providerId !== undefined) {
      this.requireProvider(input.providerId);
      binding.providerId = input.providerId;
    }
    if (input.scene !== undefined) {
      binding.scene = input.scene;
    }
    if (input.modelName !== undefined) binding.modelName = input.modelName;
    if (input.temperature !== undefined) binding.temperature = input.temperature;
    if (input.maxTokens !== undefined) binding.maxTokens = input.maxTokens;
    if (input.timeoutSeconds !== undefined) binding.timeoutSeconds = input.timeoutSeconds;
    if (input.enabled !== undefined) binding.enabled = input.enabled;
    if (input.isDefault !== undefined) binding.isDefault = input.isDefault;
    if (binding.isDefault) {
      this.clearDefaultModelBindings(binding.scene, binding.id);
    }
    binding.updatedAt = this.clock();

    this.log("model.update", "model", binding.id, `Updated model binding for ${binding.scene}`, binding.scene);
    return this.toModelBindingResponse(binding);
  }

  listPromptTemplates(): PromptTemplateResponse[] {
    return [...this.promptTemplates]
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((prompt) => this.toPromptTemplateResponse(prompt));
  }

  createPromptTemplate(input: CreatePromptTemplateInput): PromptTemplateResponse {
    const now = this.clock();
    const prompt: PromptTemplateRecord = {
      id: createId("prompt", ++this.promptSeq),
      scene: input.scene,
      templateName: input.templateName,
      systemPrompt: input.systemPrompt,
      developerPrompt: input.developerPrompt ?? null,
      version: input.version,
      isActive: input.isActive ?? false,
      createdAt: now,
      updatedAt: now,
    };

    if (prompt.isActive) {
      this.clearActivePromptTemplates(prompt.scene);
    }

    this.promptTemplates.push(prompt);
    this.log("prompt.create", "prompt", prompt.id, `Created prompt template ${prompt.templateName}`, prompt.scene);
    return this.toPromptTemplateResponse(prompt);
  }

  updatePromptTemplate(promptId: string, input: UpdatePromptTemplateInput): PromptTemplateResponse {
    const prompt = this.requirePromptTemplate(promptId);
    if (input.scene !== undefined) {
      prompt.scene = input.scene;
    }
    if (input.templateName !== undefined) prompt.templateName = input.templateName;
    if (input.systemPrompt !== undefined) prompt.systemPrompt = input.systemPrompt;
    if (input.developerPrompt !== undefined) prompt.developerPrompt = input.developerPrompt;
    if (input.version !== undefined) prompt.version = input.version;
    if (input.isActive !== undefined) prompt.isActive = input.isActive;
    if (prompt.isActive) {
      this.clearActivePromptTemplates(prompt.scene, prompt.id);
    }
    prompt.updatedAt = this.clock();

    this.log("prompt.update", "prompt", prompt.id, `Updated prompt template ${prompt.templateName}`, prompt.scene);
    return this.toPromptTemplateResponse(prompt);
  }

  listLogs(): AdminAiLogResponse[] {
    return [...this.logs]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((log) => ({
        id: log.id,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        scene: log.scene,
        message: log.message,
        createdAt: nowIso(log.createdAt),
      }));
  }

  private log(
    action: string,
    entityType: AuditLogRecord["entityType"],
    entityId: string,
    message: string,
    scene?: AIScene,
  ) {
    const log: AuditLogRecord = {
      id: createId("log", ++this.logSeq),
      action,
      entityType,
      entityId,
      scene,
      message,
      createdAt: this.clock(),
    };

    this.logs.unshift(log);
    return log.id;
  }

  private clearDefaultModelBindings(scene: AIScene, keepId?: string) {
    for (const binding of this.modelBindings) {
      if (binding.scene === scene && binding.id !== keepId) {
        binding.isDefault = false;
      }
    }
  }

  private clearActivePromptTemplates(scene: AIScene, keepId?: string) {
    for (const prompt of this.promptTemplates) {
      if (prompt.scene === scene && prompt.id !== keepId) {
        prompt.isActive = false;
      }
    }
  }

  private requireProvider(providerId: string) {
    const provider = this.providers.find((item) => item.id === providerId);
    if (!provider) {
      throw new Error("Provider not found");
    }
    return provider;
  }

  private requireModelBinding(bindingId: string) {
    const binding = this.modelBindings.find((item) => item.id === bindingId);
    if (!binding) {
      throw new Error("Model binding not found");
    }
    return binding;
  }

  private requirePromptTemplate(promptId: string) {
    const prompt = this.promptTemplates.find((item) => item.id === promptId);
    if (!prompt) {
      throw new Error("Prompt template not found");
    }
    return prompt;
  }

  private toProviderResponse(provider: ProviderRecord): ProviderResponse {
    return {
      id: provider.id,
      name: provider.name,
      providerType: provider.providerType,
      baseUrl: provider.baseUrl,
      defaultModel: provider.defaultModel,
      enabled: provider.enabled,
      apiKeyMasked: maskApiKey(decryptApiKey(provider.apiKeyEncrypted)),
      hasApiKeyConfigured: Boolean(provider.apiKeyEncrypted),
      createdAt: nowIso(provider.createdAt),
      updatedAt: nowIso(provider.updatedAt),
    };
  }

  private toModelBindingResponse(binding: ModelBindingRecord): ModelBindingResponse {
    return {
      id: binding.id,
      providerId: binding.providerId,
      scene: binding.scene,
      modelName: binding.modelName,
      temperature: binding.temperature,
      maxTokens: binding.maxTokens,
      timeoutSeconds: binding.timeoutSeconds,
      enabled: binding.enabled,
      isDefault: binding.isDefault,
      createdAt: nowIso(binding.createdAt),
      updatedAt: nowIso(binding.updatedAt),
    };
  }

  private toPromptTemplateResponse(prompt: PromptTemplateRecord): PromptTemplateResponse {
    return {
      id: prompt.id,
      scene: prompt.scene,
      templateName: prompt.templateName,
      systemPrompt: prompt.systemPrompt,
      developerPrompt: prompt.developerPrompt,
      version: prompt.version,
      isActive: prompt.isActive,
      createdAt: nowIso(prompt.createdAt),
      updatedAt: nowIso(prompt.updatedAt),
    };
  }
}
