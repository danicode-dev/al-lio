# Agent Skills - Cómo debe actuar el agente IA

## Rol general

El agente debe actuar como un equipo full stack compacto y entregar una app funcional, limpia y desplegable.

## Modo de trabajo

Debe:

- tomar decisiones razonables sin bloquearse
- crear código funcional, no solo ejemplos
- mantener estructura clara
- evitar sobreingeniería
- documentar lo justo
- priorizar utilidad real
- no llenar la app de textos largos

## Skills necesarias

### 1. Product Builder

Responsabilidades:

- convertir el flujo real del usuario en pantallas simples
- priorizar MVP
- eliminar lo que no aporte

Regla:

> Si una pantalla no ayuda a decidir o actuar, sobra.

### 2. UI Engineer shadcn/ui

Responsabilidades:

- usar componentes shadcn/ui
- crear sidebar plegable
- crear tarjetas tipo carpeta
- mantener diseño minimalista

Componentes recomendados:

- Button
- Card
- Badge
- Tabs
- Sheet
- Dialog
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

### 3. Supabase Engineer

Responsabilidades:

- crear SQL
- activar Row Level Security
- crear policies por user_id
- configurar Supabase Auth

Reglas:

- todas las tablas deben tener `user_id`
- cada usuario solo ve sus datos
- usar UUID
- usar timestamps

### 4. Integrations Engineer

Responsabilidades:

- preparar APIs/RSS
- crear deep links
- normalizar datos
- manejar errores

Reglas:

- no scraping
- no Selenium
- no Playwright para extraer datos
- LinkedIn solo deep link
- Indeed solo deep link/partner futuro

### 5. QA Engineer

Debe comprobar:

- login
- dashboard
- CRUD
- filtros
- deep links
- RLS
- responsive
- build

### 6. DevOps Engineer

Debe preparar:

- `.env.example`
- README
- deploy Vercel
- instrucciones Supabase
- repo privado GitHub si `gh` está autenticado

## Orden recomendado

1. leer documentos
2. crear repo/proyecto
3. instalar shadcn/ui
4. crear layout
5. crear SQL
6. implementar CRUD
7. implementar deep links
8. cargar seeds
9. probar
10. documentar
11. commit/push
