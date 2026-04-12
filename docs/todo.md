# Current Todo

Last updated: 2026-04-11

## Now

- Manually verify the mini program `排期` page in WeChat DevTools, especially `日 / 周 / 月 / 年` switching, bidirectional scrolling, and narrow-screen density.

## Next

1. Keep the current runtime environment up:
   - `apps/api` listening on `127.0.0.1:3000` in DB-backed mode
   - `apps/admin` listening on `127.0.0.1:4173` if config inspection is still needed
2. On the backend/frontend boundary, consume the landed real data bridge:
   - confirm mini program home/task-board/planning now reads `GET /tasks`
   - confirm task detail now reads `GET /tasks/:id`
   - extend backend read model only if manual verification exposes missing fields
3. In WeChat DevTools, manually verify:
   - opening `安排任务` shows the centered empty-state sentence instead of a fake first card
   - sending the first message removes the empty-state sentence immediately
   - bottom sheet open/close motion now feels natural enough in the real mini program
   - low-value toasts like `糖蟹已回复` no longer appear inside the arrange sheet
   - `+ 新会话` creates a fresh conversation cleanly
   - sending text appends user and assistant messages correctly
   - `历史记录` can reopen a conversation
   - confirming a conversation refreshes the home page
   - kanban tab shows the new mini gantt and grouped cards correctly
   - planning tab defaults to `日` and only shows tasks touching the current day
   - planning tab `周 / 月 / 年` switching feels correct and readable
   - planning tab task-column gantt scrolls stably in both directions
   - task card tap opens the half-sheet detail reliably
   - task detail half-sheet content is readable and scrollable
4. If the mini program cannot reach the API, inspect runtime host configuration first; do not assume backend regression when the runtime may still be pointing at an unreachable host.
5. If trying to automate or reopen the mini program through WeChat DevTools CLI, first ensure DevTools `设置 -> 安全设置 -> 服务端口` is enabled; the current machine still blocks CLI open on that switch.
5. If assistant reply quality regresses, inspect prompt/model output first. The backend fallback-formatting bug for ISO times and english priority labels has already been fixed.

## After That

1. If manual verification exposes rough edges, continue planner-sheet and board polish:
   - sheet motion feel
   - toast severity/visibility rules
   - empty-state positioning
   - composer spacing and icon balance
   - history-list density
   - gantt density and label strategy
   - planning period chip sizing
   - planning tab task-column width and bar text truncation
   - task card priority affordance
   - detail half-sheet actions and hierarchy
2. Decide whether attachment intake should stay as the current staged fallback or also move to arrange-chat conversation mode.
3. Decide whether the mini program needs a visible developer entrypoint for overriding `apiBaseUrl`, since the runtime override exists in code but not yet in product UI.
4. If the new `/tasks` payload shape is insufficient for the current board/detail UI, extend the backend read model instead of reintroducing frontend seed logic.

## Blockers

- No known blocker remains in timeline scrolling, admin/provider connectivity, or local API persistence.
- The main open risk is now backend read-path inconsistency:
  - arrange-chat confirm does create real task/schedule records now
  - mini program runtime now refreshes from `/tasks`, but real-device validation is still pending
- The main open risk is now mini program manual runtime verification in WeChat DevTools.
- A secondary risk is runtime host configuration if `127.0.0.1:3000` is not reachable from the current mini program environment.
