# Yaazh Cab Booking Database Analysis

Source: `database/yaazhcab_booking.sql` (MariaDB 11.4 dump, generated 2026-09-03).

## Schema Summary

The dump contains 47 InnoDB tables. All tables use unsigned bigint auto-increment identifiers except the intentional natural-key tables `admin_profile_photos` and `stored_media`. The schema already supports the requested API and does not require new tables.

## Tables and API Purpose

| Table | Important columns | API purpose |
| --- | --- | --- |
| `admin_users` | `id`, `role_id`, `email`, `password_hash`, `is_active` | Admin authentication and identity |
| `admin_roles` | `id`, `name`, `is_active` | Admin role names |
| `permissions` | `module`, `action` | RBAC permission catalogue |
| `role_permissions` | `role_id`, `permission_id` | Admin role grants |
| `customers` | `id`, `name`, `phone`, `email`, `password_hash`, `app_status`, `is_active` | Customer authentication/profile |
| `drivers` | `id`, `name`, `phone`, `password_hash`, status fields | Driver authentication/profile/operations |
| `auth_sessions` | polymorphic user id, `refresh_token_hash`, expiry/revocation | Refresh-token sessions |
| `auth_otp_requests` | phone/email, `otp_hash`, purpose/expiry | OTP workflows (no collection requests yet) |
| `bookings` | customer, driver, vehicle/category, route, fare, status, pickup/drop | Core booking and trip lifecycle |
| `booking_charges` | booking, charge type, amount | Fare breakdown |
| `booking_status_history` | booking, old/new status, actor ids | Lifecycle audit trail |
| `booking_driver_offers` | booking, driver, vehicle, status, expiry | Driver offers/assignment |
| `booking_invoices` | booking, invoice number, totals/status | Invoices |
| `payments` | booking, amount, method/status | Payments |
| `routes`, `cities` | city pair, slug, distance/duration | Public routes and estimates |
| `vehicle_categories`, `vehicles` | category and fleet fields | Public fleet/admin fleet |
| `tariff_plans` | category, trip type, route, rates/effective dates | Fare configuration |
| `coupons` | code, discount, usage/validity | Booking discounts |
| `customer_saved_places` | customer, label/address/coordinates | Customer saved places |
| `driver_locations` | driver, booking, coordinates/timestamp | Live location polling |
| `driver_documents` | driver, document type/file/status | Driver documents |
| `driver_vehicle_assignments` | driver, vehicle, current generated keys | Current fleet assignment |
| `driver_wallet_transactions` | driver, booking, credit/debit, balance | Driver wallet |
| `driver_payouts` | driver, amount, method/status | Payout workflow |
| `trip_events`, `trip_ratings` | booking lifecycle events and ratings | Trip tracking/feedback |
| `support_tickets`, `support_ticket_messages` | ownership, status, messages | Customer/driver/admin support |
| `notification_logs`, `notification_templates`, `app_devices` | recipient/device/channel/delivery | Notification persistence |
| `app_settings`, `remote_config_values`, `app_versions` | typed config values | Public/admin configuration |
| `cms_pages`, `blog_posts`, `faqs`, `seo_meta` | published content and metadata | Website/admin content |
| `testimonials` | review and approval fields | Public/admin reviews |
| `contact_enquiries` | visitor enquiry and status | Public contact form |
| `audit_logs` | admin actor, action, old/new JSON | Admin audit trail |
| `gallery_groups`, `gallery_images`, `stored_media`, `admin_profile_photos` | media metadata/data | Media support |
| `route_estimate_cache` | coordinate key, distance/duration/expiry | Optional estimate cache |
| `idempotency_keys` | request key/hash/response/expiry | Safe retry support |
| `job_queue` | job payload/status | Existing table, not used by this lightweight implementation |

## Authentication and Security

- Customers authenticate by unique `customers.phone`; admins by unique `admin_users.email`; drivers by unique `drivers.phone`.
- Password columns are `varchar(255)` and the supplied seed values use the `$argon2id$` format. `bcryptjs` cannot verify those values. The implementation must either add an explicitly approved Argon2 compatibility dependency or migrate existing hashes under a controlled process. It must never treat Argon2 strings as bcrypt or overwrite them blindly.
- Refresh tokens are not stored in plaintext. `auth_sessions.refresh_token_hash` is indexed and includes user/expiry/revocation fields.
- Admin access must use `role_permissions` and `permissions`; a valid admin token alone is insufficient for module operations.
- Polymorphic ownership columns are coordinated by enum fields such as `user_type`, `recipient_type`, and `changed_by_type`; the database does not enforce every combination with a CHECK constraint. Services must enforce these combinations.

## Keys and Relationships

Primary and unique constraints cover account identifiers, slugs, booking/invoice/ticket/payment/payout references, route city pairs, current driver/vehicle assignments, notification templates, and typed config keys. Foreign keys use mostly `ON DELETE CASCADE` for child records and `ON DELETE SET NULL` for historical references. Important relationships include:

- `bookings` -> customer, driver, vehicle, category, route, coupon, creating admin.
- `booking_driver_offers`, `booking_charges`, `booking_status_history`, `booking_invoices`, `payments`, `trip_events`, and `trip_ratings` -> `bookings`.
- `routes` -> pickup/drop `cities`; `tariff_plans` -> vehicle category and optional route.
- `vehicles` -> vehicle category; assignments -> driver and vehicle.
- Support, notifications, devices, wallets, payouts, and documents -> their respective user/booking entities.
- Admin users -> roles; roles -> permissions through `role_permissions`.

## Indexes and Performance

The dump includes targeted indexes for account status, session hash/user/expiry, booking status/date/customer/driver, offer status/expiry, route popularity and city pair, tariff lookup, driver location latest records, support ownership/status, notification recipients, content publication status, and RBAC. List endpoints should use these indexes, default to `page=1` and `per_page=20`, and cap `per_page` at 100. Avoid `SELECT *` for public or authenticated responses and never expose password hashes or JSON gateway payloads.

## API Implications

Booking creation and state transitions should use transactions because they update the booking plus history, events, charges, offers, wallet, or payment records. Offer acceptance and current driver/vehicle assignment are concurrency-sensitive and should use a transaction with row checks. Customer, driver, and support reads require ownership predicates in SQL. Dynamic admin updates must use allowlisted columns because SQL identifiers cannot be parameterized.

No schema modification is planned. Actual push, SMS, email, file upload, and OTP delivery are not specified by the supplied collection and should not be invented as background infrastructure.

## Public Media Storage

Website media may be placed in `storage/public/` or `uploads/`. The API serves both directories without JWT authentication at `/api/v1/public/media/<relative-path>`; `/uploads/<relative-path>` is also available for compatibility. The private document area is deliberately not mounted as a static route. File names should be generated or validated by the upload/admin layer, and private documents must not be placed in either public directory.
