# Current Todo

Last updated: 2026-04-10

## Now

- Finish the first real mini program verification pass for the AI-backed `安排任务` arrange-chat flow now that API/admin/provider integration is already working.

## Next

1. Keep the current runtime environment up:
   - `apps/api` listening on `127.0.0.1:3000` in DB-backed mode
   - `apps/admin` listening on `127.0.0.1:4173` if config inspection is still needed
2. In WeChat DevTools, manually verify:
   - opening `安排任务` creates a conversation
   - sending text appends user and assistant messages
   - `历史记录` can reopen a conversation
   - confirming a conversation refreshes the home page
3. If the mini program cannot reach the API, inspect runtime host configuration first; do not assume backend regression when the runtime may still be pointing at an unreachable host.
4. If the real model output shape regresses, tighten the prompt before touching UI polish.

## After That

1. Resume planner-sheet visual fidelity work:
   - header spacing
   - tab emphasis
   - composer sizing
   - history-list density
2. Decide whether attachment intake should stay as the current staged fallback or also move to arrange-chat conversation mode.
3. Decide whether the mini program needs a visible developer entrypoint for overriding `apiBaseUrl`, since the runtime override exists in code but not yet in product UI.

## Blockers

- No known blocker remains in timeline scrolling, admin/provider connectivity, or local API persistence.
- The main open risk is mini program manual runtime verification in WeChat DevTools.
- A secondary risk is runtime host configuration if `127.0.0.1:3000` is not reachable from the current mini program environment.
