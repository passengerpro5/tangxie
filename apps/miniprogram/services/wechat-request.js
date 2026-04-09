function resolveRequestFn(request) {
  if (request) {
    return request;
  }

  if (!globalThis.wx?.request) {
    throw new Error("WeChat request API is not available");
  }

  return globalThis.wx.request.bind(globalThis.wx);
}

function normalizeResponseBody(data) {
  if (typeof data === "string") {
    return data;
  }

  return JSON.stringify(data ?? null);
}

export function createWeChatRequestTransport(options = {}) {
  const request = resolveRequestFn(options.request);

  return {
    request(input) {
      return new Promise((resolve, reject) => {
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
