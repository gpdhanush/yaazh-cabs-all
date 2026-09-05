#!/usr/bin/env bash
# Admin API helper script for Yaazh Cab Booking API.
#
# Usage:
#   bash scripts/admin.sh login
#   bash scripts/admin.sh dashboard
#   bash scripts/admin.sh bookings
#   bash scripts/admin.sh confirm 12
#   bash scripts/admin.sh assign 12 1
#   bash scripts/admin.sh drivers
#   bash scripts/admin.sh customers
#   bash scripts/admin.sh reports
#   bash scripts/admin.sh seed
#   bash scripts/admin.sh demo
#
# Env overrides:
#   APP_URL=http://localhost:3000
#   ADMIN_EMAIL=admin@yaazh.local
#   ADMIN_PASSWORD=ChangeMe123!

set -Eeuo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# shellcheck disable=SC1091
source "$(cd "$(dirname "$0")" && pwd)/lib/env.sh"
load_dotenv .env
resolve_db_config

BASE_URL="${APP_URL:-http://localhost:3000}"
ADMIN_EMAIL="${ADMIN_EMAIL:-${SEED_ADMIN_EMAIL:-admin@yaazh.local}}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-${SEED_ADMIN_PASSWORD:-ChangeMe123!}}"
TOKEN_FILE="${TOKEN_FILE:-$ROOT/storage/private/admin.token.json}"

mkdir -p "$(dirname "$TOKEN_FILE")"

need_jq() {
  if ! command -v jq >/dev/null 2>&1; then
    echo "ERROR: jq is required. Install with: brew install jq"
    exit 1
  fi
}

api() {
  local method="$1"
  local path="$2"
  shift 2
  local url="${BASE_URL}${path}"
  local args=(-sS -X "$method" "$url" -H "Accept: application/json")

  if [[ -f "$TOKEN_FILE" ]]; then
    local token
    token="$(jq -r '.access_token // empty' "$TOKEN_FILE")"
    if [[ -n "$token" ]]; then
      args+=(-H "Authorization: Bearer ${token}")
    fi
  fi

  if [[ $# -gt 0 ]]; then
    args+=(-H "Content-Type: application/json" -d "$1")
  fi

  curl "${args[@]}"
}

pretty() {
  if command -v jq >/dev/null 2>&1; then
    jq .
  else
    cat
  fi
}

cmd_seed() {
  echo "==> Ensuring super admin exists (${ADMIN_EMAIL})"
  SEED_ADMIN_EMAIL="$ADMIN_EMAIL" SEED_ADMIN_PASSWORD="$ADMIN_PASSWORD" bash scripts/seed.sh
}

cmd_login() {
  need_jq
  echo "==> Admin login @ ${BASE_URL}"
  local res
  res="$(api POST /api/v1/auth/admin/login "$(jq -n \
    --arg email "$ADMIN_EMAIL" \
    --arg password "$ADMIN_PASSWORD" \
    '{email:$email, password:$password}')")"

  echo "$res" | pretty

  if [[ "$(echo "$res" | jq -r '.success')" != "true" ]]; then
    echo "Login failed. Run: bash scripts/admin.sh seed"
    exit 1
  fi

  echo "$res" | jq '{
    access_token: .data.access_token,
    refresh_token: .data.refresh_token,
    expires_in: .data.expires_in,
    user: .data.user,
    saved_at: (now | todate)
  }' > "$TOKEN_FILE"

  echo "==> Tokens saved to ${TOKEN_FILE}"
}

ensure_login() {
  if [[ ! -f "$TOKEN_FILE" ]] || [[ -z "$(jq -r '.access_token // empty' "$TOKEN_FILE" 2>/dev/null || true)" ]]; then
    cmd_login >/dev/null
  fi
}

cmd_refresh() {
  need_jq
  ensure_login
  local refresh
  refresh="$(jq -r '.refresh_token' "$TOKEN_FILE")"
  local res
  res="$(api POST /api/v1/auth/admin/refresh "$(jq -n --arg t "$refresh" '{refresh_token:$t}')")"
  echo "$res" | pretty
  if [[ "$(echo "$res" | jq -r '.success')" == "true" ]]; then
    echo "$res" | jq '{
      access_token: .data.access_token,
      refresh_token: .data.refresh_token,
      expires_in: .data.expires_in,
      user: (.user // {}),
      saved_at: (now | todate)
    }' > "$TOKEN_FILE"
    # keep previous user if refresh response has no user
    if [[ "$(jq -r '.user.id // empty' "$TOKEN_FILE")" == "" ]]; then
      local old_user
      old_user="$(jq -c '.user // {}' "$TOKEN_FILE" 2>/dev/null || echo '{}')"
      # rewrite with previous file user by merging from current response + old token file is already overwritten;
      # re-login is safer if user missing
      :
    fi
    echo "==> Tokens refreshed"
  fi
}

cmd_logout() {
  need_jq
  if [[ -f "$TOKEN_FILE" ]]; then
    local refresh
    refresh="$(jq -r '.refresh_token // empty' "$TOKEN_FILE")"
    if [[ -n "$refresh" ]]; then
      api POST /api/v1/auth/admin/logout "$(jq -n --arg t "$refresh" '{refresh_token:$t}')" | pretty
    fi
    rm -f "$TOKEN_FILE"
    echo "==> Logged out (token file removed)"
  else
    echo "No token file found."
  fi
}

cmd_dashboard() {
  need_jq
  ensure_login
  api GET /api/v1/admin/dashboard | pretty
}

cmd_bookings() {
  need_jq
  ensure_login
  local page="${1:-1}"
  local status="${2:-}"
  local path="/api/v1/admin/bookings?page=${page}&per_page=20"
  if [[ -n "$status" ]]; then
    path="${path}&status=${status}"
  fi
  api GET "$path" | pretty
}

cmd_booking() {
  need_jq
  ensure_login
  local id="${1:?booking id required}"
  api GET "/api/v1/admin/bookings/${id}" | pretty
}

cmd_confirm() {
  need_jq
  ensure_login
  local id="${1:?booking id required}"
  api POST "/api/v1/admin/bookings/${id}/confirm" | pretty
}

cmd_cancel() {
  need_jq
  ensure_login
  local id="${1:?booking id required}"
  local reason="${2:-Cancelled by admin script}"
  api POST "/api/v1/admin/bookings/${id}/cancel" "$(jq -n --arg r "$reason" '{reason:$r}')" | pretty
}

cmd_assign() {
  need_jq
  ensure_login
  local booking_id="${1:?booking id required}"
  local driver_id="${2:?driver id required}"
  local vehicle_id="${3:-}"
  local body
  if [[ -n "$vehicle_id" ]]; then
    body="$(jq -n --argjson d "$driver_id" --argjson v "$vehicle_id" \
      '{driver_id:$d, vehicle_id:$v, expires_in_seconds:120}')"
  else
    body="$(jq -n --argjson d "$driver_id" '{driver_id:$d, expires_in_seconds:120}')"
  fi
  api POST "/api/v1/admin/bookings/${booking_id}/assign-driver" "$body" | pretty
}

cmd_customers() {
  need_jq
  ensure_login
  api GET "/api/v1/admin/customers?page=${1:-1}" | pretty
}

cmd_drivers() {
  need_jq
  ensure_login
  api GET "/api/v1/admin/drivers?page=${1:-1}" | pretty
}

cmd_approve_driver() {
  need_jq
  ensure_login
  local id="${1:?driver id required}"
  api POST "/api/v1/admin/drivers/${id}/approve" | pretty
}

cmd_reports() {
  need_jq
  ensure_login
  api GET /api/v1/admin/reports | pretty
}

cmd_settings() {
  need_jq
  ensure_login
  api GET /api/v1/admin/settings | pretty
}

cmd_create_booking() {
  need_jq
  ensure_login
  local name="${1:-Phone Customer}"
  local phone="${2:-9123456780}"
  local category_id="${3:-1}"
  local route_id="${4:-1}"
  local pickup_at="${5:-$(date -u -v+1d +%Y-%m-%dT06:00:00.000Z 2>/dev/null || date -u -d '+1 day' +%Y-%m-%dT06:00:00.000Z)}"

  api POST /api/v1/admin/bookings "$(jq -n \
    --arg name "$name" \
    --arg phone "$phone" \
    --argjson category "$category_id" \
    --argjson route "$route_id" \
    --arg pickup_at "$pickup_at" \
    '{
      vehicle_category_id: $category,
      route_id: $route,
      trip_type: "one_way",
      customer_name: $name,
      customer_phone: $phone,
      pickup_location: "Udumalpet Bus Stand",
      drop_location: "Coimbatore Airport",
      pickup_at: $pickup_at
    }')" | pretty
}

cmd_demo() {
  need_jq
  echo "==> Demo flow: seed → login → dashboard → bookings → reports"
  cmd_seed
  cmd_login
  echo
  echo "==> Dashboard"
  cmd_dashboard
  echo
  echo "==> Bookings"
  cmd_bookings
  echo
  echo "==> Reports"
  cmd_reports
}

cmd_help() {
  cat <<EOF
Yaazh Admin API script

Usage:
  bash scripts/admin.sh <command> [args]

Commands:
  seed                         Create/ensure super admin in DB
  login                        Login and save JWT to storage/private/admin.token.json
  refresh                      Refresh access token
  logout                       Logout and delete token file
  dashboard                    GET /admin/dashboard
  bookings [page] [status]     List bookings
  booking <id>                 Get booking detail
  create-booking [name] [phone] [categoryId] [routeId] [pickupAt]
  confirm <bookingId>          Confirm booking
  cancel <bookingId> [reason]  Cancel booking
  assign <bookingId> <driverId> [vehicleId]
  customers [page]             List customers
  drivers [page]               List drivers
  approve-driver <driverId>    Approve driver
  reports                      Booking status report
  settings                     App settings
  demo                         seed + login + dashboard + bookings + reports

Defaults:
  APP_URL=${BASE_URL}
  ADMIN_EMAIL=${ADMIN_EMAIL}
  ADMIN_PASSWORD=********
EOF
}

main() {
  local cmd="${1:-help}"
  shift || true
  case "$cmd" in
    seed) cmd_seed "$@" ;;
    login) cmd_login "$@" ;;
    refresh) cmd_refresh "$@" ;;
    logout) cmd_logout "$@" ;;
    dashboard) cmd_dashboard "$@" ;;
    bookings) cmd_bookings "$@" ;;
    booking) cmd_booking "$@" ;;
    create-booking) cmd_create_booking "$@" ;;
    confirm) cmd_confirm "$@" ;;
    cancel) cmd_cancel "$@" ;;
    assign) cmd_assign "$@" ;;
    customers) cmd_customers "$@" ;;
    drivers) cmd_drivers "$@" ;;
    approve-driver) cmd_approve_driver "$@" ;;
    reports) cmd_reports "$@" ;;
    settings) cmd_settings "$@" ;;
    demo) cmd_demo "$@" ;;
    help|-h|--help) cmd_help ;;
    *)
      echo "Unknown command: $cmd"
      cmd_help
      exit 1
      ;;
  esac
}

main "$@"
