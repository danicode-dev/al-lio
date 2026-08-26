#!/usr/bin/env bash
set -Eeuo pipefail

# This command is installed as the forced command for the dedicated GitHub
# Actions SSH key. It intentionally accepts only `deploy <full-main-SHA>`.
readonly PATH="/usr/local/bin:/usr/bin:/bin"
readonly DEFAULT_RELEASES_DIR="/srv/danicode/releases"

fail() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

original_command="${SSH_ORIGINAL_COMMAND:-}"
[[ "$original_command" =~ ^deploy[[:space:]]([0-9a-f]{40})$ ]] ||
  fail "This SSH key accepts only: deploy <full-40-character-main-commit-sha>"

release_sha="${BASH_REMATCH[1]}"
releases_dir="${AL_LIO_RELEASES_DIR:-$DEFAULT_RELEASES_DIR}"

for command_name in docker readlink dirname; do
  command -v "$command_name" >/dev/null 2>&1 || fail "Required command not found: $command_name"
done

[[ "$(id -u)" -ne 0 ]] || fail "The deployment entrypoint must not run as root."
releases_dir="$(readlink -f -- "$releases_dir")"
[[ -n "$releases_dir" && "$releases_dir" != "/" ]] || fail "Invalid releases directory."

compose_dir="$(docker inspect al_lio_web --format '{{index .Config.Labels "com.docker.compose.project.working_dir"}}')"
[[ -n "$compose_dir" ]] || fail "The production web container has no Compose working-directory label."
release_dir="$(readlink -f -- "$(dirname "$compose_dir")")"

case "$release_dir" in
  "$releases_dir"/al-lio-*) ;;
  *) fail "Current production release is outside $releases_dir: $release_dir" ;;
esac

cd "$release_dir"
[[ -x ./scripts/deploy-production.sh ]] || fail "The guarded deployment command is unavailable."

AL_LIO_DEPLOY_CONFIRMATION="$release_sha" \
  ./scripts/deploy-production.sh "$release_sha"
