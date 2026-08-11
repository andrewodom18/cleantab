# CleanTab Privacy Policy

Effective date: August 7, 2026

CleanTab is a local-only browser extension. It does not collect, transmit, sell, share, or remotely process personal information or browsing activity.

## Information CleanTab handles

CleanTab processes the current page URL when you request URL cleaning. If you enable automatic features, it also observes copied text to detect complete HTTP/HTTPS URLs and form input events to remember whether a tab may contain unsaved work.

This processing happens entirely inside your browser.

## Local storage

CleanTab stores only:

- Your theme, URL-cleaning rules, domain exclusions, and automatic-suspension settings in Chrome local extension storage.
- Tab activity timestamps and dirty-form yes/no flags in Chrome session extension storage.
- A context-menu URL in session storage only until its preview is opened or expires after approximately ten minutes.

CleanTab does not maintain URL history. Session information is not synced and is cleared by the browser when the extension session ends.

## Network activity

CleanTab does not operate a server and does not send data to the developer or any third party. The packaged extension contains no remote code, analytics, advertising, telemetry, or external API integration.

## Permissions

Required browser permissions provide settings storage, tab state and native discard controls, a local inactivity timer, and URL-cleaning context menus. Website and scripting access are optional and requested only when you enable automatic copy cleaning or automatic suspension.

You can remove optional website access from CleanTab Settings at any time. Doing so turns dependent automatic features off.

## Data deletion

Use **Reset defaults** in CleanTab Settings to replace saved settings with defaults. Uninstalling CleanTab removes its local and session extension storage through Chrome.

## Changes

Material changes to this policy will be documented in the repository and release notes. A future version that introduces remote data processing would require a new disclosure and explicit review; version 1.0.1 contains none.

## Contact

For privacy questions, open an issue at <https://github.com/andrewodom18/cleantab/issues>. Do not include private browsing information in a public issue.
