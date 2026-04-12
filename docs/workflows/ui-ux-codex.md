# Codex UI/UX Workflow

This repository uses four UI/UX skills as a local Codex workflow:

- `ui-ux-workflow`
- `frontend-design`
- `ui-ux-pro-max`
- `frontend-design-review`
- `figma-create-design-system-rules`

`ui-ux-workflow` is the top-level orchestrator. The other four skills are the execution layers it routes into.

## Trigger Matrix

Use `frontend-design` for:

- New admin pages or major admin screen refactors
- New mini program flows or large visual upgrades
- Requests to improve, polish, redesign, or beautify a UI

Use `ui-ux-pro-max` in addition to `frontend-design` for:

- Net-new screens where the visual direction is still vague
- Marketing-like, high-polish, or "make it memorable" requests
- Cases where you need product-type, typography, palette, landing, or UX recommendations before coding

Use `frontend-design-review` for:

- Final UI review before closing a task
- Accessibility checks
- Design-system and visual consistency checks
- Responsive and interaction audits

Use `figma-create-design-system-rules` for:

- Figma-to-code conventions
- Shared component or token rules
- Design-system guidance that should be encoded at the repo level

## Required Sequence

### 1. Understand the existing surface

- For admin work, inspect `apps/admin/src/ui`, `apps/admin/src/pages`, and `apps/admin/src/ui/styles.css`.
- For mini program work, inspect the relevant `.ts`, `.wxml`, and `.wxss` files in `apps/miniprogram/pages` or `apps/miniprogram/components`.

### 2. Choose a design direction before coding

- Invoke `frontend-design` for any substantial UI task.
- When the direction is unclear or the quality bar is high, invoke `ui-ux-pro-max` and establish:
  - product type
  - industry/context
  - style keywords
  - target stack

Recommended `ui-ux-pro-max` usage:

```bash
python3 .codex/skills/ui-ux-pro-max/scripts/search.py "<product> <industry> <keywords>" --design-system -p "TangXie"
```

If the repository does not have a local `.codex` copy, use the global installation instead:

```bash
python3 ~/.codex/skills/ui-ux-pro-max/scripts/search.py "<product> <industry> <keywords>" --design-system -p "TangXie"
```

Optional deeper searches:

```bash
python3 .codex/skills/ui-ux-pro-max/scripts/search.py "<keyword>" --domain ux
python3 .codex/skills/ui-ux-pro-max/scripts/search.py "<keyword>" --domain typography
python3 .codex/skills/ui-ux-pro-max/scripts/search.py "<keyword>" --stack react
```

Use `--stack react` for `apps/admin`. Use `--domain ux` or general design-system recommendations for mini program work and then translate the guidance into WeChat-native layouts and interactions.

### 3. Implement against repo conventions

- `apps/admin`
  - Reuse `src/ui` primitives first.
  - Extend `styles.css` before creating parallel styling patterns.
  - Preserve the current warm-paper, amber, dark-ink brand language unless the task explicitly changes brand direction.

- `apps/miniprogram`
  - Keep spacing and sizing in `rpx`.
  - Prefer high-clarity information hierarchy and restrained motion.
  - Avoid desktop-style density and overly ornamental effects.

### 4. Encode durable design rules when needed

If the task changes shared design language, tokens, Figma translation rules, or component placement rules:

1. Invoke `figma-create-design-system-rules`
2. Generate repo-specific rules
3. Append or update the relevant sections in `AGENTS.md`
4. If the rules need a longer explanation, document them alongside the task in `docs/`

### 5. Review before closing

Invoke `frontend-design-review` for every UI task before claiming completion.

Minimum bar:

- Primary task is obvious and low-friction
- Visual direction is intentional, not generic
- Existing design language is respected or intentionally replaced
- Accessibility and focus states are not regressed
- Hardcoded one-off styling decisions are justified

Use the checklist in [ui-ux-review-checklist.md](ui-ux-review-checklist.md).

### 6. Verify locally

- Admin UI:
  - `cd apps/admin && npm test`
  - Run the local Vite app when the visual shell changes materially

- Mini program UI:
  - Run the relevant `apps/miniprogram/tests/*.spec.ts`
  - Note whether WeChat DevTools verification was completed

- Shared UI-impacting changes:
  - `pnpm run smoke`

## Repo Intent

This workflow is meant to raise the floor and the ceiling:

- `frontend-design` prevents generic UI work
- `ui-ux-pro-max` supplies stronger visual and UX reasoning when needed
- `frontend-design-review` forces a closing quality gate
- `figma-create-design-system-rules` turns one-off design decisions into reusable repo rules

## Copyable Prompts

```text
Use $ui-ux-workflow to redesign the admin models page with a stronger visual hierarchy but keep the existing brand language.
```

```text
Use $ui-ux-workflow to review the current mini program home page for design quality, friction, and accessibility.
```

```text
Use $ui-ux-workflow to create repo-level design system rules for our Figma-to-code workflow.
```
