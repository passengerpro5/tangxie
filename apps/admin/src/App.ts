import { createLogsPage } from "./pages/logs-page.ts";
import { createModelsPage } from "./pages/models-page.ts";
import { createProvidersPage, type AdminPageModel } from "./pages/providers-page.ts";
import { createPromptsPage } from "./pages/prompts-page.ts";

export interface AdminShell {
  brand: string;
  title: string;
  description: string;
  accent: string;
  navigation: Array<{ id: string; label: string }>;
  pages: AdminPageModel[];
  defaultPageId: string;
}

export function App(): AdminShell {
  const pages = [
    createProvidersPage(),
    createModelsPage(),
    createPromptsPage(),
    createLogsPage(),
  ];

  return {
    brand: "糖蟹",
    title: "AI 管理控制台",
    description: "配置服务商、模型、提示词和调用日志。",
    accent: "amber",
    navigation: pages.map((page) => ({ id: page.id, label: page.title })),
    pages,
    defaultPageId: "providers",
  };
}

export function getActivePage(shell: AdminShell, pageId = shell.defaultPageId) {
  return shell.pages.find((page) => page.id === pageId) ?? shell.pages[0];
}
