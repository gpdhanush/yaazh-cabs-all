# Client API Coverage Report

Checked on 2026-09-03 against the current `Backend-node` source, the Flutter admin app `yaazh_admin`, the Angular admin app `admin`, and the website `src`. The `backend-old` folder and attached images were excluded.

## Result

The current Backend-node implementation is **not yet compatible with either admin client**. It currently registers:

- Health/readiness
- Auth routes for customer, driver, and admin
- Public content, estimate, contact, and guest-booking routes
- Customer profile, saved places, booking list/detail/cancel
- Public media delivery

It has **no `/api/v1/admin` router** and **no `/api/v1/driver` router** yet.

## Client Base URLs

| Client | Current API origin | Finding |
| --- | --- | --- |
| Flutter admin | `https://luxe-motion-ride-1.onrender.com/api/v1` | Points to the old Render deployment by default. Set `API_BASE_URL` to the deployed Backend-node API before testing. |
| Angular admin | `https://luxe-motion-ride-1.onrender.com` | Points to the old Render deployment by default. Set `environment.apiUrl` or the deployment configuration to the Backend-node API origin. |
| Website | `VITE_API_URL` | Uses `${VITE_API_URL}/api/v1/public`; set it to the Backend-node API origin, for example `https://api.example.com` rather than an already suffixed `/api/v1` URL. |

## Flutter Admin

The Flutter app uses Dio with `AppConfig.apiBaseUrl`, and requests below are relative to `/api/v1`.

### Covered by Backend-node

- `/auth/admin/login`
- `/auth/admin/refresh`
- `/auth/admin/logout`
- `/public/app-config` is available from the public router, although the Flutter admin settings call is separate

### Missing from Backend-node

- `/admin/profile` GET and PUT
- `/admin/profile/photo` multipart upload and DELETE
- `/admin/dashboard`
- `/admin/bookings` list/detail/create/actions
- `/admin/bookings/:id/reject`
- `/admin/bookings/:id/complete`
- `/admin/bookings/:id/fare`
- `/admin/bookings/:id/payment`
- `/admin/bookings/:id/payment-status`
- `/admin/bookings/:id/invoice/whatsapp`
- `/admin/bookings/:id/invoice/resend`
- `/admin/bookings/:id/feedback-link`
- `/admin/drivers` and driver CRUD/status/photo/block/approve/reject
- `/admin/customers` list/detail/update
- `/admin/vehicles` and `/admin/vehicle-categories` CRUD
- `/admin/routes` and `/admin/tariffs` CRUD
- `/admin/driver-assignments` and assignment end
- `/admin/gallery`, `/admin/gallery/groups`, and `/admin/gallery/images` CRUD/uploads
- `/admin/enquiries` list/detail/update
- `/admin/notifications`, notification send/delete
- `/admin/reviews` CRUD/approve/reject
- `/admin/reports`
- `/admin/settings` and `/admin/settings/:key`
- `/admin/live-tracking`

Source examples: `yaazh_admin/lib/features/auth/data/auth_repository.dart`, `yaazh_admin/lib/features/bookings/data/booking_repository.dart`, `yaazh_admin/lib/features/gallery/data/gallery_repository.dart`, and related feature repositories.

## Angular Admin Web App

The Angular app uses `AdminApiService` and a generic resource service. These paths are relative to the configured API origin.

### Covered by Backend-node

- `/api/v1/auth/admin/login`
- `/api/v1/auth/admin/refresh`
- `/api/v1/auth/admin/logout`

### Missing from Backend-node

- `/api/v1/admin/profile`
- `/api/v1/admin/dashboard`
- `/api/v1/admin/live-tracking`
- `/api/v1/admin/bookings` list/detail/create/confirm/reject/cancel/assign-driver
- `/api/v1/admin/bookings/:id/invoice/resend`
- `/api/v1/admin/bookings/:id/invoice/pdf`
- `/api/v1/admin/bookings/:id/payment`
- `/api/v1/admin/bookings/:id/payment-status`
- `/api/v1/admin/devices`
- `/api/v1/admin/customers` and `/customers/:id`
- `/api/v1/admin/drivers` and `/drivers/:id`, including photo upload, block, approve, reject
- `/api/v1/admin/vehicles`, `/vehicle-categories`, `/routes`, `/tariffs`
- `/api/v1/admin/driver-assignments`
- `/api/v1/admin/enquiries`
- `/api/v1/admin/gallery`, `/gallery/groups`, `/gallery/images`
- `/api/v1/admin/notifications` and `/notifications/send`
- `/api/v1/admin/reviews`
- `/api/v1/admin/cms`, `/blog`, `/faqs`, `/seo`
- `/api/v1/admin/support`
- `/api/v1/admin/settings/:key`
- `/api/v1/admin/remote-config`
- `/api/v1/admin/app-versions`
- `/api/v1/admin/audit-logs`
- `/api/v1/admin/reports`
- `/api/v1/admin/wallet`, `/payments`, `/invoices`, `/payouts`
- `/api/v1/admin/admin-roles`, `/permissions`, `/admin-users`

The generic resource configuration is in `admin/src/app/features/resource/resource.configs.ts`. The dedicated service is `admin/src/app/core/api/admin-api.service.ts`.

## Website

The website public client calls `${VITE_API_URL}/api/v1/public` and is currently covered for:

- Cities
- Routes and route detail
- Vehicle categories
- Tariffs
- FAQs
- CMS page
- Blog list/detail
- Testimonials
- App config
- Contact
- Route estimate GET/POST
- Guest booking

The website also contains a status/track flow that expects a public booking tracking endpoint. The current Backend-node implementation does not yet provide that route. The exact client call should be implemented after confirming the desired contract, because the supplied Postman collection has no tracking request.

The website also uses `/api/chat`, OSRM map requests, and browser location search. Those are not Backend-node API routes and should not be counted as missing booking API routes.

## Contract Issues to Fix Before Client Integration

1. **Admin permissions:** the database permission key is naturally represented as `module` + `action`. The clients expect keys such as `dashboard.view`, while the current repository helper would need to return the same dotted format. Do not return colon-separated keys.
2. **Admin login response:** both admin clients expect `data.user.permissions` or follow up with `GET /api/v1/admin/profile`. The current Backend-node auth response does not include permissions and the profile route is missing.
3. **Password hashes:** the supplied admin and driver seed records use `$argon2id$` hashes. The current Backend-node implementation uses `bcryptjs` and intentionally rejects those records until a migration or explicitly approved Argon2 compatibility solution is provided.
4. **Media:** public uploaded media is already served anonymously at `/api/v1/public/media/...` and `/uploads/...`. Admin multipart upload endpoints are still missing, so the clients cannot currently create or update gallery/profile media through Backend-node.
5. **Response metadata:** Angular list pages support `meta.page`, `meta.per_page`, `meta.total`, and `meta.total_pages`. Implement admin list endpoints with this metadata, while preserving `{ success, message, data }`.

## Recommended Implementation Order

1. Add shared Express admin authentication, active-account checks, dotted permission loading, and `/admin/profile`.
2. Add admin dashboard, bookings, customers, drivers, vehicles/categories, routes, tariffs, assignments, enquiries, and payments because both clients use these most directly.
3. Add gallery/media multipart uploads with generated safe public paths; keep private documents separate.
4. Add content, support, notifications, settings/config, reports, audit logs, roles, and admin users.
5. Add the driver router and driver app workflows.
6. Point Flutter and Angular environments at the Backend-node deployment and run client build checks plus authenticated smoke tests.
