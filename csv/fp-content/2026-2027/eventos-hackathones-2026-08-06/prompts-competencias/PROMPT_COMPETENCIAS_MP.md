# Prompt para ChatGPT — competencias de los 30 hackathones/eventos nuevos de MP

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
  "ciclo": "MP",
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

## Lista cerrada de competencias de MP (usa solo estos `competencia_id`)

- MP-BAS-001 | Organizar archivos, cuentas y activos de una campaña — Gestiona documentos, imágenes, permisos, versiones y carpetas de forma profesional.
- MP-BAS-002 | Redactar mensajes claros y orientados a una acción — Distingue objetivo, público, propuesta de valor, tono y llamada a la acción.
- MP-BAS-003 | Calcular porcentajes, costes y métricas básicas — Opera con porcentajes, tasas, variaciones, costes unitarios y ratios sin errores.
- MP-BAS-004 | Evaluar fuentes y diferenciar dato, opinión e hipótesis — Comprueba origen, fecha, método, muestra y limitaciones antes de usar información.
- MP-BAS-005 | Comprender cliente, problema y modelo de negocio — Relaciona segmento, necesidad, propuesta de valor, canal, ingreso y coste.
- MP-FIN-001 | Interpretar costes, presupuestos y viabilidad — Calcula costes, margen, punto de equilibrio, presupuesto y desviaciones de una acción.
- MP-FIN-002 | Evaluar inversión y retorno de marketing — Relaciona objetivos, costes, ingresos atribuibles, riesgo y horizonte temporal.
- MP-POL-001 | Analizar mercado, competencia y situación — Recopila datos, segmenta el contexto y sintetiza amenazas, oportunidades y posición competitiva.
- MP-POL-002 | Definir segmentación, posicionamiento y propuesta — Selecciona público, necesidades, diferenciación y mensaje central.
- MP-POL-003 | Construir un plan de marketing medible — Define objetivos, estrategia, marketing mix, calendario, presupuesto, KPI y responsables.
- MP-INV-001 | Diseñar una investigación de mercado — Formula problema, objetivos, variables, fuentes y método de recogida.
- MP-INV-002 | Diseñar cuestionarios y muestras — Construye instrumentos sin sesgos evidentes y define población, muestra y selección.
- MP-CAM-001 | Planificar y controlar trabajo de campo — Define selección, formación, guion, control de calidad, incidencias y protección de datos.
- MP-DAT-001 | Limpiar, analizar y visualizar datos — Corrige errores, codifica variables y obtiene tablas, gráficos y conclusiones.
- MP-CLI-001 | Atender consultas, quejas y reclamaciones — Escucha, registra, responde, deriva y cierra incidencias respetando derechos del consumidor.
- MP-CRM-001 | Gestionar contactos, leads y consentimiento en CRM — Configura etapas, propiedades, tareas y segmentación con minimización de datos.
- MP-DIG-001 | Planificar presencia web y conversión — Define arquitectura, contenido, formularios, medición y recorrido de usuario.
- MP-DIG-002 | Aplicar SEO y estrategia de contenidos — Investiga intención, estructura contenido, metadatos, calendario y medición orgánica.
- MP-DIG-003 | Diseñar email marketing y automatizaciones — Segmenta, crea secuencias, prueba asuntos y respeta consentimiento y baja.
- MP-DIG-004 | Planificar publicidad digital — Define objetivo, audiencia, creatividad, puja, presupuesto, conversión y experimento.
- MP-DIG-005 | Medir adquisición, conversión y rendimiento — Configura eventos, UTM, embudos, dashboards y análisis con privacidad.
- MP-DIS-001 | Crear identidad visual y piezas coherentes — Aplica jerarquía, tipografía, color, composición, formato y consistencia de marca.
- MP-DIS-002 | Producir contenido audiovisual breve — Planifica guion, grabación, edición, subtítulos, formatos y llamada a la acción.
- MP-MED-001 | Construir un plan de medios — Selecciona canales, formatos, cobertura, frecuencia, calendario, coste y medición.
- MP-RRPP-001 | Planificar relaciones públicas y comunicación institucional — Define públicos, mensajes, portavoces, materiales, medios y respuesta a incidencias.
- MP-EVT-001 | Diseñar y evaluar un evento de marketing — Define objetivo, público, experiencia, proveedores, permisos, cronograma, riesgos y métricas.
- MP-LAN-001 | Preparar el lanzamiento de un producto o servicio — Integra insight, posicionamiento, oferta, canales, ventas, calendario y métricas.
- MP-LEG-001 | Aplicar privacidad, propiedad intelectual y publicidad responsable — Gestiona consentimiento, cookies, derechos de imagen, licencias y mensajes verificables.
- MP-DIGI-001 | Automatizar procesos de marketing con control — Selecciona automatizaciones, integra herramientas y define supervisión, datos y métricas.
- MP-SUS-001 | Aplicar sostenibilidad a campañas y eventos — Reduce materiales, impactos y greenwashing y mejora accesibilidad e inclusión.
- MP-ENG-001 | Trabajar con briefs y comunicación de marketing en inglés — Comprende documentación y redacta mensajes, informes y presentaciones breves.
- MP-EMP-001 | Construir portfolio y candidatura de marketing — Selecciona evidencias, explica decisiones y adapta CV a puestos concretos.
- MP-PRJ-001 | Crear una campaña integrada de principio a fin — Integra investigación, estrategia, creatividad, canales, presupuesto, ejecución, medición y legal.
- MP-PRJ-002 | Presentar y defender una propuesta — Expone insight, decisión estratégica, creatividad, plan, inversión, riesgos y medición.

## Los 30 hackathones/eventos sin competencias

- mp_tourism_innovation_summit_2026 | Tourism Innovation Summit 2026 (evento)
  Organiza: Nebext / TIS. Evento internacional de innovación y estrategias para turismo y hospitality.
  Tags: marketing turístico, customer experience, IA, datos, branding
- mp_al_andalus_innovation_venture_2026 | Al Andalus Innovation Venture 2026 (evento)
  Organiza: Al Andalus Innovation Venture. Foro para startups, scaleups, corporaciones e inversores.
  Tags: pitch, marca, ventas, inversión, comunicación
- mp_agenda_emprende_marketing_digital | Agenda Emprende — Marketing Digital (fuente_noticias)
  Organiza: Andalucía Emprende. Talleres y jornadas públicas de marketing y comunicación para emprender.
  Tags: marketing digital, redes sociales, ecommerce, contenidos
- mp_agenda_emprende_ventas_y_captacion_de_clientes | Agenda Emprende — Ventas y captación de clientes (fuente_noticias)
  Organiza: Andalucía Emprende. Fuente para talleres de venta, captación y desarrollo comercial.
  Tags: ventas, captación, clientes, networking, CRM
- mp_agenda_de_internacionalizacion_y_marketing_de | Agenda de internacionalización y marketing de Andalucía TRADE (fuente_noticias)
  Organiza: Andalucía TRADE. Misiones, jornadas y encuentros empresariales con enfoque comercial.
  Tags: internacionalización, ecommerce, mercados, promoción, B2B
- mp_concurso_de_emprendimiento_universitario_ugr | Concurso de Emprendimiento Universitario UGR (evento)
  Organiza: Universidad de Granada. Concurso universitario para proyectos, startups y spin-offs.
  Tags: pitch, propuesta de valor, comunicación, mercado
- mp_agenda_link_by_uma_y_empleabilidad_emprendimiento | Agenda Link by UMA y Empleabilidad/Emprendimiento (fuente_noticias)
  Organiza: Universidad de Málaga. Eventos y programas de emprendimiento y empleabilidad de la UMA.
  Tags: emprendimiento, marca, pitch, empleo, networking
- mp_calendario_emprendeual | Calendario EmprendeUAL (fuente_noticias)
  Organiza: Universidad de Almería. Talleres de contenidos, redes, IA y desarrollo de proyectos.
  Tags: Instagram, marca, vídeo, IA, emprendimiento
- mp_agenda_de_la_universidad_de_cadiz | Agenda de la Universidad de Cádiz (fuente_noticias)
  Organiza: Universidad de Cádiz. Agenda oficial para detectar ferias, talleres y congresos relevantes.
  Tags: comunicación, empleo, innovación, empresa
- mp_agenda_de_la_universidad_de_cordoba | Agenda de la Universidad de Córdoba (fuente_noticias)
  Organiza: Universidad de Córdoba. Agenda oficial de jornadas y formación universitaria.
  Tags: empresa, comunicación, IA, empleabilidad
- mp_agenda_de_la_universidad_de_jaen | Agenda de la Universidad de Jaén (fuente_noticias)
  Organiza: Universidad de Jaén. Eventos universitarios de empleo, empresa e innovación.
  Tags: feria empleo, comunicación, emprendimiento, networking
- mp_programa_un_paso_adelante | Programa Un Paso Adelante (evento)
  Organiza: Universidad de Huelva. Programa de formación, talleres y Foro de Empleo y Emprendimiento.
  Tags: marca personal, vídeo, empleo, comunicación, networking
- mp_feria_de_empleo_y_emprendimiento_upo_proxima_edicion | Feria de Empleo y Emprendimiento UPO — próxima edición (evento)
  Organiza: Universidad Pablo de Olavide. Feria universitaria con empresas, ponencias y actividades.
  Tags: empresas, talento, comunicación, empleabilidad
- mp_programas_de_emprendimiento_de_la_universidad_de | Programas de emprendimiento de la Universidad de Sevilla (fuente_noticias)
  Organiza: Universidad de Sevilla. Programas y concursos para proyectos emprendedores.
  Tags: Explorer, Santander X, ideas, startups, pitch
- mp_agenda_camara_de_comercio_de_cadiz | Agenda Cámara de Comercio de Cádiz (fuente_noticias)
  Organiza: Cámara de Comercio de Cádiz. Agenda oficial de formación, promoción y talleres empresariales.
  Tags: branding, storytelling, comercio, internacionalización
- mp_agenda_y_actividades_camara_granada | Agenda y actividades Cámara Granada (fuente_noticias)
  Organiza: Cámara de Comercio de Granada. Agenda de foros, talleres y encuentros empresariales.
  Tags: marketing, precios, networking, directivos, ventas
- mp_agenda_camara_de_comercio_de_malaga | Agenda Cámara de Comercio de Málaga (fuente_noticias)
  Organiza: Cámara de Comercio de Málaga. Formación y eventos empresariales de la Cámara de Málaga.
  Tags: comercio, marketing, digitalización, networking
- mp_agenda_camara_de_comercio_de_sevilla | Agenda Cámara de Comercio de Sevilla (fuente_noticias)
  Organiza: Cámara de Comercio de Sevilla. Agenda de jornadas, programas y encuentros empresariales.
  Tags: empresa, marketing, comercio, emprendimiento
- mp_agenda_camara_de_comercio_de_cordoba | Agenda Cámara de Comercio de Córdoba (fuente_noticias)
  Organiza: Cámara de Comercio de Córdoba. Fuente oficial de formación y eventos empresariales.
  Tags: comercio, ventas, digitalización, empresa
- mp_agenda_camara_de_comercio_de_almeria | Agenda Cámara de Comercio de Almería (fuente_noticias)
  Organiza: Cámara de Comercio de Almería. Fuente oficial de actividades empresariales y comerciales.
  Tags: marketing, comercio, turismo, internacionalización
- mp_agenda_camara_de_comercio_de_huelva | Agenda Cámara de Comercio de Huelva (fuente_noticias)
  Organiza: Cámara de Comercio de Huelva. Agenda y programas de apoyo empresarial en Huelva.
  Tags: empresa, comercio, ventas, networking
- mp_agenda_camara_de_comercio_de_jaen | Agenda Cámara de Comercio de Jaén (fuente_noticias)
  Organiza: Cámara de Comercio de Jaén. Fuente oficial de actividades empresariales de Jaén.
  Tags: comercio, empresa, marketing, networking
- mp_agenda_de_la_confederacion_de_empresarios_de_andalucia | Agenda de la Confederación de Empresarios de Andalucía (fuente_noticias)
  Organiza: CEA. Jornadas y encuentros del tejido empresarial andaluz.
  Tags: empresa, comunicación, digitalización, networking
- mp_eventos_del_club_de_marketing_malaga | Eventos del Club de Marketing Málaga (comunidad)
  Organiza: Club de Marketing Málaga. Eventos y encuentros de profesionales del marketing.
  Tags: marketing, estrategia, marca, ventas, networking
- mp_federacion_andaluza_de_marketing_agenda | Federación Andaluza de Marketing — agenda (comunidad)
  Organiza: Federación Andaluza de Marketing. Fuente sectorial para jornadas y eventos de marketing en Andalucía.
  Tags: marketing, asociaciones, profesionales, premios
- mp_econgress_malaga_proxima_edicion | eCongress Málaga — próxima edición (evento)
  Organiza: eCongress Málaga. Congreso especializado en marketing digital, ecommerce y redes sociales.
  Tags: marketing digital, ecommerce, redes, publicidad
- mp_andalucia_management_proxima_edicion | Andalucía Management — próxima edición (evento)
  Organiza: Andalucía Management. Encuentro de directivos y profesionales sobre gestión empresarial.
  Tags: dirección, marketing, estrategia, liderazgo, negocio
- mp_alhambra_venture_edicion_2027 | Alhambra Venture — edición 2027 (evento)
  Organiza: Alhambra Venture. Foro de emprendimiento e inversión con startups y corporaciones.
  Tags: pitch, inversión, comunicación, propuesta de valor
- mp_digital_enterprise_show_proxima_edicion | Digital Enterprise Show — próxima edición (evento)
  Organiza: Digital Enterprise Show. Tecnologías y estrategias de transformación digital empresarial.
  Tags: marketing tech, IA, datos, customer experience
- mp_foro_transfiere_edicion_2027 | Foro Transfiere — edición 2027 (evento)
  Organiza: FYCMA / Ayuntamiento de Málaga. Foro de transferencia, innovación, empresas y universidades.
  Tags: innovación, startups, comunicación científica, negocio

---
