# API → Screen Matrix

| Screen | Primary APIs | Status |
|--------|--------------|--------|
| Splash | GET `/driver/profile` | Done |
| Login | POST `/auth/driver/login`, POST `/driver/devices` | Done |
| Forgot password | — (admin process) | UI only; documented gap |
| Home | profile, status, trips, wallet, offers | Done |
| Offers | `/driver/offers*` | Done |
| Assigned trips | GET `/driver/trips` | Done |
| Trip details | GET `/driver/trips/:id`, on-the-way, arrived, start | Done |
| Active trip | location stream + trip detail | Done |
| End ride | POST complete | Done |
| Payment | GET/POST payment | Done |
| Summary | GET trip detail | Done |
| History | GET trips (completed/cancelled filter) | Done |
| Wallet / payouts | wallet + transactions + payouts | Done |
| Documents | GET/POST documents | Done (URL-based upload) |
| Notifications | GET notifications | Done |
| Profile / settings | profile, logout | Done |
| Support | hotline + local note | Gap: no ticket API |
| Vehicle details | — | Gap: no driver vehicle GET |

## Backend Gaps Found

### Feature: Forgot password / OTP reset
- **Missing:** Driver forgot-password HTTP endpoints (OTP table exists)
- **Why needed:** Self-serve password recovery
- **Suggested:** `POST /auth/driver/forgot-password`, `POST /auth/driver/verify-otp`, `POST /auth/driver/reset-password`
- **Workaround:** Fleet admin resets password

### Feature: Driver support tickets
- **Missing:** Driver-scoped support ticket create/list
- **Why needed:** In-app issue tracking
- **Suggested:** `POST /driver/support-tickets`, `GET /driver/support-tickets`
- **Workaround:** Operations hotline

### Feature: Assigned vehicle details
- **Missing:** `GET /driver/vehicle`
- **Why needed:** Show registration / category on home & trip screens
- **Suggested:** Return active `driver_vehicle_assignments` + vehicle
- **Workaround:** Omit until API added

### Feature: Multipart document / odometer photo upload
- **Present:** `POST /driver/uploads` (images + PDF) → returns public URL; then `POST /driver/documents`
- **App:** Camera / gallery / file picker on upload page
- **Storage:** `storage/public/documents/`

### Feature: Firebase push delivery
- **Present:** `POST /driver/devices` stores FCM token
- **Missing in app:** Real Firebase project config (`google-services.json`)
- **Workaround:** Stable local device token registered until FCM is configured
