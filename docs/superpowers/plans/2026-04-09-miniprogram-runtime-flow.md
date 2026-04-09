# Mini Program Runtime Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `apps/miniprogram` into a real WeChat-devtools-runnable client for the core flow: task intake, clarification, scheduling confirmation, and reminder generation.

**Architecture:** Keep the existing page-model and arrange-flow domain code, then add a thin WeChat runtime bridge around it: runtime config, request adapter, page state binding, and user-facing loading/error/empty states. Default to a local API origin while allowing an override through configuration.

**Tech Stack:** WeChat Mini Program, TypeScript, existing mini program API client and arrange-flow state machine, Node test runner

---

### Task 1: Add runtime configuration and transport bridge

**Files:**
- Create: `apps/miniprogram/config/runtime.ts`
- Modify: `apps/miniprogram/services/api.ts`
- Modify: `apps/miniprogram/project.config.json`
- Test: `apps/miniprogram/tests/home-page.spec.ts`

- [ ] **Step 1: Write the failing runtime-config test**

Add a test that expects:
- a default local API base URL
- an overridable runtime config
- a WeChat-compatible request adapter path instead of assuming Node `fetch`

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test apps/miniprogram/tests/home-page.spec.ts`
Expected: FAIL because runtime config and transport bridge do not exist.

- [ ] **Step 3: Write minimal implementation**

Create a runtime config module and update the API client so it can work with either injected `fetch` or a WeChat request wrapper.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test apps/miniprogram/tests/home-page.spec.ts`
Expected: PASS

### Task 2: Bind the home page to real mini program state

**Files:**
- Modify: `apps/miniprogram/app.ts`
- Modify: `apps/miniprogram/pages/home/index.ts`
- Modify: `apps/miniprogram/pages/home/index.wxml`
- Modify: `apps/miniprogram/pages/home/index.wxss`
- Test: `apps/miniprogram/tests/smoke.spec.ts`

- [ ] **Step 1: Write the failing page-runtime test**

Add a test that expects the home page runtime to expose:
- page data derived from `buildHomePage()`
- tab switching
- arrange-sheet open/close state
- loading/error/empty-state fields needed by the real page

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test apps/miniprogram/tests/smoke.spec.ts`
Expected: FAIL because the page file is still only a model builder.

- [ ] **Step 3: Write minimal implementation**

Add a runtime bridge that maps the model layer into real WeChat page data and events, then update WXML/WXSS to render user-facing states.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test apps/miniprogram/tests/smoke.spec.ts`
Expected: PASS

### Task 3: Wire the arrange flow through the page

**Files:**
- Modify: `apps/miniprogram/components/arrange-sheet/index.ts`
- Modify: `apps/miniprogram/pages/home/index.ts`
- Modify: `apps/miniprogram/pages/home/index.wxml`
- Test: `apps/miniprogram/tests/arrange-flow.spec.ts`

- [ ] **Step 1: Write the failing interaction test**

Extend the arrange-flow test to cover:
- draft submission from the page runtime
- clarification answer handling
- schedule confirmation state
- reminder generation summary
- page refresh after confirmation

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test apps/miniprogram/tests/arrange-flow.spec.ts`
Expected: FAIL because the page runtime is not yet driving the state machine.

- [ ] **Step 3: Write minimal implementation**

Connect the home page actions to `createArrangeFlow()`, reflect each stage in page state, and surface user-facing loading/error text.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test apps/miniprogram/tests/arrange-flow.spec.ts`
Expected: PASS

### Task 4: Document and verify the local mini program workflow

**Files:**
- Modify: `README.md`
- Modify: `docs/handoff.md`
- Modify: `docs/todo.md`

- [ ] **Step 1: Verify the end-to-end local checklist**

Confirm the concrete steps needed to:
- start the API
- point the mini program at the correct base URL
- open the project in WeChat DevTools

- [ ] **Step 2: Write the minimal documentation**

Document the local mini program debug workflow, including where to change the API origin and what the user should expect from the core flow.

- [ ] **Step 3: Run final verification**

Run:
- `node --experimental-strip-types --test apps/miniprogram/tests/home-page.spec.ts apps/miniprogram/tests/arrange-flow.spec.ts apps/miniprogram/tests/smoke.spec.ts`
- `node --experimental-strip-types --test apps/api/test/smoke.e2e-spec.ts apps/admin/tests/smoke.spec.ts apps/miniprogram/tests/smoke.spec.ts`
Expected: PASS
