# 糖蟹 Repo Rules

These rules apply to Codex work in this repository and are intentionally narrow: they govern UI/UX work for `apps/admin` and `apps/miniprogram`.

## UI/UX Skill Routing

Use the following skills for any request that builds, redesigns, beautifies, reviews, or audits UI:

- `ui-ux-workflow` is the default top-level skill. Start there, then follow its routing into the specialized design skills below.
- `frontend-design` is required for new pages, major visual refactors, or requests to "make the UI better", "redesign", "polish", or "beautify".
- `ui-ux-pro-max` is required in addition to `frontend-design` when the task needs a stronger visual point of view, a fresh design direction, or product-level UI/UX recommendations before implementation.
- `frontend-design-review` is required before claiming a UI task is complete. Use it for final review, accessibility review, design-system compliance, and responsive checks.
- `figma-create-design-system-rules` is required when the task introduces or changes Figma-to-code conventions, design tokens, shared component rules, or asks for project design-system guidance.

If a task includes both implementation and review, use the implementation skill first, then `frontend-design-review` before closing the task.

## Mandatory Workflow For UI Tasks

For files under `apps/admin/src/**`, `apps/miniprogram/pages/**`, `apps/miniprogram/components/**`, and their related styles/tests:

1. Read the existing UI files and preserve established product language before proposing a new direction.
2. For net-new UI or major redesigns, invoke `frontend-design` before implementation.
3. If the design direction is not obvious, the request demands a higher-end result, or the work spans a whole screen or flow, invoke `ui-ux-pro-max` and use it to choose an explicit visual direction before coding.
4. If the task touches shared patterns, tokens, or Figma translation rules, invoke `figma-create-design-system-rules` and update this file or the linked workflow docs with the resulting conventions.
5. Before completion, invoke `frontend-design-review` and fix blocking or major issues it surfaces.
6. Run the relevant local verification for the surface you changed before closing the task.

Do not skip step 5 for UI work.

## Project-Specific UI Conventions

### `apps/admin`

- Stack: React 19 + Vite + TypeScript with app UI under `apps/admin/src/ui` and page shells under `apps/admin/src/pages`.
- Keep the current warm-paper / dark-ink visual language unless the user explicitly asks for a broader redesign.
- Prefer extending existing layout primitives such as [`apps/admin/src/ui/layout.tsx`](apps/admin/src/ui/layout.tsx) and styling in [`apps/admin/src/ui/styles.css`](apps/admin/src/ui/styles.css) instead of introducing parallel styling systems.
- Preserve keyboard accessibility, visible focus states, and practical desktop responsiveness.

### `apps/miniprogram`

- Stack: WeChat mini program with page styles in `.wxss`, markup in `.wxml`, and runtime logic in `.ts`.
- Respect mobile-first interaction, large touch targets, and `rpx`-based spacing.
- Prefer evolving existing visual patterns on the home/task flows instead of importing desktop-heavy UI motifs.
- Keep motion restrained and performant for the mini program runtime.

## Local Verification Expectations

- Admin UI changes: run the relevant `apps/admin` tests and, when the change affects the rendered shell, verify the screen in the local admin runtime.
- Mini program UI changes: run the relevant `apps/miniprogram` tests and describe any DevTools verification still pending.
- Cross-surface UI work: run `pnpm run smoke` from the repo root when practical.

## Reference

- Workflow details: [docs/workflows/ui-ux-codex.md](docs/workflows/ui-ux-codex.md)
- Review checklist: [docs/workflows/ui-ux-review-checklist.md](docs/workflows/ui-ux-review-checklist.md)
