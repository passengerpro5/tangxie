export const DEFAULT_MINIPROGRAM_API_BASE_URL = "http://127.0.0.1:3000";
export const MINIPROGRAM_API_BASE_URL_STORAGE_KEY = "TANGXIE_RUNTIME_API_BASE_URL";

export interface MiniProgramRuntimeConfig {
  apiBaseUrl: string;
}

function readGlobalRuntimeConfig(): Partial<MiniProgramRuntimeConfig> {
  const globalConfig = (globalThis as typeof globalThis & {
    __TANGXIE_MINIPROGRAM_RUNTIME__?: Partial<MiniProgramRuntimeConfig>;
  }).__TANGXIE_MINIPROGRAM_RUNTIME__;

  return globalConfig ?? {};
}

function readWeChatStorageRuntimeConfig(): Partial<MiniProgramRuntimeConfig> {
  const maybeWx = globalThis as typeof globalThis & {
    wx?: {
      getStorageSync?: (key: string) => unknown;
    };
  };

  const apiBaseUrl = maybeWx.wx?.getStorageSync?.(MINIPROGRAM_API_BASE_URL_STORAGE_KEY);
  if (typeof apiBaseUrl !== "string" || apiBaseUrl.trim().length === 0) {
    return {};
  }

  return { apiBaseUrl };
}

export function setMiniProgramRuntimeConfig(config: Partial<MiniProgramRuntimeConfig>) {
  (globalThis as typeof globalThis & {
    __TANGXIE_MINIPROGRAM_RUNTIME__?: Partial<MiniProgramRuntimeConfig>;
  }).__TANGXIE_MINIPROGRAM_RUNTIME__ = config;

  const maybeWx = globalThis as typeof globalThis & {
    wx?: {
      setStorageSync?: (key: string, value: string) => void;
      removeStorageSync?: (key: string) => void;
    };
  };

  if (typeof config.apiBaseUrl === "string" && config.apiBaseUrl.trim().length > 0) {
    maybeWx.wx?.setStorageSync?.(MINIPROGRAM_API_BASE_URL_STORAGE_KEY, config.apiBaseUrl);
    return;
  }

  maybeWx.wx?.removeStorageSync?.(MINIPROGRAM_API_BASE_URL_STORAGE_KEY);
}

export function resolveMiniProgramRuntimeConfig(
  overrides: Partial<MiniProgramRuntimeConfig> = {},
): MiniProgramRuntimeConfig {
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
