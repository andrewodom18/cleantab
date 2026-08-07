# Permission Explanations

CleanTab's production manifest is audited during every build.

## Required

- `storage`: saves local settings and temporary session safety state.
- `tabs`: reads tab URLs and state for the current-page cleaner, exclusion rules, and native discard actions.
- `alarms`: wakes the Manifest V3 worker once per minute to evaluate automatic suspension when enabled.
- `contextMenus`: adds manual cleaning actions for pages, links, and selected text.

## Optional

- `scripting`: injects the local automation bundle into ordinary webpages.
- `http://*/*` and `https://*/*`: allows that bundle to clean copied URLs and detect unsaved form changes.

Chrome requests the optional permissions only after the user enables an automatic feature and saves Settings. CleanTab does not request access to file URLs, browser settings, downloads, history, cookies, bookmarks, or the network.

Removing website access disables automatic copy cleaning and automatic suspension. Manual current-page URL cleaning and tab suspension remain available.
