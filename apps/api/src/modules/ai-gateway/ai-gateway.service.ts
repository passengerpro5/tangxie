import type {
  AIScene,
  AIMessage,
  OpenAICompatibleProviderClient,
  OpenAICompatibleRequest,
  OpenAICompatibleResponse,
} from "./provider-client.ts";

export interface AIProviderConfig {
  id: string;
  name: string;
  providerType: "openai_compatible" | "custom";
  baseUrl: string;
  apiKey: string;
  defaultModel: string;
  enabled: boolean;
}

export interface AIModelBinding {
  scene: AIScene;
  providerId: string;
  modelName: string;
  temperature: number;
  maxTokens: number;
  timeoutSeconds: number;
  enabled: boolean;
  isDefault: boolean;
}

export interface PromptTemplate {
  scene: AIScene;
  templateName: string;
  systemPrompt: string;
  developerPrompt?: string | null;
  version: string;
  isActive: boolean;
}

export interface AiGatewayCatalog {
  getProviderById(providerId: string): AIProviderConfig | undefined;
  getModelBinding(scene: AIScene): AIModelBinding | undefined;
  getPromptTemplate(scene: AIScene): PromptTemplate | undefined;
}

export interface AiGatewayRunInput {
  input: string;
  context?: Record<string, unknown>;
}

export interface AiGatewayRunResult {
  scene: AIScene;
  providerName: string;
  providerId: string;
  modelName: string;
  promptVersion: string;
  request: OpenAICompatibleRequest;
  response: OpenAICompatibleResponse;
}

export class InMemoryAiGatewayCatalog implements AiGatewayCatalog {
  private readonly providers: AIProviderConfig[];
  private readonly bindings: AIModelBinding[];
  private readonly prompts: PromptTemplate[];

  constructor(
    providers: AIProviderConfig[],
    bindings: AIModelBinding[],
    prompts: PromptTemplate[],
  ) {
    this.providers = providers;
    this.bindings = bindings;
    this.prompts = prompts;
  }

  getProviderById(providerId: string) {
    return this.providers.find((provider) => provider.id === providerId);
  }

  getModelBinding(scene: AIScene) {
    const sceneBindings = this.bindings.filter(
      (binding) => binding.scene === scene && binding.enabled,
    );

    return sceneBindings.find((binding) => binding.isDefault) ?? sceneBindings[0];
  }

  getPromptTemplate(scene: AIScene) {
    const scenePrompts = this.prompts.filter((prompt) => prompt.scene === scene && prompt.isActive);
    return scenePrompts[0];
  }
}

function buildMessages(
  systemPrompt: string,
  developerPrompt: string | null | undefined,
  input: string,
  context: Record<string, unknown> | undefined,
): AIMessage[] {
  const messages: AIMessage[] = [{ role: "system", content: systemPrompt }];

  if (developerPrompt) {
    messages.push({ role: "developer", content: developerPrompt });
  }

  if (context && Object.keys(context).length > 0) {
    messages.push({
      role: "developer",
      content: `Context: ${JSON.stringify(context)}`,
    });
  }

  messages.push({ role: "user", content: input });
  return messages;
}

export class AiGatewayService {
  private readonly catalog: AiGatewayCatalog;
  private readonly providerClient: OpenAICompatibleProviderClient;

  constructor(
    catalog: AiGatewayCatalog,
    providerClient: OpenAICompatibleProviderClient,
  ) {
    this.catalog = catalog;
    this.providerClient = providerClient;
  }

  async runScene(scene: AIScene, input: AiGatewayRunInput): Promise<AiGatewayRunResult> {
    const binding = this.catalog.getModelBinding(scene);
    if (!binding) {
      throw new Error(`No active model binding found for scene: ${scene}`);
    }

    const provider = this.catalog.getProviderById(binding.providerId);
    if (!provider) {
      throw new Error(`No provider found for scene: ${scene}`);
    }

    if (!provider.enabled) {
      throw new Error(`Provider is disabled: ${provider.name}`);
    }

    const prompt = this.catalog.getPromptTemplate(scene);
    if (!prompt) {
      throw new Error(`No active prompt template found for scene: ${scene}`);
    }

    const request: OpenAICompatibleRequest = {
      baseUrl: provider.baseUrl,
      apiKey: provider.apiKey,
      model: binding.modelName || provider.defaultModel,
      messages: buildMessages(prompt.systemPrompt, prompt.developerPrompt, input.input, input.context),
      temperature: binding.temperature,
      maxTokens: binding.maxTokens,
      timeoutSeconds: binding.timeoutSeconds,
    };

    const response = await this.providerClient.chatCompletion(request);

    return {
      scene,
      providerName: provider.name,
      providerId: provider.id,
      modelName: request.model,
      promptVersion: prompt.version,
      request,
      response,
    };
  }
}
