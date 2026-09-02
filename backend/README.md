# Yaazh Cab Booking API

Production Node.js REST API for Yaazh Cabs. Built for **cPanel shared hosting** (Node.js + MySQL only).

Designed for cPanel shared hosting with MySQL.

## Stack

- Node.js 20+ / TypeScript / Fastify
- MySQL 8 + Prisma
- JWT + Argon2id + MySQL `auth_sessions`
- MySQL via Prisma
- FCM / SMTP optional
- Haversine route estimate by default (OSRM optional URL)

## Free / open-source classification

| Component | Category |
|-----------|----------|
| Node, Fastify, Prisma, MySQL client, Vitest, pdfkit-ready structure | FREE / OPEN SOURCE |
| MySQL on cPanel | FREE WITH PROVIDER LIMITS (host plan limits) |
| FCM | FREE WITH PROVIDER LIMITS (Google no-cost product; account required) |
| Public Nominatim / demo OSRM | FREE WITH PROVIDER LIMITS (usage caps; not for production SLA) |

Disabled by default: Redis, SMS, WhatsApp, online payment gateways, WebSockets.

## Quick start (local)

```bash
cd backend
cp .env.example .env
# set DATABASE_URL to your MySQL instance

# Create DB schema + seed + infra tables
bash scripts/migrate.sh
bash scripts/seed.sh

npm install
npm run prisma:generate
npm run dev
```

API docs: `http://localhost:3000/docs`  
Health: `GET /health` · Ready: `GET /ready`

Default seed admin (from `scripts/seed.sh`):

- Email: `admin@yaazh.local`
- Password: `ChangeMe123!`

Override with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`.

## Environment

See [`.env.example`](.env.example). Only secrets/infrastructure go in `.env`. Business settings live in `app_settings` / `remote_config_values`.

Important cPanel defaults:

```env
REDIS_ENABLED=false
FEATURE_WEBSOCKET=false
MAP_PROVIDER=haversine
FCM_ENABLED=false
MAIL_ENABLED=false
```

## Database

1. Import [`database/cab_booking_production_v2.sql`](database/cab_booking_production_v2.sql) (business source of truth).
2. Apply [`database/migrations/001_infra_cpanel.sql`](database/migrations/001_infra_cpanel.sql) (sessions, idempotency, jobs, route cache).
3. `npx prisma generate`

Do not redesign business tables.

## API versioning

- Current: `/api/v1/...`
- Shared services/domain/repositories
- `/api/v2` reserved for future contract breaks

### Auth

- `POST /api/v1/auth/customer/register|login|refresh|logout|logout-all`
- `POST /api/v1/auth/driver/login|refresh|logout`
- `POST /api/v1/auth/admin/login|refresh|logout`

### Public / Customer / Driver / Admin

Website (guest) endpoints:

- `GET /api/v1/public/vehicle-categories`
- `GET /api/v1/public/routes?popular=1`
- `GET /api/v1/public/faqs`
- `GET /api/v1/public/testimonials`
- `GET /api/v1/public/cities`
- `GET /api/v1/public/app-config`
- `POST /api/v1/public/contact`
- `POST /api/v1/public/fare/estimate`
- `POST /api/v1/public/bookings` — guest create (name + phone)
- `POST /api/v1/public/bookings/track` — status by booking reference + phone

`npm run db:seed` / `bash scripts/seed.sh` also seeds Yaazh FAQs, testimonials, Udumalpet popular routes, and public company settings for the website.

See Swagger UI at `/docs` and [`openapi.yaml`](openapi.yaml).

## Booking flow

Create → fare snapshot → charges → status history → notify (queued) → admin confirm → driver offer → accept (row lock) → trip lifecycle → invoice/payment/rating.

## cPanel deployment

See [`docs/cpanel-deploy.md`](docs/cpanel-deploy.md).

Summary:

1. Create MySQL DB in cPanel  
2. Upload `backend/` (or git pull)  
3. Configure Node.js app (Passenger / Node Selector) entry: `dist/server.js`  
4. Set `.env` with production `DATABASE_URL` + `JWT_SECRET`  
5. Run migrate + `npm ci && npx prisma generate && npm run build`  
6. Ensure `storage/` is writable
```
npm ci
bash scripts/migrate.sh
bash scripts/seed.sh
npm run build
```

## Scripts

| Script | Purpose |
|--------|---------|
| `build.sh` | CI-style build |
| `scripts/migrate.sh` | Apply SQL + infra |
| `scripts/seed.sh` | Ensure super admin |
| `scripts/backup-db.sh` | mysqldump |
| `scripts/health-check.sh` | Hit /health and /ready |

## Security

- Argon2id passwords, hashed refresh tokens, hashed OTPs
- RBAC via `admin_roles` / `permissions` / `role_permissions`
- IDOR checks on customer/driver resources
- Never commit `.env` or Firebase private keys
- Standard envelope responses; no internal DB errors in production

## Tests

```bash
npm test
```

Includes fare engine, coupon capping, booking state machine, haversine estimate.
