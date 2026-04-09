# Session Handoff

Last updated: 2026-04-09

## Goal

Keep moving from shell prototypes toward runnable product surfaces, with `apps/admin` already usable locally and `apps/miniprogram` now focused on a real WeChat DevTools runtime plus a calendar-style home screen.

## Current State

- `apps/admin` remains in the completed state from the prior handoff and still passes its lightweight checks.
- `apps/api` starts locally and was used during this session for manual WeChat DevTools verification.
- `apps/miniprogram` is no longer just a model shell:
  - it now has real `App` / `Page` runtime registration
  - it has a WeChat-compatible request transport path
  - it has runtime API-base-url override support through WeChat storage
  - it includes JS runtime entry files so WeChat DevTools can actually load the project
- The mini program home page has been reworked from a task-card list into a calendar-workspace layout with:
  - a time-axis schedule view
  - multi-day horizontal scrolling
  - past-day columns rendered in a muted style
  - a 3/4-height LUI-style planner sheet
- The arrange flow still works through the existing intake -> clarification -> schedule -> confirm path in tests.

## Done In This Session

- Added WeChat DevTools-loadable JS entry files under `apps/miniprogram/` for app, home page, runtime, services, and supporting components.
- Updated `apps/miniprogram/services/api.ts` to remove the transport-path dependency on the global `Response` constructor.
- Added/expanded tests for:
  - runtime config override through WeChat storage
  - WeChat transport behavior without `fetch` or `Response`
  - real WXML runtime bindings
  - DevTools runtime JS entry existence
  - minute-level timeline viewport rules
  - 9-hour fixed viewport duration
  - current-day-focused multi-day timeline data
- Reworked `apps/miniprogram/pages/home/index.ts` to generate `timelineView` data:
  - active date detection
  - minute-based task block placement
  - fixed 9-hour viewport
  - multi-day columns with past-day metadata
- Reworked `apps/miniprogram/pages/home/index.wxml` / `index.wxss` toward the requested product direction:
  - calendar-workspace shell
  - bottom blue `+ 安排任务` CTA
  - 3/4-height planner sheet
  - horizontally scrollable day columns
- Updated `apps/miniprogram/app.json` so the navigation title is `Time Sheet`.

## Manual Verification Status

- WeChat DevTools can now import and load `apps/miniprogram`; the earlier “missing `pages/home/index.js`” failure is resolved.
- Manual screenshots confirmed that:
  - the calendar interaction direction is now broadly correct
  - the task blocks are rendered within single-day columns instead of spanning all visible days
  - past dates can be shown on the left with muted styling
- Manual screenshots also confirmed one unresolved UX/runtime issue:
  - after refresh / initial load, the first visible day column is still not reliably forced to the current day
  - the user expectation is stricter: first paint should match the target mock where the left-most visible schedule column is the current day

## Verified Commands

The following command passed at the end of the session:

```bash
node --experimental-strip-types --test apps/miniprogram/tests/runtime-config.spec.ts apps/miniprogram/tests/home-page.spec.ts apps/miniprogram/tests/home-runtime.spec.ts apps/miniprogram/tests/arrange-flow.spec.ts apps/miniprogram/tests/smoke.spec.ts
```

## Important Files

- `apps/miniprogram/app.json`
- `apps/miniprogram/app.ts`
- `apps/miniprogram/app.js`
- `apps/miniprogram/config/runtime.ts`
- `apps/miniprogram/config/runtime.js`
- `apps/miniprogram/services/api.ts`
- `apps/miniprogram/services/api.js`
- `apps/miniprogram/services/wechat-request.ts`
- `apps/miniprogram/services/wechat-request.js`
- `apps/miniprogram/pages/home/index.ts`
- `apps/miniprogram/pages/home/index.js`
- `apps/miniprogram/pages/home/index.wxml`
- `apps/miniprogram/pages/home/index.wxss`
- `apps/miniprogram/pages/home/runtime.ts`
- `apps/miniprogram/pages/home/runtime.js`
- `apps/miniprogram/tests/runtime-config.spec.ts`
- `apps/miniprogram/tests/home-page.spec.ts`
- `apps/miniprogram/tests/home-runtime.spec.ts`
- `apps/miniprogram/tests/arrange-flow.spec.ts`
- `apps/miniprogram/tests/smoke.spec.ts`
- `docs/todo.md`

## Risks And Notes

- The main unresolved issue is no longer “DevTools cannot run the project”; it is specifically the first-paint horizontal positioning of the multi-day timeline.
- Current implementation tries to push the initial horizontal position toward the active day via page data / scroll state, but this has not matched the desired first-paint behavior in WeChat DevTools screenshots.
- The next session should not restart from generic runtime bridging work; that part is substantially complete.
- The next session should work from real screenshots and focus narrowly on initial viewport positioning and remaining visual fidelity gaps.
- Root `pnpm` workflow is still not the path being used for this mini program iteration.

## Next Recommended Step

Focus only on the initial timeline viewport behavior in WeChat DevTools.

Suggested order:

1. Reproduce the current first-paint misalignment in DevTools.
2. Decide whether the fix should be:
   - data/layout level: render the current day as the first visible logical column
   - runtime level: force post-render horizontal scroll more aggressively
3. Prefer the simpler approach that guarantees “current day is first visible column” on first paint.
4. Re-run the existing miniprogram test suite after the fix.
5. Verify with a fresh DevTools screenshot before touching any other UI polish.

## Resume Instruction

If a future session receives a handoff/resume-style message, read this file first, then `docs/todo.md`, then continue from the mini program home-screen first-paint issue. Do not reopen admin work. Do not redo runtime bridge work unless new evidence shows it is broken.
