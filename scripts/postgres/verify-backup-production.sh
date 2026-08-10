#!/usr/bin/env bash
set -Eeuo pipefail

if [[ $# -ne 1 ]]; then
  echo "Uso: bash scripts/postgres/verify-backup-production.sh /ruta/backup.dump" >&2
  exit 1
fi

container="${AL_LIO_POSTGRES_CONTAINER:-al_lio_postgres}"
user="${AL_LIO_POSTGRES_USER:-al_lio}"
backup_file="$(readlink -f -- "$1")"

if [[ ! -f "$backup_file" || ! -s "$backup_file" ]]; then
  echo "ERROR: backup inexistente o vacío." >&2
  exit 1
fi

docker inspect "$container" >/dev/null
docker exec -i "$container" pg_restore --list <"$backup_file" >/dev/null

temporary_database="al_lio_restore_check_$(date -u +%Y%m%d%H%M%S)_$$"
created=0

cleanup() {
  if [[ "$created" -eq 1 ]]; then
    docker exec "$container" dropdb -U "$user" --if-exists "$temporary_database" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

docker exec "$container" createdb -U "$user" "$temporary_database"
created=1
docker exec -i "$container" pg_restore \
  -U "$user" \
  -d "$temporary_database" \
  --exit-on-error \
  --no-owner \
  --no-acl <"$backup_file"

table_count="$(docker exec "$container" psql -U "$user" -d "$temporary_database" -Atc \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'")"

if [[ ! "$table_count" =~ ^[0-9]+$ || "$table_count" -lt 10 ]]; then
  echo "ERROR: la restauración solo contiene $table_count tablas públicas." >&2
  exit 1
fi

docker exec "$container" psql -U "$user" -d "$temporary_database" -v ON_ERROR_STOP=1 -c \
  "SELECT to_regclass('public.users') AS users, to_regclass('public.tasks') AS tasks, to_regclass('public.profiles') AS profiles;"

echo "OK: restauración completa verificada en $temporary_database ($table_count tablas)."
