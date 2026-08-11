# CleanTab 1.0.1

CleanTab 1.0.1 makes the extension simpler to understand and smoother to use while preserving its local-only privacy model.

## Improvements

- Combined page, link, and selected-URL cleaning into one adaptive context-menu action.
- Reused the nearest open tab when suspending the current tab instead of creating an unnecessary blank tab.
- Simplified the popup wording and kept every action visible without scrolling.
- Replaced checkbox-like automation controls with clear, accessible on/off switches.
- Moved optional domain exceptions and custom parameter rules into one collapsed advanced section.
- Removed unnecessary module preload hints that Chrome could report as extension warnings.
- Refreshed Chrome Web Store screenshots to match the cleaner interface.

## Install for testing

1. Download and extract `CleanTab-v1.0.1-chrome.zip`.
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode**.
4. Select **Load unpacked** and choose the extracted folder.
5. Pin CleanTab from Chrome's extensions menu if you want quick access.

If an older unpacked CleanTab build is installed, remove it first or replace its folder and select **Reload** on `chrome://extensions`.

The `SHA256SUMS.txt` file can be used to verify the downloaded archive.

## Privacy

CleanTab has no server, account, analytics, telemetry, ads, remote code, or persistent URL history. Automatic features request optional website access from Settings and can be disabled or revoked at any time.
