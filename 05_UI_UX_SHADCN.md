# UI/UX Spec - shadcn/ui

## Objetivo visual

La app debe ser:

- minimalista
- clara
- funcional
- sin ruido
- tipo panel de carpetas
- sin exceso de gráficas
- sin textos largos

Idea clave:

> Entro, veo lo importante y actúo.

## Referencia visual

Basarse en la imagen adjunta:

- saludo simple
- carpetas
- resumen corto
- fondo limpio
- estructura directa

No copiar literalmente como terminal, pero mantener la lógica de carpetas y resumen rápido.

## Componentes shadcn/ui

Usar:

- Card
- Button
- Badge
- Tabs
- Dialog
- Sheet
- DropdownMenu
- Input
- Textarea
- Select
- Calendar
- Table
- Command
- Separator
- ScrollArea
- Checkbox

## Layout general

```txt
┌──────────────────────────────────────────┐
│ Sidebar │ Main content                   │
│         │                                │
│ Inicio  │ Buenos días, Dani              │
│ Trabajo │                                │
│ Cursos  │ [Trabajo] [Cursos] [Hackathons]│
│ ...     │ [Tareas] [Calendario] [Links]  │
└──────────────────────────────────────────┘
```

## Sidebar

Debe ser:

- izquierda
- plegable
- con iconos
- limpia
- sin saturación

Items:

- Inicio
- Trabajo
- Cursos
- Hackathons
- Tareas
- Calendario
- Enlaces
- Fuentes
- Configuración

## Dashboard

Debe incluir:

### Saludo

- Buenos días, Dani
- Buenas tardes, Dani
- Buenas noches, Dani

Según hora local.

### Carpetas

Tarjetas grandes:

- Trabajo
- Cursos
- Hackathons
- Tareas
- Calendario
- Enlaces rápidos

Cada tarjeta:

- icono
- título
- descripción corta
- contador pequeño

Ejemplo:

```txt
📁 Trabajo
Ofertas, búsquedas rápidas y candidaturas
3 pendientes
```

### Resumen

Cards pequeñas:

- tareas pendientes
- ofertas guardadas
- hackathons para revisar
- cursos pendientes

## Sección Trabajo

Vista:

- tarjetas de plataformas con logo
- búsquedas rápidas
- ofertas guardadas/importadas

Plataformas:

- LinkedIn
- InfoJobs
- Indeed
- Tecnoempleo
- Adzuna
- Jooble
- Remotive
- JobToday
- Talent.com
- Welcome to the Jungle

## Sección Hackathons

Filtros:

- Provincia
- Estado
- Prioridad
- Tipo

Provincias:

- Granada
- Málaga
- Almería
- Jaén
- Córdoba
- Online

Cada card:

- nombre
- organizador
- provincia/localidad
- estado
- última revisión
- próxima revisión
- botones: Abrir web, Crear tarea, Crear recordatorio, Marcar revisado

## Sección Tareas

Vistas:

- Hoy
- Mañana
- Semana
- Sin fecha
- Completadas

Acciones:

- completar
- posponer a mañana
- editar
- eliminar

## Tono de textos

Usar textos cortos:

- Ofertas guardadas
- Hackathons para revisar
- Posponer a mañana
- Abrir búsqueda
- Marcar revisado

Evitar textos largos de marketing.
