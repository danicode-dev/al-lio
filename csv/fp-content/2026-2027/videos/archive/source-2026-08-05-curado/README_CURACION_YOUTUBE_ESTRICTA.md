# Curación estricta de vídeos de YouTube — AL LÍO

Fecha de revisión: **2026-08-05**.

## Regla aplicada

Un vídeo solo puede publicarse automáticamente como curso principal cuando cumple simultáneamente:

1. Duración individual mínima de **45 minutos**.
2. Al menos **300.000 visualizaciones por vídeo** (no la media del canal).
3. Relación directa con el ciclo y la competencia.
4. Canal especializado, verificado, institucional o con fiabilidad editorial suficiente.
5. URL de vídeo único auditable; las playlists no se autopublican.

## Campos clave para IA

- `estado_curacion_ia`: clasificación final.
- `accion_recomendada_ia`: instrucción cerrada para el agente.
- `video_sustituto_id` y `video_sustituto_url`: sustitución concreta cuando existe.
- `tipo_encaje_sustituto`: distingue reemplazos directos, amplios válidos y parciales no automáticos.
- `sustitucion_automatica_permitida`: evita que la IA invente reemplazos.
- `publicar_como_principal`: control definitivo de publicación.
- `cumple_min_45m`, `cumple_min_300k`, `relevancia_directa_ciclo`: validaciones atómicas.

## Estados

- `APROBADO_PRINCIPAL`: puede ser curso nuclear.
- `APROBADO_APOYO`: cumple métricas, pero es transversal.
- `SOLO_COMPLEMENTARIO_OFICIAL` / `SOLO_COMPLEMENTARIO_FIABLE`: útil, pero incumple al menos un umbral.
- `REEMPLAZAR_INMEDIATAMENTE`: playlist, contenido ajeno al ciclo o fallo claro.
- `REVISAR_METRICAS`: no hay evidencia suficiente para publicar.

## Importante

Las visualizaciones cambian con el tiempo. El campo `fecha_verificacion_metricas` marca la fotografía usada. Antes de una actualización importante se deben refrescar las métricas con la API de YouTube Data o una revisión manual.

En TSAF no se ha rebajado el estándar para llenar huecos: cuando no existe un vídeo especializado que supere los tres filtros, el recurso queda en `BUSCAR_NUEVO_CANDIDATO` y no se sustituye por contenido genérico o ajeno.
