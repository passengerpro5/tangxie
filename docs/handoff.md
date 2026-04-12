# Session Handoff

Last updated: 2026-04-11

## Goal

Move `apps/miniprogram` `安排任务` from the previous staged prototype flow into a real AI-backed multi-turn arrange-chat flow, while keeping the calendar home usable and exposing AI provider/model/prompt configuration through `apps/admin`.

## Current State

- `apps/api` is now DB-backed in local development:
  - local Postgres starts through the existing `db:local:*` scripts
  - API should be started with `scripts/with-local-db.mjs` so admin AI config persists
  - Prisma schema now includes `AIScene.arrange_chat`
- `apps/admin` is working for real integration:
  - provider/model/prompt/log pages still exist
  - provider test against AiHubMix now succeeds with a valid key
  - provider/model/prompt configuration survives refresh and API restart when DB-backed API is running
- `apps/api` AI integration is now on AI SDK internally while preserving the existing admin configuration model:
  - provider type stays `openai_compatible`
  - provider calls still use `baseUrl` / `apiKey` / `defaultModel`
  - `arrange_chat` prefers structured output and falls back to text
- `apps/miniprogram` still runs as a real WeChat DevTools project with:
  - real `App` / `Page` runtime registration
  - WeChat-compatible request transport
  - runtime API-base-url override support via storage/global runtime config
  - JS runtime mirror files kept in sync with the TS source files
- The calendar home screen is still not the blocker:
  - first paint lands on the active/current day
  - past-day columns remain available on the left
  - horizontal and vertical timeline scrolling remain stable
  - the vertical axis still covers the full day (`00:00` to `24:00`)
- `安排任务` now has two runtime modes:
  - legacy staged flow remains compatible for old tests and fallback behavior
  - preferred mode is AI-backed arrange chat using `/arrange/conversations*`
- `任务看板` has now been substantially upgraded on the mini program frontend:
  - no longer just status-based lightweight chips
  - now renders a mini gantt summary at the top of the kanban tab
  - now renders grouped task cards with category headings and weak separators
  - task cards now expose title / summary / deadline / duration / priority
  - tapping a task now opens a bottom half-sheet task detail panel with execution plan and suggestions
- `排期` tab now exists on the mini program home screen as a separate surface from `日程`:
  - `日程` remains the original time-axis page and should not be repurposed
  - `排期` is now a dedicated gantt-style page
  - current `排期` model is task-column-first:
    - horizontal axis = tasks
    - vertical axis = time/range slots
    - period switch = `日 / 周 / 月 / 年`
    - default = `日`, scoped to tasks that touch the active/current day
- The data source is still mixed:
  - `arrange_chat` confirm materializes real `Task + ScheduleBlock` records on the backend
  - mini program home/task-board/planning now hydrate from backend `GET /tasks`
  - task detail now refreshes from backend `GET /tasks/:id`
  - the remaining gap is mainly manual runtime verification in WeChat DevTools, not the read-path switch itself

## Done In This Session

- Added backend arrange-chat support in `apps/api`:
  - new `/arrange/conversations`
  - new `/arrange/conversations/:id`
  - new `/arrange/conversations/:id/messages`
  - new `/arrange/conversations/:id/confirm`
- Added arrange-chat persistence abstractions:
  - `apps/api/src/persistence/arrange-conversations-repository.ts`
  - `apps/api/src/persistence/prisma-arrange-conversations-repository.ts`
- Added arrange-chat service/controller:
  - `apps/api/src/modules/arrange-chat/arrange-chat.service.ts`
  - `apps/api/src/modules/arrange-chat/arrange-chat.controller.ts`
- Extended AI config scene support to include `arrange_chat`:
  - `apps/api/src/modules/ai-gateway/provider-client.ts`
  - `apps/admin/src/lib/api-client.ts`
  - `apps/admin/src/ui/admin-shell-app.tsx`
- Extended Prisma schema to include:
  - `ArrangeConversationStatus`
  - `ArrangeConversation`
  - `ArrangeConversationMessage`
- Reworked mini program arrange runtime to support:
  - creating a fresh conversation when opening the sheet
  - listing conversation history for the `历史记录` tab
  - reopening old conversations
  - sending user messages through arrange-chat endpoints
  - rendering chat messages into `threadItems`
  - confirming conversation-generated blocks and refreshing the home page
- Kept the old staged arrange flow intact for compatibility:
  - `submitAttachment()`
  - `clarification`
  - existing `arrange-flow` tests
- Extended admin console behavior to support prompt editing:
  - API client `PATCH /admin/ai/prompts/:id`
  - runtime `updatePromptTemplate`
  - prompts page defaults to editing the current template when one exists
- Migrated provider calls to AI SDK internally while keeping the external admin config contract unchanged.
- Fixed DB-backed persistence for admin AI config in local development:
  - confirmed local Postgres workflow
  - pushed Prisma schema successfully
  - verified provider/model/prompt survive API restart
- Tightened `arrange_chat` structured output behavior:
  - top-level structured output schema now satisfies provider requirements
  - task/block item schemas use explicit required fields
  - invalid structured items are filtered instead of being persisted as empty objects
  - current date/time/timezone context is injected so relative times resolve against `Asia/Shanghai`
- Completed a real AiHubMix integration pass:
  - provider test succeeds with a real key
  - real `/arrange/conversations/:id/messages` call succeeds
  - returned snapshot now contains concrete tasks and non-historical proposed block times
- Kept mini program runtime `apiBaseUrl` override support in code/storage, but removed the visible in-sheet API editor from the UI.
- Further refined `apps/miniprogram` arrange sheet UX:
  - added a manual `+ 新会话` entry on the `安排任务` tab
  - moved the composer send button inside the input shell and changed it to a Codex-like round icon button
  - removed the large `开始规划` hero card and replaced it with a centered empty-state sentence
  - removed the sheet close `×`; closing now relies on tapping the mask or dragging down the handle
  - removed left/right/bottom sheet gaps so the sheet is edge-aligned
  - tuned the bottom `安排任务` CTA size after UI feedback
  - added sheet open/close motion so it no longer hard-cuts in/out
  - reduced the motion amplitude after feedback that the bounce felt too hard
- Tightened mini program feedback/toast behavior:
  - top persistent notice/error banners were removed from the page
  - feedback now uses centered toasts with a 3 second timeout
  - low-value in-conversation success toasts were removed (`糖蟹已回复`, `已进入追问`, `补充信息已提交`, `已切换到新会话`)
  - notification boundary is now:
    - keep errors/blockers
    - keep attachment-import success
    - suppress chat-flow self-explanatory success messages inside the arrange sheet
- Improved backend fallback assistant reply formatting in `apps/api`:
  - fallback-expanded replies no longer expose raw ISO timestamps to users
  - english priorities like `high` / `medium` are mapped into readable Chinese labels
  - added arrange-chat API regression coverage for readable fallback formatting
- Fixed a mini program page-state timing issue:
  - async page actions now sync runtime state to the page immediately after the action starts, not only after it finishes
  - this avoids “tap arrange, then wait for request, then sheet suddenly appears” behavior
- Hardened mini program arrange-sheet interaction guards:
  - blank draft submit is ignored
  - blank clarification submit is ignored
  - duplicate confirm taps while arrange-chat confirmation is in flight are ignored
  - corresponding disabled states were added to the composer UI
- Reworked mini program `任务看板` from a placeholder state-column list into a real product surface:
  - `apps/miniprogram/components/kanban-view/*` now builds grouped board data plus a mini gantt summary
  - `apps/miniprogram/pages/home/index.*` now renders:
    - top mini gantt
    - grouped task cards
    - per-card metadata including summary / deadline / duration / priority
  - task detail is now shown as a bottom half-sheet in `home`, not as a route jump
  - task detail content is assembled via `createTaskDetailPage(...)` and now includes:
    - summary
    - category
    - execution plan
    - suggestions
- Extended default/frontend-seeded task data so the new board and detail surfaces have real content:
  - category ids/titles
  - summary
  - relative deadline labels (`今天` / `明天` / `4.x` / `明年`)
  - execution plan rows
  - suggestions
  - schedule segments for gantt display
- Added and passed new regression coverage for the board/detail upgrade:
  - board view-model structure
  - task detail model structure
  - task detail open/close runtime state
  - template structure for task board / task detail half-sheet
  - style assertions for new board/detail classes
- Closed the first backend data-bridge gap in `apps/api`:
  - `ArrangeChatService.confirmConversation(...)` now creates real `Task` records
  - the same confirm flow now creates real confirmed `ScheduleBlock` records
  - confirmed conversation snapshots now rewrite proposed blocks with persisted task ids / block ids
- Extended `tasks` API surfaces:
  - added `GET /tasks`
  - added `GET /tasks/:id`
  - both endpoints now expose confirmed schedule blocks grouped by task
- Added regression coverage for the real data bridge:
  - arrange-chat confirm now proves `/tasks` and `/tasks/:id` can read back persisted records
  - Prisma integration coverage now proves arrange-chat confirmations persist `Task + ScheduleBlock` across app handler instances
- Reworked the mini program home tabs again after a regression was reported:
  - fixed a bad intermediate state where `日程` was accidentally replaced by a list-style page
  - restored `日程` to the original timeline/time-axis view
  - kept `任务看板` as the grouped-card + mini-gantt surface
  - moved the new planning work into `排期` only
- Added a first dedicated `排期` gantt implementation on the mini program frontend:
  - `apps/miniprogram/pages/home/index.*` now exposes `planningView`
  - period switching is now handled by `switchHomePlanningPeriod(...)`
  - `排期` template now renders:
    - period chips (`日 / 周 / 月 / 年`)
    - task columns
    - vertical range slots
    - gantt bars per task column
- Added and passed new regression coverage for the planning tab:
  - `home-page` now verifies period switching and task-column-first planning data
  - `smoke` now verifies planning template bindings and styles
  - `home-runtime` remains green after the new planning tab event wiring
- Switched mini program task read paths to backend read models:
  - `apps/miniprogram/services/api.*` now exposes `GET /tasks` and `GET /tasks/:id`
  - `apps/miniprogram/pages/home/runtime.*` now:
    - loads backend tasks on page boot/runtime hydration
    - reloads backend tasks after arrange-chat confirm
    - fetches fresh task detail from `/tasks/:id` when opening the half-sheet
  - homepage board/planning views are now rebuilt from backend task payloads instead of relying on seeded refresh-only data
- Removed the mini-gantt summary block from the mini program `任务看板` tab:
  - the board now starts directly with grouped task cards
  - related template/style/assertion coverage was updated and stays green

## Manual Verification Status

- Automated coverage is green across `api`, `admin`, and `miniprogram`.
- Local environment blockers that previously stopped integration are resolved:
  - `apps/admin` dev server availability was verified
  - API CORS now applies to business responses and dynamically echoes request origin
  - admin AI config now persists through DB-backed API startup
- Live AiHubMix verification is now real, not just mocked:
  - provider test succeeds against upstream
  - real arrange-chat message flow succeeds through the provider
- No fresh WeChat DevTools screenshot was captured in this session after the arrange-chat runtime switch and backend/provider fixes.
- The remaining manual verification gap is the actual mini program run in WeChat DevTools:
  - open sheet creates conversation
  - send message appends user and assistant turns
  - `历史记录` reopens existing conversation
  - confirm flow refreshes the home page
  - `排期` tab still needs real-device verification for the new task-column gantt model
- No manual WeChat DevTools validation was completed in this session after the latest UI pass.
- The newest UI changes specifically still need real-device/DevTools verification for:
  - the new centered empty-state text in blank conversations
  - the `+ 新会话` placement and behavior
  - the in-input round send button styling
  - centered toast interruption level and 3-second timeout
  - sheet motion feel after the latest reduction in animation amplitude
- No manual WeChat DevTools verification was completed for the latest backend-read-path switch and task-board simplification in this session.
- The new board/planning-specific manual verification gap is:
  - grouped card spacing and weak separators in WeChat DevTools
  - card summary truncation feel
  - detail half-sheet height, scrolling, and close feel
  - tap target reliability for opening task detail
  - backend-loaded board/detail data consistency after app cold start
  - `排期` tab `日 / 周 / 月 / 年` switching, bidirectional scroll stability, and narrow-screen density
- No manual WeChat DevTools verification was completed for the new planning-tab gantt redesign in this session.
- The new planning-tab-specific manual verification gap is:
  - `日` 维度是否真的只显示当天涉及任务
  - `周 / 月 / 年` 切换后的纵轴刻度是否符合预期且文案可读
  - 任务列宽、条块高度、文本截断在 WeChat DevTools 中是否过密
  - 横向滚动与纵向滚动的手感是否稳定
  - iPhone 窄屏下是否还会出现标题/周期 chip 挤压

## Verified Commands

The following commands passed at the end of the session:

```bash
node --experimental-strip-types --test apps/api/test/arrange-chat.e2e-spec.ts apps/api/test/admin-ai.e2e-spec.ts apps/api/test/prisma-schema.spec.ts
```

```bash
node --experimental-strip-types --test apps/api/test/cors.e2e-spec.ts
```

```bash
node --experimental-strip-types --test apps/admin/tests/admin-shell.spec.ts apps/admin/tests/admin-console.spec.ts apps/admin/tests/smoke.spec.ts
```

```bash
node --experimental-strip-types --test apps/miniprogram/tests/runtime-config.spec.ts apps/miniprogram/tests/home-page.spec.ts apps/miniprogram/tests/home-runtime.spec.ts apps/miniprogram/tests/arrange-flow.spec.ts apps/miniprogram/tests/smoke.spec.ts
```

```bash
cd apps/api
node --experimental-strip-types --test test/provider-client.spec.ts test/arrange-chat.e2e-spec.ts test/cors.e2e-spec.ts test/prisma-schema.spec.ts
```

```bash
cd apps/api
node --experimental-strip-types --test test/arrange-chat.e2e-spec.ts test/provider-client.spec.ts test/cors.e2e-spec.ts
```

```bash
node --experimental-strip-types --test apps/miniprogram/tests/runtime-config.spec.ts apps/miniprogram/tests/home-page.spec.ts apps/miniprogram/tests/home-runtime.spec.ts apps/miniprogram/tests/arrange-flow.spec.ts apps/miniprogram/tests/smoke.spec.ts
```

```bash
node --experimental-strip-types --test apps/miniprogram/tests/home-page.spec.ts
```

```bash
node --experimental-strip-types --test apps/miniprogram/tests/home-runtime.spec.ts apps/miniprogram/tests/smoke.spec.ts
```

```bash
node --experimental-strip-types --test apps/miniprogram/tests/home-page.spec.ts apps/miniprogram/tests/smoke.spec.ts apps/miniprogram/tests/home-runtime.spec.ts
```

## Important Files

- `apps/api/src/app.module.ts`
- `apps/api/src/modules/arrange-chat/arrange-chat.service.ts`
- `apps/api/src/modules/arrange-chat/arrange-chat.controller.ts`
- `apps/api/src/persistence/arrange-conversations-repository.ts`
- `apps/api/src/persistence/prisma-arrange-conversations-repository.ts`
- `apps/api/prisma/schema.prisma`
- `apps/admin/src/lib/api-client.ts`
- `apps/admin/src/runtime/admin-console.ts`
- `apps/admin/src/ui/admin-shell-app.tsx`
- `apps/miniprogram/services/api.ts`
- `apps/miniprogram/services/api.js`
- `apps/miniprogram/components/arrange-sheet/index.ts`
- `apps/miniprogram/components/arrange-sheet/index.js`
- `apps/miniprogram/components/kanban-view/index.ts`
- `apps/miniprogram/components/kanban-view/index.js`
- `apps/miniprogram/pages/home/index.wxml`
- `apps/miniprogram/pages/home/index.wxss`
- `apps/miniprogram/pages/home/index.ts`
- `apps/miniprogram/pages/home/runtime.ts`
- `apps/miniprogram/pages/home/runtime.js`
- `apps/miniprogram/pages/task-detail/index.ts`
- `apps/miniprogram/pages/task-detail/index.js`
- `apps/miniprogram/tests/home-page.spec.ts`
- `apps/miniprogram/tests/home-runtime.spec.ts`
- `apps/miniprogram/tests/smoke.spec.ts`
- `apps/api/test/arrange-chat.e2e-spec.ts`
- `docs/todo.md`

## Risks And Notes

- The biggest operational risk is still JS/TS mirror drift in the mini program. If behavior looks missing in DevTools, first check whether the matching `*.js` file was updated alongside `*.ts`.
- The arrange-chat backend now strongly prefers structured output, but prompt/model quality still matters. If the active prompt/model pair degrades, conversation still works yet snapshot richness will fall back.
- The admin console now supports updating prompt templates, but the UX is still thin:
  - it edits the current prompt inline rather than offering a richer version browser
  - model/provider editing UX is still basic
- The admin console was further improved in this session:
  - provider/model/prompt forms now default toward `AiHubMix` and `arrange_chat`
  - provider test panel shows an explicit empty-state hint when no provider exists
  - controller state updates are now immutable so `useSyncExternalStore` re-renders reliably
- Real AiHubMix integration is already running locally:
  - provider test is green
  - `arrange_chat` model binding and active prompt are configured
  - real API conversation flow is green
- The main remaining risk is now mini program runtime/manual verification, especially API base URL configuration in WeChat DevTools if `127.0.0.1:3000` is not reachable from the current device/runtime.
- The planner sheet is much closer, but the latest UX decisions are still provisional until manual verification confirms the feel:
  - toast importance thresholds may still need another pass
  - the new sheet motion may still feel too hard/too soft in DevTools
  - empty-state spacing and bottom CTA size may still need one more visual adjustment
- The arrange-chat backend fallback is safer now, but prompt quality still matters; nonsensical decompositions can still originate upstream from the model/prompt pair and are no longer explained away as a frontend problem.
- The biggest architectural gap has shifted:
  - frontend task-board UX is now ahead of backend data unification
  - `arrange_chat` confirm still does not create real backend `Task + ScheduleBlock` rows
  - `tasks` still lacks a list/detail read API for the mini program
  - the current task board is therefore still seeded/refreshed from frontend state rather than a unified backend query
- The current `kanban-view` builder is intentionally frontend-oriented:
  - good enough for product/UI validation
  - but likely to be re-fed by real backend task/detail payloads later
- `task-detail` route still exists but is not the primary UX path anymore:
  - the active experience is the bottom half-sheet rendered inside `home`
  - the route file is mainly useful as a shared detail-model builder for now

## Next Recommended Step

Continue from backend data unification plus targeted DevTools verification, not from old timeline debugging.

Suggested order:

1. Keep `apps/api` running in DB-backed mode on `127.0.0.1:3000`.
2. Keep `apps/admin` running on `127.0.0.1:4173` only if you still need to inspect provider/model/prompt state.
3. On the backend, unify real task/schedule writes before more UI polish:
  - this write-path work is now landed
  - the next backend step is switching read-path consumers to `/tasks` / `/tasks/:id`
4. After that backend read-path work, open the mini program in WeChat DevTools and verify:
   - open sheet animation feels natural enough after the latest reduction in motion amplitude
   - blank conversation shows only the centered empty-state sentence and no fake hero card
   - sending a message removes the empty-state sentence immediately
   - `糖蟹已回复`-type low-value toasts no longer appear inside the arrange sheet
   - `+ 新会话` creates a fresh conversation without noisy success toasts
   - send/attachment controls look balanced in WeChat DevTools, not just in static screenshots
   - `历史记录` can reopen an old conversation
   - confirm flow refreshes the home page
   - the new task-board mini gantt renders at the right density
   - grouped card spacing and truncation feel intentional
   - tapping cards reliably opens the half-sheet
   - task detail half-sheet content is readable and scrolls correctly
   - the new `排期` tab really behaves like a gantt surface, not like the original `日程` page
   - `排期` default `日` 维度是否只呈现当天涉及任务列
   - `周 / 月 / 年` 切换是否仍然可用、可读、可滚动
5. If odd assistant text still appears, inspect the latest provider response and prompt/model quality before blaming the frontend. The fallback-formatting bug for ISO timestamps and english priority labels has already been fixed.
6. If the mini program cannot reach the API, verify the runtime `apiBaseUrl` override rather than changing backend logic first.
7. Only after the real chat loop and task board feel stable in DevTools, continue visual polish on spacing, typography, priority tagging, and detail actions.

## Resume Instruction

If a future session receives a resume/handoff message, read this file first, then `docs/todo.md`, then continue from:

1. backend task/schedule unification
2. switch mini program home/task-board/detail to the new `/tasks` read APIs
3. decide whether the new planning-tab gantt should also switch to `/tasks`-backed real data immediately or stay on temporary frontend-shaped data until the read model is richer
4. WeChat DevTools verification for the new task board, planning tab, and existing arrange sheet

Do not reopen timeline debugging or “frontend cut off long reply” debugging unless there is genuinely new evidence; the latest relevant backend formatting and reply-expansion fixes are already in place.
