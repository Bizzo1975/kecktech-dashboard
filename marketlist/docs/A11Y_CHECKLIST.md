# Accessibility checklist (Marketlist web)

Manual accept on Chromium + VoiceOver/NVDA after each major UX change. Automated axe pass covers primary routes (`npm run a11y -w @marketlist/web`).

## Screen reader

- [ ] Landmarks: page has one main region; nav labels are unique
- [ ] Headings: each screen starts with an `h1`; section titles use `h2`/`h3` in order
- [ ] Live regions: toasts/status use `role="status"` (or `alert` for hard errors)
- [ ] Images/icons: decorative icons are aria-hidden; actionable controls have accessible names
- [ ] Forms: every input has a visible `<label>` or `aria-label`
- [ ] Dialogs: edit sheets use `role="dialog"`, `aria-modal="true"`, labelled title

## Keyboard

- [ ] Tab order follows visual order; no keyboard traps in modals
- [ ] Focus visible on all interactive controls (see `:focus-visible` in `globals.css`)
- [ ] Escape closes open modals/sheets
- [ ] Buttons/links reach Activate with Enter/Space
- [ ] Filters and checkboxes (My items, preferences) are reachable and toggleable from keyboard

## Reduced motion

- [ ] `prefers-reduced-motion: reduce` disables decorative animation/transition durations (`globals.css`)
- [ ] Mobile Moti / Reanimated affordances fall back to static controls when Reduce Motion is on

## Contrast & touch

- [ ] Text vs background meets WCAG AA for body and UI chrome in light and dark themes
- [ ] Hit targets are at least ~44×44 CSS px for primary actions

## Primary routes to re-check

1. `/` marketing
2. `/login` / `/register`
3. `/app` home
4. `/app/lists` + list detail
5. `/app/pantry`
6. `/app/recipes`
7. `/app/settings`
8. `/app/insights`
