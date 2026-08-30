#!/usr/bin/env bash
set -Eeuo pipefail

umask 077

readonly DEFAULT_REPOSITORY_DIR="/srv/danicode/projects/al-lio"
readonly DEFAULT_RELEASES_DIR="/srv/danicode/releases"
readonly DEFAULT_BACKUP_DIR="/srv/danicode/backups/al-lio"
readonly COMPOSE_FILE="infra/docker-compose.prod.yml"
readonly WEB_CONTAINER="al_lio_web"
readonly POSTGRES_CONTAINER="al_lio_postgres"
readonly RADAR_CONTAINER="al_lio_radar"

repository_dir="${AL_LIO_REPOSITORY_DIR:-$DEFAULT_REPOSITORY_DIR}"
releases_dir="${AL_LIO_RELEASES_DIR:-$DEFAULT_RELEASES_DIR}"
backup_dir="${AL_LIO_BACKUP_DIR:-$DEFAULT_BACKUP_DIR}"
health_attempts="${AL_LIO_HEALTH_ATTEMPTS:-40}"
health_interval_seconds="${AL_LIO_HEALTH_INTERVAL_SECONDS:-3}"

release_sha=""
release_short_sha=""
release_dir=""
previous_release_dir=""
previous_web_image=""
postgres_container_id=""
radar_container_id=""
rehearsal_database=""
postgres_backup_file=""
radar_backup_file=""
radar_stopped=0
web_replacement_started=0
allowed_compose_env_mappings=()
allowed_compose_env_services=()
allowed_compose_env_lines=()

usage() {
  cat <<'EOF'
Usage:
  ./scripts/deploy-production.sh <full-40-character-main-commit-sha>

The command runs on the AL-LIO VPS and deploys only an exact commit already
reachable from origin/main. It builds before cutover, rehearses and backs up
additive migrations, preserves Radar/PostgreSQL container identity, checks
internal and public readiness, and rolls the web container back if the new
release does not become healthy.

Non-interactive operators must set AL_LIO_DEPLOY_CONFIRMATION to the exact SHA.
EOF
}

log() {
  printf '\n==> %s\n' "$*"
}

fail() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "Required command not found: $1"
}

read_env_value() {
  local key="$1"
  local env_file="$2"
  local line=""
  local value=""

  line="$(grep -E "^${key}=" "$env_file" | tail -n 1 || true)"
  [[ -n "$line" ]] || fail "$key is missing from $env_file"
  value="${line#*=}"
  value="${value%$'\r'}"

  if [[ "$value" == \"*\" && "$value" == *\" ]]; then
    value="${value:1:${#value}-2}"
  elif [[ "$value" == \'*\' && "$value" == *\' ]]; then
    value="${value:1:${#value}-2}"
  fi

  printf '%s' "$value"
}

write_env_value() {
  local key="$1"
  local value="$2"
  local env_file="$3"
  local temp_file="${env_file}.tmp.$$"

  awk -v key="$key" -v value="$value" '
    BEGIN { found = 0 }
    index($0, key "=") == 1 {
      if (!found) print key "=" value
      found = 1
      next
    }
    { print }
    END { if (!found) print key "=" value }
  ' "$env_file" > "$temp_file"

  chmod 600 "$temp_file"
  mv -- "$temp_file" "$env_file"
}

validate_compose_env_additions() {
  local change_lines=""
  local line=""
  local service=""
  local key=""
  local mapping=""
  local target_web_environment=""
  local target_radar_environment=""
  local target_environment=""
  local match_count=0
  local index=0

  change_lines="$(
    git -C "$repository_dir" diff --no-ext-diff --unified=0 "$current_sha" "$release_sha" -- "$COMPOSE_FILE" |
      awk '!/^--- / && !/^\+\+\+ / && /^[+-]/ { print }'
  )"
  [[ -n "$change_lines" ]] || return 1

  while IFS= read -r line; do
    case "$line" in
      '+      GOOGLE_IDENTITY_REDIRECT_URI: ${GOOGLE_IDENTITY_REDIRECT_URI:-}') service="al_lio_web"; key="GOOGLE_IDENTITY_REDIRECT_URI" ;;
      '+      RESEND_API_KEY: ${RESEND_API_KEY:-}') service="al_lio_web"; key="RESEND_API_KEY" ;;
      '+      RESEND_FROM_EMAIL: ${RESEND_FROM_EMAIL:-}') service="al_lio_web"; key="RESEND_FROM_EMAIL" ;;
      '+      AL_LIO_RADAR_V4_PROJECT_DESTINATIONS: ${AL_LIO_RADAR_V4_PROJECT_DESTINATIONS:-}') service="al_lio_web"; key="AL_LIO_RADAR_V4_PROJECT_DESTINATIONS" ;;
      '+      AL_LIO_VERIFIED_OPPORTUNITIES_ONLY: ${AL_LIO_VERIFIED_OPPORTUNITIES_ONLY:-false}') service="al_lio_web"; key="AL_LIO_VERIFIED_OPPORTUNITIES_ONLY" ;;
      '+      AL_LIO_RADAR_LEARNING_INGEST_ENABLED: ${AL_LIO_RADAR_LEARNING_INGEST_ENABLED:-false}') service="al_lio_web"; key="AL_LIO_RADAR_LEARNING_INGEST_ENABLED" ;;
      '+      AL_LIO_DELIVERY_SCHEMA_VERSION: ${AL_LIO_RADAR_DELIVERY_SCHEMA_VERSION:-3}') service="al_lio_radar"; key="AL_LIO_DELIVERY_SCHEMA_VERSION" ;;
      '+      AUTONOMOUS_PUBLICATION_ENABLED: ${AL_LIO_RADAR_AUTONOMOUS_PUBLICATION_ENABLED:-false}') service="al_lio_radar"; key="AUTONOMOUS_PUBLICATION_ENABLED" ;;
      '+      AUTONOMOUS_PUBLICATION_DESTINATIONS: ${AL_LIO_RADAR_AUTONOMOUS_PUBLICATION_DESTINATIONS:-news}') service="al_lio_radar"; key="AUTONOMOUS_PUBLICATION_DESTINATIONS" ;;
      '+      AUTONOMOUS_NEWS_SOURCE_CYCLE_MATRIX_JSON: ${AL_LIO_RADAR_AUTONOMOUS_NEWS_SOURCE_CYCLE_MATRIX_JSON:-}') service="al_lio_radar"; key="AUTONOMOUS_NEWS_SOURCE_CYCLE_MATRIX_JSON" ;;
      '+      DAILY_PUBLICATION_TIMEZONE: ${AL_LIO_RADAR_DAILY_PUBLICATION_TIMEZONE:-Europe/Madrid}') service="al_lio_radar"; key="DAILY_PUBLICATION_TIMEZONE" ;;
      '+      DAILY_PUBLICATION_TIME: ${AL_LIO_RADAR_DAILY_PUBLICATION_TIME:-09:00}') service="al_lio_radar"; key="DAILY_PUBLICATION_TIME" ;;
      '+      WEB_DISCOVERY_ENABLED: ${AL_LIO_RADAR_WEB_DISCOVERY_ENABLED:-false}') service="al_lio_radar"; key="WEB_DISCOVERY_ENABLED" ;;
      '+      LEARNING_DISCOVERY_ENABLED: ${AL_LIO_RADAR_LEARNING_DISCOVERY_ENABLED:-false}') service="al_lio_radar"; key="LEARNING_DISCOVERY_ENABLED" ;;
      '+      YOUTUBE_WATCH_ENABLED: ${AL_LIO_RADAR_YOUTUBE_WATCH_ENABLED:-false}') service="al_lio_radar"; key="YOUTUBE_WATCH_ENABLED" ;;
      '+      LEARNING_DELIVERY_ENABLED: ${AL_LIO_RADAR_LEARNING_DELIVERY_ENABLED:-false}') service="al_lio_radar"; key="LEARNING_DELIVERY_ENABLED" ;;
      '+      YOUTUBE_API_KEY: ${AL_LIO_RADAR_YOUTUBE_API_KEY:-}') service="al_lio_radar"; key="YOUTUBE_API_KEY" ;;
      '+      JOB_RADAR_ENABLED: ${AL_LIO_RADAR_JOB_RADAR_ENABLED:-false}') service="al_lio_radar"; key="JOB_RADAR_ENABLED" ;;
      *) return 1 ;;
    esac

    mapping="${service}:${key}"
    [[ ! " ${allowed_compose_env_mappings[*]} " =~ [[:space:]]${mapping}[[:space:]] ]] || return 1
    allowed_compose_env_mappings+=("$mapping")
    allowed_compose_env_services+=("$service")
    allowed_compose_env_lines+=("${line#+}")
  done <<< "$change_lines"

  target_web_environment="$(
    git -C "$repository_dir" show "$release_sha:$COMPOSE_FILE" |
      awk '
        /^  al_lio_web:$/ { in_web = 1; next }
        in_web && /^  [^ ]/ { in_web = 0; in_environment = 0 }
        in_web && /^    environment:$/ { in_environment = 1; next }
        in_web && in_environment && /^    [^ ]/ { in_environment = 0 }
        in_web && in_environment { print }
      '
  )"

  target_radar_environment="$(
    git -C "$repository_dir" show "$release_sha:$COMPOSE_FILE" |
      awk '
        /^  al_lio_radar:$/ { in_radar = 1; next }
        in_radar && /^  [^ ]/ { in_radar = 0; in_environment = 0 }
        in_radar && /^    environment:$/ { in_environment = 1; next }
        in_radar && in_environment && /^    [^ ]/ { in_environment = 0 }
        in_radar && in_environment { print }
      '
  )"

  for ((index = 0; index < ${#allowed_compose_env_mappings[@]}; index++)); do
    case "${allowed_compose_env_services[$index]}" in
      al_lio_web) target_environment="$target_web_environment" ;;
      al_lio_radar) target_environment="$target_radar_environment" ;;
      *) return 1 ;;
    esac
    match_count="$(grep -Fxc -- "${allowed_compose_env_lines[$index]}" <<< "$target_environment" || true)"
    [[ "$match_count" -eq 1 ]] || return 1
  done
}

container_status() {
  docker inspect "$1" --format '{{.State.Status}}'
}

container_health() {
  docker inspect "$1" --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}'
}

wait_for_web_health() {
  local attempt=0
  local state=""
  local health=""

  for ((attempt = 1; attempt <= health_attempts; attempt++)); do
    state="$(container_status "$WEB_CONTAINER" 2>/dev/null || true)"
    health="$(container_health "$WEB_CONTAINER" 2>/dev/null || true)"
    if [[ "$state" == "running" && "$health" == "healthy" ]]; then
      return 0
    fi
    if [[ "$state" == "exited" || "$health" == "unhealthy" ]]; then
      return 1
    fi
    sleep "$health_interval_seconds"
  done

  return 1
}

drop_rehearsal_database() {
  if [[ -n "$rehearsal_database" ]]; then
    docker exec "$POSTGRES_CONTAINER" dropdb -U al_lio --if-exists "$rehearsal_database" >/dev/null 2>&1 || true
    rehearsal_database=""
  fi
}

restart_preserved_radar() {
  if [[ "$radar_stopped" -eq 1 ]]; then
    docker start "$RADAR_CONTAINER" >/dev/null || return 1
    radar_stopped=0
  fi
}

rollback_web() {
  [[ -n "$previous_release_dir" && -f "$previous_release_dir/.env" ]] || return 1

  log "Rolling the web service back to $previous_web_image"
  (
    cd "$previous_release_dir"
    docker compose -f "$COMPOSE_FILE" --env-file .env up -d --no-deps al_lio_web </dev/null
  ) || return 1

  wait_for_web_health
}

on_exit() {
  local status=$?
  trap - EXIT INT TERM

  drop_rehearsal_database

  if [[ "$status" -ne 0 && "$web_replacement_started" -eq 1 ]]; then
    if rollback_web; then
      printf 'Rollback completed: %s is healthy again.\n' "$previous_web_image" >&2
    else
      printf 'CRITICAL: automatic web rollback did not become healthy. Follow docs/operations/DEPLOY_VPS.md.\n' >&2
    fi
  fi

  if [[ "$radar_stopped" -eq 1 ]]; then
    if restart_preserved_radar; then
      printf 'Radar restarted using its preserved container.\n' >&2
    else
      printf 'CRITICAL: Radar could not be restarted.\n' >&2
    fi
  fi

  if [[ "$status" -ne 0 ]]; then
    printf 'Deployment stopped with status %s. Production was not declared successful.\n' "$status" >&2
  fi

  exit "$status"
}

trap on_exit EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  usage
  exit 0
fi

[[ "$#" -eq 1 ]] || {
  usage >&2
  exit 2
}

release_sha="$1"
[[ "$release_sha" =~ ^[0-9a-f]{40}$ ]] || fail "Pass the full lowercase 40-character commit SHA."
release_short_sha="${release_sha:0:12}"

[[ "$health_attempts" =~ ^[1-9][0-9]*$ ]] || fail "AL_LIO_HEALTH_ATTEMPTS must be a positive integer."
[[ "$health_interval_seconds" =~ ^[1-9][0-9]*$ ]] || fail "AL_LIO_HEALTH_INTERVAL_SECONDS must be a positive integer."

for command_name in git docker curl flock awk grep install readlink sha256sum tar; do
  require_command "$command_name"
done

[[ "$(id -u)" -ne 0 ]] || fail "Run this command as the VPS deploy user, not as root."
docker compose version >/dev/null

[[ -d "$repository_dir/.git" ]] || fail "Repository not found at $repository_dir"
mkdir -p -- "$releases_dir" "$backup_dir"
repository_dir="$(readlink -f -- "$repository_dir")"
releases_dir="$(readlink -f -- "$releases_dir")"
backup_dir="$(readlink -f -- "$backup_dir")"

[[ -n "$repository_dir" && "$repository_dir" != "/" ]] || fail "Invalid repository directory."
[[ -n "$releases_dir" && "$releases_dir" != "/" ]] || fail "Invalid releases directory."
[[ -n "$backup_dir" && "$backup_dir" != "/" ]] || fail "Invalid backup directory."

exec 9>"$backup_dir/deploy-production.lock"
flock -n 9 || fail "Another AL-LIO deployment is already running."

for container_name in "$WEB_CONTAINER" "$POSTGRES_CONTAINER" "$RADAR_CONTAINER"; do
  docker inspect "$container_name" >/dev/null 2>&1 || fail "Required container is missing: $container_name"
done

[[ "$(container_status "$WEB_CONTAINER")" == "running" ]] || fail "The current web container is not running."
[[ "$(container_health "$WEB_CONTAINER")" == "healthy" ]] || fail "The current web container is not healthy."
[[ "$(container_status "$POSTGRES_CONTAINER")" == "running" ]] || fail "PostgreSQL is not running."
[[ "$(container_health "$POSTGRES_CONTAINER")" == "healthy" ]] || fail "PostgreSQL is not healthy."
[[ "$(container_status "$RADAR_CONTAINER")" == "running" ]] || fail "Radar is not running."

previous_web_image="$(docker inspect "$WEB_CONTAINER" --format '{{.Config.Image}}')"
[[ "$previous_web_image" == al-lio-web:* ]] || fail "Unexpected current web image: $previous_web_image"
current_sha="${previous_web_image#al-lio-web:}"
[[ "$current_sha" =~ ^[0-9a-f]{40}$ ]] || fail "The current web image is not tagged with a full commit SHA."

current_compose_dir="$(docker inspect "$WEB_CONTAINER" --format '{{index .Config.Labels "com.docker.compose.project.working_dir"}}')"
[[ -n "$current_compose_dir" ]] || fail "The current web container has no Compose working-directory label."
previous_release_dir="$(readlink -f -- "$(dirname "$current_compose_dir")")"
case "$previous_release_dir" in
  "$releases_dir"/*) ;;
  *) fail "Current release directory is outside $releases_dir: $previous_release_dir" ;;
esac
[[ -f "$previous_release_dir/.env" ]] || fail "Current production .env not found in $previous_release_dir"

base_url="$(read_env_value BASE_URL "$previous_release_dir/.env")"
[[ "$base_url" == https://* ]] || fail "BASE_URL must use HTTPS."

log "Fetching origin/main and validating the requested release"
git -C "$repository_dir" fetch --tags origin main
git -C "$repository_dir" cat-file -e "${release_sha}^{commit}" 2>/dev/null || fail "Commit does not exist after fetching origin/main: $release_sha"
git -C "$repository_dir" merge-base --is-ancestor "$release_sha" origin/main || fail "The requested commit is not reachable from origin/main."
git -C "$repository_dir" merge-base --is-ancestor "$current_sha" "$release_sha" || fail "The requested commit would be a downgrade or divergent release. Use the rollback runbook instead."

if [[ "$release_sha" == "$current_sha" ]]; then
  curl -fsS "$base_url/api/health" >/dev/null
  curl -fsS "$base_url/api/ready" >/dev/null
  printf 'AL-LIO is already running %s and is healthy.\n' "$release_sha"
  exit 0
fi

blocked_runtime_changes="$(git -C "$repository_dir" diff --name-only "$current_sha" "$release_sha" -- \
  infra/Dockerfile data/learning-competencies.json scripts/import-learning-competencies.mjs)"
if [[ -n "$blocked_runtime_changes" ]]; then
  printf '%s\n' "$blocked_runtime_changes" >&2
  fail "This release changes infrastructure or an operator-managed catalogue. Follow docs/operations/DEPLOY_VPS.md manually."
fi

if ! git -C "$repository_dir" diff --quiet "$current_sha" "$release_sha" -- "$COMPOSE_FILE"; then
  validate_compose_env_additions ||
    fail "Docker Compose changed outside the allowlisted service environment passthroughs. Follow docs/operations/DEPLOY_VPS.md manually."
fi

migration_changes="$(git -C "$repository_dir" diff --name-status "$current_sha" "$release_sha" -- infra/postgres/migrations)"
added_migrations=()
if [[ -n "$migration_changes" ]]; then
  while IFS=$'\t' read -r change_status migration_path extra_path; do
    [[ -n "$change_status" ]] || continue
    [[ "$change_status" == "A" && -z "${extra_path:-}" ]] || fail "Applied migration history changed ($change_status $migration_path). Existing migrations are immutable."
    [[ "$migration_path" == infra/postgres/migrations/*.sql ]] || fail "Unexpected migration file: $migration_path"
    migration_sql="$(git -C "$repository_dir" show "$release_sha:$migration_path")"
    if grep -Eiq '(^|[^[:alnum:]_])(drop[[:space:]]+(table|schema|column|index)|truncate[[:space:]]+table|delete[[:space:]]+from|alter[[:space:]]+table[^;]*(drop[[:space:]]+column|alter[[:space:]]+column|rename[[:space:]]))([^[:alnum:]_]|$)' <<< "$migration_sql"; then
      fail "Migration $migration_path contains a destructive or structural statement that requires the manual runbook."
    fi
    added_migrations+=("$migration_path")
  done <<< "$migration_changes"
fi

printf '\nCurrent release: %s\nRequested release: %s\n' "$current_sha" "$release_sha"
if [[ "${#allowed_compose_env_mappings[@]}" -gt 0 ]]; then
  printf 'Allowlisted service environment additions (inactive until configured):\n'
  printf '  - %s\n' "${allowed_compose_env_mappings[@]}"
fi
if [[ "${#added_migrations[@]}" -gt 0 ]]; then
  printf 'New additive migrations:\n'
  printf '  - %s\n' "${added_migrations[@]}"
else
  printf 'New migrations: none\n'
fi

if [[ -t 0 ]]; then
  read -r -p "Type DEPLOY ${release_short_sha} to continue: " confirmation
  [[ "$confirmation" == "DEPLOY $release_short_sha" ]] || fail "Deployment was not confirmed."
else
  [[ "${AL_LIO_DEPLOY_CONFIRMATION:-}" == "$release_sha" ]] || fail "Non-interactive deployment requires AL_LIO_DEPLOY_CONFIRMATION=$release_sha"
fi

release_dir="$releases_dir/al-lio-$release_short_sha"
case "$release_dir" in
  "$releases_dir"/al-lio-*) ;;
  *) fail "Invalid release directory: $release_dir" ;;
esac

log "Preparing immutable release worktree"
if [[ -e "$release_dir" ]]; then
  [[ -d "$release_dir" ]] || fail "Release path exists and is not a directory: $release_dir"
  [[ "$(git -C "$release_dir" rev-parse HEAD 2>/dev/null || true)" == "$release_sha" ]] || fail "Release directory already contains a different commit: $release_dir"
else
  private_umask="$(umask)"
  umask 022
  git -C "$repository_dir" worktree add --detach "$release_dir" "$release_sha"
  umask "$private_umask"
fi

[[ -z "$(git -C "$release_dir" status --porcelain --untracked-files=no)" ]] || fail "Release worktree is not clean: $release_dir"
install -m 600 "$previous_release_dir/.env" "$release_dir/.env"
write_env_value AL_LIO_IMAGE_TAG "$release_sha" "$release_dir/.env"

compose=(docker compose -f "$release_dir/$COMPOSE_FILE" --env-file "$release_dir/.env")
"${compose[@]}" config --quiet

release_started_at="$(date -u +%Y%m%dT%H%M%SZ)"
printf '%s\n' "$previous_web_image" > "$backup_dir/previous-web-image-$release_started_at.txt"
docker inspect "$RADAR_CONTAINER" --format '{{.Config.Image}}' > "$backup_dir/previous-radar-image-$release_started_at.txt"
postgres_container_id="$(docker inspect "$POSTGRES_CONTAINER" --format '{{.Id}}')"
radar_container_id="$(docker inspect "$RADAR_CONTAINER" --format '{{.Id}}')"

log "Building candidate image without stopping production"
"${compose[@]}" build --pull al_lio_web
docker image inspect "al-lio-web:$release_sha" >/dev/null

log "Auditing production migration state with the candidate image"
audit_output="$("${compose[@]}" --profile ops run --rm -T al_lio_migrator node scripts/postgres/audit-baseline.mjs </dev/null)"
printf '%s\n' "$audit_output"
migration_status_output="$("${compose[@]}" --profile ops run --rm -T al_lio_migrator node scripts/postgres/migrate.mjs --status </dev/null)"
printf '%s\n' "$migration_status_output"

migration_required=0
if grep -q 'PENDIENTE' <<< "$migration_status_output"; then
  migration_required=1
fi

if [[ "$migration_required" -eq 1 ]]; then
  log "Creating and restore-testing the PostgreSQL backup"
  AL_LIO_BACKUP_DIR="$backup_dir" bash "$release_dir/scripts/postgres/backup-production.sh"
  postgres_backup_file="$(ls -1t "$backup_dir"/al_lio_*.dump | head -n 1)"
  bash "$release_dir/scripts/postgres/verify-backup-production.sh" "$postgres_backup_file"

  log "Rehearsing all pending migrations on an isolated restored database"
  rehearsal_database="al_lio_rehearsal_${release_short_sha}_$$"
  docker exec "$POSTGRES_CONTAINER" createdb -U al_lio "$rehearsal_database"
  docker exec -i "$POSTGRES_CONTAINER" pg_restore \
    -U al_lio \
    -d "$rehearsal_database" \
    --exit-on-error \
    --no-owner \
    --no-acl < "$postgres_backup_file"

  production_migration_url="$(read_env_value DATABASE_MIGRATION_URL "$release_dir/.env")"
  migration_url_without_query="${production_migration_url%%\?*}"
  migration_url_query=""
  if [[ "$production_migration_url" == *\?* ]]; then
    migration_url_query="?${production_migration_url#*\?}"
  fi
  [[ "$migration_url_without_query" == */* ]] || fail "DATABASE_MIGRATION_URL is not a PostgreSQL URL."
  export DATABASE_MIGRATION_URL="${migration_url_without_query%/*}/${rehearsal_database}${migration_url_query}"
  "${compose[@]}" --profile ops run --rm -T -e DATABASE_MIGRATION_URL al_lio_migrator </dev/null
  unset DATABASE_MIGRATION_URL

  # schema_migrations also contains the audited 0001 baseline represented by
  # infra/postgres/schema.sql. The migrations/ directory intentionally starts
  # at 0002, so comparing the table count to only the incremental files is
  # always off by one as soon as a real pending migration is rehearsed.
  migration_file_count="$(find "$release_dir/infra/postgres/migrations" -maxdepth 1 -type f -name '*.sql' | wc -l | tr -d '[:space:]')"
  expected_migration_count="$((migration_file_count + 1))"
  rehearsal_migration_count="$(docker exec "$POSTGRES_CONTAINER" psql -U al_lio -d "$rehearsal_database" -Atc 'select count(*) from public.schema_migrations;')"
  [[ "$rehearsal_migration_count" == "$expected_migration_count" ]] || fail "Migration rehearsal ended with $rehearsal_migration_count/$expected_migration_count migrations."
  drop_rehearsal_database

  log "Stopping and backing up the preserved Radar writer"
  docker stop --time 30 "$RADAR_CONTAINER" >/dev/null
  radar_stopped=1
  radar_backup_file="$backup_dir/radar-data-$release_started_at.tgz"
  docker run --rm \
    -e BACKUP_FILE="$(basename "$radar_backup_file")" \
    -e BACKUP_UID="$(id -u)" \
    -e BACKUP_GID="$(id -g)" \
    -v al_lio_radar_data:/source:ro \
    -v "$backup_dir":/backup \
    alpine:3.20 sh -c 'cd /source && tar -czf "/backup/$BACKUP_FILE" . && chown "$BACKUP_UID:$BACKUP_GID" "/backup/$BACKUP_FILE" && chmod 600 "/backup/$BACKUP_FILE"' </dev/null
  [[ -s "$radar_backup_file" ]] || fail "Radar backup is empty."
  chmod 600 "$radar_backup_file"
  sha256sum "$radar_backup_file" > "$radar_backup_file.sha256"

  log "Applying rehearsed migrations to production"
  "${compose[@]}" --profile ops run --rm -T al_lio_migrator node scripts/postgres/audit-baseline.mjs </dev/null
  "${compose[@]}" --profile ops run --rm -T al_lio_migrator </dev/null
  production_migration_count="$(docker exec "$POSTGRES_CONTAINER" psql -U al_lio -d al_lio -Atc 'select count(*) from public.schema_migrations;')"
  [[ "$production_migration_count" == "$expected_migration_count" ]] || fail "Production ended with $production_migration_count/$expected_migration_count migrations."
fi

log "Replacing only the web service"
web_replacement_started=1
"${compose[@]}" up -d --no-deps al_lio_web </dev/null

if ! wait_for_web_health; then
  fail "The candidate web container did not become healthy."
fi

[[ "$(docker inspect "$WEB_CONTAINER" --format '{{.Config.Image}}')" == "al-lio-web:$release_sha" ]] || fail "The running web image does not match the requested release."
docker exec "$WEB_CONTAINER" wget -qO- http://127.0.0.1:3000/api/health >/dev/null
docker exec "$WEB_CONTAINER" wget -qO- http://127.0.0.1:3000/api/ready >/dev/null
curl -fsS "$base_url/api/health" >/dev/null
curl -fsS "$base_url/api/ready" >/dev/null
unauthenticated_radar_status="$(curl -sS -o /dev/null -w '%{http_code}' "$base_url/api/job-radar")"
[[ "$unauthenticated_radar_status" == "401" ]] || fail "Unauthenticated /api/job-radar returned HTTP $unauthenticated_radar_status instead of 401."

[[ "$(docker inspect "$POSTGRES_CONTAINER" --format '{{.Id}}')" == "$postgres_container_id" ]] || fail "PostgreSQL container identity changed unexpectedly."
[[ "$(docker inspect "$RADAR_CONTAINER" --format '{{.Id}}')" == "$radar_container_id" ]] || fail "Radar container identity changed unexpectedly."

if [[ "$radar_stopped" -eq 1 ]]; then
  restart_preserved_radar || fail "Radar could not be restarted after the web became healthy."
fi
[[ "$(container_status "$RADAR_CONTAINER")" == "running" ]] || fail "Radar is not running after deployment."

release_record="$backup_dir/release-$release_started_at-$release_short_sha.txt"
{
  printf 'outcome=approved\n'
  printf 'release_sha=%s\n' "$release_sha"
  printf 'previous_web_image=%s\n' "$previous_web_image"
  printf 'deployed_web_image=al-lio-web:%s\n' "$release_sha"
  printf 'postgres_backup=%s\n' "${postgres_backup_file:-not-required}"
  printf 'radar_backup=%s\n' "${radar_backup_file:-not-required}"
  printf 'migration_required=%s\n' "$migration_required"
  printf 'public_health=ok\n'
  printf 'public_readiness=ok\n'
  printf 'postgres_container_preserved=true\n'
  printf 'radar_container_preserved=true\n'
} > "$release_record"
chmod 600 "$release_record"

web_replacement_started=0

printf '\nDeployment completed successfully.\n'
printf 'Release: %s\n' "$release_sha"
printf 'Web: running and healthy\n'
printf 'PostgreSQL: preserved\n'
printf 'Radar: preserved and running\n'
printf 'Release record: %s\n' "$release_record"
printf 'Next step: perform the owner functional review in production.\n'
