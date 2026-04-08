import test from "node:test";
import assert from "node:assert/strict";

import { AI_SCENES } from "./ai-scenes.ts";
import { TASK_STATUS } from "./task-status.ts";

test("exports stable AI scene names and task statuses", () => {
  assert.deepEqual(AI_SCENES, [
    "task_extract",
    "clarification",
    "priority_rank",
    "schedule_generate",
    "reminder_copy",
  ]);

  assert.deepEqual(TASK_STATUS, [
    "draft",
    "needs_info",
    "schedulable",
    "scheduled",
    "done",
    "overdue",
  ]);

  assert.equal(Object.isFrozen(AI_SCENES), true);
  assert.equal(Object.isFrozen(TASK_STATUS), true);
});
