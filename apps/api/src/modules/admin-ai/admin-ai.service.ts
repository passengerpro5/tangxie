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
import {
  createInMemoryAdminAiRepository,
  type AdminAiRepository,
  type AuditLogRecord,
  type ModelBindingRecord,
  type PromptTemplateRecord,
  type ProviderRecord,
} from "../../persistence/admin-ai-repository.ts";

export interface AdminAiServiceOptions {
  repository?: AdminAiRepository;
  providerClient?: OpenAICompatibleProviderClient;
  now?: () => Date;
}

function nowIso(date: Date) {
  return date.toISOString();
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
  private readonly repository: AdminAiRepository;
  private readonly providerClient: OpenAICompatibleProviderClient;
  private readonly clock: () => Date;

  constructor(options: AdminAiServiceOptions = {}) {
    this.clock = options.now ?? (() => new Date());
    this.repository =
      options.repository ?? createInMemoryAdminAiRepository({ now: this.clock });
    this.providerClient = options.providerClient ?? createDefaultProviderClient();
  }

  async listProviders(): Promise<ProviderResponse[]> {
    const providers = await this.repository.listProviders();
    return [...providers]
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((provider) => this.toProviderResponse(provider));
  }

  async createProvider(input: CreateProviderInput): Promise<ProviderResponse> {
    const provider = await this.repository.createProvider({
      name: input.name,
      providerType: input.providerType,
      baseUrl: input.baseUrl,
      apiKeyEncrypted: encryptApiKey(input.apiKey),
      defaultModel: input.defaultModel,
      enabled: input.enabled ?? true,
    });
    await this.log("provider.create", "provider", provider.id, `Created provider ${provider.name}`);
    return this.toProviderResponse(provider);
  }

  async updateProvider(providerId: string, input: UpdateProviderInput): Promise<ProviderResponse> {
    const provider = await this.requireProvider(providerId);
    const updatedProvider = await this.repository.updateProvider(providerId, {
      name: input.name,
      providerType: input.providerType,
      baseUrl: input.baseUrl,
      defaultModel: input.defaultModel,
      enabled: input.enabled,
      apiKeyEncrypted:
        input.apiKey !== undefined ? encryptApiKey(input.apiKey) : undefined,
    });

    if (!updatedProvider) {
      throw new Error("Provider not found");
    }

    await this.log("provider.update", "provider", provider.id, `Updated provider ${provider.name}`);
    return this.toProviderResponse(updatedProvider);
  }

  async testProvider(providerId: string, input: { input: string }): Promise<ProviderTestResponse> {
    const provider = await this.requireProvider(providerId);
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
      logId: await this.log(
        "provider.test",
        "provider_test",
        provider.id,
        `Provider test for ${provider.name} (${finishedAt.getTime() - startedAt.getTime()}ms)`,
      ),
    };
  }

  async listModelBindings(): Promise<ModelBindingResponse[]> {
    const modelBindings = await this.repository.listModelBindings();
    return [...modelBindings]
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((binding) => this.toModelBindingResponse(binding));
  }

  async createModelBinding(input: CreateModelBindingInput): Promise<ModelBindingResponse> {
    await this.requireProvider(input.providerId);
    const binding = await this.repository.createModelBinding({
      providerId: input.providerId,
      scene: input.scene,
      modelName: input.modelName,
      temperature: input.temperature ?? 0.2,
      maxTokens: input.maxTokens ?? 2048,
      timeoutSeconds: input.timeoutSeconds ?? 60,
      enabled: input.enabled ?? true,
      isDefault: input.isDefault ?? false,
    });

    if (binding.isDefault) {
      await this.clearDefaultModelBindings(binding.scene, binding.id);
    }

    await this.log("model.create", "model", binding.id, `Created model binding for ${binding.scene}`, binding.scene);
    return this.toModelBindingResponse(binding);
  }

  async updateModelBinding(
    bindingId: string,
    input: UpdateModelBindingInput,
  ): Promise<ModelBindingResponse> {
    const binding = await this.requireModelBinding(bindingId);
    if (input.providerId !== undefined) {
      await this.requireProvider(input.providerId);
    }

    const updatedBinding = await this.repository.updateModelBinding(bindingId, {
      providerId: input.providerId,
      scene: input.scene,
      modelName: input.modelName,
      temperature: input.temperature,
      maxTokens: input.maxTokens,
      timeoutSeconds: input.timeoutSeconds,
      enabled: input.enabled,
      isDefault: input.isDefault,
    });

    if (!updatedBinding) {
      throw new Error("Model binding not found");
    }

    if (updatedBinding.isDefault) {
      await this.clearDefaultModelBindings(updatedBinding.scene, updatedBinding.id);
    }

    await this.log(
      "model.update",
      "model",
      binding.id,
      `Updated model binding for ${updatedBinding.scene}`,
      updatedBinding.scene,
    );
    return this.toModelBindingResponse(updatedBinding);
  }

  async listPromptTemplates(): Promise<PromptTemplateResponse[]> {
    const promptTemplates = await this.repository.listPromptTemplates();
    return [...promptTemplates]
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((prompt) => this.toPromptTemplateResponse(prompt));
  }

  async createPromptTemplate(input: CreatePromptTemplateInput): Promise<PromptTemplateResponse> {
    const prompt = await this.repository.createPromptTemplate({
      scene: input.scene,
      templateName: input.templateName,
      systemPrompt: input.systemPrompt,
      developerPrompt: input.developerPrompt ?? null,
      version: input.version,
      isActive: input.isActive ?? false,
    });

    if (prompt.isActive) {
      await this.clearActivePromptTemplates(prompt.scene, prompt.id);
    }

    await this.log("prompt.create", "prompt", prompt.id, `Created prompt template ${prompt.templateName}`, prompt.scene);
    return this.toPromptTemplateResponse(prompt);
  }

  async updatePromptTemplate(
    promptId: string,
    input: UpdatePromptTemplateInput,
  ): Promise<PromptTemplateResponse> {
    const prompt = await this.requirePromptTemplate(promptId);
    const updatedPrompt = await this.repository.updatePromptTemplate(promptId, {
      scene: input.scene,
      templateName: input.templateName,
      systemPrompt: input.systemPrompt,
      developerPrompt: input.developerPrompt,
      version: input.version,
      isActive: input.isActive,
    });

    if (!updatedPrompt) {
      throw new Error("Prompt template not found");
    }

    if (updatedPrompt.isActive) {
      await this.clearActivePromptTemplates(updatedPrompt.scene, updatedPrompt.id);
    }

    await this.log(
      "prompt.update",
      "prompt",
      prompt.id,
      `Updated prompt template ${updatedPrompt.templateName}`,
      updatedPrompt.scene,
    );
    return this.toPromptTemplateResponse(updatedPrompt);
  }

  async listLogs(): Promise<AdminAiLogResponse[]> {
    const logs = await this.repository.listLogs();
    return [...logs]
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

  private async log(
    action: string,
    entityType: AuditLogRecord["entityType"],
    entityId: string,
    message: string,
    scene?: AIScene,
  ) {
    const log = await this.repository.createLog({
      action,
      entityType,
      entityId,
      scene,
      message,
    });
    return log.id;
  }

  private async clearDefaultModelBindings(scene: AIScene, keepId?: string) {
    const bindings = await this.repository.listModelBindings();
    for (const binding of bindings) {
      if (binding.scene === scene && binding.id !== keepId) {
        await this.repository.updateModelBinding(binding.id, { isDefault: false });
      }
    }
  }

  private async clearActivePromptTemplates(scene: AIScene, keepId?: string) {
    const prompts = await this.repository.listPromptTemplates();
    for (const prompt of prompts) {
      if (prompt.scene === scene && prompt.id !== keepId) {
        await this.repository.updatePromptTemplate(prompt.id, { isActive: false });
      }
    }
  }

  private async requireProvider(providerId: string) {
    const provider = await this.repository.findProviderById(providerId);
    if (!provider) {
      throw new Error("Provider not found");
    }
    return provider;
  }

  private async requireModelBinding(bindingId: string) {
    const binding = await this.repository.findModelBindingById(bindingId);
    if (!binding) {
      throw new Error("Model binding not found");
    }
    return binding;
  }

  private async requirePromptTemplate(promptId: string) {
    const prompt = await this.repository.findPromptTemplateById(promptId);
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
