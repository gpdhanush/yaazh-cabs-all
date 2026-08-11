# Yaazh Cabs

Customer-facing taxi booking site for Yaazh Cabs (Udumalpet).

Prefer clean commits on the main branch; avoid rewriting published history.

## Deploy (cPanel)

- Website (this repo root): static SPA — see [docs/cpanel-deploy.md](docs/cpanel-deploy.md)
- API: [backend/](backend/) Node + MySQL — see [backend/docs/cpanel-deploy.md](backend/docs/cpanel-deploy.md)
- Admin: [admin/](admin/) Angular 20 SPA — see [admin/README.md](admin/README.md) (`ng build` → host on admin subdomain)

Website sections load from the public API when `VITE_API_URL` is set: bookings, fare, track, FAQs, routes, fleet, testimonials, cities, contact/enquiry, and app-config (phones/hours). Static copy remains as fallback.
