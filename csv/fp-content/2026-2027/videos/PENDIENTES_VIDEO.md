# Vídeos pendientes de curar — AL-LÍO FP

Actualizado tras dos correcciones seguidas el 2026-08-06 (ver "Qué pasó" abajo).

## Estado actual de cobertura

- **250** recursos en el catálogo.
- **80** tienen un vídeo real (45 curación estricta 2026-08-05 + 35 verificados a mano el 2026-08-06, nivel de exigencia "mismo dominio real", no solo "misma herramienta exacta").
- **0** vídeos compartidos entre grupos de ciclo distintos (AF/MP/TSAF/DEV) — verificado contra la base de datos, no solo contra el archivo.
- **0** vídeos por encima del tope de 5 reutilizaciones.
- Variedad real por ciclo (vídeos distintos que un usuario puede llegar a ver navegando sus hackathons): DEV 12, MP 11, AF 5, TSAF 5.

## Qué pasó (2026-08-06, dos correcciones en el mismo día)

**Intento 1** (54 vídeos): aceptaba un candidato con que compartiera una sola etiqueta de competencia. Coló emparejamientos sin sentido temático real y dos fugas entre ciclos. Corregido revisando uno a uno — quedó en 12.

**Intento 2, tras que Daniel siguiera viendo repetición** (bajado a 12 vídeos distintos totales entre AF/MP/TSAF): técnicamente correcto pero demasiado poco para no notarse — en AF, por ejemplo, solo había 2 vídeos distintos sirviendo a los 9 hackathons del ciclo (uno de ellos usado en los 9). Eso es indistinguible de "siempre el mismo vídeo" aunque cada emparejamiento fuera válido. Se relajó el criterio de "misma herramienta exacta" a "mismo dominio real" (ej. Power BI vale para un recurso de Looker Studio o Google Analytics — distinto software, mismo dominio de dashboards/datos; un vídeo de cardio vale para "fundamentos de entrenamiento" — no para "usar la app Strava"). Se recuperaron 23 de los 42 revertidos en el intento 1, dejando 35 aprobados.

**Bug adicional encontrado y arreglado en el proceso:** `scripts/import-fp-resource-videos.mjs` solo hacía `UPDATE` de las filas presentes en `recursos_video.json` — nunca limpiaba `video_url` de un `id_slug` que desaparecía del archivo entre una ejecución y la siguiente. Esto causó que un vídeo revertido en el intento 2 se quedara "fantasma" en la base de datos y siguiera generando una fuga entre ciclos ya arreglada en el archivo pero no en la BD real. El script ahora hace una sincronización completa: limpia cualquier `video_url` que ya no esté en el JSON antes de aplicar las filas actuales, en la misma transacción.

## Regla vigente para cualquier vídeo nuevo

1. Duración individual mínima de **45 minutos** (vídeo real, no playlist).
2. Al menos **300.000 visualizaciones** en ese vídeo concreto.
3. Mismo **dominio real** que el recurso (no hace falta ser la herramienta exacta, pero sí el mismo área — dashboards/BI, ofimática, marketing digital, desarrollo, entrenamiento físico... — nunca un tema sin relación real).
4. Canal especializado, verificado, institucional o con fiabilidad editorial suficiente.
5. URL de un único vídeo auditable — nunca una playlist.
6. **Nunca el mismo vídeo entre dos grupos de ciclo distintos** (AF/MP/TSAF/DEV) — se verifica contra la base de datos real en cada import, no solo contra el archivo de origen.

## Recursos que siguen sin vídeo (43)

Dos grupos, documentados en `source-2026-08-06-chatgpt/conflictivos_2026-08-06.json`:

- **19** con mezcla de dominio real (software de nicho sin tutorial real de 45+min/300k+visitas: ContaSol, CIRCE, Sede AEAT, Garmin Connect, Strava, HexFit, TrainerRize, Kinovea...; o un tema genuinamente distinto). Pendiente de que Daniel decida si se relaja aún más el criterio para herramientas de nicho o se dejan sin vídeo.
- **1** (`af_camara_nominas_seguros_sociales_2026`) sin ningún candidato con relación real en los 4 lotes.
- **23** `evidencia_recomendada` sin vídeo por diseño: enlazados con `tipo_relacion=demuestra`, que la lógica de rutas excluye a propósito de la resolución de vídeo (`getLearningItemsForCompetencies` solo usa `desarrolla`/`apoya`). Es una decisión de producto pendiente, no un hueco de datos.
