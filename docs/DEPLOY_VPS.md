# Despliegue controlado en VPS

Esta guía actualiza AL-LÍO en `https://al-lio.danielcode.dev` sin aplicar cambios de base de datos a ciegas.

## Principios

- Desplegar un commit o tag exacto, nunca una rama móvil.
- Construir la imagen antes de reemplazar el contenedor activo.
- Respaldar y restaurar de prueba antes de migrar.
- Usar `DATABASE_MIGRATION_URL` solo en el contenedor operativo.
- Usar `DATABASE_URL` con el rol limitado `al_lio_app` en la aplicación.
- No ejecutar `schema.sql` manualmente ni editar una migración aplicada.
- Detener el proceso si la auditoría del baseline encuentra diferencias.

## Requisitos

- Docker y Docker Compose.
- Red Docker externa `danicode_web`.
- Caddy conectado a `danicode_web`.
- DNS y TLS de `al-lio.danielcode.dev` operativos.
- Repositorios en `/srv/danicode/projects/al-lio` y `/srv/danicode/projects/al-lio-radar`.
- Espacio libre suficiente para dos imágenes y dos copias de la base.
- Archivo `.env` de producción fuera de Git.

## 1. Seleccionar la versión

Desde el repositorio del VPS:

```bash
cd /srv/danicode/projects/al-lio
git fetch --tags origin
git status --short
git log --oneline -5 origin/main
```

El árbol debe estar limpio. Fijar el commit aprobado:

```bash
export AL_LIO_RELEASE_SHA="<sha-aprobado>"
git checkout --detach "$AL_LIO_RELEASE_SHA"
test "$(git rev-parse HEAD)" = "$AL_LIO_RELEASE_SHA"
```

Fijar también la versión aprobada del motor Radar:

```bash
cd /srv/danicode/projects/al-lio-radar
git fetch --tags origin
git status --short
export AL_LIO_RADAR_RELEASE_SHA="<sha-radar-aprobado>"
git checkout --detach "$AL_LIO_RADAR_RELEASE_SHA"
test "$(git rev-parse HEAD)" = "$AL_LIO_RADAR_RELEASE_SHA"
cd /srv/danicode/projects/al-lio
```

Guardar también la versión anterior:

```bash
docker inspect al_lio_web --format '{{.Config.Image}}' > /srv/danicode/backups/al-lio/previous-image.txt
```

## 2. Preparar el entorno

Crear `.env` a partir de `.env.production.example`. Valores importantes:

```env
DATABASE_URL=postgresql://al_lio_app:<password-app>@al_lio_postgres:5432/al_lio
DATABASE_MIGRATION_URL=postgresql://al_lio:<password-admin>@al_lio_postgres:5432/al_lio
POSTGRES_PASSWORD=<password-admin>
SESSION_SECRET=<mínimo-32-caracteres>
GOOGLE_TOKEN_ENCRYPTION_KEY=<mínimo-32-caracteres>
BASE_URL=https://al-lio.danielcode.dev
GOOGLE_REDIRECT_URI=https://al-lio.danielcode.dev/api/google/calendar/callback
AL_LIO_IMAGE_TAG=<sha-aprobado>
AL_LIO_RADAR_IMAGE_TAG=<sha-radar-aprobado>
AL_LIO_RADAR_BUILD_CONTEXT=../../al-lio-radar
AL_LIO_RADAR_WEBHOOK_SECRET=<secreto-compartido-mínimo-32-caracteres>
AL_LIO_DEMO_ACCESS_ENABLED=false
NODE_ENV=production
```

El acceso demo solo se activa explícitamente durante pruebas controladas.

Validar permisos:

```bash
chmod 600 .env
```

No copiar `DATABASE_MIGRATION_URL` al contenedor web. Compose solo la entrega al perfil `ops`.

## 3. Inventario previo de solo lectura

```bash
docker compose -f infra/docker-compose.prod.yml --env-file .env ps
docker inspect al_lio_web --format '{{.Config.Image}} {{.State.Status}}'
docker inspect al_lio_postgres --format '{{.State.Status}}'
docker volume inspect al_lio_postgres_data 2>/dev/null || true
df -h
free -h
curl -fsS https://al-lio.danielcode.dev/api/health
```

Inventario PostgreSQL:

```bash
docker exec al_lio_postgres psql -U al_lio -d al_lio -v ON_ERROR_STOP=1 -c \
  "select current_database(), current_user, version();"
docker exec al_lio_postgres psql -U al_lio -d al_lio -v ON_ERROR_STOP=1 -c \
  "select schemaname, relname, n_live_tup from pg_stat_user_tables order by relname;"
```

Guardar la salida en el registro de release, sin contraseñas.

## 4. Respaldar PostgreSQL y Radar

Crear backup consistente:

```bash
mkdir -p /srv/danicode/backups/al-lio
bash scripts/postgres/backup-production.sh
```

Verificarlo mediante una restauración temporal real:

```bash
export AL_LIO_BACKUP_FILE="$(ls -1t /srv/danicode/backups/al-lio/al_lio_*.dump | head -1)"
bash scripts/postgres/verify-backup-production.sh "$AL_LIO_BACKUP_FILE"
```

Archivar una vez el almacenamiento JSON legacy. No se restaura en el nuevo runtime:

```bash
export AL_LIO_LEGACY_NEWS_BACKUP_DIR="/srv/danicode/backups/al-lio/legacy-news-$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$AL_LIO_LEGACY_NEWS_BACKUP_DIR"
docker cp al_lio_web:/app/data/. "$AL_LIO_LEGACY_NEWS_BACKUP_DIR/" 2>/dev/null || true
```

Si Radar ya está desplegado, detener solo ese servicio y copiar su volumen SQLite de forma consistente:

```bash
docker compose -f infra/docker-compose.prod.yml --env-file .env stop al_lio_radar 2>/dev/null || true
docker run --rm \
  -v al_lio_radar_data:/source:ro \
  -v /srv/danicode/backups/al-lio:/backup \
  alpine:3.20 sh -c 'cd /source && tar -czf /backup/radar-data.tgz .'
```

No reiniciar todavía Radar: se levantará después de que AL-LÍO esté healthy.

Si falla el backup o su restauración, no continuar.

## 5. Construir sin detener producción

```bash
docker compose -f infra/docker-compose.prod.yml --env-file .env build --pull al_lio_web al_lio_radar
docker image inspect "al-lio-web:${AL_LIO_IMAGE_TAG}" >/dev/null
docker image inspect "al-lio-radar:${AL_LIO_RADAR_IMAGE_TAG}" >/dev/null
```

El contenedor anterior continúa atendiendo mientras se construye la imagen.

## 6. Ensayar sobre una restauración

Antes de la primera adopción del baseline, restaurar el dump en un PostgreSQL temporal o de staging. La URL siguiente debe apuntar exclusivamente a esa copia, nunca a producción:

```bash
export AL_LIO_REHEARSAL_DATABASE_URL="postgresql://al_lio:<password-admin>@al_lio_postgres:5432/al_lio_rehearsal"
```

Ejecutar la auditoría con la misma imagen y red interna que se desplegarán, sin instalar Node.js en el VPS:

```bash
docker compose -f infra/docker-compose.prod.yml --env-file .env --profile ops run --rm \
  -e DATABASE_MIGRATION_URL="$AL_LIO_REHEARSAL_DATABASE_URL" \
  al_lio_migrator node scripts/postgres/audit-baseline.mjs
```

Si la auditoría muestra diferencias, detenerse. Cuando la causa sea una instalación legacy sin historial y el baseline se haya revisado como reconciliación aditiva, ensayarlo únicamente sobre la copia:

```bash
docker compose -f infra/docker-compose.prod.yml --env-file .env --profile ops run --rm \
  -e DATABASE_MIGRATION_URL="$AL_LIO_REHEARSAL_DATABASE_URL" \
  -e AL_LIO_BASELINE_RECONCILIATION=RECONCILE_0001_INITIAL_SCHEMA \
  al_lio_migrator node scripts/postgres/reconcile-baseline.mjs
```

La reconciliación se ejecuta en una sola transacción y no registra el baseline. Repetir obligatoriamente la auditoría anterior. Si sigue mostrando diferencias, no continuar ni corregir producción manualmente.

Cuando el ensayo coincida, registrar el baseline y aplicar las migraciones solo en la copia:

```bash
docker compose -f infra/docker-compose.prod.yml --env-file .env --profile ops run --rm \
  -e DATABASE_MIGRATION_URL="$AL_LIO_REHEARSAL_DATABASE_URL" \
  -e AL_LIO_BASELINE_CONFIRMATION=ADOPT_0001_INITIAL_SCHEMA \
  al_lio_migrator node scripts/postgres/audit-baseline.mjs --adopt

docker compose -f infra/docker-compose.prod.yml --env-file .env --profile ops run --rm \
  -e DATABASE_MIGRATION_URL="$AL_LIO_REHEARSAL_DATABASE_URL" \
  al_lio_migrator node scripts/postgres/migrate.mjs
```

Validar la aplicación completa contra esa copia antes de continuar y destruir la copia de ensayo solo después de guardar su resultado.

## 7. Adoptar y migrar producción

Solo después de que el mismo backup haya superado el ensayo:

Auditar sin modificar el schema objetivo:

```bash
docker compose -f infra/docker-compose.prod.yml --env-file .env --profile ops run --rm \
  al_lio_migrator node scripts/postgres/audit-baseline.mjs
```

Si la primera auditoría muestra las mismas diferencias legacy ya verificadas sobre la restauración, reconciliar producción una sola vez:

```bash
AL_LIO_BASELINE_RECONCILIATION=RECONCILE_0001_INITIAL_SCHEMA \
docker compose -f infra/docker-compose.prod.yml --env-file .env --profile ops run --rm \
  al_lio_migrator node scripts/postgres/reconcile-baseline.mjs
```

Volver a auditar inmediatamente. La adopción queda prohibida mientras la auditoría no sea completamente verde:

```bash
docker compose -f infra/docker-compose.prod.yml --env-file .env --profile ops run --rm \
  al_lio_migrator node scripts/postgres/audit-baseline.mjs
```

Cuando coincida, registrar el baseline:

```bash
AL_LIO_BASELINE_CONFIRMATION=ADOPT_0001_INITIAL_SCHEMA \
docker compose -f infra/docker-compose.prod.yml --env-file .env --profile ops run --rm \
  al_lio_migrator node scripts/postgres/audit-baseline.mjs --adopt
```

Aplicar migraciones pendientes:

```bash
docker compose -f infra/docker-compose.prod.yml --env-file .env --profile ops run --rm al_lio_migrator
```

Crear o reforzar el rol de runtime:

```bash
AL_LIO_DB_ROLE_CONFIRMATION=CREATE_AL_LIO_APP_ROLE \
docker compose -f infra/docker-compose.prod.yml --env-file .env --profile ops run --rm \
  al_lio_migrator node scripts/postgres/bootstrap-runtime-role.mjs
```

Confirmar que el rol no es administrador:

```bash
docker exec al_lio_postgres psql -U al_lio -d al_lio -c \
  "select rolname, rolsuper, rolcreatedb, rolcreaterole, rolcanlogin from pg_roles where rolname='al_lio_app';"
```

## 8. Preparar la persistencia de Radar

Compose crea el volumen estable `al_lio_radar_data`. No importar los JSON legacy de Noticias: el estado válido de publicación vive en `radar_items` y el estado del alumno en `radar_item_user_states`.

Comprobar la definición antes de arrancar:

```bash
docker compose -f infra/docker-compose.prod.yml --env-file .env config --quiet
docker volume inspect al_lio_radar_data 2>/dev/null || true
```

## 9. Reemplazar la aplicación y arrancar Radar

```bash
docker compose -f infra/docker-compose.prod.yml --env-file .env up -d --no-deps al_lio_web
```

Esperar a que el contenedor esté healthy:

```bash
docker compose -f infra/docker-compose.prod.yml --env-file .env ps
docker logs --tail=100 al_lio_web
docker exec al_lio_web wget -qO- http://127.0.0.1:3000/api/health
docker exec al_lio_web wget -qO- http://127.0.0.1:3000/api/ready
curl -fsS https://al-lio.danielcode.dev/api/health
curl -fsS https://al-lio.danielcode.dev/api/ready
```

Solo cuando AL-LÍO responda healthy y ready, arrancar el productor:

```bash
docker compose -f infra/docker-compose.prod.yml --env-file .env up -d --no-deps al_lio_radar
docker compose -f infra/docker-compose.prod.yml --env-file .env ps
docker logs --tail=100 al_lio_radar
```

Debe existir una sola réplica de Radar para evitar carreras de planificación y revisión.

## 10. Operar la revisión editorial

La recogida y clasificación son automáticas, pero publicar exige una decisión humana auditada. Revisar siempre título, resumen, URL oficial, ciclo y módulos antes de aprobar:

```bash
docker exec al_lio_radar node dist/cli/reviewStatus.js --json
docker exec al_lio_radar node dist/cli/reviewList.js
docker exec al_lio_radar node dist/cli/reviewApprove.js <id> --actor <responsable> --reason "<motivo verificable>"
docker exec al_lio_radar node dist/cli/reviewReject.js <id> --actor <responsable> --reason "<motivo del descarte>"
```

Monitorizar `reviewStatus.js --json` fuera del `HEALTHCHECK`: la cola editorial
vacía o reciente no debe reiniciar el contenedor, pero una antigüedad superior
a 72 horas devuelve código 2 y requiere aviso al responsable de contenidos.

Instalar el monitor versionado y comprobar su primera ejecución:

```bash
sudo install -m 0644 infra/systemd/al-lio-radar-review-health.service /etc/systemd/system/
sudo install -m 0644 infra/systemd/al-lio-radar-review-health.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now al-lio-radar-review-health.timer
sudo systemctl start al-lio-radar-review-health.service
systemctl status al-lio-radar-review-health.service --no-pager
```

Ante cualquier duda, rechazar. Un candidato pendiente o rechazado nunca llega a AL-LÍO.

## 11. Smoke test funcional

Comprobar como mínimo:

- login por contraseña;
- los cinco perfiles demo, si se han activado;
- Dashboard;
- crear, completar y eliminar una tarea de prueba;
- crear una nota y verla tras recargar;
- Calendario y conexión Google;
- Noticias: ningún elemento de Ideal ni de otra fuente generalista legacy;
- Noticias: cada perfil solo ve elementos aprobados para su ciclo;
- Radar: aprobar un candidato controlado, entregarlo y comprobar una única fila en `radar_deliveries`;
- Radar: reenviar el mismo `deliveryId` y comprobar respuesta idempotente sin duplicados;
- Trabajo, Cursos y Hackathons;
- persistencia tras reiniciar únicamente `al_lio_web`.

Vigilar logs durante al menos 30 minutos.

## Rollback de aplicación

Las migraciones deben ser compatibles con la versión anterior. Para volver al contenedor previo:

1. Cambiar `AL_LIO_IMAGE_TAG` en `.env` al tag guardado.
2. Ejecutar:

```bash
docker compose -f infra/docker-compose.prod.yml --env-file .env up -d --no-deps al_lio_web
curl -fsS https://al-lio.danielcode.dev/api/ready
```

No ejecutar migraciones inversas automáticas durante un incidente.

## Rollback de Radar

Radar puede detenerse sin afectar al resto de AL-LÍO; las noticias ya entregadas permanecen en PostgreSQL:

```bash
docker compose -f infra/docker-compose.prod.yml --env-file .env stop al_lio_radar
```

Para recuperar una versión anterior, cambiar `AL_LIO_RADAR_IMAGE_TAG`, reconstruir desde su SHA exacto y levantar solo `al_lio_radar`. La migración `0002_radar_news.sql` es aditiva y no debe revertirse durante un incidente.

## Recuperación de base de datos

Restaurar el dump implica pérdida de los cambios posteriores al backup. Solo hacerlo tras confirmar el incidente, detener escrituras y guardar antes una copia del estado dañado.

El procedimiento debe ensayarse primero en una base temporal usando `verify-backup-production.sh`.

## Después de cada release

- Registrar los dos commits, tags, hora, operador y backup usado.
- Confirmar health/readiness y smoke test.
- Conservar la imagen anterior hasta cerrar la ventana de observación.
- Guardar el backup fuera del VPS.
- No borrar manualmente volúmenes Docker.
