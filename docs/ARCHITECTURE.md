# CleanTab Architecture

## Runtime surfaces

- **Popup:** previews the current URL, copies the cleaned result, and starts manual suspension.
- **Options:** validates and persists local settings and initiates optional permission requests.
- **Preview:** consumes a short-lived session token created by a context-menu action, then immediately deletes the stored URL.
- **Background service worker:** owns context menus, inactivity alarms, tab activity, native discard actions, and permission reconciliation.
- **Optional page automation:** injected into HTTP/HTTPS pages only after website and scripting access is granted. It intercepts exact-URL copy events and reports dirty-form state.

## Data flow

Settings are validated through one schema before being written to `storage.local`. Tab activity uses `storage.session` because Manifest V3 workers can stop and restart. No activity record contains a URL.

Context-menu previews use a random identifier in the extension-page URL. The original URL is held under that identifier in session storage, read once by the preview page, and deleted immediately. Stale entries are removed after ten minutes.

## Safety boundaries

URL cleaning is a pure transformation. It accepts only absolute HTTP/HTTPS URLs, compares parameter names case-insensitively, preserves retained raw query segments and order, and allows keep rules to override removals.

Tab suspension uses Chrome's native `tabs.discard` API. Eligibility is calculated before each action. Unknown activity prevents automatic suspension. The active-tab flow creates a temporary adjacent tab because Chrome cannot discard an active tab, then rolls back if Chrome refuses the request.

## Permission lifecycle

The base extension does not have host access. Enabling either automatic feature requests `scripting` plus HTTP/HTTPS origins from a direct settings-page action. If Chrome declines or later removes that access, CleanTab disables both automatic features and leaves manual controls available.
