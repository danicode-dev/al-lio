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
