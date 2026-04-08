import type { AdminPageModel } from "./providers-page.ts";

export function createPromptsPage(): AdminPageModel {
  return {
    id: "prompts",
    title: "提示词管理",
    description: "编辑并版本化系统提示词和开发提示词。",
    fetchEndpoint: "/admin/ai/prompts",
    primaryAction: "新增提示词",
    secondaryActions: ["启用版本", "回滚版本"],
    fields: ["scene", "templateName", "systemPrompt", "developerPrompt", "version"],
  };
}
