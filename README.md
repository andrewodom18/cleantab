# CleanTab

CleanTab is a privacy-first browser extension that removes tracking parameters from URLs and suspends inactive tabs to reduce clutter and resource usage.

## Product vision

Give users simple, local browser controls without collecting browsing history or sending URLs to a remote service.

## URL Cleaner

- Remove common tracking parameters such as campaign identifiers.
- Clean URLs when copied.
- Clean URLs when opened.
- Add a manual “Clean URL” context-menu action.
- Show a before-and-after preview.
- Maintain customizable allowlists and per-site rules.
- Preserve parameters required for login, search, checkout, or referral functionality.
- Display which parameters were removed.

## Tab Suspender

- Suspend inactive tabs after a configurable period.
- Exclude pinned tabs.
- Exclude tabs playing audio.
- Exclude tabs with unsaved form data.
- Exclude specific domains.
- Exclude active downloads.
- Add “Suspend this tab” and “Suspend all other tabs.”
- Restore the original tab when clicked.
- Group suspended tabs by browser window.
- Show estimated memory savings when available.

## MVP

1. Local-only settings.
2. URL cleaning on copy.
3. Manual tab suspension.
4. Automatic suspension timer.
5. Domain allowlist and blocklist.
6. Options page.
7. Dark and light themes.
8. Chrome-compatible release, followed by Firefox compatibility.

## Privacy principles

- No URL collection.
- No analytics by default.
- No external API requirement.
- All URL rules are processed locally.
- Request the minimum browser permissions needed.
- Explain every permission in the settings interface.

## Technical direction

Use the cross-browser WebExtensions model with a small background service, an options page, and local extension storage. Keep URL rules in a versioned local ruleset so they can be tested independently from the browser UI.

Tab suspension must have a graceful fallback because browsers expose different levels of tab-discard support:

1. Use the browser’s native discard mechanism when supported.
2. Otherwise replace the page with a local suspended-tab page.
3. Restore the original URL only when the user requests it.

## Future features

- Sync settings between browsers.
- Tab sleeping based on memory pressure.
- Tab groups with saved sessions.
- Automatic URL cleaning for shared links.
- Temporary tab expiration.
- Reading-later mode.
- Tab usage statistics.
- Import and export of custom URL rules.

## Planned build order

1. URL parsing and cleaning rules.
2. Unit tests for safe parameter removal.
3. Copy interception and manual clean action.
4. Settings and allowlists.
5. Manual tab suspension.
6. Automatic suspension rules.
7. Restore flow and exclusions.
8. Cross-browser testing and packaging.

