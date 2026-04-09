export interface WeChatRequestSuccessResult {
  statusCode: number;
  data: unknown;
}

export interface WeChatRequestOptions {
  url: string;
  method?: string;
  data?: unknown;
  header?: Record<string, string>;
  success: (result: WeChatRequestSuccessResult) => void;
  fail: (error: { errMsg?: string }) => void;
}

export interface WeChatRequestAdapter {
  request(options: WeChatRequestOptions): void;
}

export interface TransportRequestInput {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
}

export interface TransportResponse {
  status: number;
  body: string;
}

export interface MiniProgramTransport {
  request(input: TransportRequestInput): Promise<TransportResponse>;
}

function resolveRequestFn(request?: WeChatRequestAdapter["request"]) {
  if (request) {
    return request;
  }

  const maybeWx = globalThis as typeof globalThis & {
    wx?: WeChatRequestAdapter;
  };

  if (!maybeWx.wx?.request) {
    throw new Error("WeChat request API is not available");
  }

  return maybeWx.wx.request.bind(maybeWx.wx);
}

function normalizeResponseBody(data: unknown) {
  if (typeof data === "string") {
    return data;
  }

  return JSON.stringify(data ?? null);
}

export function createWeChatRequestTransport(options: {
  request?: WeChatRequestAdapter["request"];
} = {}): MiniProgramTransport {
  const request = resolveRequestFn(options.request);

  return {
    request(input: TransportRequestInput) {
      return new Promise<TransportResponse>((resolve, reject) => {
        request({
          url: input.url,
          method: input.method,
          header: input.headers,
          data: input.body,
          success(result) {
            resolve({
              status: result.statusCode,
              body: normalizeResponseBody(result.data),
            });
          },
          fail(error) {
            reject(new Error(error.errMsg ?? "Request failed"));
          },
        });
      });
    },
  };
}
