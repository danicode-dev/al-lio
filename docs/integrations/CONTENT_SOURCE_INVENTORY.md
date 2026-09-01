# Content source inventory

This inventory defines the ownership boundary for repository-held content
inputs and evidence. It does not make a dataset safe to publish: each importer,
approval envelope and runtime trust policy remains authoritative for that
decision.

## Classification contract

- `canonical`: the reviewed source of truth for a supported import or
  build-time consumer.
- `raw`: a current importer input preserved in its received or editorial source
  shape. It is authoritative for that import path but is not read at runtime.
- `candidate`: unapproved working material. It cannot be imported or published
  without an explicit review and promotion into a canonical source.
- `generated audit`: a reproducible point-in-time report. It describes evidence
  but never grants publication authority.
- `retained evidence`: an original delivery or decision record kept to explain
  how canonical data was produced. It is not an importer input.
- `removal candidate`: material with no current consumer or unresolved
  retention need. Removal requires a separate exact-path issue with recovery
  evidence.

Every path is repository-relative. "None" under publication authority means
the material must never be treated as product-ready input in its current form.
All source files are public-source or editorial data; credentials, database
dumps and student information are prohibited regardless of the sensitivity
entry below.

## Inventory

<!-- content-source-inventory:start -->
| Path | Class | Owner | Consumer | Publication authority | Regeneration or validation | Sensitivity | Retention reason | Removal condition |
|---|---|---|---|---|---|---|---|---|
| `csv/oportunidades_tech_combinado.csv` | `canonical` | Opportunities import pipeline | `scripts/import-tech-opportunities.mjs`; `scripts/audit-legacy-opportunities.mjs` | Explicit import authority only; PostgreSQL and the Radar verification contract remain runtime truth | Hand-maintained; reproduce the audit with `npm run audit:legacy-opportunities` | Public opportunity facts and editorial notes; no credentials or applicant data | Supported importer input and source evidence for the dated legacy audit | Replace only after the importer is retired or redirected and the audit remains reproducible from retained evidence |
| `csv/cursos_formacion_granada_online.csv` | `canonical` | Courses import pipeline | `scripts/import-courses.mjs`; `scripts/audit-legacy-opportunities.mjs` | Explicit user-scoped import authority only; file presence is not current publication evidence | Hand-maintained; reproduce the audit with `npm run audit:legacy-opportunities` | Public course facts and editorial notes; no student data | Supported importer input and source evidence for the dated legacy audit | Remove only with the importer or after a reviewed replacement preserves audit recovery |
| `csv/eventos_hackathons_actualizado.csv` | `canonical` | Events import pipeline | `scripts/import-hackathons.mjs`; `scripts/audit-legacy-opportunities.mjs` | Explicit user-scoped import authority only; file presence is not current publication evidence | Hand-maintained; reproduce the audit with `npm run audit:legacy-opportunities` | Public event facts and editorial notes; no attendee data | Supported importer input and source evidence for the dated legacy audit | Remove only with the importer or after a reviewed replacement preserves audit recovery |
| `csv/fp-content/2026-2027/raw` | `raw` | FP content pipeline | `scripts/import-fp-content.mjs`; `scripts/validate-fp-content-csv.mjs`; `scripts/audit-legacy-opportunities.mjs` | Validated explicit import authority; PostgreSQL is runtime truth | Validate with `npm run validate:fp-content`; imported with `npm run import:fp-content` | Public catalogue facts and editorial notes; no student data | Current complete FP catalogue input in the original CSV shape | Replace only through a lossless reviewed source migration with validator, importer and audit updates |
| `csv/fp-content/2026-2027/competencias` | `canonical` | FP learning pipeline | `scripts/import-fp-competencies.mjs`; `scripts/validate-fp-competencias-csv.mjs` | Validated explicit import authority; PostgreSQL is runtime truth | Validate with `npm run validate:fp-competencias`; imported with `npm run import:fp-competencias` | Public curriculum references and editorial mappings; no learner evidence | Current skill, cycle-roadmap and item-to-skill source of truth | Replace only through a lossless migration that preserves stable skill and item identities |
| `csv/fp-content/2026-2027/videos/recursos_video.json` | `canonical` | FP learning-video pipeline | `scripts/import-fp-resource-videos.mjs` | Reviewed explicit import authority for video mappings; PostgreSQL is runtime truth | Validate and synchronise with `npm run import:fp-resource-videos` against a non-production review database | Public video URLs and internal curation notes; no credentials | Current reviewed resource-to-video mapping | Remove only after the importer consumes a reviewed replacement and withdrawals still synchronise correctly |
| `csv/fp-content/2026-2027/videos/source-2026-08-06-video-candidates` | `candidate` | FP learning-video curation | No runtime or importer consumer; reviewers promote accepted mappings into `recursos_video.json` | None | Original AI-assisted batches are not reproducible deterministically; review candidates against the rules in the adjacent README | Public video metadata and unapproved editorial notes; no credentials | Preserves provenance for accepted, rejected and conflicting video decisions | Remove only after every decision and provenance link is preserved in canonical curation evidence and Git recovery is verified |
| `csv/fp-content/2026-2027/eventos-hackathones-2026-08-06` | `retained evidence` | FP content pipeline | No importer consumer; transformed rows live under `csv/fp-content/2026-2027/raw` | None | Original delivery; no committed regeneration command exists | Public event facts and transformation notes; no attendee data | Explains the mapping of the 120 delivered records into the canonical FP CSV inputs | Remove only after the transformation decisions and original delivery provenance have another durable, reviewed home |
| `data/companies` | `canonical` | Work company-catalogue pipeline | `scripts/import-companies.mjs`; `scripts/lib/company-catalogue.mjs` | Importable only when the review envelope is approved and validation succeeds | Validate each file with `node scripts/import-companies.mjs --source <path> --cycle-group <group> --dry-run` | Public company links plus review metadata; no applicant or employee data | Current AF, MP and TSAF company catalogue sources | Remove a group only after its product ownership, stable identities and recovery path are explicitly retired |
| `public/data/empresas_tech_granada.md` | `canonical` | Work company-catalogue pipeline | `scripts/import-companies.mjs`; `scripts/check-project.mjs` | Grandfathered DEV import authority; validation must still report the expected stable records | Validate with `node scripts/import-companies.mjs --source public/data/empresas_tech_granada.md --cycle-group DEV --dry-run` | Public company links; legacy external job links may be present; no applicant data | Preserves the stable DEV company identities used by existing favourites | Replace only through a tested migration that preserves all DEV slugs, UUIDs and favourite references |
| `data/learning-competencies.json` | `canonical` | Learning catalogue pipeline | `src/lib/learning/catalog.ts`; `scripts/import-learning-competencies.mjs`; learning validators | Build-time and reviewed explicit import authority | Run `npm run validate:learning-competencies` and `npm run validate:learning-sources` before `npm run import:learning-competencies` | Public curriculum and video metadata plus editorial review evidence; no learner data | Current application-bundled competency and learning-resource catalogue | Replace only after build-time and database consumers share a validated successor with stable identities |
| `docs/audits/legacy-opportunities-2026-08-28.json` | `generated audit` | Opportunity-retirement audit | Generated by `scripts/audit-legacy-opportunities.mjs`; consumed as review evidence | None | Reproduce exactly with `npm run audit:legacy-opportunities` from the seven registered CSV sources | Public legacy opportunity facts and classifications; no database records or user data | Point-in-time evidence for legacy retirement and publication-trust decisions | Remove only when the governing decision no longer needs this snapshot and exact regeneration is verified at the retained source revision |
| `docs/audits/unused-code-baseline.json` | `retained evidence` | Repository hygiene issue #333 under parent #276 | Consumed by `scripts/check-unused-code.mjs` and the CI `audit:unused` gate | None; this inventory has no publication authority | Validate deterministically with `npm run audit:unused`; investigate the underlying graph with `npm run audit:unused:raw` | Public repository paths, package names and exported symbols; no database records, secrets or user data | Reviewed exact-set baseline that makes new and stale unused-code findings fail CI until classified | Remove only when a replacement repository-hygiene control is merged with equivalent exact drift detection and the classified follow-ups are preserved |
<!-- content-source-inventory:end -->

## Change rules

- Add or update the inventory in the same change that introduces, renames or
  retires a dataset family or supported importer input.
- Candidate and retained-evidence paths must not be wired directly into an
  importer. Promotion creates or updates a canonical path instead.
- A generated audit must name an executable regeneration command and the
  source revision remains the recovery boundary for a dated snapshot.
- Run the focused consistency check with:

  ```bash
  node --test tests/operations/importers/content-source-inventory.test.mjs
  ```

The check rejects missing inventory paths, overlapping classifications,
unregistered CSV or JSON dataset files and supported importer inputs whose
consumer is not named in the inventory.
