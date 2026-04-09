import { resolveMiniProgramRuntimeConfig } from "./config/runtime.js";

export function createMiniProgramApp() {
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
  if (typeof globalThis.App === "function") {
    globalThis.App({
      globalData: {
        runtimeConfig: resolveMiniProgramRuntimeConfig(),
      },
    });
  }
}

registerMiniProgramApp();

export default createMiniProgramApp();
