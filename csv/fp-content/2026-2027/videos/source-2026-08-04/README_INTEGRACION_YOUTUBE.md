# AL LÍO — Integración interna de vídeos de YouTube

## Objetivo

El paquete relaciona las competencias, criterios y oportunidades del roadmap con vídeos o playlists de YouTube que pueden mostrarse dentro de AL LÍO mediante el reproductor oficial.

## Modelo de datos recomendado

- `youtube_resources`: una fila por vídeo o playlist.
- `competency_youtube_resources`: segmentos, orden, objetivo y tipo de cobertura.
- `criterion_youtube_resources`: criterio y recurso principal.
- `item_youtube_lessons`: ruta de cada hackatón, evento, práctica o recurso.
- `user_video_progress`: segundos vistos, último segundo y fecha.
- `user_video_notes`: nota, timestamp, competencia y lección.
- `user_evidence`: evidencia que permite completar la aptitud.

## Reproductor

Usa la YouTube IFrame Player API. Las URL incluidas emplean `youtube-nocookie.com`, `enablejsapi=1`, subtítulos y tiempo inicial. Para detener un tramo exactamente en `fin_segundos`, controla el reproductor con la IFrame API, porque `endSeconds` está soportado de forma fiable mediante la sintaxis de objeto de la API.

En producción:

1. Añade `origin` con el dominio real de AL LÍO.
2. No anules ni tapes controles o marca de YouTube.
3. No descargues, copies ni almacenes el audio o el vídeo.
4. Conserva un botón fallback `Abrir en YouTube`.
5. Envía un `Referer` válido; evita políticas de referrer que eliminen totalmente el origen.
6. Comprueba periódicamente disponibilidad, inserción, restricción de edad y cambios de privacidad.

## Progreso y notas

Eventos recomendados:

- `onReady`: cargar el último segundo guardado.
- `onStateChange`: iniciar/parar el guardado periódico.
- Cada 10-15 segundos: guardar progreso, nunca cada segundo.
- Al crear una nota: capturar `player.getCurrentTime()`.
- Al finalizar el segmento: mostrar la actividad, no completar automáticamente la aptitud.

## Regla de finalización

`video finalizado` y `competencia demostrada` son estados distintos. Para marcar una competencia como demostrada deben cumplirse sus criterios y guardarse la evidencia mínima del roadmap.

## Fiabilidad y curación

El paquete prioriza canales oficiales, fabricantes, organizaciones institucionales y creadores profesionales reconocidos. Aun así, algunos contenidos —especialmente TSAF acuático/musical, normativa laboral/fiscal e inglés específico— quedan marcados como cobertura parcial y aparecen en `cola_revision_videos_parciales.csv`.

## Seguridad TSAF

Un vídeo de RCP/DEA sirve como introducción o repaso. No sustituye formación práctica, certificación, evaluación presencial ni protocolos de emergencia vigentes.
