# data/

Hand-maintained JSON datasets that feed importers or are bundled into the app.
Nothing writes to this folder at runtime; every file here is a reviewed source
input, edited by hand and imported explicitly.

For the bulk CSV catalogue sources see `csv/`. For delivered/runtime content
see PostgreSQL — this folder is inputs only.

## Files

| Path | Consumed by | Notes |
|---|---|---|
| `learning-competencies.json` | `src/lib/learning/catalog.ts` (imported at build time), plus `import:learning-competencies`, `validate:learning-competencies`, `validate:learning-sources` | Canonical learning-competency catalogue. Bundled into the app, so a malformed edit breaks the build. Listed in `deploy-production.sh` as a deploy-relevant path. |
| `companies/administracion-finanzas.json` | `npm run import:companies -- --source data/companies/… --cycle-group AF` | Work-tab company catalogue, one dataset per cycle group. |
| `companies/marketing-publicidad.json` | same, `--cycle-group MP` | |
| `companies/acondicionamiento-fisico.json` | same, `--cycle-group TSAF` | |
| `.gitkeep` | — | Keeps the folder present when only generated/ignored content would otherwise remain. |

## Editing

- Validate before importing: `npm run validate:learning-competencies`,
  `npm run validate:learning-sources`.
- Company datasets carry `status` / `reviewedAt` / `reviewedBy` metadata that
  the importer checks; see
  `docs/integrations/COMPANY_CATALOGUE_GOVERNANCE.md`.
- Keep personal data, credentials and live database dumps out of this folder.
