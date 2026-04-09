# Current Todo

Last updated: 2026-04-09

## Now

- Finish the `apps/miniprogram` home-screen first-paint behavior so WeChat DevTools opens with the current day as the first visible schedule column.

## Next

1. Verify the current DevTools behavior from a cold refresh and confirm how the horizontal scroll starts.
2. Decide whether to solve it by:
   - rendering the active day as the first visible logical column, or
   - forcing the scroll position after first render in a more reliable way.
3. Keep the existing multi-day horizontal scroll interaction and muted past-day styling.
4. Re-check that task blocks still occupy only one day column after the viewport fix.
5. Re-run the miniprogram test suite.

## After That

1. Continue closing visual fidelity gaps between the current home screen and the target mock.
2. Re-run manual WeChat DevTools verification for:
   - home first paint
   - planner sheet
   - arrange-flow happy path
3. Revisit workspace-level tooling only after the miniprogram screen behavior is stable.

## Blockers

- The remaining blocker is not runtime loading anymore; it is the initial horizontal positioning of the timeline in WeChat DevTools.
- Root `pnpm` workflow still is not the active path for this mini program work.
