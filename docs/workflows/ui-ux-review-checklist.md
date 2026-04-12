# UI/UX Review Checklist

Use this checklist with `frontend-design-review` before closing any UI task.

## Task Clarity

- [ ] The primary user task is obvious within one glance
- [ ] The screen has one clear primary action and limited competing actions
- [ ] Empty, loading, and error states still leave the user oriented

## Visual Quality

- [ ] The result has a clear visual direction instead of generic AI styling
- [ ] Typography choices fit the product and are consistent across the screen
- [ ] Color, spacing, and motion feel intentional rather than ad hoc
- [ ] New UI matches the surrounding product language unless the task is a deliberate redesign

## Design-System Discipline

- [ ] Existing layout/component primitives were reused before creating new patterns
- [ ] Shared styling lives in the right place for the surface
- [ ] One-off hardcoded values are avoided or explicitly justified
- [ ] Any lasting design rule change is reflected in `AGENTS.md` or adjacent docs

## Accessibility And Interaction

- [ ] Focus states, keyboard paths, and readable contrast are preserved for admin web UI
- [ ] Touch targets, readability, and motion restraint are preserved for mini program UI
- [ ] The interaction flow is understandable without hidden steps or dead ends

## Surface-Specific Checks

### Admin

- [ ] Changes fit the `apps/admin/src/ui` + `styles.css` structure
- [ ] Desktop layout remains usable at practical viewport widths

### Mini Program

- [ ] Changes respect `rpx` spacing and mobile-first hierarchy
- [ ] The result still feels native to WeChat rather than like a squeezed desktop page

## Verification

- [ ] Relevant tests were run
- [ ] Any visual/manual verification still pending is stated explicitly
