# AL-LIO recursos con video curado

Capa opcional y separada del catalogo FP: asocia un video de YouTube de
confianza a un recurso ya existente (`fp_content_items.id_slug`), para que
se pueda ver dentro de AL-LIO (`/ruta/[slug]`) en vez de mandar al usuario
fuera de la app.

No reemplaza ni modifica el catalogo base — es una tabla de referencias
(`id_slug -> video_url`) que se puede ampliar fila a fila cuando haya un
video curado para ese recurso. Un `id_slug` sin fila aqui simplemente no
tiene video todavia; la app muestra el recurso igual, sin reproductor.

## Columnas

- `id_slug`: debe existir ya en `csv/fp-content/2026-2027/raw/*.csv`.
- `video_url`: URL completa de YouTube (`https://www.youtube.com/watch?v=...`
  o `https://youtu.be/...`).
- `notas`: opcional, contexto interno (por que se eligio ese video, quien lo
  reviso, etc.). No se muestra al usuario.

## Import

```bash
npm run import:fp-resource-videos
```

Idempotente. Si un `id_slug` no existe en el catalogo ya importado, se
reporta y se salta esa fila en vez de fallar todo el import.

## Origen de los datos (2026-08-05, curacion estricta — vigente)

Las filas actuales de `recursos_video.csv` vienen de
`source-2026-08-05-curado/` (`AL_LIO_ROADMAPS_FP_YOUTUBE_CURADO_2026_08_05.zip`),
que sustituye a la entrega del 2026-08-04. Un video solo entra en
`recursos_video.csv` si pasa los 5 filtros de `auditoria_youtube_estricta_todos_ciclos.csv`
(duracion >=45 min, >=300.000 visitas en ese video concreto, relacion
directa con el ciclo/competencia, canal fiable, video unico auditable
— nunca playlist). Ver `PENDIENTES_VIDEO.md` para el detalle completo
de reglas y la lista de recursos que todavia no tienen un video que
las cumpla.

Ademas, ningun video se reutiliza como principal en mas de 5 recursos
distintos (tope fijado a proposito para no repetir el mismo video en
decenas de tarjetas, ver `_tmp-build-curated-videos.mjs` en el
historial de commits para el criterio exacto — no forma parte del
repo, era un script puntual). Los recursos que se quedaron sin video
por el tope de reuso (no porque no hubiera ningun video valido) tambien
aparecen en `PENDIENTES_VIDEO.md`.

### Origen anterior (2026-08-04, superado)

`source-2026-08-04/` (`AL_LIO_ROADMAPS_FP_YOUTUBE_2026_08_04.zip`) fue
la primera entrega: 47 videos/playlists reales verificados manualmente
(canales oficiales, fabricantes, organismos publicos y creadores
profesionales reconocidos), pero sin verificar duracion ni visitas por
video. Se mantiene en el repo solo como referencia historica — ya no
es la fuente de `recursos_video.csv`.

Ese paquete relaciona cada recurso con **varios** videos distintos segun
la competencia desde la que se mire (a veces el mismo video con tramos
de inicio/fin distintos por competencia) — mas rico que el modelo actual
de `recursos_video.csv`, que solo admite un video por recurso.

`csv/fp-content/2026-2027/videos/../scripts` no incluye el script que
genero `recursos_video.csv` desde ese paquete (fue un script puntual, no
commiteado); el criterio de seleccion por recurso fue: preferir la fila
`obligatoria_para_item = si`, luego menor `orden_preparacion`, luego
mayor `fiabilidad_1_5`. Al ser el primer video "principal" del recurso,
en algunos casos no es el mas obvio tematicamente (ej. un recurso de
Docker mostrando un video de diseno de bases de datos, porque asi quedo
etiquetada su competencia principal en la importacion de competencias
original) — pendiente de revisar caso a caso si hace falta.

Extension futura pendiente: usar `items_competencias_videos_youtube.csv`
(en `source-2026-08-04/`) para mostrar el video **especifico de cada
competencia** con su tramo de inicio/fin exacto, en vez de un unico video
por recurso. Requiere ampliar `fp_item_competencies` con columnas de
video/tramo y que `/ruta/[slug]` acepte un tramo opcional.

`cola_revision_videos_parciales.csv` (tambien en `source-2026-08-04/`)
es el backlog editorial de competencias con cobertura solo parcial —
util para priorizar que videos sustituir mas adelante.
