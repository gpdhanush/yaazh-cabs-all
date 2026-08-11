# Yaazh Driver App — Backend API Audit

Base path: `/api/v1`  
Auth header: `Authorization: Bearer <access_token>`  
Envelope: `{ success, message, data, meta, errors, request_id }`

## Auth

| Method | Endpoint | Auth | Purpose | Screen |
|--------|----------|------|---------|--------|
| POST | `/auth/driver/login` | No | `{ phone, password }` → tokens + user | Login |
| POST | `/auth/driver/refresh` | No | `{ refresh_token }` → new tokens | API interceptor |
| POST | `/auth/driver/logout` | No | `{ refresh_token }` | Settings / Profile |

## Driver profile & status

| Method | Endpoint | Purpose | Screen |
|--------|----------|---------|--------|
| GET | `/driver/profile` | Profile | Splash, Home, Profile |
| PUT | `/driver/profile` | Update name/email/address | Profile |
| GET | `/driver/status` | Online / availability | Home |
| PUT | `/driver/status` | Toggle online | Home |

## Offers

| Method | Endpoint | Purpose | Screen |
|--------|----------|---------|--------|
| GET | `/driver/offers` | Pending offers | Offers |
| GET | `/driver/offers/:id` | Offer + booking | Offers |
| POST | `/driver/offers/:id/accept` | Accept assignment | Offers |
| POST | `/driver/offers/:id/reject` | Reject (`reason?`) | Offers |

## Trips

| Method | Endpoint | Body | Screen |
|--------|----------|------|--------|
| GET | `/driver/trips` | — | Trips, History, Home |
| GET | `/driver/trips/:id` | — | Trip details (+ nested payment) |
| POST | `/driver/trips/:id/on-the-way` | — | Trip details |
| POST | `/driver/trips/:id/arrived` | — | Trip details |
| POST | `/driver/trips/:id/start` | `{ odometer_km }` | Start ride |
| POST | `/driver/trips/:id/complete` | `{ odometer_km }` | End ride |
| POST | `/driver/trips/:id/close` | alias of complete | — |
| GET | `/driver/trips/:id/payment` | — | Payment |
| POST | `/driver/trips/:id/payment` | `{ amount, method?, note? }` | Payment |

## Location / docs / wallet / notifications / devices

| Method | Endpoint | Screen |
|--------|----------|--------|
| POST | `/driver/location` | Active trip tracker |
| GET/POST | `/driver/documents` | Documents |
| GET | `/driver/wallet` | Wallet |
| GET | `/driver/wallet/transactions` | Wallet |
| GET/POST | `/driver/payouts` | Wallet |
| GET | `/driver/notifications` | Notifications |
| POST | `/driver/devices` | After login |

## Booking status lifecycle (driver-facing)

`driver_assigned` → `on_the_way` → `arrived` → `trip_started` → `completed`

Terminal: `cancelled`, `rejected`, `no_show`  
Payment: `unpaid` | `partial` | `paid` | `refunded` | `failed`
