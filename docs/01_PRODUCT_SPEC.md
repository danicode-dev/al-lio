# Product Spec - AL-LÍO

## Resumen

AL-LÍO es una aplicación web de orientación, planificación y seguimiento. Centraliza tareas, calendario, cursos, hackathons, oportunidades, noticias y enlaces para que el usuario pueda decidir qué hacer cada semana sin repartir su trabajo entre múltiples herramientas.

## Usuario Actual

El producto funciona hoy como dashboard privado para un usuario principal con foco en:

- organización semanal;
- oportunidades de formación;
- hackathons y convocatorias;
- búsqueda de empleo o prácticas;
- seguimiento de tareas y evidencias.

## Problema

La información útil está dispersa entre calendarios, portales de empleo, cursos, notas, recordatorios, webs de eventos y enlaces guardados. Esa dispersión hace difícil priorizar y demostrar progreso.

## Solución

Un panel único con módulos conectados:

- Dashboard semanal.
- Tareas.
- Calendario local y Google Calendar.
- Cursos.
- Hackathons.
- Oportunidades.
- Noticias.
- Enlaces y fuentes.

## Estado Funcional

- Dashboard privado operativo.
- Datos persistidos en PostgreSQL propio.
- Sesión propia mediante cookie firmada.
- Acceso real mediante Google OAuth.
- Google Calendar conectado desde servidor.
- Importadores CSV para cursos, hackathons y oportunidades.
- Caché local versionada para noticias.
- Despliegue VPS con Docker Compose y Caddy.

## Fuera De Alcance Actual

Estos puntos no deben presentarse como terminados:

- Login email/password completo.
- Onboarding final por ciclo formativo.
- Fixtures demo oficiales para candidatura.
- Suite BDD/Playwright.
- Licencia y metadata final de entrega.

## Principio De Producto

La app debe ser directa, útil y operativa:

- entrar;
- ver prioridades;
- abrir oportunidades relevantes;
- registrar avance;
- preparar evidencia.
