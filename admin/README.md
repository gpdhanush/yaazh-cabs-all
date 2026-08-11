# Yaazh Admin (Angular 20)

Premium admin console for Yaazh Cabs — Angular 20, Material, Tailwind, ApexCharts, standalone + lazy routes.

Menus and CRUD logic map **only** to existing Fastify admin APIs (`/api/v1/auth/admin`, `/api/v1/admin/*`). Appearance theme is client-side (localStorage).

## Quick start

```bash
# Terminal 1 — API
cd backend
npm run dev

# Terminal 2 — Admin
cd admin
npm start
# http://localhost:4200
```

Default seed login:

- Email: `admin@yaazh.local`
- Password: `ChangeMe123!`

## Environment

- Development: `src/environments/environment.development.ts` → `http://127.0.0.1:3000`
- Production: `src/environments/environment.ts` → `https://api.yaazhcabs.in`

Ensure backend `CORS_ORIGINS` includes `http://localhost:4200`.

## Scripts

| Command | Purpose |
|---------|---------|
| `npm start` | Dev server (port 4200) |
| `npm run build` | Production build → `dist/admin` |
| `npm run lint` | Compile check |

## Surface (API-backed, Yaazh-relevant)

**Ops:** Dashboard, Bookings, Customers, Drivers, Reports  
**Fleet:** Vehicles, Routes, Tariffs  
**Website:** FAQs, Testimonials, Contact enquiries, Settings  
**System:** Appearance (browser theme only)

Intentionally hidden for now (empty / unused by the current website, or broken against DB): assignments, coupons, payments, invoices, wallet, payouts, CMS, blog, SEO, notifications, support tickets, remote-config, app-versions, audit logs.
