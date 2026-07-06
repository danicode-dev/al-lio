# Al-Lío Open

> Organiza tu formación, tus oportunidades y tus próximos pasos profesionales desde un único panel.

[Ver demo](https://al-lio.danielcode.dev) ·
[Documentación](docs/) ·
[Arquitectura](docs/03_ARCHITECTURE_AND_STACK.md)

---

## Sobre el proyecto

**Al-Lío** es una aplicación web que centraliza tareas, calendario, cursos, hackathons, candidaturas y recursos relacionados con la búsqueda de empleo tecnológico.

El proyecto nació como una herramienta personal para resolver un problema concreto: tener entregas, formación, convocatorias y oportunidades repartidas entre demasiadas aplicaciones.

El repositorio contiene actualmente un **MVP operativo**. Su evolución, presentada como **Al-Lío Open** para Aircury Summer of Code 2026, busca convertirlo en una plataforma abierta, multiusuario y accesible para estudiantes y personas que están dando sus primeros pasos profesionales.

## Problema

Durante la transición entre los estudios y el primer empleo es necesario coordinar:

- Clases, prácticas y proyectos.
- Cursos y formación complementaria.
- Hackathons, becas y convocatorias.
- Candidaturas y procesos de selección.
- Fechas límite, requisitos y próximos pasos.

Esta información suele estar distribuida entre calendarios, portales de empleo, notas y gestores de tareas. Al-Lío reúne esos procesos para ayudar al usuario a saber **qué necesita atención ahora y por qué**.

## Funcionalidades actuales

### Panel principal

El dashboard ofrece una visión rápida de:

- Tareas urgentes o prioritarias.
- Planificación semanal.
- Eventos locales y de Google Calendar.
- Próximos hackathons.
- Búsquedas de empleo tecnológico.

### Gestión de tareas

- Tablero Kanban con bloques Diario, Pendiente y Semanal.
- Prioridades baja, media, alta y crítica.
- Fechas límite, alarmas y etiquetas.
- Creación rápida desde el dashboard.
- Edición y eliminación desde el detalle de cada tarea.

### Calendario

- Calendario mensual y vista detallada por día.
- Integración con Google Calendar.
- Creación y eliminación de eventos.
- Consultas puntuales sin sincronización constante innecesaria.

### Formación y oportunidades

- Gestión de cursos y hackathons.
- Notas, enlaces y fuentes de información.
- Seguimiento de oportunidades.
- Acceso a información y convocatorias externas.

### Búsqueda de empleo

Una misma búsqueda puede abrirse en:

- LinkedIn.
- InfoJobs.
- Tecnoempleo.
- Indeed.

El usuario solo necesita indicar el puesto y la ubicación para consultar los distintos portales.

### Autenticación

- Acceso mediante Google OAuth.
- Sesiones administradas con Supabase.
- Rutas privadas protegidas.
- Gestión de credenciales y tokens desde servidor.
- Interfaz responsive con modo claro y oscuro.

## Evolución: Al-Lío Open

La siguiente fase convertirá el MVP personal en una aplicación preparada para usuarios reales.

El alcance incluye:

- Aplicación multiusuario con datos aislados por cuenta.
- Ruta profesional con objetivos, competencias y proyectos.
- Seguimiento de candidaturas y resultados.
- Oportunidades asociadas a requisitos y próximos pasos.
- Registro de evidencias de aprendizaje y progreso.
- Alertas y planificación semanal.
- Mejora de accesibilidad conforme a WCAG 2.2 AA.
- Exportación y eliminación de datos.
- Validación con estudiantes y tutores.
- Publicación de una demo estable y documentada.

El objetivo no es crear otro gestor de tareas genérico, sino conectar el proceso completo:

```text
Oportunidad → Requisitos → Próxima acción → Evidencia → Resultado