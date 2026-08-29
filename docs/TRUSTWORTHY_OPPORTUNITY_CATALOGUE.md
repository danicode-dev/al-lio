# Trustworthy opportunity catalogue

AL-LÍO treats PostgreSQL canonical occurrences as operational truth, Radar v4
JSON as the versioned transport contract, and CSV files only as import/export
or migration-audit inputs. CSV row existence, an old review date, internal
priority, notes, or a provider listing never make a resource publishable.

## Safe activation

1. Keep `AL_LIO_RADAR_V4_PROJECT_DESTINATIONS` empty and
   `AL_LIO_VERIFIED_OPPORTUNITIES_ONLY=false` while the legacy inventory is
   re-verified.
2. Run `npm run audit:legacy-opportunities` and resolve every candidate through
   the Radar evidence workflow. An item becomes `verified_migratable` only after
   it has an accepted `radar_content_occurrences` record.
3. Enable Radar projection for `course` or `event` separately, compare counts,
   exact URLs and preserved user-state links, then enable
   `AL_LIO_VERIFIED_OPPORTUNITIES_ONLY=true` in local review.
4. Run migration, contract, unit, build and PostgreSQL sandbox checks. Obtain
   owner approval before changing production flags.

The rollback is configuration-only: set
`AL_LIO_VERIFIED_OPPORTUNITIES_ONLY=false`. The migration is additive and the
legacy row linked by `legacy_fp_content_item_id` retains favourites, progress,
tasks and completion state.

## Student-facing contract

Only source-supported fields are rendered. Course difficulty, minimum
education, other eligibility, credential level and attendance mode remain
independent. Event occurrence dates, registration, eligibility, prize and
certification belong to the exact edition. Missing optional values remove the
row or section; they do not produce placeholders. The primary action prefers
the exact registration URL and otherwise uses the canonical official URL.
