# Autonomous production deployment

> **Manual fallback:** routine releases are normally started by GitHub after a
> successful post-merge CI run. See
> [`GITHUB_PRODUCTION_DEPLOY.md`](GITHUB_PRODUCTION_DEPLOY.md). Use this guide
> when automatic deployment is disabled or a transient GitHub/SSH failure needs
> an operator retry.

Esta guía permite al propietario revisar una versión en local, fusionarla en
GitHub y desplegarla personalmente en el VPS con una sola orden. El script no
sustituye la revisión funcional: automatiza la parte operativa repetitiva y
detiene el despliegue cuando detecta un caso que necesita intervención manual.

## Daily workflow

### 1. Finish the local review

Comprueba la rama en local como haces habitualmente. Cuando estés conforme:

```powershell
git status
git rev-parse HEAD
git push
```

No añadas nuevos commits después de la comprobación manual. Si cambias el
código, vuelve a revisar esa versión antes de fusionarla.

### 2. Merge the pull request

En GitHub:

1. Confirma que la PR apunta a `main`.
2. Comprueba que el último commit es el que revisaste.
3. Espera a que estén verdes `Verify application`, `Dependency review` y
   `Analyze JavaScript and TypeScript`.
4. Pulsa **Merge pull request** y confirma.
5. Copia el SHA completo del **merge commit** que GitHub muestra después de la
   fusión. Será un valor de 40 caracteres, por ejemplo
   `9517e115314bb4d2aecda5afb8e17eca54745937`.

El SHA del merge puede ser distinto al SHA de la rama que revisaste. Para el
despliegue debes utilizar siempre el SHA del merge que ya pertenece a `main`.

También puedes obtenerlo desde tu ordenador si tienes GitHub CLI:

```powershell
gh pr view NUMERO_PR --json mergeCommit --jq '.mergeCommit.oid'
```

### 3. Connect to production

Desde PowerShell:

```powershell
ssh al-lio-vps
```

Ya dentro del VPS, entra en la release que está ejecutándose actualmente:

```bash
cd "$(dirname "$(docker inspect al_lio_web --format '{{index .Config.Labels "com.docker.compose.project.working_dir"}}')")"
```

No necesitas recordar el nombre de la carpeta. La orden anterior lo obtiene
del contenedor que está sirviendo producción.

### 4. Run the release command

Sustituye `<SHA>` por el SHA completo del merge:

```bash
./scripts/deploy-production.sh <SHA>
```

Ejemplo:

```bash
./scripts/deploy-production.sh 9517e115314bb4d2aecda5afb8e17eca54745937
```

El script enseñará la versión actual, la nueva versión y las migraciones
detectadas. Para evitar un despliegue accidental te pedirá escribir:

```text
DEPLOY 9517e115314
```

Escribe exactamente el texto que aparezca en tu terminal y pulsa Entrar.

### 5. Wait for the final result

No cierres la conexión SSH mientras trabaja. Una finalización correcta termina
con un resumen similar a este:

```text
Deployment completed successfully.
Release: <SHA>
Web: running and healthy
PostgreSQL: preserved
Radar: preserved and running
Next step: perform the owner functional review in production.
```

Después realiza tu comprobación funcional habitual directamente en
`https://al-lio.danielcode.dev`.

## What the command does

La orden realiza automáticamente estas tareas:

1. Impide que dos despliegues se ejecuten simultáneamente.
2. Comprueba que web, PostgreSQL y Radar están saludables antes de empezar.
3. Descarga `origin/main` y verifica que el SHA pertenece a `main`.
4. Impide desplegar una versión anterior o una rama divergente.
5. Crea un worktree limpio e inmutable para ese SHA sin tocar el checkout
   histórico del VPS.
6. Copia el `.env` de producción sin mostrar secretos y cambia únicamente la
   etiqueta de la imagen web.
7. Renderiza y valida Docker Compose.
8. Construye la imagen candidata mientras la versión actual sigue atendiendo
   tráfico.
9. Comprueba el baseline y el estado de las migraciones.
10. Si hay migraciones pendientes, crea un dump de PostgreSQL, verifica una
    restauración completa y ensaya las migraciones en una base aislada.
11. Antes de migrar producción, detiene brevemente Radar y guarda su volumen.
12. Aplica únicamente las migraciones ensayadas.
13. Sustituye exclusivamente `al_lio_web`.
14. Comprueba health, readiness, el límite de autenticación de Radar y que los
    contenedores de PostgreSQL y Radar siguen siendo los mismos.
15. Deja un registro privado del despliegue dentro de
    `/srv/danicode/backups/al-lio`.

Los despliegues web sin migraciones no detienen ni respaldan innecesariamente
PostgreSQL o Radar.

## Automatic stop conditions

El script se detiene sin declarar éxito cuando detecta cualquiera de estas
situaciones:

- el SHA no tiene 40 caracteres o no pertenece a `origin/main`;
- la versión solicitada es anterior o divergente respecto a producción;
- otro despliegue está en curso;
- algún contenedor obligatorio ya estaba enfermo antes de empezar;
- se modificó una migración existente;
- una migración nueva contiene DDL destructivo;
- cambiaron `Dockerfile`, Docker Compose o un catálogo con importación
  operativa propia;
- la configuración, build, backup, restauración o migración falla;
- el contenedor nuevo no supera health/readiness;
- PostgreSQL o Radar cambian de identidad inesperadamente.

Cuando cambian Docker/Compose, un catálogo operado mediante importador, Radar o
una migración no aditiva, utiliza el procedimiento completo de
[`DEPLOY_VPS.md`](DEPLOY_VPS.md). Esos casos no son una release web rutinaria.

## Failure and rollback

Si la build falla, producción no se modifica.

Si el fallo sucede después de reemplazar la web, el script intenta recuperar
automáticamente la imagen y la release anteriores. Si había detenido Radar,
vuelve a arrancar exactamente el mismo contenedor.

Las migraciones automáticas admitidas son aditivas. No se ejecutan migraciones
inversas durante un rollback: la aplicación anterior debe seguir siendo
compatible con el esquema ampliado.

Si aparece un mensaje `CRITICAL`, detén cualquier otra operación y sigue la
sección de recuperación de [`DEPLOY_VPS.md`](DEPLOY_VPS.md).

## First use

El script estará disponible en producción después de que esta funcionalidad se
fusione y se despliegue una primera vez con el procedimiento actual. A partir
de esa release, siempre estará incluido en la carpeta que devuelve el comando
del paso 3 y los siguientes despliegues ya podrán hacerse con una sola orden.
