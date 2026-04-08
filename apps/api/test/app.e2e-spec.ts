import assert from "node:assert/strict";
import test from "node:test";

import { createAppHandler } from "../src/app.module.ts";

test("GET /health returns ok", async () => {
  const handler = createAppHandler();
  const headers: Record<string, string> = {};
  let statusCode = 0;
  let bodyText = "";

  const req = {
    method: "GET",
    url: "/health",
  };

  const res = {
    writeHead(code: number, nextHeaders: Record<string, string>) {
      statusCode = code;
      Object.assign(headers, nextHeaders);
      return res;
    },
    end(chunk: string) {
      bodyText = chunk;
    },
  };

  handler(req as never, res as never);

  assert.equal(statusCode, 200);
  assert.equal(headers["Content-Type"], "application/json; charset=utf-8");
  assert.deepEqual(JSON.parse(bodyText), { ok: true });
});
