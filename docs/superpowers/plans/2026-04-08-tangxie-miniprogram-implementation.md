# 糖蟹小程序 1.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first working version of 糖蟹, including the mini program task-intake and scheduling flow, the backend task/schedule/reminder APIs, and the admin console for AI provider/model/prompt configuration.

**Architecture:** Use a dual-client architecture: a WeChat mini program for end users and a web admin console for operators. Back the system with a TypeScript service exposing REST APIs, a PostgreSQL database for business/config data, and an AI orchestration layer that routes by scene to configurable OpenAI-compatible providers such as AiHubMix.

**Tech Stack:** WeChat Mini Program + TypeScript, Node.js + NestJS, PostgreSQL + Prisma, React + Vite admin console, Vitest/Jest, Playwright for admin smoke checks

---

## Assumptions

This repository is currently empty, so this plan fixes a default stack and monorepo layout to avoid blocking implementation:

1. `apps/miniprogram` for the C-end WeChat app.
2. `apps/admin` for the B-end AI configuration console.
3. `apps/api` for backend APIs and scheduling logic.
4. `packages/shared` for shared TypeScript types and scene constants.
5. PostgreSQL is available locally or via Docker during development.

If these assumptions change, update the bootstrap task first and keep all later tasks aligned.

## Planned File Structure

### Repository Root

- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/package.json`
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/pnpm-workspace.yaml`
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/tsconfig.base.json`
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/README.md`
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/.env.example`

### Shared Package

- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/packages/shared/package.json`
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/packages/shared/src/index.ts`
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/packages/shared/src/ai-scenes.ts`
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/packages/shared/src/task-status.ts`

### API App

- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/api/package.json`
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/api/src/main.ts`
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/api/src/app.module.ts`
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/api/prisma/schema.prisma`
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/api/src/modules/tasks/*`
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/api/src/modules/clarification/*`
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/api/src/modules/scheduling/*`
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/api/src/modules/reminders/*`
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/api/src/modules/admin-ai/*`
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/api/src/modules/ai-gateway/*`
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/api/test/*`

### Admin App

- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/admin/package.json`
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/admin/src/main.tsx`
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/admin/src/App.tsx`
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/admin/src/pages/providers-page.tsx`
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/admin/src/pages/models-page.tsx`
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/admin/src/pages/prompts-page.tsx`
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/admin/src/pages/logs-page.tsx`
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/admin/src/lib/api-client.ts`
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/admin/tests/*`

### Mini Program App

- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/miniprogram/project.config.json`
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/miniprogram/app.json`
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/miniprogram/app.ts`
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/miniprogram/pages/home/*`
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/miniprogram/pages/task-detail/*`
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/miniprogram/components/schedule-view/*`
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/miniprogram/components/kanban-view/*`
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/miniprogram/components/arrange-sheet/*`
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/miniprogram/services/api.ts`
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/miniprogram/tests/*`

## Task 1: Bootstrap The Monorepo

**Files:**
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/package.json`
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/pnpm-workspace.yaml`
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/tsconfig.base.json`
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/.env.example`
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/README.md`

- [ ] **Step 1: Write the failing workspace sanity check**

Create a root script expectation in `README.md` and a temporary validation checklist that assumes the commands below exist:

```text
pnpm install
pnpm --filter @tangxie/api test
pnpm --filter @tangxie/admin test
pnpm --filter @tangxie/miniprogram test
```

- [ ] **Step 2: Run the sanity command to verify it fails**

Run: `pnpm install`
Expected: FAIL because the workspace files do not exist yet.

- [ ] **Step 3: Write the minimal workspace bootstrap**

Create the root `package.json` with workspace scripts:

```json
{
  "name": "tangxie",
  "private": true,
  "packageManager": "pnpm@10",
  "scripts": {
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "lint": "pnpm -r lint"
  }
}
```

Create `pnpm-workspace.yaml`:

```yaml
packages:
  - apps/*
  - packages/*
```

- [ ] **Step 4: Re-run workspace sanity check**

Run: `pnpm install`
Expected: PASS with lockfile generated and workspace discovered.

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-workspace.yaml tsconfig.base.json .env.example README.md
git commit -m "chore: bootstrap workspace"
```

## Task 2: Define Shared Domain Types

**Files:**
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/packages/shared/package.json`
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/packages/shared/src/index.ts`
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/packages/shared/src/ai-scenes.ts`
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/packages/shared/src/task-status.ts`
- Test: `/Users/zhuyicheng/Codex Project/糖蟹开发/packages/shared/src/index.test.ts`

- [ ] **Step 1: Write the failing shared-types test**

```ts
import { AI_SCENES, TASK_STATUS } from "./index";

it("exports stable AI scene names and task statuses", () => {
  expect(AI_SCENES).toContain("task_extract");
  expect(TASK_STATUS).toContain("needs_info");
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @tangxie/shared test`
Expected: FAIL because the package and exports do not exist yet.

- [ ] **Step 3: Implement shared enums and constants**

Expose:

```ts
export const AI_SCENES = [
  "task_extract",
  "clarification",
  "priority_rank",
  "schedule_generate",
  "reminder_copy"
] as const;

export const TASK_STATUS = [
  "draft",
  "needs_info",
  "schedulable",
  "scheduled",
  "done",
  "overdue"
] as const;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @tangxie/shared test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/shared
git commit -m "feat: add shared domain constants"
```

## Task 3: Create The API Skeleton

**Files:**
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/api/package.json`
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/api/src/main.ts`
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/api/src/app.module.ts`
- Test: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/api/test/app.e2e-spec.ts`

- [ ] **Step 1: Write the failing API health test**

```ts
it("/health returns ok", async () => {
  const res = await request(app.getHttpServer()).get("/health");
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ ok: true });
});
```

- [ ] **Step 2: Run the API test to verify it fails**

Run: `pnpm --filter @tangxie/api test`
Expected: FAIL because the NestJS app does not exist yet.

- [ ] **Step 3: Build the minimal API app**

Create a NestJS app with:

```ts
@Controller()
export class HealthController {
  @Get("/health")
  getHealth() {
    return { ok: true };
  }
}
```

- [ ] **Step 4: Run the API test to verify it passes**

Run: `pnpm --filter @tangxie/api test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api
git commit -m "feat: scaffold api service"
```

## Task 4: Model The Core Database Schema

**Files:**
- Modify: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/api/prisma/schema.prisma`
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/api/test/prisma-schema.spec.ts`

- [ ] **Step 1: Write the failing schema coverage test**

```ts
it("contains core business and AI config models", async () => {
  const schema = await readFile("apps/api/prisma/schema.prisma", "utf8");
  expect(schema).toContain("model Task");
  expect(schema).toContain("model ClarificationSession");
  expect(schema).toContain("model ScheduleBlock");
  expect(schema).toContain("model Reminder");
  expect(schema).toContain("model AIProviderConfig");
  expect(schema).toContain("model AIModelBinding");
  expect(schema).toContain("model PromptTemplate");
});
```

- [ ] **Step 2: Run the schema test to verify it fails**

Run: `pnpm --filter @tangxie/api test -- prisma-schema`
Expected: FAIL because the schema does not exist yet.

- [ ] **Step 3: Implement the minimal Prisma schema**

Add models for:

1. `Task`
2. `TaskInputSource`
3. `ClarificationSession`
4. `ScheduleBlock`
5. `Reminder`
6. `UserSchedulePreference`
7. `AIProviderConfig`
8. `AIModelBinding`
9. `PromptTemplate`
10. `AiCallLog`

Include enums for task status, reminder status, and provider type.

- [ ] **Step 4: Run Prisma validation and the schema test**

Run: `pnpm --filter @tangxie/api prisma validate && pnpm --filter @tangxie/api test -- prisma-schema`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/prisma apps/api/test/prisma-schema.spec.ts
git commit -m "feat: add core database schema"
```

## Task 5: Build The AI Provider Gateway

**Files:**
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/api/src/modules/ai-gateway/ai-gateway.module.ts`
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/api/src/modules/ai-gateway/ai-gateway.service.ts`
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/api/src/modules/ai-gateway/provider-client.ts`
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/api/src/modules/ai-gateway/ai-gateway.service.spec.ts`

- [ ] **Step 1: Write the failing AI gateway test**

```ts
it("routes an AI request by scene using the active provider, model, and prompt", async () => {
  const result = await service.runScene("clarification", {
    input: "明天下午前交论文初稿"
  });

  expect(result.providerName).toBe("AiHubMix");
  expect(result.modelName).toBe("gpt-4o-mini");
  expect(result.promptVersion).toBe("v1");
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @tangxie/api test -- ai-gateway`
Expected: FAIL because the gateway layer does not exist yet.

- [ ] **Step 3: Implement the minimal scene router**

The service must:

1. Look up the active `AIModelBinding` by scene.
2. Load the active `PromptTemplate`.
3. Load the referenced `AIProviderConfig`.
4. Call an OpenAI-compatible client with `base_url`, `api_key`, and `model`.
5. Persist an `AiCallLog` summary.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @tangxie/api test -- ai-gateway`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/ai-gateway
git commit -m "feat: add ai provider gateway"
```

## Task 6: Add Admin APIs For Provider, Model, And Prompt Management

**Files:**
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/api/src/modules/admin-ai/admin-ai.module.ts`
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/api/src/modules/admin-ai/admin-ai.controller.ts`
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/api/src/modules/admin-ai/admin-ai.service.ts`
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/api/src/modules/admin-ai/dto/*.ts`
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/api/test/admin-ai.e2e-spec.ts`

- [ ] **Step 1: Write the failing admin AI API test**

```ts
it("creates a provider and returns masked credentials", async () => {
  const res = await request(app.getHttpServer())
    .post("/admin/ai/providers")
    .send({
      name: "AiHubMix",
      providerType: "openai_compatible",
      baseUrl: "https://api.aihubmix.com/v1",
      apiKey: "secret-key"
    });

  expect(res.status).toBe(201);
  expect(res.body.apiKeyMasked).toContain("***");
});
```

- [ ] **Step 2: Run the admin API test to verify it fails**

Run: `pnpm --filter @tangxie/api test -- admin-ai`
Expected: FAIL because the module does not exist yet.

- [ ] **Step 3: Implement CRUD and test endpoints**

Add endpoints for:

1. `POST /admin/ai/providers`
2. `GET /admin/ai/providers`
3. `POST /admin/ai/models`
4. `GET /admin/ai/models`
5. `POST /admin/ai/prompts`
6. `GET /admin/ai/prompts`
7. `POST /admin/ai/providers/:id/test`
8. `GET /admin/ai/logs`

Ensure `api_key` is encrypted at rest and masked on read.

- [ ] **Step 4: Run the admin API tests**

Run: `pnpm --filter @tangxie/api test -- admin-ai`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/admin-ai apps/api/test/admin-ai.e2e-spec.ts
git commit -m "feat: add admin ai configuration apis"
```

## Task 7: Implement Task Intake And Clarification APIs

**Files:**
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/api/src/modules/tasks/tasks.module.ts`
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/api/src/modules/tasks/tasks.controller.ts`
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/api/src/modules/tasks/tasks.service.ts`
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/api/src/modules/clarification/clarification.module.ts`
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/api/src/modules/clarification/clarification.controller.ts`
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/api/src/modules/clarification/clarification.service.ts`
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/api/test/task-intake.e2e-spec.ts`

- [ ] **Step 1: Write the failing task-intake test**

```ts
it("creates a task draft and returns missing fields for clarification", async () => {
  const res = await request(app.getHttpServer())
    .post("/tasks/intake")
    .send({ rawText: "周五前写完论文初稿" });

  expect(res.status).toBe(201);
  expect(res.body.task.status).toBe("needs_info");
  expect(res.body.missingFields).toContain("estimated_duration_minutes");
});
```

- [ ] **Step 2: Run the task-intake test to verify it fails**

Run: `pnpm --filter @tangxie/api test -- task-intake`
Expected: FAIL because intake and clarification modules do not exist yet.

- [ ] **Step 3: Implement intake and clarification flow**

The backend must:

1. Create a `Task` draft and `TaskInputSource`.
2. Call `task_extract`.
3. Persist a `ClarificationSession`.
4. Detect missing fields.
5. Return the first follow-up question when required.

- [ ] **Step 4: Run the intake tests**

Run: `pnpm --filter @tangxie/api test -- task-intake`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/tasks apps/api/src/modules/clarification apps/api/test/task-intake.e2e-spec.ts
git commit -m "feat: add task intake and clarification flow"
```

## Task 8: Implement Priority Ranking And Scheduling

**Files:**
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/api/src/modules/scheduling/scheduling.module.ts`
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/api/src/modules/scheduling/scheduling.controller.ts`
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/api/src/modules/scheduling/scheduling.service.ts`
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/api/src/modules/scheduling/scheduler-rules.ts`
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/api/test/scheduling.e2e-spec.ts`

- [ ] **Step 1: Write the failing scheduling test**

```ts
it("creates proposed schedule blocks ordered by priority before deadline", async () => {
  const res = await request(app.getHttpServer())
    .post("/scheduling/propose")
    .send({ taskIds: ["task-1", "task-2"] });

  expect(res.status).toBe(201);
  expect(res.body.blocks[0].taskId).toBe("task-1");
  expect(new Date(res.body.blocks[0].endAt).getTime()).toBeLessThanOrEqual(
    new Date("2026-04-10T17:00:00+08:00").getTime()
  );
});
```

- [ ] **Step 2: Run the scheduling test to verify it fails**

Run: `pnpm --filter @tangxie/api test -- scheduling`
Expected: FAIL because scheduling APIs do not exist yet.

- [ ] **Step 3: Implement the minimal rule-based scheduler**

Encode these rules:

1. Require deadline and estimated duration.
2. Rank by urgency and user-confirmed ordering.
3. Choose the earliest available slot.
4. Never place blocks after deadline.
5. Return an explicit failure result when tasks do not fit.

- [ ] **Step 4: Run the scheduling test to verify it passes**

Run: `pnpm --filter @tangxie/api test -- scheduling`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/scheduling apps/api/test/scheduling.e2e-spec.ts
git commit -m "feat: add rule-based scheduling"
```

## Task 9: Implement Reminder Generation And Daily Summary APIs

**Files:**
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/api/src/modules/reminders/reminders.module.ts`
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/api/src/modules/reminders/reminders.controller.ts`
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/api/src/modules/reminders/reminders.service.ts`
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/api/test/reminders.e2e-spec.ts`

- [ ] **Step 1: Write the failing reminders test**

```ts
it("creates start and deadline reminders from confirmed schedule blocks", async () => {
  const res = await request(app.getHttpServer())
    .post("/reminders/generate")
    .send({ scheduleBlockId: "block-1" });

  expect(res.status).toBe(201);
  expect(res.body.items).toHaveLength(2);
});
```

- [ ] **Step 2: Run the reminders test to verify it fails**

Run: `pnpm --filter @tangxie/api test -- reminders`
Expected: FAIL because reminder generation does not exist yet.

- [ ] **Step 3: Implement reminder generation**

Support:

1. Start reminder.
2. Deadline-nearing reminder.
3. Daily summary query.

Only generate reminders from confirmed `ScheduleBlock` records.

- [ ] **Step 4: Run the reminders test**

Run: `pnpm --filter @tangxie/api test -- reminders`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/reminders apps/api/test/reminders.e2e-spec.ts
git commit -m "feat: add reminder generation"
```

## Task 10: Build The Admin Console

**Files:**
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/admin/package.json`
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/admin/src/main.tsx`
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/admin/src/App.tsx`
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/admin/src/pages/providers-page.tsx`
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/admin/src/pages/models-page.tsx`
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/admin/src/pages/prompts-page.tsx`
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/admin/src/pages/logs-page.tsx`
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/admin/src/lib/api-client.ts`
- Test: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/admin/tests/admin-shell.spec.tsx`

- [ ] **Step 1: Write the failing admin shell test**

```tsx
it("renders navigation for providers, models, prompts, and logs", () => {
  render(<App />);
  expect(screen.getByText("服务商配置")).toBeInTheDocument();
  expect(screen.getByText("模型配置")).toBeInTheDocument();
  expect(screen.getByText("提示词管理")).toBeInTheDocument();
  expect(screen.getByText("调用日志")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the admin test to verify it fails**

Run: `pnpm --filter @tangxie/admin test`
Expected: FAIL because the admin app does not exist yet.

- [ ] **Step 3: Implement the minimal admin console**

Build:

1. Sidebar navigation.
2. Provider CRUD form with masked API key display.
3. Model binding page by scene.
4. Prompt version list and editor.
5. Call log table.

- [ ] **Step 4: Run the admin test to verify it passes**

Run: `pnpm --filter @tangxie/admin test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/admin
git commit -m "feat: add ai admin console"
```

## Task 11: Build The Mini Program Home, Arrange Sheet, And Task Detail

**Files:**
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/miniprogram/project.config.json`
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/miniprogram/app.json`
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/miniprogram/app.ts`
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/miniprogram/pages/home/index.ts`
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/miniprogram/pages/home/index.wxml`
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/miniprogram/pages/home/index.wxss`
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/miniprogram/pages/task-detail/index.ts`
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/miniprogram/components/arrange-sheet/index.ts`
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/miniprogram/components/schedule-view/index.ts`
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/miniprogram/components/kanban-view/index.ts`
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/miniprogram/services/api.ts`
- Test: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/miniprogram/tests/home-page.spec.ts`

- [ ] **Step 1: Write the failing mini program page-state test**

```ts
it("shows tabs for 日程 and 任务看板 and exposes 安排任务 entry", () => {
  const state = buildHomePageState();
  expect(state.tabs).toEqual(["日程", "任务看板"]);
  expect(state.primaryActionText).toBe("安排任务");
});
```

- [ ] **Step 2: Run the mini program test to verify it fails**

Run: `pnpm --filter @tangxie/miniprogram test`
Expected: FAIL because the mini program app does not exist yet.

- [ ] **Step 3: Implement the minimal UI shell**

Ship:

1. Home page with tab switcher.
2. Schedule view component.
3. Kanban view component.
4. Bottom arrange sheet component.
5. Task detail page.
6. API service methods for intake, clarification, propose schedule, confirm schedule, and load daily tasks.

- [ ] **Step 4: Run the mini program tests**

Run: `pnpm --filter @tangxie/miniprogram test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/miniprogram
git commit -m "feat: add miniprogram shell"
```

## Task 12: Connect The Mini Program To The Real Scheduling Flow

**Files:**
- Modify: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/miniprogram/components/arrange-sheet/index.ts`
- Modify: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/miniprogram/services/api.ts`
- Modify: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/miniprogram/pages/home/index.ts`
- Test: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/miniprogram/tests/arrange-flow.spec.ts`

- [ ] **Step 1: Write the failing arrange-flow test**

```ts
it("intakes a task, shows a clarification question, and then loads proposed schedule blocks", async () => {
  const flow = createArrangeFlow(fakeApi);

  await flow.submitRawText("周五前写完论文初稿");
  expect(flow.messages[0].role).toBe("assistant");
  expect(flow.messages[0].text).toContain("大概需要多久");
});
```

- [ ] **Step 2: Run the arrange-flow test to verify it fails**

Run: `pnpm --filter @tangxie/miniprogram test -- arrange-flow`
Expected: FAIL because the flow wiring does not exist yet.

- [ ] **Step 3: Implement the end-to-end page state flow**

Wire:

1. Text submission to `/tasks/intake`.
2. Clarification replies to `/clarification/reply`.
3. Proposal fetch to `/scheduling/propose`.
4. Schedule confirmation to `/scheduling/confirm`.
5. Home page refresh after confirmation.

- [ ] **Step 4: Run the arrange-flow test**

Run: `pnpm --filter @tangxie/miniprogram test -- arrange-flow`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/miniprogram/components/arrange-sheet apps/miniprogram/services/api.ts apps/miniprogram/pages/home/index.ts
git commit -m "feat: connect arrange flow"
```

## Task 13: Add Attachment Intake Stubs

**Files:**
- Modify: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/api/src/modules/tasks/tasks.controller.ts`
- Modify: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/miniprogram/components/arrange-sheet/index.ts`
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/api/test/attachments.e2e-spec.ts`

- [ ] **Step 1: Write the failing attachment intake test**

```ts
it("accepts an uploaded file and stores a task input source record", async () => {
  const res = await request(app.getHttpServer())
    .post("/tasks/intake/file")
    .attach("file", Buffer.from("fake"), "brief.docx");

  expect(res.status).toBe(201);
  expect(res.body.sourceType).toBe("doc");
});
```

- [ ] **Step 2: Run the attachment test to verify it fails**

Run: `pnpm --filter @tangxie/api test -- attachments`
Expected: FAIL because file intake is not implemented yet.

- [ ] **Step 3: Add the minimal file intake path**

Implement:

1. Multipart upload endpoint.
2. Temporary file metadata persistence.
3. Task input source creation.
4. Placeholder parser response for image/doc input to unblock UI integration.

- [ ] **Step 4: Run the attachment test**

Run: `pnpm --filter @tangxie/api test -- attachments`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/tasks apps/miniprogram/components/arrange-sheet apps/api/test/attachments.e2e-spec.ts
git commit -m "feat: add attachment intake stub"
```

## Task 14: Add End-To-End Verification Scripts

**Files:**
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/admin/tests/smoke.spec.ts`
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/api/test/smoke.e2e-spec.ts`
- Create: `/Users/zhuyicheng/Codex Project/糖蟹开发/apps/miniprogram/tests/smoke.spec.ts`
- Modify: `/Users/zhuyicheng/Codex Project/糖蟹开发/README.md`

- [ ] **Step 1: Write the failing smoke checklist**

Document required verification:

1. Create an AI provider.
2. Bind a model to `clarification`.
3. Save a prompt template.
4. Intake one text task.
5. Complete one clarification turn.
6. Generate one schedule proposal.
7. Confirm one schedule and generate reminders.

- [ ] **Step 2: Run the smoke tests to verify they fail**

Run: `pnpm test`
Expected: FAIL because smoke coverage is not present yet.

- [ ] **Step 3: Implement smoke tests and developer instructions**

Add:

1. API smoke test for the core lifecycle.
2. Admin shell smoke test for provider/model/prompt/log pages.
3. Mini program state smoke test for tabs and arrange entry.
4. README runbook for local startup and verification.

- [ ] **Step 4: Run the full suite**

Run: `pnpm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/admin/tests apps/api/test apps/miniprogram/tests README.md
git commit -m "test: add end-to-end verification coverage"
```

## Delivery Notes

1. Keep provider API keys encrypted and masked from the first admin API task onward.
2. Do not implement automatic global rescheduling in 1.0.
3. Keep one task to one schedule block by default, but preserve the schema for multi-block support later.
4. Do not let the reminder module generate notifications from unconfirmed draft schedules.
5. Prefer Chinese labels in the mini program and admin UI, but keep code identifiers in English.

## Final Verification Checklist

- [ ] `pnpm install`
- [ ] `pnpm --filter @tangxie/shared test`
- [ ] `pnpm --filter @tangxie/api test`
- [ ] `pnpm --filter @tangxie/admin test`
- [ ] `pnpm --filter @tangxie/miniprogram test`
- [ ] Manual admin check: provider/model/prompt/log pages render and save
- [ ] Manual mini program check: intake -> clarification -> propose -> confirm -> home refresh
