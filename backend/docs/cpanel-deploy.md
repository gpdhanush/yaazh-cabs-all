# cPanel shared hosting deployment

This API is designed to run **without Docker or Redis**.

## Requirements

- cPanel with **Node.js Selector** (or Passenger Node) — Node 20+ preferred
- MySQL 8.x database
- SSH or Terminal access for migrate/build (or RunJS equivalents)
- Cron Jobs feature

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

5. **Node.js app** in cPanel:
   - Application root: `~/cab-api`
   - Application startup file: `dist/server.js`
   - Or Passenger `app.js` that re-exports/requires the built server

6. **Cron** (every minute):

```bash
* * * * * cd ~/cab-api && /usr/bin/node dist/jobs/worker.js >> ~/cab-api/storage/private/worker.log 2>&1
```

7. **Permissions**: `storage/public` and `storage/private` must be writable by the app user.

8. **Point subdomain** `api.yourdomain.com` to the Node application URL provided by cPanel.

## Notes

- Live driver tracking uses **HTTP polling** (`GET /api/v1/customer/bookings/:id/location`), not WebSockets.
- Optional FCM: set `FCM_ENABLED=true` and Firebase service account env vars (never commit the private key).
- Optional SMTP: set `MAIL_ENABLED=true` and SMTP fields (cPanel email account works).
- Backups: `bash scripts/backup-db.sh` or cPanel backup tools.
