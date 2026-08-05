# Vídeos pendientes de curar — AL-LÍO FP

Actualizado tras el lote de recursos de nicho del 2026-08-06 (ver "Criterio vigente" abajo — Daniel pidió explícitamente ser menos estrictos).

## Estado actual de cobertura

- **250** recursos en el catálogo.
- **98** tienen un vídeo real (45 curación estricta 2026-08-05 + 35 "mismo dominio" + 18 "genérico amplio" del 2026-08-06).
- **1** recurso sigue sin vídeo porque ni siquiera hay un candidato genérico razonable (`tsaf_iad_accesibilidad_instalaciones`) — se respetó el "no" honesto en vez de forzar uno.
- Tope de reutilización: 5, con **una excepción documentada a propósito**: un vídeo de entrenamiento físico se usa en 7 herramientas de nicho de TSAF (Garmin Connect, Hexfit, Kinovea, Polar Flow, Strava, Trainerize, TrainingPeaks) porque ninguna tiene tutorial propio y todas comparten el mismo fondo técnico — pedido explícito de Daniel, no un descuido.
- **1 vídeo compartido entre AF y TSAF** (un curso de Excel, usado en `af_camara_auxiliar_administrativo_2026` y `tsaf_herramienta_excel`): a diferencia de las fugas de la corrección anterior, este caso es intencional — los dos ciclos necesitan genuinamente Excel básico y no tiene sentido buscar dos vídeos distintos solo para mantenerlos separados. Si Daniel prefiere evitarlo del todo, avisar para buscar una alternativa exclusiva de uno de los dos.

## Criterio vigente (2026-08-06, más permisivo a petición de Daniel)

Tras las correcciones de esta misma tarde, Daniel pidió explícitamente bajar aún más el nivel de exigencia: no hace falta el vídeo exacto del recurso ni de la herramienta concreta — vale cualquier curso o vídeo real y verificado que trate el mismo tema de fondo (ej. "si el hackathon de GSoC recomienda Java, vale un curso de Java", aunque no sea el curso oficial de ninguna organización concreta). Las 5 reglas de fondo (duración ≥45min, ≥300k visitas, canal fiable, vídeo único sin playlist, y ahora *relación amplia* en vez de *relación directa*) siguen aplicando — lo único que cambió es cuánto de específico tiene que ser el encaje temático, y que la reutilización de un mismo vídeo en varios recursos afines ya no se penaliza si el motivo es real (mismo trasfondo, no falta de búsqueda).

## Qué pasó (2026-08-06, dos correcciones en el mismo día)

**Intento 1** (54 vídeos): aceptaba un candidato con que compartiera una sola etiqueta de competencia. Coló emparejamientos sin sentido temático real y dos fugas entre ciclos. Corregido revisando uno a uno — quedó en 12.

**Intento 2, tras que Daniel siguiera viendo repetición** (bajado a 12 vídeos distintos totales entre AF/MP/TSAF): técnicamente correcto pero demasiado poco para no notarse — en AF, por ejemplo, solo había 2 vídeos distintos sirviendo a los 9 hackathons del ciclo (uno de ellos usado en los 9). Eso es indistinguible de "siempre el mismo vídeo" aunque cada emparejamiento fuera válido. Se relajó el criterio de "misma herramienta exacta" a "mismo dominio real" (ej. Power BI vale para un recurso de Looker Studio o Google Analytics — distinto software, mismo dominio de dashboards/datos; un vídeo de cardio vale para "fundamentos de entrenamiento" — no para "usar la app Strava"). Se recuperaron 23 de los 42 revertidos en el intento 1, dejando 35 aprobados.

**Bug adicional encontrado y arreglado en el proceso:** `scripts/import-fp-resource-videos.mjs` solo hacía `UPDATE` de las filas presentes en `recursos_video.json` — nunca limpiaba `video_url` de un `id_slug` que desaparecía del archivo entre una ejecución y la siguiente. Esto causó que un vídeo revertido en el intento 2 se quedara "fantasma" en la base de datos y siguiera generando una fuga entre ciclos ya arreglada en el archivo pero no en la BD real. El script ahora hace una sincronización completa: limpia cualquier `video_url` que ya no esté en el JSON antes de aplicar las filas actuales, en la misma transacción.

## Regla vigente para cualquier vídeo nuevo

1. Duración individual mínima de **45 minutos** (vídeo real, no playlist).
2. Al menos **300.000 visualizaciones** en ese vídeo concreto.
3. Relación **amplia** con el recurso — mismo tema de fondo, no hace falta ser el curso/herramienta exacta (ver "Criterio vigente" arriba). Sigue habiendo un mínimo: el vídeo tiene que tratar realmente ese tema, no solo compartir una palabra suelta.
4. Canal especializado, verificado, institucional o con fiabilidad editorial suficiente.
5. URL de un único vídeo auditable — nunca una playlist.
6. Evitar compartir vídeo entre grupos de ciclo distintos salvo que el motivo sea real y documentado (ver la excepción de Excel arriba) — nunca por descuido, siempre explicado en `PENDIENTES_VIDEO.md`/`README.md` si ocurre.

## Recursos que siguen sin vídeo (25)

- **1** (`tsaf_iad_accesibilidad_instalaciones`) sin ningún candidato ni siquiera genérico — ChatGPT lo dijo explícitamente en vez de inventarse uno.
- **1** (`af_camara_nominas_seguros_sociales_2026`) sin ningún candidato con relación real en los lotes anteriores — no se volvió a intentar con el criterio amplio, pendiente de un intento más si se quiere cerrar del todo.
- **23** `evidencia_recomendada` sin vídeo por diseño: enlazados con `tipo_relacion=demuestra`, que la lógica de rutas excluye a propósito de la resolución de vídeo (`getLearningItemsForCompetencies` solo usa `desarrolla`/`apoya`). Es una decisión de producto pendiente, no un hueco de datos — ver sección de más abajo si existe, o el commit que lo documentó por primera vez.
