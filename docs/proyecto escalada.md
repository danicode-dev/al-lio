# Proyecto Escalada D1OS

## Objetivo

Convertir D1OS en una app permanente, accesible desde movil y PC, con datos guardados en la nube y sin depender de `localhost` ni del navegador concreto donde se use.

La idea final es que D1OS funcione como un panel personal para:

- Tareas rapidas.
- Calendario mensual.
- Cursos guardados.
- Hackathons.
- Empresas y portales de empleo.
- Registro diario de tareas realizadas.
- Evolucion mensual.
- Acceso desde cualquier dispositivo.

## Estado actual del proyecto

La app ya funciona como una aplicacion Next.js local.

Puntos ya trabajados:

- La pantalla principal arranca en `/dashboard`.
- Hay barra lateral de navegacion.
- Hay tarjetas tipo carpeta para Trabajo, Cursos, Hackathons, Tareas, Calendario y Enlaces.
- Hay boton flotante `+` para alta rapida.
- Las tareas rapidas ya no necesitan URL.
- Cursos, hackathons y empresas si pueden tener enlaces.
- `/calendar` esta pensado como calendario mensual con eventos dentro del dia.
- `/work` esta planteado con dos pestanas: `Portales` y `Empresas`.
- Se importaron empresas desde `empresas_tech_granada.md`.
- Ahora mismo los datos principales se guardan en `localStorage`.

Limitacion actual importante:

`localStorage` solo guarda datos en el navegador/dispositivo actual. Si se abre la app en el movil, en otro PC o en otro navegador, esos datos no aparecen. Para una app permanente hace falta una base de datos en la nube.

## Arquitectura recomendada

La arquitectura recomendada es:

- **Frontend/App**: Next.js desplegado en Vercel.
- **Base de datos**: Supabase Postgres.
- **Autenticacion**: Supabase Auth.
- **Seguridad de datos**: Row Level Security de Supabase.
- **Repositorio**: GitHub.
- **Dominio opcional**: Cloudflare, Namecheap o Vercel Domains.
- **Movil**: usar la web como PWA, instalable desde el navegador.

Resumen:

```text
Usuario movil/PC
      |
      v
Vercel - App Next.js
      |
      v
Supabase - Auth + Postgres + Backups
```

## Por que no basta con Vercel

Vercel sirve para tener la app online.

Pero Vercel no sustituye a una base de datos para guardar tareas, notas, empresas o progreso diario. Si se despliega la app en Vercel pero se deja todo en `localStorage`, la app cargara desde cualquier sitio, pero los datos seguiran siendo locales a cada navegador.

Para que los datos esten disponibles en movil, PC y futuro, hay que mover la persistencia a Supabase.

## Coste aproximado

Los precios pueden cambiar, pero con la informacion revisada en abril de 2026, el escenario aproximado seria:

### Opcion 1: pruebas / coste cero

- Vercel Hobby: 0 USD/mes.
- Supabase Free: 0 USD/mes.
- Dominio: opcional, normalmente 10-15 USD/ano para `.com`.

Coste aproximado:

```text
0 USD/mes + dominio opcional
```

Ventajas:

- Sirve para probar.
- Permite validar la app sin pagar.

Inconvenientes:

- No lo consideraria 100% permanente para datos importantes.
- Supabase Free tiene limites.
- Menos garantias de backups y continuidad.

### Opcion 2: recomendada para uso personal serio

- Vercel Hobby: 0 USD/mes.
- Supabase Pro: aprox. 25 USD/mes.
- Dominio: 10-15 USD/ano aproximadamente.

Coste aproximado:

```text
25 USD/mes + dominio opcional
```

Ventajas:

- Buen equilibrio.
- Datos en base de datos real.
- Mejor continuidad.
- Acceso desde movil y PC.
- Backups diarios en Supabase Pro.

Inconvenientes:

- Ya tiene coste mensual.
- Si crecen mucho datos, usuarios o trafico, puede haber sobrecostes.

### Opcion 3: mas profesional

- Vercel Pro: aprox. 20 USD/mes.
- Supabase Pro: aprox. 25 USD/mes.
- Dominio: 10-15 USD/ano aproximadamente.

Coste aproximado:

```text
45 USD/mes + dominio opcional + impuestos
```

Ventajas:

- Mejor para producto serio.
- Mas margen operativo.
- Mejor experiencia de despliegue y equipo.

Inconvenientes:

- Para una app personal puede ser mas de lo necesario al principio.

### Si quieres tener varias apps

La recomendacion inicial es no crear una base de datos por cada idea pequena.

Mejor:

- Una app principal llamada D1OS.
- Modulos dentro: tareas, empleo, cursos, hackathons, calendario, empresas.
- Un unico Supabase Pro.
- Un unico Vercel.

Si mas adelante hay apps muy distintas, entonces se pueden separar.

Ejemplo aproximado con varios proyectos Supabase en Pro:

- 1 proyecto Supabase Pro con micro compute: aprox. 25 USD/mes.
- 3 proyectos Supabase Pro con micro compute: la documentacion de Supabase muestra un ejemplo de aprox. 45 USD/mes en Supabase.
- Si ademas se usa Vercel Pro: sumar aprox. 20 USD/mes.

## Paso a paso recomendado

### Fase 1 - Dejar el proyecto local limpio

Objetivo: que la app compile bien antes de subirla.

Pasos:

1. Arreglar el problema actual de estilos si sigue ocurriendo.
2. Limpiar artefactos generados:
   - `.next`
   - `.playwright-mcp`
   - `dev-server*.log`
3. Ejecutar:

```bash
npm install
npm run build
```

4. Arrancar local:

```bash
npm run dev
```

5. Verificar:
   - `/dashboard` carga con estilo.
   - El boton `+` guarda tareas.
   - `/calendar` muestra calendario mensual.
   - `/work` carga Portales y Empresas.
   - Las empresas importadas aparecen.

Nota importante:

No borrar `.next` ni otros artefactos sin confirmar antes, porque es una operacion destructiva local. Para arreglar estilos normalmente si conviene borrar `.next` y reiniciar el servidor.

### Fase 2 - Subir el codigo a GitHub

Objetivo: tener un repositorio remoto para que Vercel pueda desplegar.

Pasos:

1. Crear repositorio en GitHub, por ejemplo:

```text
d1os
```

2. Revisar que `.gitignore` ignore:

```gitignore
node_modules
.next
.env
.env*.local
.playwright-mcp
dev-server*.log
```

3. Hacer commit inicial del proyecto limpio.
4. Subir a GitHub.

### Fase 3 - Crear Supabase

Objetivo: tener backend permanente.

Pasos:

1. Crear cuenta en Supabase.
2. Crear organizacion.
3. Crear proyecto, por ejemplo:

```text
d1os-prod
```

4. Elegir region cercana a Espana/Europa.
5. Guardar:
   - Project URL.
   - Anon public key.
   - Service role key solo para servidor, nunca en cliente.

### Fase 4 - Disenar tablas

Tablas recomendadas:

#### `tasks`

Guarda tareas.

Campos:

- `id`
- `user_id`
- `title`
- `description`
- `due_at`
- `status`
- `priority`
- `created_at`
- `updated_at`
- `completed_at`

Estados posibles:

- `pending`
- `completed`
- `postponed`
- `archived`

#### `progress_notes`

Guarda notas de avance sin completar la tarea.

Campos:

- `id`
- `user_id`
- `task_id`
- `note`
- `created_at`

Uso:

- Cuando se pulsa `Nota` en una tarea.
- Sirve para saber que se avanzo aunque no se terminara.

#### `courses`

Guarda cursos.

Campos:

- `id`
- `user_id`
- `title`
- `provider`
- `url`
- `starts_at`
- `ends_at`
- `status`
- `notes`
- `created_at`

#### `hackathons`

Guarda hackathons.

Campos:

- `id`
- `user_id`
- `title`
- `url`
- `starts_at`
- `ends_at`
- `location`
- `status`
- `notes`
- `created_at`

#### `companies`

Guarda empresas.

Campos:

- `id`
- `user_id`
- `name`
- `website_url`
- `jobs_url`
- `category`
- `employment_type`
- `source`
- `verification_status`
- `notes`
- `created_at`
- `updated_at`

Estados de verificacion:

- `verified`
- `unverified`
- `broken`

Importante:

Los links que no se puedan validar automaticamente deben marcarse como `unverified`, no como `broken`.

#### `job_portals`

Guarda portales de empleo.

Campos:

- `id`
- `name`
- `base_url`
- `search_url_template`
- `location`
- `created_at`

Ejemplos:

- LinkedIn.
- InfoJobs.
- Indeed.
- Tecnoempleo.
- JobToday.
- Talent.com.
- Welcome to the Jungle.

Terminos de busqueda recomendados:

- `Frontend Developer`
- `React Frontend Developer`
- `Software Developer`
- `Software Engineer`
- `Programador/a Java Junior`
- `Backend Developer`
- `Full Stack Developer`
- `QA Junior`
- `Soporte IT Junior`
- `Practicas DAW`

### Fase 5 - Activar autenticacion

Objetivo: que puedas iniciar sesion y ver tus datos desde cualquier dispositivo.

Pasos:

1. Activar email/password en Supabase Auth.
2. Opcional: activar login con Google.
3. Crear paginas:
   - `/login`
   - `/register`
   - `/logout`
4. Proteger rutas:
   - `/dashboard`
   - `/calendar`
   - `/work`
   - `/courses`
   - `/hackathons`

### Fase 6 - Activar Row Level Security

Objetivo: que cada usuario vea solo sus datos.

Regla base:

```sql
user_id = auth.uid()
```

Esto debe aplicarse a:

- `tasks`
- `progress_notes`
- `courses`
- `hackathons`
- `companies`
- cualquier tabla con datos privados.

### Fase 7 - Migrar de localStorage a Supabase

Objetivo: no perder lo que ya se haya guardado en el navegador.

Plan:

1. Mantener compatibilidad temporal con `localStorage`.
2. Crear boton o rutina de migracion:

```text
Importar datos locales a la nube
```

3. Leer el store actual:

```text
techlife.store.D1OS.v2
```

4. Insertar tareas, cursos, hackathons y empresas en Supabase.
5. Marcar migracion completada en `localStorage`.
6. A partir de ahi, usar Supabase como fuente principal.

### Fase 8 - Desplegar en Vercel

Objetivo: tener URL publica.

Pasos:

1. Crear cuenta en Vercel.
2. Importar repositorio de GitHub.
3. Confirmar:
   - Framework: Next.js.
   - Build command: `npm run build`.
   - Install command: `npm install`.
4. Anadir variables de entorno:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

5. Desplegar.
6. Probar URL generada:

```text
https://d1os.vercel.app
```

### Fase 9 - Dominio propio

Objetivo: tener una URL limpia.

Ejemplos:

```text
d1os.app
d1os.es
app.tudominio.com
d1os.tudominio.com
```

Pasos:

1. Comprar dominio.
2. Anadir dominio en Vercel.
3. Configurar DNS:
   - Apex domain: registro `A`.
   - Subdominio: registro `CNAME`.
4. Esperar propagacion.
5. Verificar SSL.

### Fase 10 - Movil como app

Objetivo: usar D1OS desde el movil como si fuera una app.

Pasos:

1. Anadir `manifest.json`.
2. Anadir iconos.
3. Definir color de tema.
4. Probar en Chrome Android:
   - Abrir URL.
   - Menu.
   - Anadir a pantalla de inicio.
5. Probar en Safari iPhone:
   - Compartir.
   - Anadir a pantalla de inicio.

## Checklist de pruebas

Antes de considerar el despliegue bueno:

- [ ] `npm run build` pasa sin errores.
- [ ] `/dashboard` carga con estilos.
- [ ] `/calendar` muestra eventos dentro del mes.
- [ ] `/work` carga Portales y Empresas.
- [ ] El boton `+` permite crear tarea sin URL.
- [ ] `Manana misma hora` conserva la hora y cambia el dia.
- [ ] `Hecho` marca tarea como completada.
- [ ] `Nota` guarda progreso sin completar la tarea.
- [ ] Las tareas se ven desde otro navegador tras iniciar sesion.
- [ ] Las tareas se ven desde movil tras iniciar sesion.
- [ ] Empresas y enlaces abren en nueva pestana.
- [ ] Los links no verificados aparecen como `sin verificar`.
- [ ] El usuario no puede ver datos de otro usuario.
- [ ] El dominio funciona con HTTPS.

## Orden de trabajo recomendado

### Primero

1. Reparar estilos locales.
2. Limpiar proyecto.
3. Confirmar build.
4. Subir a GitHub.
5. Desplegar version actual en Vercel.

### Segundo

1. Crear Supabase.
2. Crear tablas.
3. Activar Auth.
4. Activar RLS.
5. Conectar app con Supabase.

### Tercero

1. Migrar datos de `localStorage`.
2. Probar en PC y movil.
3. Anadir dominio.
4. Anadir PWA.

## Riesgos principales

### Riesgo 1: datos solo en navegador

Solucion:

Mover persistencia a Supabase.

### Riesgo 2: borrar datos locales antes de migrar

Solucion:

No borrar `localStorage`. Crear export/import o migracion controlada.

### Riesgo 3: costes si se crean demasiados proyectos

Solucion:

Usar una sola app D1OS con modulos internos hasta que realmente haga falta separar.

### Riesgo 4: seguridad de datos

Solucion:

Activar RLS desde el principio y probar con dos usuarios.

### Riesgo 5: enlaces externos que no se pueden validar

Solucion:

Marcarlos como `sin verificar`, no como rotos.

## Decision recomendada

Para este proyecto, la mejor opcion es:

```text
Vercel Hobby + Supabase Pro + dominio propio opcional
```

Coste aproximado:

```text
25 USD/mes + dominio anual + posibles impuestos
```

Motivo:

- La app sera permanente.
- Los datos estaran en la nube.
- Podras usarla desde movil y PC.
- No pagas Vercel Pro hasta que haga falta.
- Mantienes un coste bajo y controlado.

## Fuentes utiles

- [Vercel Pricing](https://vercel.com/pricing)
- [Next.js on Vercel](https://vercel.com/docs/frameworks/nextjs)
- [Vercel Custom Domains](https://vercel.com/docs/domains/set-up-custom-domain)
- [Supabase Billing FAQ](https://supabase.com/docs/guides/platform/billing-faq)
- [Supabase Compute Usage](https://supabase.com/docs/guides/platform/manage-your-usage/compute)
- [Supabase Backups](https://supabase.com/docs/guides/platform/backups)
- [Supabase Local Development](https://supabase.com/docs/guides/local-development)

