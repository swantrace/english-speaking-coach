#!/bin/sh

set -eu

profile="${1:-}"

case "$profile" in
  development | practice) ;;
  *)
    echo "Usage: sh scripts/dev-profile.sh <development|practice>" >&2
    exit 1
    ;;
esac

backend_source="apps/backend/.env.${profile}.local"
agent_source="apps/agent/.env.${profile}.local"

missing_files=""

if [ ! -f "$backend_source" ]; then
  missing_files="${missing_files}\n  - ${backend_source}"
fi

if [ ! -f "$agent_source" ]; then
  missing_files="${missing_files}\n  - ${agent_source}"
fi

if [ -n "$missing_files" ]; then
  printf "Cannot start the %s profile. Create these files first:%b\n" "$profile" "$missing_files" >&2
  exit 1
fi

cp "$backend_source" apps/backend/.env.local
cp "$agent_source" apps/agent/.env.local

echo "Using the ${profile} environment profile."
exec pnpm run dev:full
