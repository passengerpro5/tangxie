import assert from "node:assert/strict";
import test from "node:test";

import { App, getActivePage } from "../src/App.ts";

test("admin smoke exposes provider, model, prompt, and log surfaces", () => {
  const shell = App();

  assert.equal(shell.brand, "糖蟹");
  assert.equal(shell.defaultPageId, "providers");
  assert.deepEqual(shell.navigation.map((item) => item.id), [
    "providers",
    "models",
    "prompts",
    "logs",
  ]);

  const active = getActivePage(shell, "prompts");
  assert.equal(active.id, "prompts");
  assert.equal(active.title.includes("提示词"), true);
});
