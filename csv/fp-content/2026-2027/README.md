# AL-LIO FP content catalog 2026-2027

This folder stores the reviewed, versioned source material for the FP
personalization catalog. The repository-wide ownership and retention contract
is recorded in
[`docs/integrations/CONTENT_SOURCE_INVENTORY.md`](../../../docs/integrations/CONTENT_SOURCE_INVENTORY.md).

## Files

- `raw/daw-dam.csv`: shared Desarrollo de Aplicaciones source data for DAW and DAM.
- `raw/administracion-finanzas.csv`: Administracion y Finanzas source data.
- `raw/acondicionamiento-fisico.csv`: Acondicionamiento Fisico source data.
- `raw/marketing-publicidad.csv`: Marketing y Publicidad source data.

## Current scope

These CSVs are classified as `raw` because they preserve the editorial source
shape. They are supported inputs to `import:fp-content`, but the application
does not read them at runtime; delivered content lives in PostgreSQL.

The intended MVP behavior is:

- DAW and DAM are treated as one shared DEV group while preserving each row's original `ciclo_siglas`.
- AF, TSAF and MP remain separate profile groups.
- `empleo_busqueda` rows are kept in the raw source, but should not be shown as static MVP content because job data expires quickly.
- First-year profiles should prioritize basic courses, tools, resources and simple evidence.
- Second-year profiles should prioritize complementary courses, challenges, hackathons, practice calls and demonstrable projects.

## Validation

Run:

```bash
npm run validate:fp-content
```

The validator checks headers, duplicate ids, cycles, priorities, fit score, URLs and date formatting before these files are used by import scripts.

## Import

Apply the PostgreSQL schema first, then import the catalog:

```bash
npm run postgres:setup
npm run import:fp-content
```

The importer upserts every raw row into the FP catalog tables. `empleo_busqueda` rows are imported so the source is preserved, but the MVP repository keeps them hidden by default because they expire quickly.
