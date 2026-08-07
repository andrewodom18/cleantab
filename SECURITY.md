# Security Policy

## Supported versions

Security fixes are provided for the latest released version of CleanTab.

## Reporting a vulnerability

Please do not open a public issue for a suspected vulnerability.

Use GitHub's **Report a vulnerability** option in the repository Security tab to create a private security advisory. Include the affected version, reproduction steps, impact, and any suggested mitigation. Avoid including unrelated browsing information or personal data.

You should receive an acknowledgement within seven days. Confirmed issues will be prioritized based on user impact and released with appropriate credit unless you request anonymity.

## Security boundaries

- CleanTab must not transmit browsing data or load remote executable code.
- Optional all-site access must remain user initiated and removable.
- URL cleaning must not silently rewrite browser navigation.
- Automatic tab suspension must preserve active, pinned, audible, dirty, excluded, and protected tabs.
- Release archives must pass the manifest and remote-code audit before publication.
