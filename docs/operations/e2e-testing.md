# Browser E2E harness (authentication + Tasks)

A deterministic Playwright suite that drives a real browser through password
login and the Tasks critical path, against a local application and a disposable
local database only. It is the first, deliberately small E2E slice (issue #329).

## One command

```bash
npm run e2e
```

That command (`scripts/e2e/run.mjs` + `scripts/e2e/lifecycle.mjs`):

1. starts a throwaway PostgreSQL (`infra/docker-compose.e2e.yml`, container
   `al_lio_postgres_e2e`, `127.0.0.1:54339`, in-memory `tmpfs`, no volume),
2. applies the existing migrations to it (`scripts/postgres/migrate.mjs`),
3. runs the Playwright suite - Chromium headless - which starts the application
   through `scripts/e2e/app.mjs` (`next dev` on `127.0.0.1:3210`) and stops it
   when the run ends,
4. always runs `docker compose ... down -v` afterwards, including on failure.

### Guaranteed database teardown

The lifecycle in `scripts/e2e/lifecycle.mjs` never calls `process.exit()` from
inside its work: `run()` and `waitForDatabase()` throw an `Error` carrying an
`exitCode`, which propagates to the lifecycle's own `finally`. A flag is set
the moment `docker compose ... up` is *attempted*, so a migration failure, a
database-readiness failure, a Playwright failure, or a partially successful
`up` (network created, container unhealthy, `--wait` times out) all still run
`docker compose ... down -v`. The original failing exit code is preserved
where practical; a failing teardown is reported and, if the suite itself
passed, becomes the process exit code rather than being swallowed.

`tests/operations/e2e-harness/runner-cleanup.test.mjs` covers this without
Docker, Playwright or any database - `exec` and `waitForDatabase` are stubbed.

Requirements: Docker running locally, and the Node version in `package.json`
`engines`. Nothing else. The suite never reads `.env`, the developer database,
or the `postgres:sandbox` database.

To run only the test files against an already-prepared isolated database
(no Docker lifecycle, no migration step):

```bash
E2E_MANAGE_DB=false E2E_DATABASE_URL=postgresql://<user-with-"e2e">:<pw>@127.0.0.1:<port>/<db-with-"e2e"> npm run e2e
```

## Isolation and fail-closed guards

`tests/e2e/support/env.ts` runs inside the Playwright config and the global
setup, before any database connection or browser launch. It refuses to run and
throws when:

- `NODE_ENV=production`;
- `al-lio.app` appears in the database URL or the application URL;
- the database host is not loopback (`localhost`, `127.0.0.1`, `0.0.0.0`, `::1`);
- the database name or the database user does not contain `e2e` (so it cannot be
  the production `al_lio` database or the `aidraft_sandbox` one);
- the application URL host is not loopback;
- the application URL port is not the configured E2E port, or is `3000` /
  `3200` (local development / the owner review server).

`scripts/e2e/run.mjs` repeats the loopback and marker checks before it touches
Docker. The CI job additionally sets every target explicitly to an ephemeral
service container and a loopback port; if any guard fails, the job fails.

The owner review server on port `3200` is never used or started: the E2E
application is a separate `next dev` process pinned to `127.0.0.1:3210`, torn
down by Playwright at the end of the run.

### Application environment isolation

Playwright's `webServer.command` is `node scripts/e2e/app.mjs`, not
`next dev`. `scripts/e2e/app-env.mjs` rebuilds the child environment from
scratch so the E2E `next dev` process can only receive synthetic
configuration:

1. **No parent-shell passthrough.** Only a fixed operating-system bootstrap
   allowlist (`PATH`, `SystemRoot`, `TEMP`, `APPDATA`, `HOME`, ... - all
   non-secret) is copied from `process.env`. The parent environment is never
   spread in, so a `DATABASE_URL`, `SESSION_SECRET`, `GOOGLE_*`, `RESEND_*`,
   `RADAR_*`, `SUPABASE_*`, `INFOJOBS_*`, `ADZUNA_*`, `JOOBLE_*` or any other
   value exported in the developer's shell simply is not present.
2. **No dotenv.** Every key declared by any `.env`, `.env.local`,
   `.env.development` or `.env.development.local` in the project root that is
   not on the approved list is pinned to an empty string in the child
   environment. `@next/env` does not override a variable that is already
   defined, so it cannot load the real value. As a second layer,
   `__NEXT_PROCESSED_ENV=true` disables `@next/env` dotenv processing
   entirely.
3. **Approved variables only.** The child receives exactly `NODE_ENV`
   (`development`), `PORT`, `HOSTNAME`, `DATABASE_URL` (the disposable E2E
   database), `SESSION_SECRET` (the per-run secret), `BASE_URL`,
   `AL_LIO_DEMO_ACCESS_ENABLED=false`, plus `NEXT_TELEMETRY_DISABLED`. These
   are the variables the login -> dashboard -> Tasks routes read; database,
   session, Google, Resend, OAuth, Radar, import and other integration
   secrets are not among them.
4. **Fail closed.** Before spawning `next dev`, `app.mjs` re-runs the loopback
   and `e2e`-marker guards on `DATABASE_URL` / `BASE_URL` and calls
   `assertNoIntegrationSecrets()`, which throws if any known secret marker
   still carries a value. A hostile target or a leaked secret aborts the
   launch.

This is a launcher only. It adds no authentication bypass, no test-only
application route, no production code branch and no change to application
runtime behaviour.

`tests/operations/e2e-harness/app-env-isolation.test.mjs` builds the child
environment from a deliberately hostile parent (real-looking production
secrets) and a temporary project with secret-laden `.env` / `.env.local`
files, and asserts that none of it reaches the result, that synthetic values
win, and that every hostile target is refused.

## Synthetic users, fixtures and cleanup

Two reserved identities, `tasks-e2e-user-a@al-lio.test` and
`tasks-e2e-user-b@al-lio.test`, each with a fixed UUID. Their password and the
application's session-signing secret are both generated fresh per run by
`scripts/e2e/run.mjs`, kept only in the process environment, and never logged
or written to a file. Running the raw `playwright test` without them fails
closed. `tests/e2e/support/fixtures.ts` provisions them directly in the
database (a confirmed user row and a completed-onboarding profile with the
product tour marked finished) and removes them again.

Cleanup targets only those two ids (`DELETE ... WHERE user_id = ANY(<reserved
ids>)`). It runs in Playwright's global teardown, which executes even when a
test fails, and again through `docker compose ... down -v`, which destroys the
whole database.

## Journey covered

1. an anonymous visit to `/tasks` ends on `/login`;
2. user A signs in with a password and reaches the private app;
3. user A creates a task with a deterministic `E2E-TASK-*` title;
4. user A edits the task and the new title is shown;
5. after a reload the edited title is still served (from PostgreSQL, checked
   both in the UI and with a direct row count);
6. user A marks the task complete;
7. the task appears under the completed filter and survives another reload;
8. user B, in a separate browser context, cannot see user A's task;
9. global teardown removes both users and all their task data.

A wrong password is also covered: it keeps the visitor on `/login` with a
visible error.

## Artifacts and secrets

- Screenshots and video: disabled.
- Traces: kept only on failure, locally, under `output/playwright/`
  (git-ignored). A trace records typed input and request bodies - the
  synthetic password and the signed session cookie - and Playwright has no
  guaranteed redaction, so **CI produces no trace and uploads no artifact**.
  The CI job log is the only diagnostic there, and it never prints a
  credential.
- Generated directories (`output/playwright/`, `playwright-report/`,
  `blob-report/`, `.playwright/`) are in `.gitignore`.

## CI

The `e2e` job in `.github/workflows/ci.yml` runs alongside the existing
`verify` job without changing it. It uses an ephemeral `postgres:17-alpine`
service container and `npx playwright install --with-deps chromium` on the
runner, pins its actions by commit SHA like the rest of the file, and has a
20-minute timeout. It reads no production secret.
