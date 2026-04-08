import type { AIScene } from "../../ai-gateway/provider-client.ts";

export interface CreateModelBindingInput {
  providerId: string;
  scene: AIScene;
  modelName: string;
  temperature?: number;
  maxTokens?: number;
  timeoutSeconds?: number;
  enabled?: boolean;
  isDefault?: boolean;
}

export interface UpdateModelBindingInput {
  providerId?: string;
  scene?: AIScene;
  modelName?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutSeconds?: number;
  enabled?: boolean;
  isDefault?: boolean;
}

export interface ModelBindingResponse {
  id: string;
  providerId: string;
  scene: AIScene;
  modelName: string;
  temperature: number;
  maxTokens: number;
  timeoutSeconds: number;
  enabled: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}
