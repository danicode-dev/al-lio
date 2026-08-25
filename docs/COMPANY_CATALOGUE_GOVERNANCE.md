# Company catalogue governance

## Scope

The Work tab's company catalogue (`public.companies`) is grouped by
`cycle_group` (`DEV`, `AF`, `MP`, `TSAF`). `DEV` (DAW/DAM) has 69 companies
reviewed before this document existed and is not covered by the rules below —
see "DEV is grandfathered" further down. Everything in this document governs
`AF`, `MP` and `TSAF` and any future dataset added the same way.

## Format

Each group's dataset is a single JSON file under `data/companies/`:

- `data/companies/administracion-finanzas.json` → `AF`
- `data/companies/marketing-publicidad.json` → `MP`
- `data/companies/acondicionamiento-fisico.json` → `TSAF`

Shape:

```json
{
  "schemaVersion": 1,
  "cycleGroup": "AF",
  "reviewedAt": "2026-08-25",
  "reviewedBy": "who/what reviewed this batch",
  "status": "pending_owner_review | approved",
  "companies": [
    {
      "nombre": "Company name",
      "web": "https://official-homepage/",
      "empleo": null,
      "tipo_empleo": null,
      "categoria": "Sub-sector A / Sub-sector B",
      "granada": "Short, verified note on Granada/Andalusia relevance",
      "fuente": "https://... URL that best supports the row"
    }
  ],
  "discarded": [{ "nombre": "...", "reason": "..." }],
  "searchesPerformed": ["..."]
}
```

`discarded` and `searchesPerformed` are optional audit trail fields (not
imported, but useful for the reviewer to see what was tried and rejected).

## Required fields and source policy

- `nombre`, `web`, `categoria`, `granada`, `fuente` are required.
- `web` must be the company's own official homepage — never LinkedIn,
  InfoJobs, Indeed, Talent.com, a generic directory, a search engine result,
  a social-media profile, or a link shortener. It's the exact URL the
  "Visitar web" button sends a student to.
- `empleo`/`tipo_empleo` are optional. When present, `empleo` follows the
  same official-source-only rule as `web`. LinkedIn/InfoJobs/Indeed may be
  used to *discover* a company, never as the value saved in `web`, `empleo`
  or `fuente`.
- `empleo`/`tipo_empleo` are not rendered in the UI (`CompanyCard` only ever
  uses `web`) — they exist for future use and internal audit only.
- The exact blocked-host list lives in `scripts/lib/company-catalogue.mjs`
  (`isBlockedWebHost`).

## Validating and importing

```bash
# Validate + check for cross-group slug collisions, write nothing:
node scripts/import-companies.mjs --source data/companies/administracion-finanzas.json --cycle-group AF --dry-run

# Import one group (idempotent — safe to re-run):
node scripts/import-companies.mjs --source data/companies/administracion-finanzas.json --cycle-group AF
node scripts/import-companies.mjs --source data/companies/marketing-publicidad.json --cycle-group MP
node scripts/import-companies.mjs --source data/companies/acondicionamiento-fisico.json --cycle-group TSAF
```

- `--cycle-group` must match the dataset's own `cycleGroup` field, must be
  one of `DEV`/`AF`/`MP`/`TSAF`, and only ever touches rows in that group.
- Every row is validated before anything is written; if any row is invalid
  the whole run fails and nothing is written.
- Re-running the same file is a no-op beyond updating the row in place
  (`ON CONFLICT (id_slug) DO UPDATE`, gated so it can never move a row to a
  different `cycle_group`).
- `id_slug`/`id` are deterministic (sha1-derived from `cycle_group:name` for
  every group except DEV), so the same company always resolves to the same
  row, and the same name in two different groups never collides.

## Checking DEV and favourites stayed intact

```bash
node scripts/import-companies.mjs --source public/data/empresas_tech_granada.md --cycle-group DEV --dry-run
```

should report exactly 69 valid rows and zero errors. After importing any new
group into a sandbox database:

```sql
select cycle_group, count(*) from public.companies group by cycle_group;
select count(*) from public.company_favorites; -- unchanged before/after
```

## DEV is grandfathered

DEV's 69 rows predate this policy and were reviewed under a different
standard: some carry a historical LinkedIn/InfoJobs search link in
`empleo`/`tipo_empleo` (never rendered in the UI). The importer does not
enforce the official-source-only rule on `empleo` for `cycle_group === "DEV"`
specifically so those rows are never rejected or silently rewritten — `web`
is still required and validated the same as every other group (DEV's `web`
values were already all official). Do not backfill or "clean up" DEV's
`empleo` field as part of an unrelated change; if it's ever revisited, that's
its own reviewed decision, not a side effect of adding AF/MP/TSAF.

## Adding companies later

1. Add a row to the relevant group's JSON file (or a new group file, plus
   `ALLOWED_CYCLE_GROUPS` in `scripts/lib/company-catalogue.mjs` and the
   `cycle_group` check constraint in `infra/postgres/schema.sql` if it's a
   genuinely new group).
2. Run the `--dry-run` command above and fix anything it flags.
3. Re-run the import command for that group.

## Review status

- `status: "pending_owner_review"` means Claude/an automated session
  verified each row's official website but the app's owner has not yet
  reviewed the batch. Do not treat this as "approved for production" or
  "imported into production" — those are separate, owner-only steps.
- Once reviewed, update `status` to `"approved"` and record who reviewed it
  and when in `reviewedBy`/`reviewedAt`.
