#!/usr/bin/env bash

# Validates the only Docker Compose change that the routine production release
# may cross automatically: strictly additive, namespaced environment mappings
# under the existing web or Radar services. The caller provides repository_dir,
# current_sha, release_sha and COMPOSE_FILE and receives an auditable list in
# allowed_compose_env_mappings.

extract_service_environment() {
  local sha="$1"
  local service="$2"

  git -C "$repository_dir" show "$sha:$COMPOSE_FILE" |
    awk -v wanted_service="$service" '
      $0 == "  " wanted_service ":" { in_service = 1; next }
      in_service && /^  [^ ]/ { in_service = 0; in_environment = 0 }
      in_service && /^    environment:$/ { in_environment = 1; next }
      in_service && in_environment && /^    [^ ]/ { in_environment = 0 }
      in_service && in_environment && /^      [A-Z][A-Z0-9_]*:/ { print }
    '
}

validate_unique_environment_keys() {
  local environment="$1"

  awk -F: '
    {
      key = $1
      sub(/^ +/, "", key)
      seen[key]++
      if (seen[key] > 1) exit 1
    }
  ' <<< "$environment"
}

validate_new_environment_mapping() {
  local service="$1"
  local line="$2"
  local mapping_pattern='^      ([A-Z][A-Z0-9_]*): \$\{([A-Z][A-Z0-9_]*):-([-A-Za-z0-9_.,:/+]*)\}$'
  local key=""
  local source_key=""
  local expected_source_key=""

  [[ "$line" =~ $mapping_pattern ]] || return 1
  key="${BASH_REMATCH[1]}"
  source_key="${BASH_REMATCH[2]}"

  case "$service" in
    al_lio_web)
      [[ "$key" =~ ^AL_LIO_[A-Z0-9_]+$ ]] || return 1
      [[ "$source_key" == "$key" ]] || return 1
      ;;
    al_lio_radar)
      case "$key" in
        AL_LIO_DELIVERY_* | AUTONOMOUS_* | DAILY_PUBLICATION_* | WEB_DISCOVERY_* | LEARNING_* | YOUTUBE_* | JOB_RADAR_* | DISCOVERY_* | RETENTION_* | OPENAI_API_KEY) ;;
        *) return 1 ;;
      esac

      if [[ "$key" == AL_LIO_* ]]; then
        expected_source_key="AL_LIO_RADAR_${key#AL_LIO_}"
      else
        expected_source_key="AL_LIO_RADAR_${key}"
      fi
      [[ "$source_key" == "$expected_source_key" ]] || return 1
      ;;
    *)
      return 1
      ;;
  esac
}

validate_compose_env_additions() {
  local change_lines=""
  local current_environment=""
  local target_environment=""
  local line=""
  local service=""
  local key=""
  local current_count=0
  local target_count=0
  local change_count=0
  local addition_count=0
  local changed_line_count=0
  local index=0

  allowed_compose_env_mappings=()
  allowed_compose_env_lines=()

  change_lines="$(
    git -C "$repository_dir" diff --no-ext-diff --unified=0 "$current_sha" "$release_sha" -- "$COMPOSE_FILE" |
      awk '!/^--- / && !/^\+\+\+ / && /^[+-]/ { print }'
  )"
  [[ -n "$change_lines" ]] || return 1

  while IFS= read -r line; do
    [[ "$line" == +* ]] || return 1
    change_count=$((change_count + 1))
  done <<< "$change_lines"

  for service in al_lio_web al_lio_radar; do
    current_environment="$(extract_service_environment "$current_sha" "$service")"
    target_environment="$(extract_service_environment "$release_sha" "$service")"

    [[ -n "$current_environment" && -n "$target_environment" ]] || return 1
    validate_unique_environment_keys "$target_environment" || return 1

    while IFS= read -r line; do
      [[ -n "$line" ]] || continue
      target_count="$(grep -Fxc -- "$line" <<< "$target_environment" || true)"
      [[ "$target_count" -eq 1 ]] || return 1
    done <<< "$current_environment"

    while IFS= read -r line; do
      [[ -n "$line" ]] || continue
      current_count="$(grep -Fxc -- "$line" <<< "$current_environment" || true)"
      if [[ "$current_count" -eq 0 ]]; then
        validate_new_environment_mapping "$service" "$line" || return 1
        key="${line#      }"
        key="${key%%:*}"
        allowed_compose_env_mappings+=("$service:$key")
        allowed_compose_env_lines+=("$line")
        addition_count=$((addition_count + 1))
      elif [[ "$current_count" -ne 1 ]]; then
        return 1
      fi
    done <<< "$target_environment"
  done

  [[ "$addition_count" -gt 0 && "$change_count" -eq "$addition_count" ]] || return 1

  for ((index = 0; index < ${#allowed_compose_env_lines[@]}; index++)); do
    changed_line_count="$(grep -Fxc -- "+${allowed_compose_env_lines[$index]}" <<< "$change_lines" || true)"
    [[ "$changed_line_count" -eq 1 ]] || return 1
  done
}
