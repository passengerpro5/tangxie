export interface AdminPageModel {
  id: string;
  title: string;
  description: string;
  fetchEndpoint: string;
  primaryAction: string;
  secondaryActions: string[];
  fields: string[];
}

export function createProvidersPage(): AdminPageModel {
  return {
    id: "providers",
    title: "服务商配置",
    description: "管理 AI 服务商、base URL、默认模型和连通性测试。",
    fetchEndpoint: "/admin/ai/providers",
    primaryAction: "新增服务商",
    secondaryActions: ["测试连通性", "启用/停用"],
    fields: ["name", "providerType", "baseUrl", "apiKey", "defaultModel"],
  };
}
