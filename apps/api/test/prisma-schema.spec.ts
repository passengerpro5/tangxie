import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const schema = readFileSync(new URL("../prisma/schema.prisma", import.meta.url), "utf8");

test("contains the core Prisma models", () => {
  const expectedModels = [
    "model Task",
    "model TaskInputSource",
    "model ClarificationSession",
    "model ScheduleBlock",
    "model Reminder",
    "model UserSchedulePreference",
    "model AIProviderConfig",
    "model AIModelBinding",
    "model PromptTemplate",
    "model ArrangeConversation",
    "model ArrangeConversationMessage",
    "model AiCallLog",
    "model AdminAiAuditLog",
  ];

  for (const model of expectedModels) {
    assert.ok(schema.includes(model), `missing ${model}`);
  }
});

test("contains the core enums", () => {
  const expectedEnums = [
    "enum TaskStatus",
    "enum ReminderStatus",
    "enum ProviderType",
    "enum ScheduleBlockType",
    "enum ScheduleStatus",
    "enum ReminderType",
    "enum AIScene",
    "enum ClarificationSessionStatus",
    "enum ArrangeConversationStatus",
  ];

  for (const enumName of expectedEnums) {
    assert.ok(schema.includes(enumName), `missing ${enumName}`);
  }
});

test("AIScene enum includes arrange_chat for persisted admin/model configuration", () => {
  assert.ok(schema.includes("arrange_chat"), "missing AIScene.arrange_chat");
});

test("contains datasource and generator declarations", () => {
  assert.ok(schema.includes("generator client"), "missing generator client");
  assert.ok(schema.includes("datasource db"), "missing datasource db");
  assert.ok(schema.includes('provider = "postgresql"'), "missing postgres provider");
});
