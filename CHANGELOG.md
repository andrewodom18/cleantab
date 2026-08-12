# Changelog

## Unreleased

- Redesigned the popup around a single link-cleaning action and two compact tab-suspension actions.
- Redesigned Settings as a responsive full-tab experience instead of a cramped Chrome details dialog.
- Added a contextual Save bar that appears only when settings change.
- Reduced permanent permission and reset controls while preserving clear status and access removal.

## 1.0.1 — 2026-08-11

- Simplified page, link, and selection cleaning into one adaptive context-menu action.
- Reused the nearest existing tab when suspending the active tab to avoid unnecessary blank tabs.
- Removed unnecessary module preload hints that Chrome reported as extension warnings.
- Simplified the popup wording and moved optional exceptions and custom rules into one advanced section.
- Replaced ambiguous checkbox styling with accessible on/off switches.
- Kept every popup action visible without requiring a scrollbar.

## 1.0.0 — 2026-08-07

- Added conservative URL tracking-parameter removal with previews, custom rules, and domain exclusions.
- Added page, link, and selection context-menu cleaning.
- Added opt-in automatic cleaning for copied URLs.
- Added native manual and automatic tab suspension with conservative safety exclusions.
- Added opt-in unsaved-form detection, local settings, session-only activity state, and permission revocation handling.
- Added accessible popup, settings, preview, themes, tests, package auditing, and Chrome release packaging.
