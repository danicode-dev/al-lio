# AL-LIO FP competencies 2026-2027

Combined (all 5 cycles) roadmap-of-skills dataset, sourced from the
`AL_LIO_ROADMAPS_FP_2026_2027` package (official Junta de Andalucia curriculum
modules).

## Model

A skill is canonical and cycle-agnostic: if DAW and DAM both need "Git", it is
**one** row in `habilidades.csv`, not two. What differs per cycle (which
skills apply, in what order, at what stage/module) lives in
`ciclo_habilidades.csv`. This replaced an earlier model where every
competency was duplicated per cycle (see `archive/` for the old
`roadmap_competencias.csv` / `relaciones_competencias.csv` — kept for
history, no longer imported).

## Files

- `habilidades.csv`: the canonical skill catalog. One row per distinct
  skill (`skill_id`, title, description, pass criteria, evidence,
  estimated hours). No cycle here on purpose.
- `ciclo_habilidades.csv`: where each skill sits inside a given cycle's
  roadmap (`ciclo_siglas`, `skill_id`, order, stage/`etapa`, official
  module code/name, target level, whether it's part of the base roadmap
  or a before-you-start basic). A skill shared by two cycles has two rows
  here, both pointing at the same `skill_id`. `prerrequisito_texto` is a
  plain, human-readable sentence ("Antes de esto conviene saber: X") — not
  a maintained dependency graph. It's informational only; nothing enforces
  it.
- `item_competencias.csv`: links catalog items (`item_id_slug`, must
  already exist in `fp_content_items`) to skills via `skill_id`.
  `tipo_relacion` is one of:
  - `requiere`: the item (hackathon, convocatoria, evento, reto) requires
    the skill.
  - `ensena`: the item teaches the skill (course, tool, resource) — this
    merges the old `desarrolla`/`apoya` split, which had no functional
    difference (both were always queried together) and only added a way
    to mistag a resource so it silently didn't show up anywhere.
  - `demuestra`: the item is evidence/proof of the skill (a project, a
    deliverable) rather than something that teaches it.

## Validation

```bash
npm run validate:fp-competencias
```

Checks headers, duplicate skill ids, and that every
`item_id_slug`/`skill_id` referenced actually exists.

## Import

Apply the schema first (adds `fp_skills`, `fp_cycle_skills`,
`fp_item_competencies`), then import:

```bash
npm run postgres:setup
npm run import:fp-competencias
```

Rows in `item_competencias.csv` whose `item_id_slug` is not found in
`fp_content_items` are skipped and reported, not silently dropped or fatal.

## Archived snapshots (historical reference, not an import source)

`archive/` keeps the superseded per-cycle competency model. It is retained as
provenance only. **No import, script, test or application code reads it**:
`npm run import:fp-competencias` reads only `habilidades.csv`,
`ciclo_habilidades.csv` and `item_competencias.csv` from this directory. A
repo-wide `git grep` confirms nothing outside `archive/` and this README
references these files.

Do not edit these files as if they were current canonical input. They are a
frozen snapshot; current changes go to the three files listed under "Files".

- **Contents:** `roadmap_competencias.csv`, `relaciones_competencias.csv`.
- **Provenance / date:** the `AL_LIO_ROADMAPS_FP_2026_2027` package; added
  2026-08-04, moved into `archive/` on 2026-08-06 when the model changed.
- **Status:** historical evidence. Not an active import source.
- **Current canonical source:** `habilidades.csv` (cycle-agnostic skills) plus
  `ciclo_habilidades.csv` (per-cycle placement) plus `item_competencias.csv`
  (item-to-skill links), imported by `npm run import:fp-competencias`.
- **Why retained:** it records the earlier design, where every competency was
  duplicated per cycle, so the migration to the current model stays auditable.
- **Known consumers:** none. Runtime must not consume it.
- **Removal / externalisation condition:** once the current skill model has had
  a full release cycle in production and no open question references the old
  per-cycle rows, these two files may be moved to external historical storage by
  an explicit owner decision, leaving a pointer here.
