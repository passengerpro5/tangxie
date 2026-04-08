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
  ];

  for (const enumName of expectedEnums) {
    assert.ok(schema.includes(enumName), `missing ${enumName}`);
  }
});

test("contains datasource and generator declarations", () => {
  assert.ok(schema.includes("generator client"), "missing generator client");
  assert.ok(schema.includes("datasource db"), "missing datasource db");
  assert.ok(schema.includes('provider = "postgresql"'), "missing postgres provider");
});
