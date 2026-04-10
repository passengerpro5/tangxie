# Arrange Chat AIHubMix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a real multi-turn arrange-chat flow backed by AIHubMix, with editable admin prompt configuration and persisted conversation history that can be reopened from the mini program.

**Architecture:** Add a new backend arrange-conversation layer that stores conversations, messages, and snapshots, and routes chat turns through the existing configurable AI gateway. Keep admin provider/model/prompt management as the source of truth for AIHubMix settings, then replace the mini program's stage-based arrange sheet runtime with a conversation-driven chat runtime that loads and resumes server-side sessions.

**Tech Stack:** TypeScript, Node HTTP handlers, Prisma/Postgres + in-memory repositories, React admin console, WeChat mini program runtime, Node test runner

---

### Task 1: Map the new arrange-chat backend boundary

**Files:**
- Modify: `apps/api/src/modules/ai-gateway/provider-client.ts`
- Modify: `apps/api/src/modules/ai-gateway/ai-gateway.service.ts`
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/src/persistence/arrange-conversations-repository.ts`
- Create: `apps/api/src/persistence/prisma-arrange-conversations-repository.ts`
- Create: `apps/api/src/modules/arrange-chat/arrange-chat.service.ts`
- Create: `apps/api/src/modules/arrange-chat/arrange-chat.controller.ts`

- [ ] **Step 1: Define new AI scene and persistence records**
- [ ] **Step 2: Add failing schema and repository tests for conversations, messages, and snapshots**
- [ ] **Step 3: Implement in-memory repository**
- [ ] **Step 4: Implement Prisma repository mapping**
- [ ] **Step 5: Run backend repository tests**

### Task 2: Add failing HTTP tests for arrange-chat endpoints

**Files:**
- Create: `apps/api/test/arrange-chat.e2e-spec.ts`
- Modify: `apps/api/src/app.module.ts`
- Create: `apps/api/src/modules/arrange-chat/arrange-chat.module.ts`

- [ ] **Step 1: Write failing tests for create/list/get/send/confirm arrange conversations**
- [ ] **Step 2: Run targeted arrange-chat tests and verify expected failures**
- [ ] **Step 3: Wire controller into app routing**
- [ ] **Step 4: Implement minimal handler/service behavior to pass**
- [ ] **Step 5: Re-run arrange-chat tests**

### Task 3: Route arrange chat through configured AIHubMix provider, model, and prompt

**Files:**
- Modify: `apps/api/src/modules/admin-ai/admin-ai.service.ts`
- Modify: `apps/api/src/persistence/admin-ai-repository.ts`
- Modify: `apps/api/src/persistence/prisma-admin-ai-repository.ts`
- Modify: `apps/api/src/modules/ai-gateway/ai-gateway.service.ts`
- Modify: `apps/api/test/admin-ai.e2e-spec.ts`

- [ ] **Step 1: Write failing tests for `arrange_chat` model binding and prompt retrieval**
- [ ] **Step 2: Run admin/AI gateway tests to watch them fail**
- [ ] **Step 3: Implement `arrange_chat` scene support and active-config lookup**
- [ ] **Step 4: Re-run admin/AI gateway tests**
- [ ] **Step 5: Keep provider test flow green**

### Task 4: Make the admin console editable enough for AIHubMix onboarding

**Files:**
- Modify: `apps/admin/src/lib/api-client.ts`
- Modify: `apps/admin/src/runtime/admin-console.ts`
- Modify: `apps/admin/src/ui/admin-shell-app.tsx`
- Modify: `apps/admin/src/pages/models-page.ts`
- Modify: `apps/admin/src/pages/prompts-page.ts`
- Modify: `apps/admin/tests/admin-console.spec.ts`
- Modify: `apps/admin/tests/admin-shell.spec.ts`

- [ ] **Step 1: Write failing admin tests for selecting `arrange_chat` and editing the single prompt template**
- [ ] **Step 2: Run targeted admin tests to verify failures**
- [ ] **Step 3: Implement minimal page/runtime/API updates**
- [ ] **Step 4: Re-run admin tests**

### Task 5: Replace mini program arrange flow with a conversation runtime

**Files:**
- Modify: `apps/miniprogram/services/api.ts`
- Modify: `apps/miniprogram/services/api.js`
- Modify: `apps/miniprogram/components/arrange-sheet/index.ts`
- Modify: `apps/miniprogram/components/arrange-sheet/index.js`
- Modify: `apps/miniprogram/pages/home/runtime.ts`
- Modify: `apps/miniprogram/pages/home/runtime.js`
- Modify: `apps/miniprogram/pages/home/index.ts`
- Modify: `apps/miniprogram/pages/home/index.js`
- Modify: `apps/miniprogram/pages/home/index.wxml`
- Modify: `apps/miniprogram/tests/arrange-flow.spec.ts`
- Modify: `apps/miniprogram/tests/home-runtime.spec.ts`
- Modify: `apps/miniprogram/tests/smoke.spec.ts`

- [ ] **Step 1: Write failing tests for create/load/send/resume conversation behavior**
- [ ] **Step 2: Run targeted mini program tests and verify the old flow no longer matches**
- [ ] **Step 3: Implement API client methods for arrange conversations**
- [ ] **Step 4: Implement runtime state for current conversation, messages, snapshot, and history**
- [ ] **Step 5: Re-run targeted mini program tests**

### Task 6: Keep final scheduling confirmation wired to the home page

**Files:**
- Modify: `apps/miniprogram/pages/home/index.ts`
- Modify: `apps/miniprogram/pages/home/index.js`
- Modify: `apps/api/src/modules/arrange-chat/arrange-chat.service.ts`
- Modify: `apps/api/test/arrange-chat.e2e-spec.ts`

- [ ] **Step 1: Write a failing integration-style test that confirm updates home-facing schedule data**
- [ ] **Step 2: Run the test and verify failure**
- [ ] **Step 3: Implement snapshot confirmation to task/schedule/reminder records**
- [ ] **Step 4: Re-run the test**

### Task 7: Verify end-to-end stability

**Files:**
- Modify: `docs/handoff.md`
- Modify: `docs/todo.md`

- [ ] **Step 1: Run targeted API tests**
- [ ] **Step 2: Run targeted admin tests**
- [ ] **Step 3: Run the mini program suite**
- [ ] **Step 4: Update handoff and todo with the new arrange-chat baseline**
