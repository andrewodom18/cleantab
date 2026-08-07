# Chrome Web Store Permission Justifications

- **storage:** Save user configuration and session-only tab safety state.
- **tabs:** Read tab URL/state for current-page cleaning, domain exclusions, and native discard operations.
- **alarms:** Evaluate user-enabled automatic suspension on a local one-minute interval.
- **contextMenus:** Let users explicitly clean a page, link, or selected URL.
- **scripting (optional):** Run the local copy-cleaning and dirty-form detector only after automation is enabled.
- **HTTP and HTTPS origins (optional):** Allow the optional automation to operate on ordinary web pages. No page data is transmitted.

No broader permission can be substituted without removing documented functionality. Host access and scripting are optional because all manual features can operate without persistent page access.
