# Prompt para ChatGPT — competencias de los 30 hackathones/eventos nuevos de TSAF

Copia todo el bloque de abajo (desde "Eres un curador..." hasta el final) y pégalo en un chat nuevo de ChatGPT.

---

Eres un curador de currículo para AL-LÍO, una app para estudiantes de FP Grado Superior en Andalucía. Tengo una lista CERRADA de competencias ya definidas para este ciclo (no inventes ninguna nueva, usa solo las de la lista) y una lista de hackathones/eventos nuevos sin competencias asignadas todavía. Tu tarea: para cada hackathón, elegir entre 3 y 5 competencias de la lista cerrada que un alumno debería preparar antes de participar.

REGLAS:
1. Usa EXCLUSIVAMENTE los `competencia_id` de la lista que te doy abajo — nunca inventes uno nuevo ni cambies el texto.
2. Elige 3 a 5 competencias por hackathón, las más directamente relevantes según su título, descripción y tags.
3. Marca como `obligatoria: true` como máximo 1 o 2 de esas competencias (las realmente imprescindibles), el resto `obligatoria: false` (recomendadas).
4. Si un hackathón es demasiado genérico o no tiene relación clara con ninguna competencia de la lista, indícalo con un array vacío en vez de forzar coincidencias débiles.
5. `orden_preparacion` es un número (1, 2, 3...) que indica en qué orden conviene prepararlas — la más básica primero.

## FORMATO DE RESPUESTA

Devuélveme un único JSON:

```json
{
  "ciclo": "TSAF",
  "asignaciones": [
    {
      "item_id_slug": "el id_slug exacto del hackathon",
      "competencias": [
        { "competencia_id": "XXX-000", "obligatoria": true, "orden_preparacion": 1, "motivo": "una frase breve" }
      ]
    }
  ]
}
```

## Lista cerrada de competencias de TSAF (usa solo estos `competencia_id`)

- TSAF-BAS-001 | Organizar archivos, formularios y hojas de cálculo — Gestiona documentos de usuarios, sesiones, registros y copias con orden y confidencialidad.
- TSAF-BAS-002 | Reconocer anatomía y movimientos fundamentales — Identifica planos, ejes, articulaciones, grupos musculares y patrones de movimiento básicos.
- TSAF-BAS-003 | Comprender respuestas básicas al ejercicio — Distingue frecuencia cardiaca, intensidad, fatiga, recuperación, adaptación y señales de alarma.
- TSAF-BAS-004 | Comunicar instrucciones de forma clara y segura — Da consignas breves, comprueba comprensión y adapta lenguaje a la persona.
- TSAF-BAS-005 | Distinguir alcance profesional, derivación y consentimiento — Reconoce límites del TSAF, evita diagnóstico y obtiene consentimiento para datos, imágenes y pruebas.
- TSAF-VAL-001 | Realizar entrevista inicial y cribado básico — Recoge objetivos, experiencia, disponibilidad, antecedentes declarados y señales que requieren derivación.
- TSAF-VAL-002 | Aplicar pruebas básicas de condición física — Selecciona y ejecuta pruebas de fuerza, resistencia, movilidad y composición dentro de protocolos.
- TSAF-VAL-003 | Registrar y analizar evolución — Organiza datos, compara mediciones y comunica tendencias con incertidumbre.
- TSAF-AUX-001 | Actuar ante una emergencia y activar ayuda — Aplica conducta PAS, valoración inicial, llamada a emergencias y actuación básica hasta relevo.
- TSAF-AUX-002 | Aplicar RCP básica y DEA — Reconoce parada, inicia RCP y usa DEA conforme a formación práctica acreditada.
- TSAF-FIT-001 | Seleccionar ejercicios y enseñar técnica — Elige ejercicios por objetivo, nivel, material y limitaciones y aplica regresiones o progresiones.
- TSAF-FIT-002 | Programar fuerza, resistencia y movilidad — Define objetivos, frecuencia, volumen, intensidad, descansos y progresión a partir de valoración.
- TSAF-FIT-003 | Dirigir y adaptar una sesión individual — Gestiona calentamiento, bloque principal, vuelta a la calma, observación y ajustes en tiempo real.
- TSAF-MUS-001 | Comprender ritmo, frase musical y estructura de sesión — Relaciona música, bloques, intensidad, pasos y seguridad.
- TSAF-MUS-002 | Diseñar coreografías por niveles — Construye secuencias progresivas, simétricas y adaptables a diferentes competencias motrices.
- TSAF-MUS-003 | Dirigir una clase grupal especializada — Gestiona voz, demostración, motivación, posicionamiento, seguridad y control del grupo.
- TSAF-AQU-001 | Aplicar propiedades del medio acuático al ejercicio — Comprende flotación, resistencia, profundidad, temperatura y seguridad de instalación.
- TSAF-AQU-002 | Programar y dirigir una sesión acuática — Diseña una sesión con objetivos, intensidad, material, transiciones y adaptaciones.
- TSAF-HID-001 | Diseñar actividades de movilidad y bienestar en agua — Aplica técnicas de hidrocinesia dentro del protocolo y límites profesionales.
- TSAF-POS-001 | Analizar patrones posturales y funcionales sin diagnosticar — Observa ejecución, movilidad y control y propone trabajo general o derivación.
- TSAF-POS-002 | Programar movilidad, estabilidad y mantenimiento funcional — Diseña sesiones orientadas a autonomía, control y adherencia.
- TSAF-ESP-001 | Adaptar actividad a personas mayores y colectivos diversos — Ajusta comunicación, entorno, dosis y ejercicios a capacidad, objetivos y accesibilidad.
- TSAF-SOC-001 | Gestionar comunicación, motivación y conflictos — Escucha, establece límites, da feedback y maneja incidencias con usuarios o equipos.
- TSAF-GES-001 | Organizar recursos, calidad y seguridad de una instalación — Revisa equipamiento, accesibilidad, mantenimiento, aforo, incidencias y calidad del servicio.
- TSAF-GES-002 | Diseñar y ejecutar un evento de actividad física — Define objetivo, público, programa, recursos, permisos, seguridad, comunicación y evaluación.
- TSAF-DIG-001 | Usar tecnología y datos en seguimiento sin invadir privacidad — Selecciona apps, wearables y software, interpreta limitaciones y protege información.
- TSAF-SUS-001 | Aplicar sostenibilidad a servicios deportivos — Reduce consumos, residuos, barreras y desplazamientos y mejora mantenimiento y acceso.
- TSAF-ENG-001 | Comprender instrucciones y recursos profesionales en inglés — Lee protocolos, fichas técnicas y mensajes y comunica consignas básicas.
- TSAF-EMP-001 | Preparar candidatura profesional en fitness y deporte — Analiza funciones, límites, atención al cliente, componente comercial y evidencias requeridas.
- TSAF-PRJ-001 | Crear un programa integral de acondicionamiento físico — Integra análisis de población, valoración, programación, seguridad, recursos, evaluación y comunicación.
- TSAF-PRJ-002 | Presentar y defender una propuesta de servicio — Expone necesidad, método, seguridad, resultados esperados, límites y viabilidad.

## Los 30 hackathones/eventos sin competencias

- tsaf_diseno_y_gestion_de_programas_actividades_y_eventos_de | Diseño y gestión de programas, actividades y eventos de inclusión en el deporte local (evento)
  Organiza: Instituto Andaluz del Deporte / Junta de Andalucía. Formación para planificar, ejecutar y evaluar actividades deportivas inclusivas.
  Tags: inclusión, gestión deportiva, eventos, accesibilidad
- tsaf_entrenar_en_la_adolescencia_comprendiendo_y | Entrenar en la adolescencia: comprendiendo y acompañando el cambio (evento)
  Organiza: Instituto Andaluz del Deporte. Actualización sobre entrenamiento y acompañamiento durante la adolescencia.
  Tags: adolescencia, entrenamiento, desarrollo, adaptación
- tsaf_contratacion_publica_en_el_deporte_municipal_4_edicion | Contratación pública en el deporte municipal — 4.ª edición (evento)
  Organiza: Instituto Andaluz del Deporte. Formación sobre contratación y gestión de servicios deportivos municipales.
  Tags: contratación pública, deporte municipal, gestión
- tsaf_formacion_de_tecnicos_en_actividad_fisica_para | Formación de técnicos en actividad física para personas mayores (evento)
  Organiza: Instituto Andaluz del Deporte. Formación específica para intervención con población mayor.
  Tags: personas mayores, ejercicio, adaptación, salud
- tsaf_convivencia_y_acoso_entre_iguales_en_el_deporte | Convivencia y acoso entre iguales en el deporte (evento)
  Organiza: Instituto Andaluz del Deporte. Formación sobre prevención y actuación ante acoso en contextos deportivos.
  Tags: acoso, convivencia, deporte base, prevención
- tsaf_fundamentos_del_entrenamiento_del_alto_rendimiento_a | Fundamentos del entrenamiento: del alto rendimiento a la salud (evento)
  Organiza: Instituto Andaluz del Deporte. Actualización sobre fundamentos y aplicación del entrenamiento.
  Tags: fuerza, resistencia, salud, rendimiento, planificación
- tsaf_empleabilidad_y_futuro_profesional_en_el_deporte | Empleabilidad y futuro profesional en el deporte (evento)
  Organiza: Instituto Andaluz del Deporte. Jornadas sobre competencias digitales, empleo y modelos de negocio deportivo.
  Tags: empleabilidad, tecnología, emprendimiento, competencias
- tsaf_actualizaciones_en_entrenamiento_de_gimnasia_ritmica | Actualizaciones en entrenamiento de gimnasia rítmica: fuerza y prevención (evento)
  Organiza: Instituto Andaluz del Deporte. Formación específica sobre fuerza y prevención de lesiones en gimnasia.
  Tags: gimnasia rítmica, fuerza, prevención, rendimiento
- tsaf_agenda_de_cultura_y_deporte_de_la_junta_de_andalucia | Agenda de Cultura y Deporte de la Junta de Andalucía (fuente_noticias)
  Organiza: Junta de Andalucía. Agenda oficial con cursos y jornadas deportivas para 2026/27.
  Tags: deporte, formación, gestión, entrenamiento, inclusión
- tsaf_i_congreso_internacional_del_rendimiento_en_actividad | I Congreso Internacional del Rendimiento en Actividad Física y Deporte (evento)
  Organiza: Universidad Pablo de Olavide. Congreso universitario sobre rendimiento y actividad física.
  Tags: rendimiento, actividad física, investigación, entrenamiento
- tsaf_agenda_deportiva_de_la_universidad_de_almeria | Agenda deportiva de la Universidad de Almería (fuente_noticias)
  Organiza: Universidad de Almería. Agenda universitaria con filtro específico de deportes y salud.
  Tags: deporte, competición, salud, formación
- tsaf_agenda_deportiva_de_la_universidad_de_jaen | Agenda deportiva de la Universidad de Jaén (fuente_noticias)
  Organiza: Universidad de Jaén. Agenda universitaria para detectar jornadas y actividades deportivas.
  Tags: deporte, salud, formación, empleo
- tsaf_eventos_de_la_facultad_de_educacion_psicologia_y | Eventos de la Facultad de Educación, Psicología y Ciencias del Deporte UHU (fuente_noticias)
  Organiza: Universidad de Huelva. Eventos y jornadas vinculados a Ciencias del Deporte en la UHU.
  Tags: ciencias del deporte, salud, inclusión, educación
- tsaf_agenda_deportiva_de_la_universidad_de_cordoba | Agenda deportiva de la Universidad de Córdoba (fuente_noticias)
  Organiza: Universidad de Córdoba. Agenda oficial para cursos, jornadas y actividades deportivas.
  Tags: actividad física, salud, deporte universitario
- tsaf_servicio_de_deportes_de_la_universidad_de_malaga | Servicio de Deportes de la Universidad de Málaga (fuente_noticias)
  Organiza: Universidad de Málaga. Fuente oficial de actividades y competiciones deportivas de la UMA.
  Tags: deporte universitario, cursos, competiciones, salud
- tsaf_sadus_actividades_y_competiciones | SADUS — actividades y competiciones (fuente_noticias)
  Organiza: Universidad de Sevilla. Servicio de Actividades Deportivas de la Universidad de Sevilla.
  Tags: deporte universitario, competiciones, formación
- tsaf_facultad_de_ciencias_del_deporte_ugr_agenda | Facultad de Ciencias del Deporte UGR — agenda (fuente_noticias)
  Organiza: Universidad de Granada. Fuente académica y profesional de Ciencias del Deporte.
  Tags: entrenamiento, actividad física, investigación, salud
- tsaf_instituto_mixto_universitario_deporte_y_salud_imuds | Instituto Mixto Universitario Deporte y Salud — IMUDS (evento)
  Organiza: Universidad de Granada. Instituto universitario especializado en deporte y salud.
  Tags: deporte, salud, investigación, rendimiento, prevención
- tsaf_servicio_de_deportes_de_la_upo | Servicio de Deportes de la UPO (fuente_noticias)
  Organiza: Universidad Pablo de Olavide. Actividades deportivas y formación vinculada a la UPO.
  Tags: deporte universitario, actividad física, competiciones
- tsaf_colef_andalucia_formacion_y_eventos | COLEF Andalucía — formación y eventos (evento)
  Organiza: Colegio Oficial de Licenciados y Graduados en Ciencias de la Actividad Física y del Deporte. Fuente profesional para formación continua y jornadas del sector.
  Tags: CAFyD, profesión, formación, normativa, empleo
- tsaf_calendario_federacion_andaluza_de_triatlon_2026 | Calendario Federación Andaluza de Triatlón 2026 (evento)
  Organiza: Federación Andaluza de Triatlón. Más de cien pruebas oficiales distribuidas por Andalucía.
  Tags: triatlón, duatlón, acuatlón, organización, seguridad
- tsaf_calendario_federacion_andaluza_de_atletismo | Calendario Federación Andaluza de Atletismo (evento)
  Organiza: Federación Andaluza de Atletismo. Calendario oficial de competiciones y actividades atléticas.
  Tags: atletismo, carreras, pista, entrenamiento, organización
- tsaf_calendario_federacion_andaluza_de_ciclismo | Calendario Federación Andaluza de Ciclismo (evento)
  Organiza: Federación Andaluza de Ciclismo. Calendario oficial de pruebas ciclistas en Andalucía.
  Tags: ciclismo, MTB, carretera, organización, rendimiento
- tsaf_calendario_federacion_andaluza_de_deportes_de_montana | Calendario Federación Andaluza de Deportes de Montaña (evento)
  Organiza: FADMES. Calendario oficial de competiciones y actividades de montaña.
  Tags: montaña, trail, escalada, seguridad, orientación
- tsaf_calendario_federacion_andaluza_de_natacion | Calendario Federación Andaluza de Natación (evento)
  Organiza: Federación Andaluza de Natación. Competiciones, campeonatos y actividades federativas de natación.
  Tags: natación, entrenamiento, competiciones, técnica
- tsaf_agenda_federacion_andaluza_de_baloncesto | Agenda Federación Andaluza de Baloncesto (evento)
  Organiza: Federación Andaluza de Baloncesto. Calendarios, cursos y actividades federativas.
  Tags: baloncesto, entrenadores, deporte base, formación
- tsaf_agenda_y_formacion_de_la_real_federacion_andaluza_de | Agenda y formación de la Real Federación Andaluza de Fútbol (evento)
  Organiza: RFAF. Calendarios y actividades formativas de fútbol andaluz.
  Tags: fútbol, entrenadores, preparación física, deporte base
- tsaf_andalucia_bike_race_edicion_2027 | Andalucía Bike Race — edición 2027 (evento)
  Organiza: Andalucía Bike Race. Prueba por etapas útil para observar logística, preparación y recuperación.
  Tags: MTB, resistencia, organización, rendimiento
- tsaf_zurich_maraton_de_sevilla_2027 | Zurich Maratón de Sevilla 2027 (evento)
  Organiza: Instituto Municipal de Deportes de Sevilla / organizadores. Gran evento de atletismo y gestión deportiva en Sevilla.
  Tags: maratón, resistencia, planificación, recuperación, eventos
- tsaf_generali_maraton_malaga_edicion_2026_27 | Generali Maratón Málaga — edición 2026/27 (evento)
  Organiza: Maratón Málaga / Ayuntamiento de Málaga. Evento de atletismo para analizar planificación, logística y rendimiento.
  Tags: maratón, resistencia, organización, entrenamiento

---
