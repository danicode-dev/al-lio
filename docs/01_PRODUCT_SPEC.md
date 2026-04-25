# Product Spec - TechLife Control Panel

## Resumen

**TechLife Control Panel** es una aplicación web personal para centralizar oportunidades y organización diaria relacionada con el mundo tech.

Controla:

- trabajo y ofertas
- búsquedas rápidas
- cursos
- hackathons
- eventos
- tareas pendientes
- recordatorios
- calendario interno
- enlaces rápidos

## Usuario inicial

Estudiante de **Desarrollo de Aplicaciones Web** que busca:

- trabajo junior
- prácticas
- cursos
- hackathons
- eventos tech
- organización personal

## Problema

El flujo actual está disperso:

- LinkedIn
- InfoJobs
- Indeed
- Tecnoempleo
- Google
- notas
- calendario
- recordatorios
- webs de hackathons

La app debe evitar abrir 10 pestañas y perderse.

## Solución

Un panel central con carpetas principales:

- Trabajo
- Cursos
- Hackathons
- Tareas
- Calendario
- Enlaces rápidos

## Principio de diseño

Debe ser:

- simple
- rápida
- directa
- minimalista
- sin relleno
- orientada a actuar

## MVP

Debe incluir:

- login
- dashboard
- sidebar plegable
- CRUD de tareas
- CRUD de ofertas guardadas
- CRUD de cursos
- CRUD de hackathons
- CRUD de enlaces rápidos
- deep links de empleo
- calendario interno básico
- seed inicial de hackathons
- deploy preparado para Vercel

## Estados

### Ofertas

- guardada
- pendiente_revision
- aplicada
- entrevista
- rechazada
- descartada

### Hackathons

- inscripcion_abierta
- pendiente
- realizado
- revisar_futura_edicion
- descartado

### Tareas

- pendiente
- en_progreso
- completada
- pospuesta
- cancelada

### Cursos

- pendiente
- empezado
- terminado
- pausado
- descartado
