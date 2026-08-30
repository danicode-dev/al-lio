# OpenWebinars news pilot

This runbook coordinates the first autonomous Radar publication into AL-LIO.
It authorizes one source (`openwebinars-blog`), one destination (`news`) and two
cycles (`DAW` and `DAM`). It does not authorize web discovery, courses, events,
learning resources, YouTube or jobs.

## Dormant release state

Merge and deploy the Compose wiring with these values first:

```dotenv
AL_LIO_RADAR_V4_PROJECT_DESTINATIONS=
AL_LIO_RADAR_DELIVERY_SCHEMA_VERSION=3
AL_LIO_RADAR_AUTONOMOUS_PUBLICATION_ENABLED=false
AL_LIO_RADAR_AUTONOMOUS_PUBLICATION_DESTINATIONS=news
AL_LIO_RADAR_AUTONOMOUS_NEWS_SOURCE_CYCLE_MATRIX_JSON={}
AL_LIO_RADAR_DAILY_PUBLICATION_TIMEZONE=Europe/Madrid
AL_LIO_RADAR_DAILY_PUBLICATION_TIME=09:00
AL_LIO_RADAR_WEB_DISCOVERY_ENABLED=false
AL_LIO_RADAR_LEARNING_DISCOVERY_ENABLED=false
AL_LIO_RADAR_YOUTUBE_WATCH_ENABLED=false
AL_LIO_RADAR_LEARNING_DELIVERY_ENABLED=false
AL_LIO_RADAR_YOUTUBE_API_KEY=
AL_LIO_RADAR_JOB_RADAR_ENABLED=false
AL_LIO_RADAR_LEARNING_INGEST_ENABLED=false
```

The merge is safe because both the AL-LIO projector and the Radar master switch
are disabled. A routine web release preserves the running Radar container, so
adding this wiring cannot start the pilot.

## Preflight and activation order

Work from the exact active release directory. Back up its private `.env`, keep
file mode `600`, and never print `docker compose config` or the environment into
an issue or CI log because the resolved output contains secrets.

1. Set only `AL_LIO_RADAR_V4_PROJECT_DESTINATIONS=news`.
2. Recreate only `al_lio_web`, then require healthy `/api/health` and
   `/api/ready` responses. Radar remains dormant.
3. Configure the exact Radar pilot while keeping the master switch false:

   ```dotenv
   AL_LIO_RADAR_DELIVERY_SCHEMA_VERSION=4
   AL_LIO_RADAR_AUTONOMOUS_PUBLICATION_ENABLED=false
   AL_LIO_RADAR_AUTONOMOUS_PUBLICATION_DESTINATIONS=news
   AL_LIO_RADAR_AUTONOMOUS_NEWS_SOURCE_CYCLE_MATRIX_JSON={"openwebinars-blog":["DAW","DAM"]}
   AL_LIO_RADAR_DAILY_PUBLICATION_TIMEZONE=Europe/Madrid
   AL_LIO_RADAR_DAILY_PUBLICATION_TIME=09:00
   AL_LIO_RADAR_WEB_DISCOVERY_ENABLED=false
   AL_LIO_RADAR_LEARNING_DISCOVERY_ENABLED=false
   AL_LIO_RADAR_YOUTUBE_WATCH_ENABLED=false
   AL_LIO_RADAR_LEARNING_DELIVERY_ENABLED=false
   AL_LIO_RADAR_YOUTUBE_API_KEY=
   AL_LIO_RADAR_JOB_RADAR_ENABLED=false
   AL_LIO_RADAR_LEARNING_INGEST_ENABLED=false
   ```

4. Validate interpolation without exposing resolved values:

   ```bash
   docker compose -f infra/docker-compose.prod.yml --env-file .env config --quiet
   ```

5. Stop the single Radar writer. Run health and a source-only sync from one-off
   containers against the same volume while publication is still disabled, then
   review the accepted, rejected and quarantined counts. Do not run a second
   writer alongside the scheduler.

   ```bash
   docker compose -f infra/docker-compose.prod.yml --env-file .env stop al_lio_radar
   docker compose -f infra/docker-compose.prod.yml --env-file .env run --rm --no-deps \
     al_lio_radar node dist/cli/health.js
   docker compose -f infra/docker-compose.prod.yml --env-file .env run --rm --no-deps \
     al_lio_radar node dist/cli/sync.js --source=openwebinars-blog
   ```

6. Back up and restore-test the Radar SQLite volume following
   [`DEPLOY_VPS.md`](DEPLOY_VPS.md). Then set
   `AL_LIO_RADAR_AUTONOMOUS_PUBLICATION_ENABLED=true`, repeat the health command
   and recreate only `al_lio_radar`. If any preflight step fails, restart Radar
   with the dormant configuration instead of leaving the writer stopped.
7. Confirm the scheduler reports schema 4, destination `news`, the exact source
   matrix and every unrelated capability as disabled.

An empty, malformed or broadened matrix must stop activation. Do not substitute
a similar source identifier or add a cycle to make a day produce content.

## Same-day controlled window

The first verification does not need to wait for three separate 09:00 windows.
After the dormant source-only sync has accepted a current DAW/DAM item, set the
daily time temporarily to the next Europe/Madrid minute, validate again, enable
the master switch and recreate Radar. The scheduler opens the due window on its
first tick and can publish only items accepted before that scheduled minute.

Require one of these explicit outcomes:

- `queued`: a signed schema-v4 delivery is accepted and projected into AL-LIO;
- `no_content`: no reviewed item met the source, cycle, freshness and evidence
  gates; unrelated or stale content is not used as filler.

After evidence is captured, restore `09:00`. A same-day window with a different
time has a different idempotency key; already batched items remain excluded.
The following three normal 09:00 windows are observation evidence, not a gate
that delays the initial release.

## Student-facing verification

For a queued item verify the signed delivery and database projection before
checking the UI:

- destination is `news` and target cycles are only `DAW` and/or `DAM`;
- title, short summary, publication date, source name and canonical URL match
  OpenWebinars evidence;
- the detail view uses the canonical content and offers the deterministic next
  news item;
- no course, event, learning resource, YouTube video, job or private student
  state was created;
- retries do not create a duplicate occurrence.

## Rollback

1. Set `AL_LIO_RADAR_AUTONOMOUS_PUBLICATION_ENABLED=false` and recreate only
   Radar. Confirm health reports the pilot disabled.
2. If the fault is in the AL-LIO projection or presentation, also set
   `AL_LIO_RADAR_V4_PROJECT_DESTINATIONS=` and recreate only the web service.
3. After the master switch is confirmed off, restore the matrix to `{}` and
   schema version to `3`.

Do not delete SQLite, PostgreSQL rows, evidence or frozen batches as rollback.
They are required for audit and idempotent recovery.
