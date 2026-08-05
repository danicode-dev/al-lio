# Vídeos pendientes de curar — AL-LÍO FP

Actualizado tras la incorporación del lote de vídeos vía ChatGPT del 2026-08-06.

## Estado actual de cobertura

- **250** recursos en el catálogo.
- **99** tienen un vídeo real que pasa los 5 filtros estrictos (45 de la curación del 2026-08-05 + 54 nuevos del 2026-08-06).
- **24** recursos de tipo accionable (curso, herramienta o evidencia) siguen sin vídeo — listados abajo.
- Los ~127 restantes del catálogo son de tipo directorio/referencia (instituto, fuente de noticias, comunidad, empleo, beca, evento, reto, convocatoria) y no necesitan vídeo — ya están bien servidos por su enlace externo.
- Tope de reutilización: ningún vídeo se usa como principal en más de 5 recursos (verificado también contra la base de datos real, no solo contra el CSV/JSON de origen).

## Patrón importante en lo que queda pendiente

De los 24 recursos sin vídeo, **23 son de tipo `evidencia_recomendada`** (proyectos/evidencias de síntesis, ej. "Plan de marketing integrado", "Programa progresivo de fuerza de doce semanas") y solo 1 es un curso normal (`af_camara_nominas_seguros_sociales_2026`).

Esto no es casualidad y tiene una causa concreta en el esquema, no solo "son más dificiles de encajar": en `item_competencias.csv`, los recursos `evidencia_recomendada` están enlazados a sus competencias con `tipo_relacion = "demuestra"` (este item demuestra que ya dominas la competencia), no `"desarrolla"`/`"apoya"` (este item te enseña la competencia). La consulta que resuelve qué vídeo mostrar en una ruta (`getLearningItemsForCompetencies`) **solo mira `desarrolla`/`apoya` a propósito** — así que aunque le pongamos un `video_url` a un recurso `demuestra`, la ruta de un hackathon nunca lo va a elegir como paso enseñable; como mucho se vería si alguien entra directamente a la página propia de ese recurso.

Antes de buscarles vídeo, hay una decisión de producto pendiente (no solo de datos): ¿tiene sentido que un recurso "demuestra tu dominio" enseñe con un vídeo, o su naturaleza es ser el ejercicio final después de ver los vídeos de los recursos `desarrolla`/`apoya` de esas mismas competencias? Mientras no se decida, mejor dejarlos sin vídeo que forzar un candidato de encaje débil.

## Regla que debe cumplir cualquier vídeo nuevo

1. Duración individual mínima de **45 minutos** (vídeo real, no playlist).
2. Al menos **300.000 visualizaciones** en ese vídeo concreto (no la media del canal).
3. Relación **directa** con el ciclo formativo y la competencia indicada — no genérico ni de otro área.
4. Canal especializado, verificado, institucional o con fiabilidad editorial suficiente.
5. URL de un único vídeo auditable — **nunca una playlist**.

Si no hay ningún vídeo real que cumpla las 5 condiciones para un recurso, mejor dejarlo sin vídeo que forzar uno que no encaje.

## Los 24 recursos sin vídeo

### AF (8)

- **af_camara_nominas_seguros_sociales_2026** — Gestión de nóminas y seguros sociales para tu empresa (curso_complementario)
- **af_evidencia_calendario_fiscal_pyme** — Calendario fiscal y checklist de cumplimiento (evidencia_recomendada)
- **af_evidencia_ciclo_contable_completo** — Caso completo de ciclo contable y cierre (evidencia_recomendada)
- **af_evidencia_dashboard_financiero_power_bi** — Dashboard financiero en Power BI (evidencia_recomendada)
- **af_evidencia_expediente_nomina_cotizacion** — Expediente laboral de nómina y cotización (evidencia_recomendada)
- **af_evidencia_factura_electronica_firmada** — Flujo de factura electrónica (evidencia_recomendada)
- **af_evidencia_plan_empresa_circe** — Plan administrativo de creación de empresa (evidencia_recomendada)
- **af_evidencia_presupuesto_tesoreria_excel** — Presupuesto y previsión de tesorería en Excel (evidencia_recomendada)

### DAW/DAM (1)

- **daw_evidencia_pwa_offline** — PWA instalable con modo offline (evidencia_recomendada)

### MP (7)

- **mp_evidencia_calendario_contenidos** — Calendario editorial multicanal (evidencia_recomendada)
- **mp_evidencia_campana_email** — Secuencia de email marketing (evidencia_recomendada)
- **mp_evidencia_campana_google_ads** — Campaña simulada de Google Ads (evidencia_recomendada)
- **mp_evidencia_campana_social_ads** — Campaña de Meta Ads con variantes creativas (evidencia_recomendada)
- **mp_evidencia_dashboard_marketing** — Dashboard de rendimiento de marketing (evidencia_recomendada)
- **mp_evidencia_investigacion_mercado** — Investigación de mercado con encuesta (evidencia_recomendada)
- **mp_evidencia_plan_marketing_integrado** — Plan de marketing integrado (evidencia_recomendada)

### TSAF (8)

- **tsaf_evidencia_acondicionamiento_agua** — Programa básico de acondicionamiento físico en el agua (evidencia_recomendada)
- **tsaf_evidencia_plan_emergencia_dea** — Plan de actuación ante emergencias en una sala fitness (evidencia_recomendada)
- **tsaf_evidencia_programa_fuerza_12_semanas** — Programa progresivo de fuerza de doce semanas (evidencia_recomendada)
- **tsaf_evidencia_programa_personas_mayores** — Programa de ejercicio para personas mayores (evidencia_recomendada)
- **tsaf_evidencia_servicio_entrenamiento_personal** — Servicio completo de entrenamiento personal (evidencia_recomendada)
- **tsaf_evidencia_sesion_soporte_musical** — Sesión colectiva con soporte musical (evidencia_recomendada)
- **tsaf_evidencia_valoracion_inicial** — Protocolo de valoración inicial y consentimiento (evidencia_recomendada)
- **tsaf_evidencia_videoanalisis_kinovea** — Análisis técnico de movimiento con Kinovea (evidencia_recomendada)

Lista completa con competencias exactas por recurso: ver `conflictivos_2026-08-06.json` (mismo directorio que este archivo, en `source-2026-08-06-chatgpt/`).
