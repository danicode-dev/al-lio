# AL-LIO recursos con video curado

Capa opcional y separada del catalogo FP: asocia un video de YouTube de
confianza a un recurso ya existente (`fp_content_items.id_slug`), para que
se pueda ver dentro de AL-LIO (`/ruta/[slug]`) en vez de mandar al usuario
fuera de la app.

No reemplaza ni modifica el catalogo base — es un mapa de referencias
(`id_slug -> video_url`) que se puede ampliar cuando haya un video curado
para ese recurso. Un `id_slug` sin entrada aqui simplemente no tiene video
todavia; la app muestra el recurso igual, sin reproductor.

`recursos_video.json` is the `canonical` importer input. The dated
`source-2026-08-06-video-candidates/` batches are `candidate` evidence and have
no publication authority. Their retention and removal conditions are defined
in the
[content source inventory](../../../../docs/integrations/CONTENT_SOURCE_INVENTORY.md).

## Formato: JSON desde 2026-08-06

`recursos_video.json` es la fuente activa. Objeto con un array `recursos`,
cada elemento con las mismas tres columnas que antes:

- `id_slug`: debe existir ya en `csv/fp-content/2026-2027/raw/*.csv`.
- `video_url`: URL completa de YouTube (`https://www.youtube.com/watch?v=...`
  o `https://youtu.be/...`).
- `notas`: opcional, contexto interno (por que se eligio ese video, de que
  fuente viene, cuantas competencias en comun tenia, etc.). No se muestra
  al usuario.

Este dominio usaba CSV hasta el 2026-08-05 (`recursos_video.csv`, retirado
del arbol de trabajo el 2026-08-06 — sigue en el historial de git). Se
cambia a JSON porque los lotes que llegan ahora (candidatos de video vía
ChatGPT) ya vienen en JSON de origen, y porque `notas`/futuras listas
anidadas (varias competencias, varios candidatos de reserva) encajan mejor
en JSON que en filas planas de CSV — no es una migracion del resto del
catalogo, que sigue en CSV en `csv/fp-content/2026-2027/raw/` y
`csv/fp-content/2026-2027/competencias/` sin cambios.

## Import

```bash
npm run import:fp-resource-videos
```

Idempotente. Si un `id_slug` no existe en el catalogo ya importado, se
reporta y se salta esa fila en vez de fallar todo el import. Si hay
`id_slug` duplicados dentro de `recursos_video.json`, el import falla
entero antes de tocar la base de datos (evita que un duplicado silencioso
pise una fila valida).

## Origen de los datos (2026-08-06, ChatGPT + revision manual de encaje — vigente)

4 lotes de candidatos (uno por ciclo/grupo: TSAF, DAW/DAM, AF, MP) generados
por ChatGPT a partir de los prompts en `PROMPT_DEV.md` / `PROMPT_AF.md` /
`PROMPT_MP.md` / `PROMPT_TSAF.md` (no committeados, son prompts de trabajo,
no datos del catalogo). Los 4 JSON crudos estan archivados en
`source-2026-08-06-video-candidates/` para trazabilidad.

**Primer intento (revertido el mismo dia):** cruzar cada candidato contra el
recurso pendiente por coincidencia directa de `id_slug` (si el JSON de
origen ya lo etiquetaba en `recursos_compatibles`) o por al menos una
competencia en comun con `item_competencias.csv`. Resolvio 54 recursos, pero
aceptar una sola coincidencia de texto sin comprobar el tema real del video
dejo pasar emparejamientos incorrectos (ej. un video de "Marketing" en un
curso de "Auxiliar administrativo", un video de "Word" en un curso de
"edicion de video") — visible en produccion como videos repetidos/genericos
en varios ciclos. Ver `PENDIENTES_VIDEO.md` para el detalle completo del
incidente.

**Segunda correccion (mismo dia):** con el criterio de "misma herramienta
exacta" del primer arreglo, AF quedo con solo 2 videos distintos sirviendo
a sus 9 hackathons (uno de ellos en los 9) — tecnicamente correcto pero
indistinguible en la practica de "siempre el mismo video". Se relajo el
criterio a "mismo dominio real" (ej. un video de Power BI vale para un
recurso de Looker Studio o Google Analytics — distinto software, mismo
dominio de datos/dashboards) y se recuperaron 23 de los 42 revertidos,
dejando 35 aprobados (12 + 23). Tambien se encontro y arreglo un bug real
en `import-fp-resource-videos.mjs`: solo hacia `UPDATE` de las filas
presentes en el JSON, nunca limpiaba `video_url` de un recurso que
desaparecia entre una ejecucion y la siguiente — un video ya revertido en
el archivo seguia "fantasma" en la base de datos real. El import ahora
sincroniza completo (limpia lo que ya no esta en el JSON) en cada ejecucion.

Se mantiene el tope de 5 reutilizaciones por video y **0 videos compartidos
entre grupos de ciclo distintos** (AF/MP/TSAF/DEV) — verificado con consulta
directa a la base de datos tras cada import, no solo contra el archivo de
origen.

### Origen previo (lotes pre-Radar 2026-08-04 / 2026-08-05, retirados)

Las entregas de arranque anteriores a Radar (los lotes `source-2026-08-04` y
`source-2026-08-05-curado`, antes bajo `archive/`) se han retirado del arbol
actual. Siguen
siendo recuperables por el historial de Git y **no son fuentes de runtime**. La
fuente canonica vigente de este dominio es `recursos_video.json`; el catalogo de
competencias vive en `habilidades.csv`, `ciclo_habilidades.csv` e
`item_competencias.csv`.
