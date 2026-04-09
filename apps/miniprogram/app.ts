import { resolveMiniProgramRuntimeConfig } from "./config/runtime.ts";

export interface MiniProgramShell {
  brand: string;
  defaultRoute: string;
  pages: string[];
  runtimeConfig: {
    apiBaseUrl: string;
  };
  theme: {
    background: string;
    accent: string;
    foreground: string;
  };
}

export function createMiniProgramApp(): MiniProgramShell {
  return {
    brand: "糖蟹",
    defaultRoute: "pages/home/index",
    pages: ["pages/home/index", "pages/task-detail/index"],
    runtimeConfig: resolveMiniProgramRuntimeConfig(),
    theme: {
      background: "warm-gradient",
      accent: "amber",
      foreground: "ink",
    },
  };
}

export function registerMiniProgramApp() {
  const maybeApp = globalThis as typeof globalThis & {
    App?: (options: { globalData: { runtimeConfig: { apiBaseUrl: string } } }) => void;
  };

  if (typeof maybeApp.App === "function") {
    maybeApp.App({
      globalData: {
        runtimeConfig: resolveMiniProgramRuntimeConfig(),
      },
    });
  }
}

registerMiniProgramApp();

export default createMiniProgramApp();
