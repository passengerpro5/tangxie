import type { AdminPageModel } from "./providers-page.ts";

export function createLogsPage(): AdminPageModel {
  return {
    id: "logs",
    title: "调用日志",
    description: "查看 provider、model、prompt version 和请求结果。",
    fetchEndpoint: "/admin/ai/logs",
    primaryAction: "刷新日志",
    secondaryActions: ["按场景过滤", "查看详情"],
    fields: ["scene", "providerName", "modelName", "promptVersion", "statusCode", "durationMs"],
  };
}
