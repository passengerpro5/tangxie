import type { AdminPageModel } from "./providers-page.ts";

export function createModelsPage(): AdminPageModel {
  return {
    id: "models",
    title: "模型配置",
    description: "按场景绑定模型、温度和超时配置。",
    fetchEndpoint: "/admin/ai/models",
    primaryAction: "新增模型绑定",
    secondaryActions: ["设为默认", "按场景筛选"],
    fields: ["providerId", "scene", "modelName", "temperature", "maxTokens", "timeoutSeconds"],
  };
}
