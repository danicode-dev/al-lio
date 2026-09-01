# Eventos y hackathones de Andalucía 2026/2027 — lote base

Origen: `AL_LIO_EVENTOS_HACKATHONES_ANDALUCIA_2026_2027_BASE_FASE1.json`
(archivado tal cual en esta carpeta), 120 registros (30 por ciclo: DAW/DAM,
AF, MP, TSAF), entregado por Daniel el 2026-08-06.

Las 120 filas se incorporaron directamente a `csv/fp-content/2026-2027/raw/*.csv`
(añadidas al final de cada archivo del ciclo correspondiente) y ya están
importadas en `fp_content_items` / `fp_content_cycle_fit`. Catálogo total:
250 -> 370 items.

This directory is `retained evidence`, not a current importer input. The
transformed rows under `../raw/` are the supported FP content source. See the
[content source inventory](../../../../docs/integrations/CONTENT_SOURCE_INVENTORY.md)
for the retention and removal boundary.

## Qué NO incluye todavía esta importación

**Ninguno de los 120 tiene competencias asignadas** (`fp_item_competencies`).
El archivo de origen no las traía. Eso significa que, tal como se importaron,
estos recursos aparecen en la app como tarjetas normales (nombre, fechas,
organizador, enlace) pero **sin chips de "Aptitudes" ni botón "Abrir ruta"**
— degradan bien, no rompen nada, simplemente no tienen guía todavía. Enlazar
competencias es la siguiente fase, pendiente de decidir con Daniel.

## Decisiones de mapeo tomadas (documentadas para poder revisarlas)

El archivo de origen no usa directamente los valores que la app espera
(`tipo`, `estado`, etc. tienen un enum cerrado — ver
`scripts/validate-fp-content-csv.mjs`), así que se mapearon por palabras
clave. Si algo no queda bien clasificado, es aquí donde hay que corregirlo:

- **`tipo`** (campo `categoria_app` + `tipo_recurso` del origen, en ese orden
  de prioridad):
  - contiene "hackathon" -> `hackathon`
  - contiene "reto"/"concurso"/"premio" (y NO es un curso/formación) -> `reto`
  - contiene "beca" -> `beca`
  - contiene "fuente" (agendas/calendarios pensados como fuente a vigilar,
    no un evento con fecha concreta) -> `fuente_noticias`
  - contiene "comunidad" (y no es congreso/feria) -> `comunidad`
  - cualquier otro caso (congresos, foros, jornadas, ferias, programas...)
    -> `evento`
  - Reparto resultante: hackathon 6, evento 59, reto 2, fuente_noticias 50,
    comunidad 3.

- **`estado`** (campo `estado_2026_2027` del origen):
  - contiene "pendiente" -> `pendiente_convocatoria`
  - contiene "monitorizar" o "revisar" -> `revisar`
  - resto (confirmada/activa/activo) -> `activo`

- **`ciclo_siglas` para los 30 de "DAW/DAM"**: el origen no distingue entre
  DAW y DAM (los 30 registros son genéricos de tecnología/innovación, sin
  ninguno con enfoque móvil/Android claro). Se asignaron todos como `DAW`
  por simplicidad. No cambia la visibilidad en la app (`DAW` y `DAM` se
  agrupan igual en `cycle_group = DEV`), pero si a Daniel le importa la
  distinción exacta por ciclo, hay que revisarlos uno a uno.

- **Campos que el origen no traía y son obligatorios en el catálogo**
  (`coste`, `certificacion`): se rellenaron con `"no consta"` en los 120.
  `practicas` se dejó en `"no"` (ninguno de estos 120 es una oferta de
  prácticas). `accion_sugerida` se generó con una frase genérica según el
  `tipo` final (ver `scripts/` — no hay script committeado, fue puntual).

- **`id_slug`**: generado a partir del título (`<ciclo>_<titulo-slugificado>`,
  truncado a límite de caracteres cortando por palabra completa, nunca a
  mitad de palabra). Se verificó que no colisiona con ninguno de los 250
  `id_slug` ya existentes en el catálogo.

- **`notas`**: cada fila conserva el `alcance`, el `filtro_o_seguimiento`,
  las `observaciones` y el estado original tal cual venía en el origen, más
  un aviso explícito de que el propio archivo de Daniel marcaba las 120
  filas como `requiere_revision_antes_publicar: "Sí"` — queda visible para
  quien revise el dato, no se ocultó.

## Siguiente paso

Enlazar competencias reales a estos 120 recursos (mismo patrón que
`csv/fp-content/2026-2027/competencias/item_competencias.csv` para los 250
originales) para que empiecen a mostrar Aptitudes y, más adelante, vídeo.
