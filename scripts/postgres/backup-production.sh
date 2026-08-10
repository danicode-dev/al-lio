#!/usr/bin/env bash
set -Eeuo pipefail

umask 077

container="${AL_LIO_POSTGRES_CONTAINER:-al_lio_postgres}"
database="${AL_LIO_POSTGRES_DB:-al_lio}"
user="${AL_LIO_POSTGRES_USER:-al_lio}"
backup_dir="${AL_LIO_BACKUP_DIR:-/srv/danicode/backups/al-lio}"

mkdir -p -- "$backup_dir"
backup_dir="$(readlink -f -- "$backup_dir")"
if [[ -z "$backup_dir" || "$backup_dir" == "/" ]]; then
  echo "ERROR: directorio de backups no válido." >&2
  exit 1
fi

docker inspect "$container" >/dev/null
docker exec "$container" pg_isready -U "$user" -d "$database" >/dev/null

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
final_path="$backup_dir/al_lio_${timestamp}.dump"
temp_path="$backup_dir/.al_lio_${timestamp}.$$.tmp"

cleanup() {
  rm -f -- "$temp_path"
}
trap cleanup EXIT

docker exec "$container" pg_dump \
  -U "$user" \
  -d "$database" \
  --format=custom \
  --compress=6 \
  --no-owner \
  --no-acl >"$temp_path"

test -s "$temp_path"
docker exec -i "$container" pg_restore --list <"$temp_path" >/dev/null
mv -- "$temp_path" "$final_path"
sha256sum "$final_path" >"$final_path.sha256"

echo "Backup creado y validado: $final_path"
echo "Checksum: $final_path.sha256"
