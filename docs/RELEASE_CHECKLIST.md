# CleanTab Release Checklist

Run this checklist against the final unpacked release archive in current stable Chrome.

## Every release

- Install the extracted archive through `chrome://extensions` and confirm the CleanTab icon, popup, options page, and context menus load without errors.
- Confirm a URL with `utm_source` is cleaned while `id`, query order, and the fragment remain intact.
- Confirm a page, link, and selected URL open the one-time preview and that Copy works.
- Grant optional website access from Settings, confirm automatic copy cleaning, then remove access and confirm both automatic features turn off.
- Edit a form, wait for its tab to become inactive, and confirm CleanTab does not automatically suspend it.
- Confirm system, light, and dark themes have readable text, visible focus, and usable keyboard navigation.

## Native discard

- Suspend an ordinary current tab. Confirm an adjacent tab opens, the original remains in the tab strip as discarded, and selecting it reloads the original URL.
- Suspend other tabs. Confirm eligible tabs are discarded while the active, pinned, audible, excluded-domain, and known dirty-form tabs remain loaded.
- Trigger a refused discard using a protected or pinned tab and confirm no helper tab is left behind.
- Repeat the native-discard checks on current stable Chrome for macOS, Windows, and Linux before publishing a new major release.

## Package and publication

- Run `npm ci`, `npm audit --audit-level=low`, `npm run check`, `npm run test:e2e`, and `npm run zip`.
- Confirm the ZIP opens with `manifest.json` at its root and contains no source maps, remote code, or development files.
- Verify the SHA-256 checksum, release notes, privacy policy, permission justifications, screenshots, and version number.
