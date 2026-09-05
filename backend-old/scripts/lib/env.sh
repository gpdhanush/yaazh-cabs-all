#!/usr/bin/env bash
# Shared .env loader for shell scripts.
# Prefer DB_HOST / DB_USER / DB_PASSWORD / DB_NAME / DB_PORT.
# Falls back to DATABASE_URL if present.

load_dotenv() {
  local file="${1:-.env}"
  [[ -f "$file" ]] || return 0
  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
    if [[ "$line" =~ ^([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]]; then
      local key="${BASH_REMATCH[1]}"
      local val="${BASH_REMATCH[2]}"
      if [[ "$val" =~ ^\"(.*)\"$ ]]; then
        val="${BASH_REMATCH[1]}"
      elif [[ "$val" =~ ^\'(.*)\'$ ]]; then
        val="${BASH_REMATCH[1]}"
      fi
      printf -v "$key" '%s' "$val"
      export "$key"
    fi
  done < "$file"
}

resolve_db_config() {
  DB_HOST="${DB_HOST:-127.0.0.1}"
  DB_PORT="${DB_PORT:-3306}"
  DB_USER="${DB_USER:-root}"
  DB_PASSWORD="${DB_PASSWORD:-}"
  DB_NAME="${DB_NAME:-yaazh_cab_booking}"

  if [[ -n "${DATABASE_URL:-}" ]]; then
    local proto creds rest user pass hostport db host port
    proto="${DATABASE_URL#mysql://}"
    creds="${proto%%@*}"
    rest="${proto#*@}"
    user="${creds%%:*}"
    pass="${creds#*:}"
    if [[ "$creds" == "$user" ]]; then pass=""; fi
    hostport="${rest%%/*}"
    db="${rest#*/}"
    db="${db%%\?*}"
    host="${hostport%%:*}"
    port="${hostport##*:}"
    if [[ "$host" == "$port" ]]; then port=3306; fi
    DB_HOST="${DB_HOST:-$host}"
    DB_PORT="${DB_PORT:-$port}"
    DB_USER="${DB_USER:-$user}"
    DB_PASSWORD="${DB_PASSWORD:-$pass}"
    DB_NAME="${DB_NAME:-$db}"
  fi

  # Rebuild URL for Prisma CLI helpers
  if [[ -n "$DB_PASSWORD" ]]; then
    DATABASE_URL="mysql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
  else
    DATABASE_URL="mysql://${DB_USER}:@${DB_HOST}:${DB_PORT}/${DB_NAME}"
  fi
  export DB_HOST DB_PORT DB_USER DB_PASSWORD DB_NAME DATABASE_URL
}

mysql_cmd() {
  if [[ -n "${DB_PASSWORD}" ]]; then
    MYSQL_PWD="$DB_PASSWORD" mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" "$DB_NAME" "$@"
  else
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" "$DB_NAME" "$@"
  fi
}

mysqldump_cmd() {
  if [[ -n "${DB_PASSWORD}" ]]; then
    MYSQL_PWD="$DB_PASSWORD" mysqldump -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" "$DB_NAME" "$@"
  else
    mysqldump -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" "$DB_NAME" "$@"
  fi
}
