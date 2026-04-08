import type { IncomingMessage, ServerResponse } from "node:http";

export type ApiHandler = (req: IncomingMessage, res: ServerResponse) => void;

function sendJson(res: ServerResponse, statusCode: number, payload: unknown) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

export function createAppHandler(): ApiHandler {
  return (req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");

    if (req.method === "GET" && url.pathname === "/health") {
      sendJson(res, 200, { ok: true });
      return;
    }

    sendJson(res, 404, { message: "Not Found" });
  };
}

export class AppModule {
  static createHandler() {
    return createAppHandler();
  }
}
