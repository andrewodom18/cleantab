# Contributing to CleanTab

Thanks for helping improve CleanTab.

## Before opening a change

1. Open an issue for behavior changes that affect permissions, privacy, or URL-removal defaults.
2. Work from the `dev` branch and keep changes focused.
3. Install Node.js 22.13 or newer and run `npm ci`.
4. Add tests for URL rules, suspension decisions, settings migration, or browser behavior affected by the change.
5. Run `npm run check` and `npm run test:e2e`.

## Product rules

- Keep all processing local unless a separately reviewed major version explicitly changes the product model.
- Request the narrowest browser permission needed for implemented behavior.
- Prefer conservative URL removal over rules that could break login, search, checkout, or navigation.
- Never close, overwrite, or redirect a user's page as a substitute for safe suspension.
- Preserve keyboard access, visible focus, readable contrast, screen-reader status updates, and reduced-motion behavior.

## Commit style

Use concise imperative messages such as `Add custom URL keep rules` or `Protect dirty tabs during automatic suspension`.
