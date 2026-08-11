---
name: Cab Booking API
overview: Build a production Fastify + TypeScript + Prisma cab booking REST API in `backend/`, mapped to `cab_booking_production_v2.sql`, optimized for cPanel shared hosting (Node + MySQL only — no Docker, no Redis required).
todos:
  - id: phase-0-foundation
    content: Scaffold backend/, copy SQL + additive infra SQL, Prisma, MySQL-only config/env, health endpoints, cPanel-ready scripts (no Redis/Docker required)
    status: pending
  - id: phase-1-auth-public
    content: JWT/Argon2 + MySQL auth_sessions + customer/driver/admin auth + public read/contact APIs
    status: pending
  - id: phase-2-booking-core
    content: Fare engine, booking create/cancel, state machine, admin confirm/assign, driver offer locking + MySQL idempotency
    status: pending
  - id: phase-3-trip-live
    content: Driver trip lifecycle, location ingest, HTTP polling live-track endpoints (WebSocket optional/off on cPanel), ratings
    status: pending
  - id: phase-4-money
    content: Manual payments, invoices/PDF, wallet ledger, payouts admin flow
    status: pending
  - id: phase-5-ops-surface
    content: Remaining admin/customer/driver CRUD, CMS/support/settings/notifications/RBAC/audit/reports
    status: pending
  - id: phase-6-hardening
    content: MySQL job queue + cron worker, providers, Vitest, openapi.yaml, cPanel deploy docs, free-service docs
    status: pending
isProject: false
---

# Cab Booking Production API (backend/) — cPanel Shared Hosting

## Deployment target (updated)

**Primary production target: cPanel shared hosting.**

Constraints that drive architecture:

- No Docker
- No Redis
- No self-hosted OSRM/Nominatim on the same host
- Limited background processes (use cPanel Cron)
- WebSockets often unreliable or unsupported behind shared Apache/Passenger
- Available: Node.js (cPanel Node Selector / Passenger), MySQL 8.x, local filesystem, SMTP if host provides it, Cron

Local Docker Compose is **optional developer convenience only**, not part of production deploy.

## Source of truth

- Business SQL: [`/Users/naethra/Desktop/cab_booking_production_v2.sql`](/Users/naethra/Desktop/cab_booking_production_v2.sql) (DB `yaazh_cab_booking`, 42 tables) — **do not redesign**
- Target: empty [`backend/`](backend/)
- Frontend bookings today are localStorage-only ([`src/lib/bookings.ts`](src/lib/bookings.ts)); this plan does **not** wire the website yet

## Schema verification + additive infra tables

Business schema stays as supplied.

Because Redis is unavailable on cPanel, add a **separate additive migration** (does not modify existing business tables):

```text
database/
  cab_booking_production_v2.sql      # source of truth (unchanged)
  migrations/
    001_infra_cpanel.sql             # auth_sessions, idempotency_keys, job_queue, route_estimate_cache
```

| Table | Purpose (replaces Redis) |
|-------|---------------------------|
| `auth_sessions` | Refresh token rotation + device sessions (hashed tokens, expiry, revoke) |
| `idempotency_keys` | Dedupe booking/payment/payout/offer-accept |
| `job_queue` | Async FCM/email/offer-expiry/invoice/cleanup jobs |
| `route_estimate_cache` | Cache OSRM/public routing responses |

Wallet remains ledger-only. Booking refs remain app-generated (`CAB` + `YYYYMMDD` + sequence).

Prisma: apply business SQL → apply `001_infra_cpanel.sql` → `prisma db pull` → commit schema → document Prisma↔MySQL CHECK limitations.

## Architecture (cPanel-compatible)

```mermaid
flowchart TB
  clients[Website_Admin_Flutter]
  apache[cPanel_Apache_Passenger]
  api[Fastify_Api_V1]
  svc[Domain_Services]
  repo[Repositories]
  prisma[Prisma]
  mysql[(MySQL)]
  jobs[job_queue_table]
  cron[cPanel_Cron_Worker]
  providers[FCM_SMTP_MapsHTTP_LocalStorage]

  clients --> apache
  apache --> api
  api --> svc
  svc --> repo
  repo --> prisma
  prisma --> mysql
  svc --> jobs
  cron --> jobs
  cron --> providers
  svc --> providers
```

Layering unchanged: routes → thin controllers → Zod → auth/RBAC → services → repositories → Prisma.

**Stack (production default):**

- Node.js + TypeScript strict + Fastify 5 + Prisma + MySQL 8
- Zod, Argon2id, JWT, Helmet, CORS, Pino, Vitest, pdfkit, firebase-admin (optional FCM)
- **No Redis, no BullMQ, no Docker required**
- Rate limiting: in-memory Fastify rate-limit (single Node process on shared host)
- Queues: MySQL `job_queue` + cron worker script
- Live tracking: **HTTP polling** as primary; WebSocket plugin off by default (`FEATURE_WEBSOCKET=false`)

## Project layout (under `backend/`)

```text
backend/
  src/{app,server,config,api/v1,controllers,services,repositories,
       domain,schemas,dto,middleware,plugins,policies,events,jobs,
       queues,providers,utils,errors,types}
  prisma/schema.prisma
  database/cab_booking_production_v2.sql
  database/migrations/001_infra_cpanel.sql
  tests/
  scripts/{build,migrate,seed,test,health-check,backup-db,worker}.sh
  storage/{public,private}
  docs/cpanel-deploy.md
  openapi.yaml
  build.sh
  .env.example
  README.md
  docker-compose.yml          # OPTIONAL local only (mysql); documented as non-production
```

## Core domain decisions

### Auth
- Customer / driver / admin JWT access + refresh rotation
- Refresh tokens stored hashed in **`auth_sessions`** (MySQL), not Redis
- Passwords: Argon2id; OTP hashed in `auth_otp_requests`
- Default OTP: email when `MAIL_ENABLED`; else development console OTP when SMS off
- Endpoints under `/api/v1/auth/{customer|driver|admin}/...` as specified

### Booking state machine
Same explicit transitions; every change writes `booking_status_history` + `trip_events`.

### Driver offer concurrency
MySQL transaction + `SELECT ... FOR UPDATE` on booking row (works on shared MySQL).

### Fare engine
Server-side only: `TariffService` → `FareCalculationService` → `CouponService` → `TaxService` → `BookingPricingService`; snapshot on booking + `booking_charges`.

### Maps (no self-host on cPanel)
- Prefer known `routes.distance_km` when `route_id` is known
- `GET /api/v1/public/route/estimate`: call configurable `OSRM_BASE_URL` if set; otherwise Haversine estimate with clear `provider: "haversine"` in response meta
- Cache results in `route_estimate_cache`
- Do **not** require Docker OSRM/Nominatim for the API to start
- Public Nominatim documented as **FREE WITH PROVIDER LIMITS** (≤1 req/s) — disabled by default

### Notifications / jobs
Business event → enqueue row in `job_queue` → **never block/rollback booking** on FCM/email failure.

Worker: `scripts/worker.sh` / `npm run worker` processed by **cPanel Cron** every minute (or continuous if host allows always-on Node).

Providers: FCM (optional), SMTP (optional), Mock SMS/WhatsApp stubs.

### Payments / wallet / invoice
Cash / manual UPI / bank transfer; `PAYMENT_ENABLED=false` by default; wallet balance from ledger; PDF to `storage/private`.

### Live tracking (cPanel-safe)
- Driver: `POST /api/v1/driver/location` → `driver_locations` + update `drivers.current_*`
- Customer/admin: `GET /api/v1/customer/bookings/{id}/location` (and admin equivalent) — short-poll
- `FEATURE_WEBSOCKET=false` by default; WS code path only if host supports it later

### Admin RBAC + audit
Permission key `{module}.{action}` from seed; `audit_logs` for sensitive admin ops.

### API envelope
`{ success, message, data, meta, errors, request_id }` + page/per_page pagination; cursor for high-volume tables.

## cPanel deployment model

Documented in `docs/cpanel-deploy.md` and README:

1. Create MySQL DB + user in cPanel
2. Upload/build API (or git pull) under e.g. `api.yaazhcabs.com` or subdomain folder
3. Set Node version via Node.js Selector / Passenger
4. Configure `.env` (no Redis vars required)
5. Run `migrate.sh` (import business SQL + infra migration) + `prisma generate`
6. Set app startup: `node dist/server.js` (or Passenger entry)
7. Point subdomain document root / application root to built app
8. Add Cron: `* * * * * cd ~/backend && node dist/jobs/worker.js`
9. Ensure `storage/` writable; keep private docs outside web root if possible
10. Optional SMTP from cPanel email account

`.env` production example (no Redis):

```env
NODE_ENV=production
PORT=3000
HOST=127.0.0.1
DATABASE_URL=mysql://user:pass@localhost:3306/yaazh_cab_booking
JWT_SECRET=...
REDIS_ENABLED=false
FEATURE_WEBSOCKET=false
FEATURE_LIVE_TRACKING=true
MAP_PROVIDER=haversine
FCM_ENABLED=false
MAIL_ENABLED=false
SMS_ENABLED=false
WHATSAPP_ENABLED=false
PAYMENT_ENABLED=false
STORAGE_DRIVER=local
```

`REDIS_URL` omitted / ignored when `REDIS_ENABLED=false`.

## Implementation phases

### Phase 0 — Foundation
Scaffold; copy SQL; write `001_infra_cpanel.sql`; Prisma; Zod env without Redis requirement; health `/health` `/ready` (MySQL only for ready); Helmet/CORS/rate-limit/request-id; optional local `docker-compose` MySQL-only.

### Phase 1 — Auth + public APIs
MySQL sessions; auth routes; public cities/routes/categories/tariffs/faqs/cms/blog/testimonials/app-config/contact.

### Phase 2 — Booking core
Fare + coupon; create/cancel; state machine; admin confirm/assign; driver offer lock; MySQL idempotency.

### Phase 3 — Trip + polling live track
Driver trip endpoints; location ingest; polling location read APIs; ratings; WebSocket gated off.

### Phase 4 — Money
Manual payments, invoices/PDF, wallet, payouts.

### Phase 5 — Ops surface
Remaining CRUD, CMS, support, settings, remote-config, app-versions, notifications, reports, audit, FCM device registration.

### Phase 6 — Hardening
MySQL job worker + cron docs; provider mocks; Vitest (auth, booking, concurrency, IDOR, fare); OpenAPI; `build.sh`; cPanel deploy guide; free-service classification.

## Free-service classification (README)

- **FREE / OPEN SOURCE:** Node, Fastify, MySQL, Prisma, Vitest, pdfkit, local filesystem storage, Haversine route estimate
- **FREE WITH PROVIDER LIMITS:** FCM (no-cost product; Google project required); public Nominatim/OSRM demos if ever enabled (usage limits, no SLA)
- **Not used on cPanel production:** Docker, Redis, BullMQ, self-hosted OSRM/Nominatim
- **Disabled by default:** SMTP, SMS, WhatsApp, online payment gateways, WebSockets

## Security non-negotiables
Never commit `.env` / Firebase JSON; never log secrets; strip `password_hash`; IDOR ownership checks; explicit DTOs; no internal DB errors to clients.

## Out of scope for this build
Wiring Yaazh website to the API; `/api/v2` business endpoints; paid Maps/SMS/WhatsApp/Razorpay/Stripe; redesigning business SQL tables; requiring Redis or Docker for production.
