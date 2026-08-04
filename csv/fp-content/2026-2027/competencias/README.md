# AL-LIO FP competencies 2026-2027

Combined (all 5 cycles) roadmap-of-competencies dataset, sourced from the
`AL_LIO_ROADMAPS_FP_2026_2027` package (official Junta de Andalucia curriculum
modules, converted into an ordered, prerequisite-linked list of competencies
per cycle).

## Files

- `roadmap_competencias.csv`: one row per competency (id, cycle, stage,
  official module, title, description, target level, estimated hours,
  pass criteria summary).
- `relaciones_competencias.csv`: directed prerequisite edges between
  competencies (`competencia_origen_id` must be met before
  `competencia_destino_id`).
- `item_competencias.csv`: links catalog items (`item_id_slug`, must already
  exist in `fp_content_items`) to competencies. `tipo_relacion` is
  `requiere` for items that require a competency (hackathons, convocatorias)
  or `desarrolla` for items that build it (courses, tools, resources).

## Validation

```bash
npm run validate:fp-competencias
```

Checks headers, duplicate competency ids, and that every
`item_id_slug`/`competencia_id` referenced actually exists.

## Import

Apply the schema first (adds `fp_competencies`, `fp_competency_relations`,
`fp_item_competencies`), then import:

```bash
npm run postgres:setup
npm run import:fp-competencias
```

Rows in `item_competencias.csv` whose `item_id_slug` is not found in
`fp_content_items` are skipped and reported, not silently dropped or fatal.
