# Yaazh Driver App — SQL Schema Mapping

Source: `backend/database/cab_booking_production_v2.sql`

| Table | Purpose | App screens |
|-------|---------|-------------|
| `drivers` | Account, online/availability, rating, location | Auth, Home, Profile |
| `auth_sessions` | Refresh tokens | Login / refresh |
| `auth_otp_requests` | OTP (schema only; no driver HTTP API) | Gap: forgot password |
| `app_devices` | FCM / device tokens | Device registration |
| `bookings` | Assigned trips, odometer, payment_status | Trips lifecycle |
| `booking_driver_offers` | Offer inbox | Offers |
| `booking_status_history` | Status audit | Trip details (implicit) |
| `trip_events` | Driver lifecycle events | Written by API |
| `driver_locations` | GPS trail | Active trip |
| `vehicles` | Fleet vehicles | No driver GET API (gap) |
| `driver_vehicle_assignments` | Driver↔vehicle | Used on offer accept |
| `driver_documents` | KYC docs | Documents |
| `payments` | Cash/UPI collections | Payment collect |
| `driver_wallet_transactions` | Ledger | Wallet |
| `driver_payouts` | Payout requests | Wallet |
| `notification_logs` | In-app notifications | Notifications |
| `support_tickets` | Support | Gap: no driver API |

## Important booking columns

- `booking_reference`, `status`, `trip_type`, `payment_status`
- `customer_name`, `customer_phone`
- `pickup_location`, `drop_location`, `pickup_at`
- `assigned_driver_id`
- `start_odometer_km`, `end_odometer_km`, `actual_distance_km`
- `estimated_total`, `final_total`
