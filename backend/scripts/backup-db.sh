#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
# shellcheck disable=SC1091
source "$ROOT/scripts/lib/env.sh"
load_dotenv .env
resolve_db_config

STAMP="$(date +%Y%m%d_%H%M%S)"
OUT="${BACKUP_DIR:-./storage/private}/db_${STAMP}.sql"
mkdir -p "$(dirname "$OUT")"
mysqldump_cmd > "$OUT"
echo "Backup written to $OUT"
