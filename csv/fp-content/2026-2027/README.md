# AL-LIO FP content catalog 2026-2027

This folder stores the raw source CSVs for the FP personalization catalog.

## Files

- `raw/daw-dam.csv`: shared Desarrollo de Aplicaciones source data for DAW and DAM.
- `raw/administracion-finanzas.csv`: Administracion y Finanzas source data.
- `raw/acondicionamiento-fisico.csv`: Acondicionamiento Fisico source data.
- `raw/marketing-publicidad.csv`: Marketing y Publicidad source data.

## Current scope

These CSVs are versioned as raw input. They are not imported by the app yet.

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
