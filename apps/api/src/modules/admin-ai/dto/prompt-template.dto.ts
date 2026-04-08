import type { AIScene } from "../../ai-gateway/provider-client.ts";

export interface CreatePromptTemplateInput {
  scene: AIScene;
  templateName: string;
  systemPrompt: string;
  developerPrompt?: string | null;
  version: string;
  isActive?: boolean;
}

export interface UpdatePromptTemplateInput {
  scene?: AIScene;
  templateName?: string;
  systemPrompt?: string;
  developerPrompt?: string | null;
  version?: string;
  isActive?: boolean;
}

export interface PromptTemplateResponse {
  id: string;
  scene: AIScene;
  templateName: string;
  systemPrompt: string;
  developerPrompt?: string | null;
  version: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
