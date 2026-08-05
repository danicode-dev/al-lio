# Prompt para ChatGPT — competencias de los 30 hackathones/eventos nuevos de AF

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
  "ciclo": "AF",
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

## Lista cerrada de competencias de AF (usa solo estos `competencia_id`)

- AF-BAS-001 | Organizar archivos y documentación administrativa — Clasifica documentos, aplica nombres consistentes, versiones, permisos y copias de seguridad.
- AF-BAS-002 | Escribir con precisión y usar funciones básicas de Office — Crea documentos, tablas y presentaciones legibles y usa atajos y revisión.
- AF-BAS-003 | Operar con porcentajes, reglas de tres e importes — Calcula bases, descuentos, recargos, impuestos, intereses simples y variaciones.
- AF-BAS-004 | Redactar correos y comunicaciones profesionales — Escribe mensajes con asunto, contexto, petición, plazo, tono y cierre adecuados.
- AF-BAS-005 | Proteger datos, credenciales y documentación — Reconoce phishing, aplica mínimos accesos y evita compartir información por canales inadecuados.
- AF-JUR-001 | Distinguir formas jurídicas y órganos de la empresa — Relaciona responsabilidad, capital, gestión y trámites con la forma jurídica.
- AF-JUR-002 | Preparar trámites de constitución y documentación oficial — Identifica organismos, secuencia, plazos y documentos para actuaciones empresariales.
- AF-RRHH-001 | Analizar organización, puestos y selección — Describe estructura, funciones, competencias y un proceso de selección no discriminatorio.
- AF-RRHH-002 | Aplicar responsabilidad social, igualdad y protección — Integra ética, sostenibilidad, igualdad, prevención y privacidad en políticas internas.
- AF-OFI-001 | Crear documentos administrativos mediante estilos y plantillas — Automatiza cartas, informes, formularios y combinaciones de correspondencia.
- AF-OFI-002 | Usar Excel para gestión administrativa — Aplica tablas, referencias, funciones lógicas, búsquedas, validación, filtros y gráficos.
- AF-OFI-003 | Automatizar limpieza y consolidación de datos — Importa CSV, transforma columnas, relaciona tablas y actualiza informes.
- AF-COM-001 | Gestionar compras, ventas, facturas y cobros — Relaciona pedido, albarán, factura, impuesto, vencimiento, pago y archivo.
- AF-COM-002 | Registrar el ciclo contable básico — Clasifica hechos, realiza asientos sencillos y relaciona libro diario, mayor y balances.
- AF-CLI-001 | Atender y registrar consultas, quejas y reclamaciones — Escucha, informa, documenta, deriva y cierra incidencias con lenguaje profesional.
- AF-CLI-002 | Gestionar comunicaciones y archivo multicanal — Mantiene registro de entradas, salidas, llamadas, reuniones y documentación con criterios de acceso.
- AF-LAB-001 | Interpretar contratos, jornada y documentación laboral — Relaciona modalidad, jornada, periodo, salario, altas, bajas y expediente.
- AF-LAB-002 | Calcular y revisar una nómina — Calcula devengos, deducciones, bases y líquido y verifica coherencia.
- AF-FIN-001 | Aplicar cálculo financiero — Calcula interés, descuento, equivalencia, cuotas y coste efectivo en casos administrativos.
- AF-FIN-002 | Gestionar tesorería, financiación y riesgo — Prepara previsiones, compara alternativas y controla cobros, pagos y liquidez.
- AF-CON-001 | Completar el ciclo contable — Registra ajustes, amortizaciones, periodificaciones, regularización y cierre.
- AF-CON-002 | Gestionar obligaciones fiscales básicas — Relaciona operaciones con IVA, retenciones y otros modelos aplicables sin sustituir asesoramiento especializado.
- AF-LOG-001 | Planificar aprovisionamiento e inventario — Calcula necesidades, stock, punto de pedido y coste y evalúa proveedores.
- AF-LOG-002 | Negociar y controlar compras — Prepara condiciones, compara ofertas, registra incidencias y evalúa servicio.
- AF-BI-001 | Crear cuadros de mando administrativos y financieros — Conecta datos, define KPI y presenta evolución, desviación y alertas.
- AF-DIG-001 | Automatizar procesos administrativos con control — Mapea flujo, elimina duplicación, define excepciones, trazabilidad y revisión humana.
- AF-SUS-001 | Aplicar sostenibilidad y calidad a procesos administrativos — Reduce papel, errores, desplazamientos y consumo y mejora accesibilidad y conservación.
- AF-ENG-001 | Gestionar comunicaciones administrativas en inglés — Comprende facturas, pedidos y correos y responde de forma profesional.
- AF-EMP-001 | Preparar candidatura administrativa — Adapta CV, demuestra Excel y procesos y analiza requisitos de ofertas y bolsas.
- AF-SIM-001 | Gestionar una empresa simulada de forma integrada — Coordina constitución, compras, ventas, personal, contabilidad, fiscalidad, tesorería y atención.
- AF-PRJ-001 | Diseñar una solución administrativa integral — Analiza necesidad, proceso, normativa, datos, recursos, costes, riesgos y evaluación.
- AF-PRJ-002 | Presentar y defender una propuesta administrativa — Expone problema, proceso, ahorro, control, riesgos, datos y resultados.

## Los 30 hackathones/eventos sin competencias

- af_agenda_general_de_andalucia_emprende | Agenda general de Andalucía Emprende (fuente_noticias)
  Organiza: Andalucía Emprende. Agenda autonómica de formación e información empresarial.
  Tags: empresa, autónomos, gestión, fiscalidad, ayudas
- af_agenda_emprende_gestion_empresarial | Agenda Emprende — Gestión empresarial (evento)
  Organiza: Andalucía Emprende. Filtro para jornadas de gestión y dirección de pequeñas empresas.
  Tags: gestión, organización, procesos, costes, empresa
- af_agenda_emprende_legal | Agenda Emprende — Legal (evento)
  Organiza: Andalucía Emprende. Filtro para eventos de normativa y cumplimiento empresarial.
  Tags: legal, protección de datos, contratos, obligaciones
- af_agenda_emprende_ayudas_y_financiacion | Agenda Emprende — Ayudas y financiación (evento)
  Organiza: Andalucía Emprende. Talleres y jornadas sobre financiación y subvenciones.
  Tags: subvenciones, financiación, ayudas, inversión
- af_agenda_emprende_rrhh_y_equipos | Agenda Emprende — RRHH y equipos (evento)
  Organiza: Andalucía Emprende. Eventos sobre gestión de equipos, personas y prevención.
  Tags: recursos humanos, equipos, liderazgo, PRL
- af_agenda_emprende_creacion_de_empresas | Agenda Emprende — Creación de empresas (evento)
  Organiza: Andalucía Emprende. Jornadas sobre constitución, trámites y puesta en marcha.
  Tags: autónomos, forma jurídica, plan de empresa, trámites
- af_convocatorias_de_andalucia_emprende | Convocatorias de Andalucía Emprende (reto)
  Organiza: Andalucía Emprende. Convocatorias oficiales de programas, premios y jornadas.
  Tags: premios, programas, ayudas, emprendimiento
- af_premios_emprendemos_proxima_edicion | Premios Emprendemos — próxima edición (evento)
  Organiza: Andalucía Emprende. Programa autonómico de reconocimiento a proyectos emprendedores.
  Tags: empresa, plan de negocio, pitch, financiación
- af_agenda_empresarial_de_andalucia_trade | Agenda empresarial de Andalucía TRADE (fuente_noticias)
  Organiza: Andalucía TRADE. Jornadas y encuentros para empresas andaluzas.
  Tags: financiación, internacionalización, innovación, gestión
- af_ciclo_miercoles_de_trade | Ciclo Miércoles de TRADE (evento)
  Organiza: Andalucía TRADE. Talleres empresariales especializados organizados por Andalucía TRADE.
  Tags: propiedad industrial, internacionalización, gestión, innovación
- af_concurso_de_emprendimiento_universitario_ugr | Concurso de Emprendimiento Universitario UGR (evento)
  Organiza: Universidad de Granada. Concurso para proyectos empresariales y startups universitarias.
  Tags: plan de negocio, viabilidad, finanzas, pitch
- af_santander_x_explorer_universidad_de_sevilla | Santander X Explorer — Universidad de Sevilla (evento)
  Organiza: Universidad de Sevilla / Santander X. Programa formativo para desarrollar y validar ideas de negocio.
  Tags: modelo de negocio, validación, finanzas, emprendimiento
- af_concurso_de_ideas_de_emprendimiento_us | Concurso de Ideas de Emprendimiento US (evento)
  Organiza: Universidad de Sevilla. Concurso universitario de ideas y proyectos emprendedores.
  Tags: ideas, plan de empresa, presupuesto, pitch
- af_calendario_emprendeual | Calendario EmprendeUAL (fuente_noticias)
  Organiza: Universidad de Almería. Actividades y programas de emprendimiento de la UAL.
  Tags: financiación, empresa, MVP, gestión, ayudas
- af_concurso_upoemprende_proxima_convocatoria | Concurso UPOemprende — próxima convocatoria (evento)
  Organiza: Universidad Pablo de Olavide. Concurso de creación de empresas con talleres de apoyo.
  Tags: clientes, competencia, plan de negocio, viabilidad
- af_feria_de_empleo_y_emprendimiento_upo | Feria de Empleo y Emprendimiento UPO (evento)
  Organiza: Universidad Pablo de Olavide. Feria universitaria con empresas, actividades y ponencias.
  Tags: empresas, empleo, administración, finanzas, CV
- af_programa_un_paso_adelante | Programa Un Paso Adelante (evento)
  Organiza: Universidad de Huelva. Programa de formación y foro de empleo y emprendimiento.
  Tags: empleo, administración, competencias, empresa
- af_feria_de_empleo_de_la_universidad_de_jaen_2026 | Feria de Empleo de la Universidad de Jaén 2026 (evento)
  Organiza: Universidad de Jaén. Encuentro universitario con empresas y oportunidades profesionales.
  Tags: administración, finanzas, empresas, prácticas, empleo
- af_agenda_de_eventos_de_la_universidad_de_cordoba | Agenda de eventos de la Universidad de Córdoba (fuente_noticias)
  Organiza: Universidad de Córdoba. Agenda oficial para detectar jornadas empresariales y de empleo.
  Tags: empresa, economía, empleo, formación
- af_agenda_de_eventos_de_la_universidad_de_cadiz | Agenda de eventos de la Universidad de Cádiz (fuente_noticias)
  Organiza: Universidad de Cádiz. Agenda oficial con congresos, ferias y encuentros universitarios.
  Tags: empresa, relaciones laborales, economía, empleo
- af_agenda_camara_de_comercio_de_almeria | Agenda Cámara de Comercio de Almería (fuente_noticias)
  Organiza: Cámara de Comercio de Almería. Agenda y programas empresariales de la Cámara de Almería.
  Tags: empresa, fiscalidad, comercio, formación
- af_agenda_camara_de_comercio_de_cadiz | Agenda Cámara de Comercio de Cádiz (fuente_noticias)
  Organiza: Cámara de Comercio de Cádiz. Agenda oficial de programas, formación y eventos.
  Tags: empresa, comercio, internacionalización, empleo
- af_agenda_camara_de_comercio_de_cordoba | Agenda Cámara de Comercio de Córdoba (fuente_noticias)
  Organiza: Cámara de Comercio de Córdoba. Fuente oficial de actividades y programas empresariales.
  Tags: empresa, fiscalidad, gestión, comercio
- af_agenda_camara_de_comercio_de_granada | Agenda Cámara de Comercio de Granada (fuente_noticias)
  Organiza: Cámara de Comercio de Granada. Foros, talleres y encuentros de gestión empresarial.
  Tags: fiscalidad, laboral, precios, RRHH, empresa
- af_agenda_camara_de_comercio_de_huelva | Agenda Cámara de Comercio de Huelva (fuente_noticias)
  Organiza: Cámara de Comercio de Huelva. Agenda y servicios empresariales de la Cámara de Huelva.
  Tags: empresa, comercio, financiación, empleo
- af_agenda_camara_de_comercio_de_jaen | Agenda Cámara de Comercio de Jaén (fuente_noticias)
  Organiza: Cámara de Comercio de Jaén. Fuente oficial de formación y eventos empresariales.
  Tags: empresa, gestión, comercio, financiación
- af_agenda_camara_de_comercio_de_malaga | Agenda Cámara de Comercio de Málaga (fuente_noticias)
  Organiza: Cámara de Comercio de Málaga. Actividades, formación y programas empresariales de Málaga.
  Tags: empresa, gestión, fiscalidad, digitalización
- af_agenda_camara_de_comercio_de_sevilla | Agenda Cámara de Comercio de Sevilla (fuente_noticias)
  Organiza: Cámara de Comercio de Sevilla. Agenda de jornadas y programas empresariales.
  Tags: empresa, administración, comercio, financiación
- af_agenda_de_la_confederacion_de_empresarios_de_andalucia | Agenda de la Confederación de Empresarios de Andalucía (fuente_noticias)
  Organiza: CEA. Encuentros y jornadas del tejido empresarial andaluz.
  Tags: empresa, normativa, financiación, RRHH, economía
- af_jornadas_tecnicas_de_fiscalidad_y_laboral_de_camara | Jornadas técnicas de fiscalidad y laboral de Cámara Granada (evento)
  Organiza: Cámara Granada / colaboradores especializados. Jornadas prácticas sobre novedades fiscales, laborales y gestión.
  Tags: fiscalidad, laboral, obligaciones, despachos, empresa

---
