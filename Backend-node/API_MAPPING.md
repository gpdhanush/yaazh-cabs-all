# Yaazh Cab Booking API Mapping

Source of truth: `postman/Yaazh Cab Booking API v1.json`.

The collection contains 135 requests. All JSON endpoints use the response envelope `{ success, message, data }`; errors use `{ success: false, message }`. `page` defaults to 1 and `per_page` defaults to 20 with a maximum of 100 where pagination is shown.

## Implemented Foundation

| Postman endpoint | Express route | Controller/service | Tables |
| --- | --- | --- | --- |
| `GET /health` | `/health` | inline health handler | none |
| `GET /ready` | `/ready` | DB readiness handler | `SELECT 1` |
| `POST /api/v1/auth/customer/register` | auth router | auth controller/service/repository | `customers`, `auth_sessions` |
| `POST /api/v1/auth/{customer,driver,admin}/login` | auth router | auth controller/service/repository | identity table, `auth_sessions` |
| `POST /api/v1/auth/{customer,driver,admin}/refresh` | auth router | auth controller/service/repository | `auth_sessions`, identity table |
| `POST /api/v1/auth/{customer,driver,admin}/logout` | auth router | auth controller/repository | `auth_sessions` |
| `POST /api/v1/auth/{customer,driver,admin}/logout-all` | auth router | auth controller/repository | `auth_sessions` |
| `GET /api/v1/public/cities` | public router | public controller | `cities` |
| `GET /api/v1/public/routes` | public router | public controller | `routes`, `cities` |
| `GET /api/v1/public/routes/:slug` | public router | public controller | `routes`, `cities` |
| `GET /api/v1/public/vehicle-categories` | public router | public controller | `vehicle_categories` |
| `GET /api/v1/public/tariffs` | public router | public controller | `tariff_plans`, `vehicle_categories` |
| `GET /api/v1/public/faqs` | public router | public controller | `faqs` |
| `GET /api/v1/public/cms/pages/:slug` | public router | public controller | `cms_pages` |
| `GET /api/v1/public/blog` | public router | public controller | `blog_posts` |
| `GET /api/v1/public/blog/:slug` | public router | public controller | `blog_posts` |
| `GET /api/v1/public/testimonials` | public router | public controller | `testimonials` |
| `GET /api/v1/public/app-config` | public router | public controller | `app_settings` |
| `POST /api/v1/public/contact` | public router | public controller | `contact_enquiries` |
| `POST /api/v1/public/route/estimate` | public router | public controller | in-process Haversine estimate |
| `GET /api/v1/public/route/estimate` | public router | public controller | in-process Haversine estimate |

## Implemented Customer Coverage

The customer router now covers the customer requests in the collection: profile, saved-place CRUD, authenticated booking creation/list/detail/cancel, invoice, live location, rating, notifications, device registration/deletion, and support ticket/message flows. Customer-owned queries enforce `customer_id` predicates.

## Remaining Collection Coverage

The following exact Postman requests remain to be implemented in subsequent slices. Every request uses the bearer token variable shown by its folder unless marked public.

### Public and Customer

- `POST /api/v1/public/bookings` (`bookings`, `booking_charges`, `booking_status_history`; public guest booking)

### Driver

- Implemented: `GET|PUT /api/v1/driver/profile` and `GET|PUT /api/v1/driver/status` (`drivers`)
- Implemented: `GET /api/v1/driver/offers`, `GET /api/v1/driver/offers/:offerId`, `POST .../:offerId/accept`, `POST .../:offerId/reject` (`booking_driver_offers`, `bookings`, `trip_events`)
- Implemented: `GET /api/v1/driver/trips`, `GET /api/v1/driver/trips/:bookingId` (`bookings`, `trip_events`)
- Implemented: `POST /api/v1/driver/location` (`driver_locations`, `drivers`)
- Trip transitions: `POST /api/v1/driver/trips/:bookingId/on-the-way`, `/arrived`, `/start`, `/complete` (`bookings`, `trip_events`, `booking_status_history`)
- `GET|POST /api/v1/driver/documents` (`driver_documents`)
- `GET /api/v1/driver/wallet`, `GET /api/v1/driver/wallet/transactions` (`driver_wallet_transactions`)
- `GET|POST /api/v1/driver/payouts` (`driver_payouts`)
- `GET /api/v1/driver/notifications`, `POST /api/v1/driver/devices` (`notification_logs`, `app_devices`)

### Admin

- Implemented: `GET /api/v1/admin/dashboard` (`bookings`, `drivers`, `customers`, `contact_enquiries`)
- Bookings: `GET|POST /api/v1/admin/bookings`, `GET /:bookingId`, `POST /:bookingId/confirm`, `/cancel`, `/assign-driver` (`bookings`, offers, history, audit)
- Customers/drivers: `GET /api/v1/admin/customers`, `GET /:customerId`, `GET /api/v1/admin/drivers`, `GET /:driverId`, `PUT /:driverId`, `POST /:driverId/approve`, `/reject` (`customers`, `drivers`)
- Fleet: `GET|POST /api/v1/admin/vehicles`, `PUT /:vehicleId`, `GET|POST /api/v1/admin/driver-assignments` (`vehicles`, assignments)
- Routes/tariffs/coupons: list/create/update requests under `/api/v1/admin/routes`, `/tariffs`, `/coupons` (corresponding tables)
- Finance: `GET /api/v1/admin/payments`, `/invoices`, `/wallet`, `/payouts`; payout approve/reject/mark-paid actions (`payments`, invoices, wallet, payouts)
- Content: review list/approve/reject, notifications list/send, CMS list/create/update, blog list/create/update, FAQ list/create/update, SEO list/update (`testimonials`, notification tables, CMS/content tables)
- Support: list/get/reply under `/api/v1/admin/support` (`support_tickets`, messages)
- Settings/reports: settings get/update, remote config get/update, app versions get/update, audit logs, reports, dashboard (`app_settings`, `remote_config_values`, `app_versions`, `audit_logs`, aggregate tables)

## Cross-Cutting Rules

- Customer/driver routes enforce `req.user` type and resource ownership in SQL predicates.
- Admin routes enforce the matching `module:action` permission from `role_permissions`; writes create `audit_logs` rows where the collection operation changes business data.
- IDs are positive integers; enum values and update fields are allowlisted. SQL values are always parameterized.
- Multi-row booking, offer, trip, payout, and assignment operations use a manually acquired connection, transaction, rollback on failure, and `finally` release.
- The collection includes literal expired/example bearer tokens. They are test artifacts and must be removed/rotated before production use.

## Direct Admin Password Change

`POST /api/v1/auth/admin/change-password` requires an admin bearer token and accepts:

```json
{ "new_password": "AtLeast8Characters" }
```

The API also accepts `password` as an input alias. It directly replaces the authenticated admin password with a bcrypt hash. No old password, email delivery, OTP, or reset code is required.

`POST /api/v1/auth/admin/reset-password` accepts `{ "email": "admin@example.com", "new_password": "..." }` and updates the active admin account matched by email. This endpoint has no OTP, email delivery, or authentication and must be protected by a private deployment/admin network before production; otherwise anyone who knows an admin email can take over that account. The authenticated `change-password` endpoint is the safer option.
