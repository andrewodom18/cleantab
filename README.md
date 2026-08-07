# CleanTab

CleanTab is a privacy-first Chrome extension that removes known tracking parameters from URLs and safely suspends tabs you are not using.

Everything happens inside your browser. CleanTab has no account, server, analytics, ads, telemetry, or browsing-history database.

## Features

- Preview and copy a cleaned version of the current page URL.
- Clean page, link, or selected URLs from the right-click menu.
- Optionally clean copied URLs automatically when the copied text is exactly one HTTP or HTTPS URL.
- Suspend the current tab or other eligible tabs using Chrome's native discard feature.
- Optionally suspend inactive tabs after 5 minutes to 24 hours.
- Always protect active, pinned, audible, browser-internal, excluded-domain, and known unsaved-form tabs.
- Configure separate URL-cleaning and suspension domain exclusions.
- Add custom parameter removal and preservation rules.
- Follow the system appearance or use a light or dark theme.

## Install

### GitHub release

1. Download `CleanTab-v1.0.0-chrome.zip` from the [latest release](https://github.com/andrewodom18/cleantab/releases/latest).
2. Extract the ZIP to a permanent folder.
3. Open `chrome://extensions` in Chrome.
4. Enable **Developer mode**.
5. Select **Load unpacked** and choose the extracted folder.

Chrome Web Store submission materials are ready, but the initial distribution is through GitHub Releases.

## Permissions

| Permission | Why CleanTab uses it |
| --- | --- |
| Storage | Save only your local settings and temporary tab safety state. |
| Tabs | Read tab state, clean the current page URL, and request native tab suspension. |
| Alarms | Check inactivity on a one-minute local schedule when automatic suspension is enabled. |
| Context menus | Offer manual URL cleaning for pages, links, and selections. |
| Scripting (optional) | Detect copied URLs and unsaved form changes only after you enable automation. |
| HTTP/HTTPS pages (optional) | Run the optional automation on normal websites. This is requested once from Settings. |

Manual URL cleaning and single-tab suspension work without all-site access. Removing optional website access immediately turns automatic cleaning and suspension off.

See [Permissions](docs/PERMISSIONS.md) and [Privacy](PRIVACY.md) for the full explanation.

## Safety behavior

- CleanTab removes a conservative list of known marketing identifiers and does not remove generic parameters such as `id`, `q`, `page`, or `ref`.
- Keep rules override built-in and custom removal rules.
- URL cleaning never rewrites navigation or changes the page you are viewing.
- Suspended tabs remain in the tab bar and reload through Chrome when selected.
- Suspending the active tab first creates an adjacent tab; if Chrome refuses the discard, CleanTab restores the original state.
- Automatic suspension treats missing activity information as recent and refuses to act.

## Development

Requirements: Node.js 22.13 or newer and Chrome/Chromium.

```bash
npm ci
npm run dev
```

Useful checks:

```bash
npm run check
npm run test:e2e
npm run zip
```

The loaded-browser tests use a real unpacked production build for the popup, settings, preview, automatic copy cleaning, and dirty-form reporting. Native discard is covered by API-level integration tests and the [real-Chrome release checklist](docs/RELEASE_CHECKLIST.md) because Chromium terminates DevTools-controlled tabs during automated discard tests.

## Architecture

CleanTab uses WXT, TypeScript, Manifest V3, and browser-native HTML/CSS. Pure URL and suspension rules live separately from browser APIs so they can be tested without a browser. Settings persist in `storage.local`; tab timestamps, dirty-form flags, and context-menu preview URLs use session-only storage.

See [Architecture](docs/ARCHITECTURE.md) for the data flow and safety boundaries.

## Troubleshooting

- **A URL was not changed:** it may already be clean, use an excluded domain, or contain a parameter CleanTab intentionally preserves.
- **A tab stayed open:** active, pinned, audible, protected, excluded, dirty, or recently used tabs are intentionally skipped.
- **Automation turned off:** Chrome website access may have been declined or removed. Open CleanTab Settings to grant it again.
- **The extension disappeared after moving files:** unpacked extensions must remain in the folder selected during installation.

## Browser support

Version 1.0.0 targets current Chrome releases on macOS, Windows, and Linux. The browser API layer is written for a future Firefox build, but Firefox is not part of this release.

## Contributing and security

See [CONTRIBUTING.md](CONTRIBUTING.md) before opening a change. Report vulnerabilities privately using the process in [SECURITY.md](SECURITY.md).

CleanTab is available under the [MIT License](LICENSE).
