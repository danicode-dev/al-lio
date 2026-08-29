# Security policy

AL-LIO handles account identity, student-owned planning data, OAuth tokens and
signed service-to-service deliveries. Security reports are taken seriously.

## Reporting a vulnerability

Do not open a public issue containing an exploitable vulnerability, secret,
OAuth token, personal data or production infrastructure detail.

Use the repository's **Security** tab to create a private security advisory.
Include:

- the affected revision and component;
- a concise impact description;
- reproducible steps using fictional or local data;
- any proposed mitigation;
- confirmation that production was not disrupted.

Do not test denial of service, credential attacks, destructive database
operations or data extraction against the public deployment.

## Supported version

Security fixes target the latest revision on `main` and the currently deployed
production release. Older commits and unmaintained local modifications are not
supported.

## Security boundaries

Reports are especially relevant when they affect:

- session creation, verification, expiry or cookie settings;
- user-to-user authorisation and identifier ownership;
- password rate limiting or account enumeration;
- Google OAuth state, token encryption or Calendar permissions;
- Radar HMAC verification, replay protection or idempotency;
- database-role separation, migrations, backup or restore;
- secret exposure through logs, builds, Docker or Git history;
- unsafe rendering or redirection of external content.

## Disclosure

Please allow the maintainer time to investigate and prepare a safe release
before public disclosure. A confirmed issue should receive a regression test
or another repeatable verification at the narrowest responsible boundary.
