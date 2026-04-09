export const DEFAULT_MINIPROGRAM_API_BASE_URL = "http://127.0.0.1:3000";
export const MINIPROGRAM_API_BASE_URL_STORAGE_KEY = "TANGXIE_RUNTIME_API_BASE_URL";

function readGlobalRuntimeConfig() {
  return globalThis.__TANGXIE_MINIPROGRAM_RUNTIME__ ?? {};
}

function readWeChatStorageRuntimeConfig() {
  const apiBaseUrl = globalThis.wx?.getStorageSync?.(MINIPROGRAM_API_BASE_URL_STORAGE_KEY);
  if (typeof apiBaseUrl !== "string" || apiBaseUrl.trim().length === 0) {
    return {};
  }

  return { apiBaseUrl };
}

export function setMiniProgramRuntimeConfig(config) {
  globalThis.__TANGXIE_MINIPROGRAM_RUNTIME__ = config;

  if (typeof config.apiBaseUrl === "string" && config.apiBaseUrl.trim().length > 0) {
    globalThis.wx?.setStorageSync?.(MINIPROGRAM_API_BASE_URL_STORAGE_KEY, config.apiBaseUrl);
    return;
  }

  globalThis.wx?.removeStorageSync?.(MINIPROGRAM_API_BASE_URL_STORAGE_KEY);
}

export function resolveMiniProgramRuntimeConfig(overrides = {}) {
  const globalConfig = readGlobalRuntimeConfig();
  const storageConfig = readWeChatStorageRuntimeConfig();

  return {
    apiBaseUrl:
      overrides.apiBaseUrl ??
      globalConfig.apiBaseUrl ??
      storageConfig.apiBaseUrl ??
      DEFAULT_MINIPROGRAM_API_BASE_URL,
  };
}
