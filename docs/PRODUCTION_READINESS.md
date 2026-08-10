# Preparación de producción

Este documento separa lo ya automatizado de lo que requiere acceso al VPS o decisiones de producto.

## Implementado en el repositorio

- [x] Imagen Next.js standalone y proceso no-root.
- [x] `.dockerignore` para no enviar secretos ni dumps al builder.
- [x] Imagen versionable mediante `AL_LIO_IMAGE_TAG`.
- [x] Healthcheck de liveness y readiness con PostgreSQL.
- [x] Rotación básica de logs Docker.
- [x] Volumen persistente transitorio para Noticias.
- [x] Migraciones ordenadas, transaccionales, con checksum y advisory lock.
- [x] Rechazo automático de bases existentes no auditadas.
- [x] Auditoría estricta y adopción explícita del baseline.
- [x] Rol de runtime PostgreSQL sin permisos administrativos.
- [x] Backup y restauración temporal verificable.
- [x] Cookies sensibles `Secure` en producción.
- [x] Acceso demo cerrado por defecto en producción.
- [x] Rate limiting básico para contraseña y perfiles demo.
- [x] Validación de variables antes de iniciar el contenedor.
- [x] Validadores de migración, integración y despliegue incluidos en CI.

## P0 antes del primer despliegue

- [ ] Inventariar commit, contenedores, volúmenes, recursos y schema del VPS.
- [ ] Rotar o confirmar secretos de al menos 32 caracteres.
- [ ] Crear backup y restaurarlo correctamente.
- [ ] Ensayar la auditoría del baseline sobre una copia del VPS.
- [ ] Crear una migración de reconciliación si aparece cualquier diferencia.
- [ ] Adoptar el baseline solo después del ensayo.
- [ ] Crear `al_lio_app` y comprobar sus privilegios.
- [ ] Preservar el directorio `/app/data` de Noticias al crear el volumen.
- [ ] Ejecutar smoke test de todos los flujos críticos.
- [ ] Guardar backup cifrado fuera del VPS.

## P1 para usuarios reales

- [ ] Automatizar backup diario y retención 7/4 sin guardar credenciales en cron.
- [ ] Añadir monitor externo para `/api/health` y `/api/ready`.
- [ ] Centralizar errores de servidor sin datos sensibles.
- [ ] Añadir pruebas de autorización por usuario y manipulación de IDs.
- [ ] Migrar Noticias desde JSON a `news_items` y `user_news_state`.
- [ ] Reiniciar los datos demo periódicamente o usar una base demo separada.
- [ ] Diseñar revocación/rotación de sesiones activas.
- [ ] Revisar cabeceras CSP/HSTS y política de orígenes en Caddy.
- [ ] Fijar versiones de imágenes Docker y planificar actualizaciones.

## P2 de rendimiento y mantenibilidad

- [ ] Sustituir `getGlobalStore()` del layout por carga específica por página.
- [ ] Extraer las pantallas restantes de `guest-app.tsx`.
- [ ] Paginar listados y evitar `SELECT *` en rutas calientes.
- [ ] Cachear únicamente catálogos compartidos con invalidación explícita.
- [ ] Configurar `pg_stat_statements` y revisar consultas lentas.
- [ ] Medir Web Vitals y presupuesto de JavaScript por ruta.
- [ ] Añadir pruebas E2E de login, tareas, Bloc, Calendario y navegación móvil.

## Criterio para declarar producción lista

La release puede considerarse lista cuando todos los P0 estén cerrados, CI esté verde, el ensayo sobre backup funcione y exista rollback probado de imagen. Para uso con datos personales reales también deben cerrarse monitorización, backup externo y pruebas de autorización de P1.
