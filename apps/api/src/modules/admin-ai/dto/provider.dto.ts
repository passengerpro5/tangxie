export type AdminProviderType = "openai_compatible" | "custom";

export interface CreateProviderInput {
  name: string;
  providerType: AdminProviderType;
  baseUrl: string;
  apiKey: string;
  defaultModel: string;
  enabled?: boolean;
}

export interface UpdateProviderInput {
  name?: string;
  providerType?: AdminProviderType;
  baseUrl?: string;
  apiKey?: string;
  defaultModel?: string;
  enabled?: boolean;
}

export interface ProviderResponse {
  id: string;
  name: string;
  providerType: AdminProviderType;
  baseUrl: string;
  defaultModel: string;
  enabled: boolean;
  apiKeyMasked: string;
  hasApiKeyConfigured: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderTestResponse {
  ok: boolean;
  provider: ProviderResponse;
  modelName: string;
  outputText: string;
  logId: string;
}
