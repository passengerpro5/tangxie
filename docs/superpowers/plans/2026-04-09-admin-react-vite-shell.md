# Admin React Vite Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `apps/admin` into a real React + Vite admin console that can run locally, render the existing management areas, and call the current admin API for list/create/test flows.

**Architecture:** Keep the existing admin page-model files as the content/domain layer and add a thin React app shell around them. Use Vite for the dev server, a small API hook layer for requests and mutation state, and focused UI sections for navigation, list rendering, forms, and feedback.

**Tech Stack:** React, Vite, TypeScript, Node test runner, existing admin API client

---

### Task 1: Scaffold the admin frontend runtime

**Files:**
- Create: `apps/admin/index.html`
- Create: `apps/admin/tsconfig.json`
- Create: `apps/admin/vite.config.ts`
- Modify: `apps/admin/package.json`
- Modify: `apps/admin/src/main.ts`

- [ ] **Step 1: Write the failing runtime expectation**

Add a test assertion in `apps/admin/tests/admin-shell.spec.ts` that expects the runtime entry to export a browser bootstrap function and the package scripts to expose `dev` and `build`.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test apps/admin/tests/admin-shell.spec.ts`
Expected: FAIL because the browser bootstrap and scripts do not exist yet.

- [ ] **Step 3: Write minimal implementation**

Add the Vite/React entry files and scripts without changing page behavior yet.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test apps/admin/tests/admin-shell.spec.ts`
Expected: PASS

### Task 2: Render a real admin shell in React

**Files:**
- Create: `apps/admin/src/ui/admin-shell-app.tsx`
- Create: `apps/admin/src/ui/layout.tsx`
- Create: `apps/admin/src/ui/page-panel.tsx`
- Create: `apps/admin/src/ui/styles.css`
- Modify: `apps/admin/src/App.ts`
- Modify: `apps/admin/src/main.ts`
- Test: `apps/admin/tests/admin-shell.spec.ts`

- [ ] **Step 1: Write the failing UI test**

Add a rendering-oriented shell test that verifies navigation, default page selection, and visible field labels can be produced from the React app layer.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test apps/admin/tests/admin-shell.spec.ts`
Expected: FAIL because the React rendering layer does not exist.

- [ ] **Step 3: Write minimal implementation**

Build the React shell, use the existing page models, and add product-style layout/styling.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test apps/admin/tests/admin-shell.spec.ts`
Expected: PASS

### Task 3: Add API-backed read and mutation flows

**Files:**
- Create: `apps/admin/src/ui/use-admin-console.ts`
- Create: `apps/admin/src/ui/forms/provider-form.tsx`
- Create: `apps/admin/src/ui/forms/model-form.tsx`
- Create: `apps/admin/src/ui/forms/prompt-form.tsx`
- Modify: `apps/admin/src/lib/api-client.ts`
- Modify: `apps/admin/src/ui/admin-shell-app.tsx`
- Test: `apps/admin/tests/admin-shell.spec.ts`
- Test: `apps/admin/tests/admin-integration.spec.ts`

- [ ] **Step 1: Write the failing interaction test**

Add a UI-level test with stubbed `fetch` that expects list loads, create submits, provider test actions, loading states, and error text.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test apps/admin/tests/admin-shell.spec.ts`
Expected: FAIL because the React app does not perform data loading or mutations yet.

- [ ] **Step 3: Write minimal implementation**

Implement a small console state hook that loads current page data, submits provider/model/prompt forms, and triggers provider connectivity tests against the existing API client.

- [ ] **Step 4: Run targeted tests**

Run: `node --experimental-strip-types --test apps/admin/tests/admin-shell.spec.ts apps/admin/tests/admin-integration.spec.ts`
Expected: PASS

### Task 4: Verify runnable developer workflow

**Files:**
- Modify: `README.md`
- Create: `docs/handoff.md`
- Create: `docs/todo.md`
- Test: `apps/admin/tests/smoke.spec.ts`

- [ ] **Step 1: Write the failing workflow expectation**

Add or update smoke/readme assertions so the repo documents how to start the admin app locally against the API.

- [ ] **Step 2: Run verification to expose gaps**

Run: `node --experimental-strip-types --test apps/admin/tests/smoke.spec.ts`
Expected: either FAIL on missing documented workflow or PASS while docs still need to be updated manually.

- [ ] **Step 3: Write minimal implementation**

Document the new admin startup flow, restore handoff files with the latest repo state, and keep the current next steps visible for the following sessions.

- [ ] **Step 4: Run final verification**

Run:
- `node --experimental-strip-types --test apps/admin/tests/admin-shell.spec.ts apps/admin/tests/admin-integration.spec.ts apps/admin/tests/smoke.spec.ts`
- `node --experimental-strip-types --test apps/api/test/smoke.e2e-spec.ts apps/admin/tests/smoke.spec.ts apps/miniprogram/tests/smoke.spec.ts`
Expected: PASS
