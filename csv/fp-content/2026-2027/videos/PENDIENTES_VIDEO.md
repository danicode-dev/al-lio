# Vídeos pendientes de curar — AL-LÍO FP

Actualizado tras corregir un problema real de encaje temático detectado el 2026-08-06 (ver sección "Qué pasó" abajo).

## Estado actual de cobertura

- **250** recursos en el catálogo.
- **57** tienen un vídeo real que pasa los 5 filtros estrictos Y un encaje temático verificado manualmente (45 de la curación del 2026-08-05 + 12 nuevos, verificados uno a uno, del lote de ChatGPT del 2026-08-06).
- **19 vídeos distintos** en total. Tope de reutilización de 5 por vídeo, verificado también contra la base de datos real. 0 vídeos compartidos entre grupos de ciclo distintos (AF/MP/TSAF/DEV) — verificado con consulta directa.
- Por ciclo: AF 8, DEV 40, MP 5, TSAF 4.

## Qué pasó (2026-08-06, corregido en el mismo día)

Un primer intento incorporó 54 vídeos del lote de ChatGPT aceptando cualquier candidato que compartiera **al menos una** etiqueta de competencia con el recurso, incluidas etiquetas de tipo `recursos_compatibles` que el propio JSON de origen ya traía. Esto coló bastantes emparejamientos sin sentido temático real: un vídeo de "Marketing" asignado a "Auxiliar administrativo", un vídeo de "Word" a un curso de "Dirección y edición de vídeo", vídeos de "Power BI" o "Python" a herramientas concretas (ContaSol, Nominasol, Garmin Connect, Strava...) que no tienen nada que ver. Esto es justo lo que provocó que un mismo puñado de vídeos genéricos apareciera repetido en recursos de distintos ciclos — incluido al menos un caso real de un vídeo compartido entre AF y MP y otro entre MP y TSAF.

Se corrigió revisando los 54 uno por uno por sentido temático real (no solo por coincidencia de texto): de 54, solo **12 pasaron la revisión manual**. Los otros 42 se quitaron de `fp_content_items.video_url` en la base de datos y vuelven a la lista de pendientes de abajo.

**Lección aplicada:** de aquí en adelante, ningún vídeo se acepta solo porque el JSON de origen lo etiquete como compatible o comparta una palabra de competencia — tiene que superar una revisión de que el tema real del vídeo coincide con el tema real del recurso.

## Patrón estructural en lo que sigue pendiente: recursos `herramienta`

Buena parte de los 42 que se revirtieron eran de tipo `herramienta` (software concreto: ContaSol, Nominasol, sede electrónica AEAT, Garmin Connect, Strava, TrainerRize, HexFit, Google Forms, Meta Business Suite, Search Console...). Para estas apps/portales específicos casi nunca existe un tutorial real de YouTube de 45+ minutos y 300k+ visitas — son herramientas de nicho, no cursos masivos. Esto no es un fallo de búsqueda, es que probablemente ese tipo de recurso necesita otro criterio (ej. aceptar vídeos más cortos, o la documentación oficial del fabricante en vez de vídeo) en vez de forzar el mismo estándar que usamos para "aprende Excel" o "aprende Python". Pendiente de que Daniel decida si se relaja el criterio para `herramienta` o se deja sin vídeo por diseño.

## Patrón ya documentado: recursos `evidencia_recomendada`

23 recursos de tipo `evidencia_recomendada` siguen sin vídeo por una razón de esquema, no de búsqueda: están enlazados a sus competencias con `tipo_relacion=demuestra`, que la lógica de la ruta (`getLearningItemsForCompetencies`) excluye a propósito de la resolución de vídeo. Ver commit anterior para el detalle — sigue pendiente de decisión de producto, no se ha tocado en esta corrección.

## Regla que debe cumplir cualquier vídeo nuevo

1. Duración individual mínima de **45 minutos** (vídeo real, no playlist).
2. Al menos **300.000 visualizaciones** en ese vídeo concreto (no la media del canal).
3. Relación **directa** con el ciclo formativo y la competencia indicada — no genérico ni de otro área. **El título y el tema real del vídeo tienen que coincidir con el recurso, no solo compartir una etiqueta.**
4. Canal especializado, verificado, institucional o con fiabilidad editorial suficiente.
5. URL de un único vídeo auditable — **nunca una playlist**.

Si no hay ningún vídeo real que cumpla las 5 condiciones para un recurso, mejor dejarlo sin vídeo que forzar uno que no encaje.

Lista completa de los 42 revertidos + los 23 `evidencia_recomendada` + el conflictivo original: ver `conflictivos_2026-08-06.json` en `source-2026-08-06-chatgpt/`.
