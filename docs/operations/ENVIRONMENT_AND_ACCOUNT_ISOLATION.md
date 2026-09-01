# Environment and account isolation

AL-LIO uses separate trust boundaries for production, shared development and
local work. A user, database, session secret or OAuth credential from one
environment must never be reused in another.

## Environment contract

| Environment | Public origin | Data boundary | Accounts |
| --- | --- | --- | --- |
| Production | `https://al-lio.app` | Dedicated production PostgreSQL and production-only secrets | Real, individually owned accounts only |
| Shared development (planned) | `https://des.al-lio.app` | A separate non-production PostgreSQL database and separate secrets/OAuth callbacks | Fictional or authorised review accounts; never copied from production |
| Local | `http://localhost:<port>` | Developer-local or disposable sandbox PostgreSQL | Local test accounts and automated fixtures only |

Session cookies must remain host-only. Each deployed origin needs its own
`BASE_URL`, session secret, Google callback registrations, database credentials
and encryption keys. Production data must not be cloned into shared development
or local databases unless it has first been irreversibly anonymised through a
separately reviewed process.

## Production accounts

The four responsible users are normal production identities, not seed data.
Create one account per person with an individual email and credential or Google
identity. Do not share passwords or reuse one generic account. Grant only the
role each person needs and use the ordinary account lifecycle for password
reset, session revocation and offboarding. The private-input and verification
checklist for those four accounts is tracked by #380; credentials never belong
in that issue.

## Test and review data

- Automated tests create synthetic users only inside the isolated E2E or
  PostgreSQL sandbox database.
- Local review utilities must reject non-loopback databases and target an
  explicitly named local account.
- Public screenshots use fictional data from shared development or local, not
  a real student's production workspace.
- No runtime flag, login shortcut or repository seed may create a permanent
  passwordless demo identity in production.

## Retiring the five legacy demo identities

Issue #379 removes every code path that creates or signs in as the historical
DEV, DAM, AF, TSAF and MP demo users. Database cleanup is a separate operator
action because deleting a user also deletes its user-owned data through foreign
key cascades.

From the reviewed release, first run the audit-only command with a read-capable
connection:

```bash
DATABASE_URL='postgresql://...' npm run postgres:legacy-demo-users:cleanup
```

It reports `PRESENT` or `ABSENT` for the five exact UUID/email pairs and changes
nothing. Before deletion, create and verify a production backup, review the
audit output, and obtain explicit owner approval. Then use the administrative
connection and both guard values:

```bash
DATABASE_MIGRATION_URL='postgresql://...' \
AL_LIO_LEGACY_DEMO_BACKUP_CONFIRMATION=BACKUP_VERIFIED \
AL_LIO_LEGACY_DEMO_CLEANUP_CONFIRMATION=DELETE_FIVE_LEGACY_DEMO_USERS \
npm run postgres:legacy-demo-users:cleanup -- --execute
```

The command locks and rechecks every exact identity, deletes inside one
transaction, and rolls back on any UUID/email mismatch or row-count anomaly.
Run the audit-only command again afterward and retain the redacted result with
the release evidence. Never commit the connection values or raw database data.
