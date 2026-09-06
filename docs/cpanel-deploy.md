# Deploy luxe-motion-ride (Yaazh website) to cPanel shared hosting

This is the **main customer website** (TanStack Start + Vite).  
For shared hosting without Node for the site, use **SPA mode** + static upload.

The **API** stays separate: `backend/` on a Node subdomain.

## Architecture

```text
https://yaazhcabsudumalpet.in       → this app (static SPA in public_html)
https://api.yaazhcabsudumalpet.in   → Backend-node API (Node Selector)
```

## 1. Build (SPA)

```bash
cd /path/to/luxe-motion-ride
cp .env.example .env          # set VITE_* as needed
npm ci
npm run build:cpanel
```

The Vite build emits the SPA and `.htaccess` into `dist/`.

Upload the contents of **`dist/`**.

Replace the existing `public_html/.htaccess` when redeploying. If cPanel or LiteSpeed has a separate custom `Content-Security-Policy` or `Permissions-Policy` header, update or remove that duplicate header too; it must include `https://api.yaazhcabsudumalpet.in` in `connect-src`, `https://www.google.com` in `frame-src`, and must not contain the obsolete `interest-cohort` feature.

```bash
ls dist/index.html dist/.htaccess
```

## 2. Upload to cPanel

1. cPanel → **File Manager** → `public_html`
2. Upload **all files inside** the public build folder (not the folder itself)
3. Confirm present:
   - `_shell.html` (or `index.html` if aliased)
   - `.htaccess`
   - `assets/` / `public/` hashed JS/CSS
   - `robots.txt`, favicons, `manifest.webmanifest`

## 3. SSL

cPanel → SSL/TLS Status → AutoSSL, then uncomment HTTPS redirect in `.htaccess`.

## 4. API (bookings + track)

For the `Backend-node` API on cPanel, upload `package.json` and `package-lock.json`, run `npm ci --omit=dev` in the `Backend-node` directory using Node Selector/SSH, and restart the application. This is required after adding dependencies such as `nodemailer`, `multer`, and `pdfkit`.

Set the Node application environment variable `CORS_ORIGIN` or `CORS_ORIGINS` to `https://yaazhcabsudumalpet.in,https://www.yaazhcabsudumalpet.in,https://admin.yaazhcabsudumalpet.in`. Both variable names are merged, and trailing slashes are normalized. Do not leave only localhost origins in production.

For SMTP, use the full mailbox address as `MAIL_USERNAME`, the current mailbox password as `MAIL_PASSWORD` without surrounding quote characters, port `465`, `MAIL_SECURE=true`, and `MAIL_AUTH_METHOD=LOGIN`. If the server rejects authentication with `535`, reset the mailbox password in cPanel Email Accounts and update the Node application environment before restarting it.

To enable admin push notifications, create a Firebase service account and set `FCM_ENABLED=true`, `FCM_PROJECT_ID`, `FCM_CLIENT_EMAIL`, and `FCM_PRIVATE_KEY` in the Node application environment. Store the private key with escaped newlines (`\\n`). Leave `FCM_ENABLED=false` when push is not configured; notifications will still be stored as in-app queued records.

The Android `google-services.json` is only for the mobile client and is already used by `yaazh_admin`. Do not use it as the Node server credential. Download the server key from Firebase Console -> Project settings -> Service accounts -> Generate new private key, then copy its `project_id`, `client_email`, and `private_key` into the backend environment variables.

The website calls the Fastify API for:

- `GET /api/v1/public/vehicle-categories` — fleet + booking vehicle picker
- `GET /api/v1/public/routes?popular=1` — popular routes + footer links
- `GET /api/v1/public/faqs` — FAQ accordion
- `GET /api/v1/public/testimonials` — reviews carousel
- `GET /api/v1/public/cities` — location suggestions
- `GET /api/v1/public/app-config` — phones, email, hours, fare note
- `POST /api/v1/public/contact` — contact enquiry form
- `POST /api/v1/public/fare/estimate`
- `POST /api/v1/public/bookings` — guest create
- `POST /api/v1/public/bookings/track` — status by booking reference + phone

After DB migrate, run `bash scripts/seed.sh` in `backend/` so FAQs, testimonials, Udumalpet routes, and public settings exist.

1. Deploy `backend/` per [backend/docs/cpanel-deploy.md](../backend/docs/cpanel-deploy.md)
2. Set API CORS allowlist (comma-separated):

```env
CORS_ORIGINS=https://yaazhcabsudumalpet.in,https://www.yaazhcabsudumalpet.in,https://admin.yaazhcabsudumalpet.in,http://localhost:4000
```

3. Set site env **before** building the SPA (Vite bakes `VITE_*` at build time):

```env
VITE_API_URL=https://api.yaazhcabsudumalpet.in
```

Local dev example: `VITE_API_URL=http://127.0.0.1:3000` then `npm run dev`.

Rebuild the site after any `VITE_*` change.

### Guest booking + track

- Customers book with **name + phone** (no login).
- `/status` requires **booking reference + phone**.
- WhatsApp remains an optional “notify desk” action after a successful API booking.
- Optional customer login / history is a later follow-up.

## Notes for shared hosting

| Feature | On cPanel static |
|---------|------------------|
| Marketing pages, booking UI, track UI | Yes (client SPA + API) |
| Guest booking via API | Yes (`VITE_API_URL`) |
| Track by ref + phone | Yes (public track endpoint) |
| LocalStorage | Cache of recent refs only |
| TanStack `/api/chat` server route | No (use WhatsApp fallback) |
| SSR HTML for SEO | Limited (shell only unless you prerender routes) |

## Redeploy

```bash
npm run build:cpanel
# re-upload public output contents
```

## Checklist

- [ ] `npm run build:cpanel` succeeds with production `VITE_API_URL`
- [ ] `index.html` + `_shell.html` + `.htaccess` in `public_html`
- [ ] Direct URL `/status` refreshes without 404
- [ ] SSL on
- [ ] API subdomain live + CORS allowlist includes the site origin
- [ ] Smoke test: create booking → track with ref + phone
- [ ] Mobile smoke test home / book / track
