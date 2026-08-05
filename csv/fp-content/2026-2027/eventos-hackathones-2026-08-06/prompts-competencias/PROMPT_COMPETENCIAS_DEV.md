# Prompt para ChatGPT — competencias de los 30 hackathones/eventos nuevos de DEV

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
  "ciclo": "DEV",
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

## Lista cerrada de competencias de DEV (usa solo estos `competencia_id`)

- DAW-BAS-001 | Gestionar archivos, carpetas y copias de seguridad — Organiza proyectos, descargas y documentos sin perder versiones ni credenciales.
- DAW-BAS-002 | Usar terminal y comandos esenciales — Navega, crea, mueve y elimina archivos desde terminal y entiende rutas absolutas y relativas.
- DAW-BAS-003 | Resolver problemas mediante algoritmos simples — Descompone un problema en entradas, proceso, decisiones, repeticiones y salida.
- DAW-BAS-004 | Comprender cómo funciona una aplicación conectada — Distingue cliente, servidor, red, DNS, HTTP, API, base de datos y despliegue.
- DAW-BAS-005 | Documentar errores y aprender mediante práctica — Registra hipótesis, pruebas, errores, soluciones y fuentes consultadas.
- DAW-SI-001 | Instalar y configurar un sistema de trabajo — Configura usuarios, almacenamiento, software, actualizaciones y un entorno reproducible.
- DAW-SI-002 | Aplicar red y seguridad básica — Comprende IP, puertos, servicios, permisos, usuarios, copias y secretos.
- DAW-BD-001 | Modelar datos relacionales — Transforma requisitos en entidades, atributos, relaciones, claves y restricciones.
- DAW-BD-002 | Crear y consultar una base de datos con SQL — Implementa tablas y resuelve consultas de selección, agregación y combinación.
- DAW-BD-003 | Mantener integridad, transacciones y acceso seguro — Gestiona transacciones, usuarios, permisos, copias y errores de persistencia.
- DAW-PRO-001 | Programar con variables, decisiones y bucles — Construye programas de consola con entrada, validación, control de flujo y salida.
- DAW-PRO-002 | Diseñar funciones y trabajar con colecciones — Divide el problema en funciones, maneja arrays o colecciones y evita duplicación.
- DAW-PRO-003 | Aplicar programación orientada a objetos — Modela clases, encapsula estado, usa composición, herencia solo cuando aporta valor e interfaces.
- DAW-PRO-004 | Gestionar errores, ficheros y pruebas — Controla excepciones, persiste información simple y escribe pruebas automatizadas básicas.
- DAW-LM-001 | Estructurar información con lenguajes de marcas — Crea documentos HTML, XML o JSON válidos, bien estructurados y transformables.
- DAW-LM-002 | Presentar información de forma responsive — Aplica CSS, layout, tipografía y adaptación a móvil con una jerarquía clara.
- DAW-ED-001 | Usar Git y un flujo de trabajo colaborativo — Versiona código con commits útiles, ramas, pull requests y resolución básica de conflictos.
- DAW-ED-002 | Depurar, automatizar y mantener calidad — Configura IDE, formateo, análisis estático, pruebas y una integración continua básica.
- DAW-DIG-001 | Analizar digitalización, datos e IA de forma responsable — Identifica procesos digitalizables, riesgos, métricas y límites de automatización o IA.
- DAW-SUS-001 | Aplicar sostenibilidad al desarrollo y operación — Evalúa consumo, ciclo de vida, accesibilidad, mantenimiento y reducción de desperdicio digital.
- DAW-ENG-001 | Leer y comunicar información técnica en inglés — Comprende documentación, incidencias y mensajes técnicos y redacta textos breves profesionales.
- DAW-EMP-001 | Preparar perfil profesional y candidatura — Presenta proyectos, adapta CV, analiza ofertas y trabaja con comunicación profesional.
- DAW-PRJ-001 | Planificar y entregar un proyecto integrador — Define problema, alcance, requisitos, arquitectura, datos, pruebas, despliegue y documentación.
- DAW-PRJ-002 | Presentar y defender una solución — Expone problema, usuario, decisiones, demo, resultados, límites y siguientes pasos.
- DAW-CLI-001 | Programar interacción con JavaScript en el navegador — Manipula DOM, eventos, formularios, módulos y almacenamiento local sin acoplamiento innecesario.
- DAW-CLI-002 | Consumir APIs y gestionar asincronía — Realiza peticiones HTTP, controla carga, error y cancelación y transforma respuestas.
- DAW-CLI-003 | Construir interfaces basadas en componentes — Divide la interfaz en componentes, gestiona estado y navegación y evita duplicación.
- DAW-SRV-001 | Crear rutas, validación y lógica de servidor — Implementa endpoints o controladores, valida datos y separa presentación, negocio y persistencia.
- DAW-SRV-002 | Implementar autenticación y autorización seguras — Gestiona identidad, sesiones o tokens, roles, contraseñas y protección de rutas.
- DAW-SRV-003 | Persistir datos y exponer una API mantenible — Integra base de datos, migraciones, transacciones, paginación y documentación de API.
- DAW-DEP-001 | Desplegar una aplicación web con configuración segura — Configura dominio, HTTPS, variables de entorno, servidor y observabilidad básica.
- DAW-DEP-002 | Contenerizar y automatizar entrega — Crea contenedores, servicios relacionados y pipeline de construcción, pruebas y despliegue.
- DAW-UI-001 | Diseñar experiencias usables y coherentes — Define arquitectura de información, componentes, estados y navegación centrados en tareas.
- DAW-UI-002 | Aplicar accesibilidad web verificable — Usa HTML semántico, teclado, foco, etiquetas, contraste y mensajes comprensibles.
- DAW-UI-003 | Optimizar rendimiento, SEO técnico y compatibilidad — Reduce peso y bloqueos, usa metadatos, rutas rastreables y pruebas en navegadores.
- DAM-BAS-001 | Gestionar archivos, carpetas y copias de seguridad — Organiza proyectos, descargas y documentos sin perder versiones ni credenciales.
- DAM-BAS-002 | Usar terminal y comandos esenciales — Navega, crea, mueve y elimina archivos desde terminal y entiende rutas absolutas y relativas.
- DAM-BAS-003 | Resolver problemas mediante algoritmos simples — Descompone un problema en entradas, proceso, decisiones, repeticiones y salida.
- DAM-BAS-004 | Comprender cómo funciona una aplicación conectada — Distingue cliente, servidor, red, DNS, HTTP, API, base de datos y despliegue.
- DAM-BAS-005 | Documentar errores y aprender mediante práctica — Registra hipótesis, pruebas, errores, soluciones y fuentes consultadas.
- DAM-SI-001 | Instalar y configurar un sistema de trabajo — Configura usuarios, almacenamiento, software, actualizaciones y un entorno reproducible.
- DAM-SI-002 | Aplicar red y seguridad básica — Comprende IP, puertos, servicios, permisos, usuarios, copias y secretos.
- DAM-BD-001 | Modelar datos relacionales — Transforma requisitos en entidades, atributos, relaciones, claves y restricciones.
- DAM-BD-002 | Crear y consultar una base de datos con SQL — Implementa tablas y resuelve consultas de selección, agregación y combinación.
- DAM-BD-003 | Mantener integridad, transacciones y acceso seguro — Gestiona transacciones, usuarios, permisos, copias y errores de persistencia.
- DAM-PRO-001 | Programar con variables, decisiones y bucles — Construye programas de consola con entrada, validación, control de flujo y salida.
- DAM-PRO-002 | Diseñar funciones y trabajar con colecciones — Divide el problema en funciones, maneja arrays o colecciones y evita duplicación.
- DAM-PRO-003 | Aplicar programación orientada a objetos — Modela clases, encapsula estado, usa composición, herencia solo cuando aporta valor e interfaces.
- DAM-PRO-004 | Gestionar errores, ficheros y pruebas — Controla excepciones, persiste información simple y escribe pruebas automatizadas básicas.
- DAM-LM-001 | Estructurar información con lenguajes de marcas — Crea documentos HTML, XML o JSON válidos, bien estructurados y transformables.
- DAM-LM-002 | Presentar información de forma responsive — Aplica CSS, layout, tipografía y adaptación a móvil con una jerarquía clara.
- DAM-ED-001 | Usar Git y un flujo de trabajo colaborativo — Versiona código con commits útiles, ramas, pull requests y resolución básica de conflictos.
- DAM-ED-002 | Depurar, automatizar y mantener calidad — Configura IDE, formateo, análisis estático, pruebas y una integración continua básica.
- DAM-DIG-001 | Analizar digitalización, datos e IA de forma responsable — Identifica procesos digitalizables, riesgos, métricas y límites de automatización o IA.
- DAM-SUS-001 | Aplicar sostenibilidad al desarrollo y operación — Evalúa consumo, ciclo de vida, accesibilidad, mantenimiento y reducción de desperdicio digital.
- DAM-ENG-001 | Leer y comunicar información técnica en inglés — Comprende documentación, incidencias y mensajes técnicos y redacta textos breves profesionales.
- DAM-EMP-001 | Preparar perfil profesional y candidatura — Presenta proyectos, adapta CV, analiza ofertas y trabaja con comunicación profesional.
- DAM-PRJ-001 | Planificar y entregar un proyecto integrador — Define problema, alcance, requisitos, arquitectura, datos, pruebas, despliegue y documentación.
- DAM-PRJ-002 | Presentar y defender una solución — Expone problema, usuario, decisiones, demo, resultados, límites y siguientes pasos.
- DAM-AD-001 | Conectar aplicaciones a bases de datos — Implementa conexiones, consultas parametrizadas, mapeo y gestión de recursos.
- DAM-AD-002 | Gestionar persistencia avanzada y migraciones — Trabaja con ORM, relaciones, transacciones, repositorios y evolución del esquema.
- DAM-UI-001 | Construir interfaces de escritorio o multiplataforma — Diseña ventanas, componentes, navegación, formularios y estados con separación de responsabilidades.
- DAM-UI-002 | Aplicar usabilidad, accesibilidad y empaquetado — Evalúa navegación, atajos, mensajes, adaptación y entrega instalable.
- DAM-MOB-001 | Crear una aplicación móvil con navegación y estado — Construye pantallas, navegación, estado, recursos y ciclo de vida en una plataforma móvil.
- DAM-MOB-002 | Integrar datos, red y capacidades del dispositivo — Consume APIs, persiste datos y usa permisos o sensores con control de privacidad.
- DAM-SP-001 | Programar procesos concurrentes de forma segura — Usa hilos, tareas, sincronización y cancelación evitando bloqueos y condiciones de carrera.
- DAM-SP-002 | Crear servicios de red y comunicación entre aplicaciones — Implementa comunicación cliente-servidor o mensajería con protocolos y errores definidos.
- DAM-ERP-001 | Comprender e implantar procesos ERP y CRM — Modela procesos de negocio y configura módulos, usuarios, permisos y datos maestros.
- DAM-ERP-002 | Extender e integrar un sistema empresarial — Personaliza informes, automatizaciones o módulos y conecta datos con sistemas externos.
- DAM-ARC-001 | Diseñar una arquitectura multiplataforma mantenible — Selecciona capas, módulos, interfaces, almacenamiento y estrategia de pruebas según requisitos.

## Los 30 hackathones/eventos sin competencias

- daw_nasa_space_apps_challenge_malaga_2026 | NASA Space Apps Challenge Málaga 2026 (hackathon)
  Organiza: NASA Space Apps / Space Apps Spain. Hackathon global con sede anunciada en Málaga.
  Tags: nasa, datos abiertos, programación, ciencia, prototipado
- daw_nasa_space_apps_challenge_sevilla_2026 | NASA Space Apps Challenge Sevilla 2026 (hackathon)
  Organiza: NASA Space Apps / Agencia Espacial Española. Sede sevillana del hackathon global de NASA.
  Tags: nasa, espacio, software, datos, prototipado
- daw_tourism_innovation_summit_2026 | Tourism Innovation Summit 2026 (evento)
  Organiza: Nebext / TIS. Tecnología aplicada al turismo y a operaciones digitales.
  Tags: IA, traveltech, ciberseguridad, datos, startups
- daw_al_andalus_innovation_venture_2026 | Al Andalus Innovation Venture 2026 (evento)
  Organiza: Al Andalus Innovation Venture. Foro de startups, scaleups, inversión e innovación abierta.
  Tags: startups, deep tech, IA, ciberseguridad, pitch
- daw_expo_agritech_2026 | Expo AgriTech 2026 (evento)
  Organiza: Nebext / Junta de Andalucía. Tecnología, digitalización e innovación para el sector agroalimentario.
  Tags: agritech, automatización, IoT, datos, IA
- daw_iii_encuentro_iberoamericano_de_innovacion_y | III Encuentro Iberoamericano de Innovación y Tecnología Educativa Digital (evento)
  Organiza: Universidad de Cádiz. Encuentro universitario sobre innovación y tecnología educativa digital.
  Tags: edtech, innovación digital, educación, software
- daw_curso_domina_la_ia_herramientas_y_aplicaciones | Curso Domina la IA: herramientas y aplicaciones prácticas (evento)
  Organiza: Universidad de Córdoba / Fundecor. Formación práctica sobre herramientas y aplicaciones de inteligencia artificial.
  Tags: IA, herramientas, automatización, productividad
- daw_noche_europea_de_los_investigadores_2026_jaen | Noche Europea de los Investigadores 2026 — Jaén (evento)
  Organiza: Universidad de Jaén. Feria científica con actividades y contacto con grupos de investigación.
  Tags: ciencia, tecnología, divulgación, networking
- daw_feria_de_empleo_de_la_universidad_de_jaen_2026 | Feria de Empleo de la Universidad de Jaén 2026 (evento)
  Organiza: Universidad de Jaén. Feria universitaria para conectar alumnado y empresas.
  Tags: empleo tech, empresas, talento, prácticas
- daw_unigreen_innovation_challenge_2026 | UNIgreen Innovation Challenge 2026 (reto)
  Organiza: Universidad de Almería / Alianza UNIgreen. Programa con selección, formación, mentoría y competición internacional.
  Tags: innovación, MVP, sostenibilidad, mentoría
- daw_hackaton_jump_emprendimiento_el_reto | Hackatón JUMP Emprendimiento El Reto (hackathon)
  Organiza: Universidad de Almería. Hackatón universitario intensivo con retos, prototipos y mentoría.
  Tags: hackathon, prototipado, programación, equipos, premios
- daw_calendario_emprendeual | Calendario EmprendeUAL (fuente_noticias)
  Organiza: Universidad de Almería. Calendario de actividades de emprendimiento y retos de la UAL.
  Tags: IA, emprendimiento, tecnología, MVP, talleres
- daw_flash_session_hackathon_proxima_edicion | Flash Session Hackathon — próxima edición (hackathon)
  Organiza: Universidad de Málaga / BIC Euronova. Hackathon anual de creación de ideas emprendedoras de la UMA.
  Tags: emprendimiento, prototipado, INCIBE, equipos
- daw_talent_job_hackathon_proxima_edicion | Talent & Job Hackathon — próxima edición (hackathon)
  Organiza: Universidad de Málaga. Hackathon orientado a competencias profesionales y acceso al empleo.
  Tags: empleabilidad, competencias, empresas, equipos
- daw_microhackathon_ciencias_proxima_edicion | MicroHackathon Ciencias — próxima edición (hackathon)
  Organiza: Universidad de Málaga / Link by UMA. Reto universitario para transformar problemas científicos en propuestas.
  Tags: ciencia, emprendimiento, prototipo, pitch
- daw_concurso_de_emprendimiento_universitario_ugr_proxima | Concurso de Emprendimiento Universitario UGR — próxima convocatoria (evento)
  Organiza: Universidad de Granada. Concurso para proyectos emprendedores y startups vinculadas a la UGR.
  Tags: startup, spin-off, innovación, pitch, premios
- daw_programas_de_emprendimiento_de_la_universidad_de | Programas de emprendimiento de la Universidad de Sevilla (fuente_noticias)
  Organiza: Universidad de Sevilla. Página oficial de programas y convocatorias de emprendimiento de la US.
  Tags: Santander X, Explorer, startups, ideas, premios
- daw_ctx_tech_experience_hub_proxima_edicion | CTx Tech Experience Hub — próxima edición (evento)
  Organiza: CTx / Universidad Pablo de Olavide. Encuentro internacional de tecnología, innovación y emprendimiento.
  Tags: tecnología, empresas, talento, investigación, innovación
- daw_concurso_upoemprende_proxima_convocatoria | Concurso UPOemprende — próxima convocatoria (evento)
  Organiza: Universidad Pablo de Olavide. Concurso universitario de creación de empresas y proyectos.
  Tags: modelo de negocio, cliente, prototipo, pitch
- daw_huelva_ignite | Huelva Ignite (evento)
  Organiza: Diputación de Huelva / Universidad de Huelva. Programa para convertir ideas y proyectos técnicos en iniciativas reales.
  Tags: startup, proyectos técnicos, mentoría, emprendimiento
- daw_agenda_tecnologica_y_de_innovacion_de_la_universidad | Agenda tecnológica y de innovación de la Universidad de Cádiz (fuente_noticias)
  Organiza: Universidad de Cádiz. Agenda oficial con próximos congresos, encuentros y actividades.
  Tags: tecnología, innovación, congresos, empleo
- daw_agenda_tecnologica_de_la_universidad_de_cordoba | Agenda tecnológica de la Universidad de Córdoba (fuente_noticias)
  Organiza: Universidad de Córdoba. Agenda oficial de cursos, congresos y jornadas de la UCO.
  Tags: IA, tecnología, educación, investigación
- daw_agenda_de_eventos_de_la_universidad_de_jaen | Agenda de eventos de la Universidad de Jaén (fuente_noticias)
  Organiza: Universidad de Jaén. Agenda oficial con eventos tecnológicos, científicos y de empleabilidad.
  Tags: ciberseguridad, empleo, ciencia, tecnología
- daw_agenda_de_eventos_de_la_universidad_de_huelva | Agenda de eventos de la Universidad de Huelva (fuente_noticias)
  Organiza: Universidad de Huelva. Agenda oficial de actividades y congresos de la UHU.
  Tags: ingeniería, tecnología, emprendimiento, empleo
- daw_agenda_de_eventos_de_la_universidad_pablo_de_olavide | Agenda de eventos de la Universidad Pablo de Olavide (fuente_noticias)
  Organiza: Universidad Pablo de Olavide. Agenda oficial de eventos de la UPO.
  Tags: tecnología, innovación, emprendimiento, congresos
- daw_agenda_emprende_digitalizacion_e_ia | Agenda Emprende — Digitalización e IA (fuente_noticias)
  Organiza: Andalucía Emprende. Agenda pública andaluza con talleres y jornadas de digitalización.
  Tags: digitalización, IA, web, automatización, emprendimiento
- daw_agenda_de_innovacion_de_andalucia_trade | Agenda de innovación de Andalucía TRADE (fuente_noticias)
  Organiza: Andalucía TRADE. Eventos públicos sobre innovación, cooperación tecnológica y empresa.
  Tags: innovación, transferencia, tecnología, B2B, startups
- daw_opensouthcode_proxima_edicion | OpenSouthCode — próxima edición (comunidad)
  Organiza: OpenSouthCode. Conferencia de tecnología y software libre celebrada en Málaga.
  Tags: software libre, desarrollo, DevOps, IA, ciberseguridad
- daw_digital_enterprise_show_proxima_edicion | Digital Enterprise Show — próxima edición (evento)
  Organiza: Digital Enterprise Show / FYCMA. Congreso internacional de transformación digital y tecnologías exponenciales.
  Tags: IA, big data, cloud, ciberseguridad, automatización
- daw_foro_transfiere_edicion_2027 | Foro Transfiere — edición 2027 (evento)
  Organiza: FYCMA / Ayuntamiento de Málaga. Foro europeo para ciencia, tecnología, transferencia e innovación.
  Tags: I+D, transferencia, startups, universidades, tecnología

---
