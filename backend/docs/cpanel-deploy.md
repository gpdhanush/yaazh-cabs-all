# cPanel shared hosting deployment

This API runs directly on cPanel Node.js hosting with MySQL.

## Requirements

- cPanel with **Node.js Selector** (or Passenger Node) — Node 20+ preferred
- MySQL 8.x database
- SSH or Terminal access for migrate/build (or RunJS equivalents)

## Steps

1. **Create MySQL database + user** in cPanel and note credentials.

2. **Upload** the `backend` folder (or clone the repo) to e.g. `~/cab-api`.

3. **Create `.env`** from `.env.example`:

```env
NODE_ENV=production
HOST=127.0.0.1
PORT=3000
APP_URL=https://api.yourdomain.com
DATABASE_URL=mysql://USER:PASSWORD@localhost:3306/DBNAME
JWT_SECRET=generate-a-long-random-string
REDIS_ENABLED=false
FEATURE_WEBSOCKET=false
MAP_PROVIDER=haversine
FCM_ENABLED=false
MAIL_ENABLED=false
DB_CONNECTION_LIMIT=5
DB_POOL_TIMEOUT=10
DB_CONNECT_TIMEOUT=10
DB_AUTO_UTF8MB4=false
CORS_ORIGINS=https://yourdomain.com,https://admin.yourdomain.com
```

4. **Install & build** (SSH):

```bash
cd ~/cab-api
npm ci
bash scripts/migrate.sh
bash scripts/seed.sh
npx prisma generate
npm run build
```

The build uses the cPanel environment variables configured for the Node.js application. A `.env` file is optional; do not commit production credentials.

5. **Node.js app** in cPanel:
   - Application root: `~/cab-api`
   - Application startup file: `dist/server.js`
   - Or Passenger `app.js` that re-exports/requires the built server

6. **Permissions**: `storage/public` and `storage/private` must be writable by the app user.

7. **Point subdomain** `api.yourdomain.com` to the Node application URL provided by cPanel.

## Notes

- Live driver tracking uses **HTTP polling** (`GET /api/v1/customer/bookings/:id/location`), not WebSockets.
- UTF-8 conversion is disabled during normal startup; run `bash scripts/migrate.sh` for schema changes, or temporarily enable `DB_AUTO_UTF8MB4=true` when required.
- Optional FCM: set `FCM_ENABLED=true` and Firebase service account env vars (never commit the private key).
- Optional SMTP: set `MAIL_ENABLED=true` and SMTP fields (cPanel email account works).
- Backups: `bash scripts/backup-db.sh` or cPanel backup tools.
