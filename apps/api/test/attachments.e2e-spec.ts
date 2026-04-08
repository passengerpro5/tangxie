import assert from "node:assert/strict";
import test from "node:test";

import { createTasksHandler } from "../src/modules/tasks/tasks.controller.ts";
import { TasksService } from "../src/modules/tasks/tasks.service.ts";

function createRequest(method: string, url: string, body?: unknown) {
  return { method, url, body };
}

function createResponse() {
  const state = {
    statusCode: 0,
    headers: {} as Record<string, string>,
    bodyText: "",
  };

  const res = {
    writeHead(statusCode: number, headers: Record<string, string>) {
      state.statusCode = statusCode;
      state.headers = { ...state.headers, ...headers };
      return res;
    },
    end(chunk?: string) {
      state.bodyText = typeof chunk === "string" ? chunk : "";
    },
  };

  return {
    response: res,
    state,
  };
}

async function invoke(handler: ReturnType<typeof createTasksHandler>, method: string, url: string, body?: unknown) {
  const request = createRequest(method, url, body);
  const { response, state } = createResponse();
  await handler(request as never, response as never);

  return {
    statusCode: state.statusCode,
    headers: state.headers,
    body: state.bodyText ? JSON.parse(state.bodyText) : null,
  };
}

test("task intake accepts an attachment stub for image and doc inputs", async () => {
  const tasksHandler = createTasksHandler(
    new TasksService({
      now: () => new Date("2026-04-08T09:00:00+08:00"),
    }),
  );

  const res = await invoke(tasksHandler, "POST", "/tasks/intake", {
    attachments: [
      {
        kind: "doc",
        name: "brief.docx",
        fileUrl: "https://example.test/brief.docx",
      },
    ],
  });

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.task.status, "needs_info");
  assert.equal(res.body.source.sourceType, "doc");
  assert.equal(res.body.source.fileName, "brief.docx");
  assert.equal(res.body.source.fileUrl, "https://example.test/brief.docx");
  assert.match(res.body.source.rawText, /brief\.docx/);
  assert.match(res.body.task.description, /brief\.docx/);
});
