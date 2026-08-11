# Flutter Driver App Implementation Guide

## Purpose

Use this document as the master implementation prompt for building a production-ready Flutter Driver App for a private cab or enterprise fleet company.

This app is for company drivers only. It is not a public ride-hailing marketplace. Drivers do not search for customers, bid for trips, accept public ride requests, or compete with other drivers. Drivers only operate trips assigned by the company through the existing backend.

The implementation must be based on the existing backend APIs and the existing database schema file:

- Backend folder: `backend/`
- Database schema: `cab_booking_production_v2.sql`

Before generating or editing Flutter code, analyze the backend and SQL schema in the target project. Reuse existing APIs, models, database concepts, status values, and business rules. Do not invent duplicate APIs unless a required feature is genuinely unsupported by the backend.

---

## Role

Act as a senior Flutter architect, mobile product designer, backend integration engineer, and enterprise UX specialist.

Build a premium Android-first Flutter Driver App using:

- Flutter
- Material 3
- MVVM architecture
- Riverpod for state management
- Dio for HTTP networking
- GoRouter for navigation
- Freezed for immutable models and unions
- json_serializable for JSON mapping
- Secure storage for sensitive values
- Local database/cache for offline support
- Firebase Cloud Messaging for push notifications
- Background location support where required by the business flow

The app must feel like a polished enterprise workforce tool for professional drivers.

---

## Mandatory First Step: Analyze Backend and SQL

Before implementing screens, perform a full backend and schema audit.

### Backend Analysis

Inspect the complete `backend/` folder and identify:

- Framework and project structure
- Authentication endpoints
- Driver profile endpoints
- Booking/trip assignment endpoints
- Trip lifecycle endpoints
- Odometer/photo upload endpoints
- Payment summary endpoints
- Wallet and payout endpoints
- Notification endpoints
- Vehicle endpoints
- Driver document endpoints
- Location tracking endpoints
- Support/help endpoints
- Existing middleware and auth guards
- API response formats
- Error response formats
- Required headers
- Token refresh flow, if present
- File upload conventions
- Pagination conventions
- Date/time format
- Status enum values

For every endpoint, document:

```md
Endpoint:
Method:
Purpose:
Auth required:
Request body:
Query params:
Response body:
Error response:
Related screen:
Related repository method:
Related ViewModel:
Related DB tables:
```

### SQL Schema Analysis

Inspect `cab_booking_production_v2.sql` and identify all tables related to:

- Drivers
- Users/accounts/auth
- Vehicles
- Vehicle assignment
- Bookings
- Trips
- Trip status history
- Driver availability/status
- Odometer readings
- Route/location tracking
- Payments
- Wallet ledger
- Payouts
- Documents
- Notifications
- Support tickets
- Audit logs
- Admin assignment flow
- Device tokens

For every relevant table, document:

```md
Table:
Purpose:
Primary key:
Foreign keys:
Important columns:
Status columns:
Created/updated timestamps:
Soft-delete columns:
Related APIs:
Related app screens:
```

### API Reuse Rule

Use existing endpoints exactly as designed wherever possible.

Do not create new backend routes when an existing route already supports the required workflow.

If a required screen cannot be supported by the current backend, create a section named:

```md
Backend Gaps Found
```

For each gap, specify:

```md
Feature:
Missing API/table/column:
Why needed:
Suggested endpoint:
Suggested request:
Suggested response:
Suggested DB change:
Backward compatibility notes:
```

---

## Product Definition

### App Type

Enterprise fleet driver application.

### Target Users

- Company drivers
- Fleet drivers
- Cab drivers
- Transport employees
- Field mobility staff

### Non-Goals

The app must not include:

- Public ride marketplace behavior
- Driver bidding
- Nearby customer search
- Price negotiation
- Consumer ride request feed
- Surge pricing UI
- Competitor-style ride-hailing design patterns

### Core Goals

The app must allow a driver to:

- Log in securely
- View assigned trips
- Manage availability
- View assigned vehicle
- Accept or acknowledge assigned bookings if backend supports it
- Navigate to pickup
- Mark arrival at pickup
- Start ride with odometer validation
- Track ride progress
- Mark destination reached
- End ride with end odometer
- View payment or fare summary
- View completed trip history
- View wallet and payout information where supported
- Receive notifications
- View documents and verification status
- Contact support
- Update limited profile settings
- Work reliably with poor network conditions

---

## Technical Stack

Use the following stack unless the existing project already contains an equivalent approved library:

```yaml
dependencies:
  flutter_riverpod
  riverpod_annotation
  dio
  go_router
  freezed_annotation
  json_annotation
  flutter_secure_storage
  connectivity_plus
  firebase_core
  firebase_messaging
  flutter_local_notifications
  geolocator
  permission_handler
  intl
  cached_network_image
  shared_preferences
```

```yaml
dev_dependencies:
  build_runner
  riverpod_generator
  freezed
  json_serializable
  flutter_lints
  mocktail
```

If the app needs local relational storage, use `drift` or `isar` based on project preference. Choose one and use it consistently.

---

## Architecture

Use feature-first MVVM with clear boundaries.

### Layers

```txt
lib/
  app/
    app.dart
    router/
    theme/
    lifecycle/
  core/
    config/
    constants/
    errors/
    network/
    storage/
    location/
    notifications/
    utils/
    widgets/
  features/
    auth/
    dashboard/
    trips/
    trip_details/
    active_trip/
    history/
    wallet/
    payouts/
    vehicle/
    documents/
    notifications/
    profile/
    settings/
    support/
  l10n/
```

Each feature should follow:

```txt
feature_name/
  data/
    datasources/
    dto/
    repositories/
  domain/
    models/
    repositories/
    usecases/
  presentation/
    pages/
    widgets/
    viewmodels/
    providers/
```

For small features, use the same structure but avoid unnecessary abstraction. The architecture must stay practical, not ceremonial.

---

## MVVM Pattern

### View

Flutter pages and widgets must:

- Render state from Riverpod providers
- Avoid direct API calls
- Avoid business logic
- Avoid parsing backend responses
- Show loading, error, empty, offline, and success states
- Delegate actions to ViewModels

### ViewModel

ViewModels must:

- Own screen state
- Call repositories or use cases
- Convert exceptions into user-friendly states
- Expose methods for user actions
- Avoid BuildContext except for navigation-independent behavior
- Be testable

Use `AsyncNotifier`, `Notifier`, or generated Riverpod notifiers depending on state complexity.

### Repository

Repositories must:

- Call remote data sources
- Call local cache where needed
- Map DTOs to domain models
- Hide Dio and storage implementation details
- Provide clean methods consumed by ViewModels

Example repository responsibilities:

```dart
abstract class TripRepository {
  Future<List<Trip>> getAssignedTrips();
  Future<TripDetails> getTripDetails(String bookingId);
  Future<void> acknowledgeTrip(String bookingId);
  Future<void> markReachedPickup(String bookingId);
  Future<void> startRide(StartRideInput input);
  Future<void> completeRide(CompleteRideInput input);
}
```

---

## Riverpod Rules

Use Riverpod consistently across the app.

Required provider categories:

- `dioProvider`
- `secureStorageProvider`
- `authRepositoryProvider`
- `tripRepositoryProvider`
- `locationServiceProvider`
- `notificationServiceProvider`
- Feature ViewModel providers
- Current authenticated driver provider
- Connectivity provider

Rules:

- No global mutable state
- No singleton service access from UI
- Prefer generated providers for maintainability
- Keep provider names predictable
- Use `AsyncValue` for async UI
- Use explicit state classes for complex workflows
- Dispose streams and timers correctly

---

## Networking With Dio

Create a central API client.

Required features:

- Base URL configuration by environment
- Authorization token interceptor
- Refresh token support if backend supports it
- Request timeout
- Response timeout
- Structured API errors
- Retry policy for safe idempotent requests
- Multipart upload support
- Logging only in debug mode
- No sensitive token logging

### API Response Handling

Match the backend's actual response structure.

If backend responses use:

```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

create a generic `ApiResponse<T>` wrapper.

If the backend returns raw objects or arrays, map them directly.

Never force a frontend response model that conflicts with the real backend.

### Error Mapping

Map errors into these user-facing categories:

- No internet
- Request timeout
- Unauthorized session
- Permission denied
- Validation error
- Resource not found
- Conflict or invalid trip status
- Server error
- Unknown error

The UI must show clear recovery actions:

- Retry
- Refresh
- Sign in again
- Contact support
- Continue offline where safe

---

## Authentication Flow

### Screens

- Splash
- Login
- Forgot Password
- OTP or reset flow if supported by backend
- Session expired screen or dialog

### Backend Mapping

Map to existing auth endpoints:

- Login
- Logout
- Refresh token
- Forgot password
- OTP verification
- Reset password
- Driver profile/current user
- Device token registration

### Requirements

- Store access tokens securely
- Store refresh tokens securely if used
- Clear secure storage on logout
- Register FCM token after login
- Attach driver ID only from authenticated backend response
- Never trust locally typed driver IDs
- Validate mobile number/email/password based on backend requirements
- Disable login button while request is running
- Show clear validation messages

---

## Navigation

Use GoRouter.

Required route groups:

```txt
/splash
/login
/forgot-password
/home
/trips
/trips/:bookingId
/active-trip/:bookingId
/history
/history/:bookingId
/wallet
/payouts
/vehicle
/documents
/notifications
/profile
/settings
/support
```

Use auth-aware redirects:

- Unauthenticated users go to login
- Authenticated users go to home
- Active trip routes require valid assigned trip
- Expired sessions return to login

Use bottom navigation for primary sections:

- Home
- Trips
- History
- Wallet
- Profile

If wallet is unsupported by backend, replace with Notifications or Support.

---

## Design System

Use Material 3 with a custom enterprise visual language.

### Design Characteristics

- Professional
- Calm
- Premium
- Dense enough for operations
- Comfortable for all-day usage
- High readability outdoors
- Large touch targets
- Clear visual hierarchy
- Soft surfaces
- Minimal decorative noise

### Theme

Create:

- Light theme
- Dark theme
- Color tokens
- Typography tokens
- Spacing tokens
- Radius tokens
- Elevation tokens
- Motion durations

### UI Rules

- Use an 8pt spacing system
- Minimum tap target: 48x48
- Prefer 16px page padding on phones
- Use 20px to 24px padding on tablets
- Use responsive layouts for tablets and landscape
- Keep card radius between 12px and 20px unless project standards differ
- Use Material 3 components but customize them enough to avoid generic templates
- Avoid copying Uber, Ola, Lyft, Bolt, Rapido, or similar apps

### Accessibility

Support:

- Text scaling
- High contrast
- Screen readers
- Proper semantic labels
- Large tap targets
- Error text announced clearly
- Color-independent status indicators

---

## Offline Sync

The driver app must handle weak network conditions.

### Offline Capabilities

Cache:

- Driver profile
- Assigned vehicle
- Current active trip
- Assigned trips list
- Trip details
- Recent trip history
- Wallet summary if available
- Documents status if available

Queue only safe actions:

- Location pings
- Odometer submission if backend supports idempotency
- Trip status transitions only if the workflow can be reconciled safely

Do not queue risky actions unless there is an idempotency key:

- Start ride
- Complete ride
- Payment confirmation

For important trip lifecycle actions, generate and send an idempotency key where backend supports it. If the backend does not support idempotency, require online confirmation for critical state transitions.

### Offline UI

Show:

- Offline banner
- Last synced timestamp
- Pending sync indicator
- Retry sync action
- Clear warning before critical actions that require internet

---

## Firebase Cloud Messaging

Implement FCM only after confirming backend support for device token registration.

### Required Behavior

- Request notification permission at the right moment
- Register device token after login
- Send token to backend
- Refresh token when Firebase rotates it
- Remove or invalidate token on logout if backend supports it
- Handle foreground notifications
- Handle background notification taps
- Deep link to trip details when notification contains booking/trip ID

### Notification Types

Support notification handling for:

- New assigned trip
- Trip updated
- Trip cancelled
- Payment updated
- Document status changed
- Payout updated
- Admin message
- Support ticket update

---

## Location and Background Tracking

Implement location features only according to backend requirements and platform permissions.

### Location Use Cases

- Show driver current location
- Send periodic location updates during active trip
- Send pickup/destination status location
- Support admin tracking during assigned/active trip

### Rules

- Request location permission with clear context
- Use foreground service on Android if continuous tracking is required
- Stop tracking when trip is completed
- Avoid collecting background location when not needed
- Respect battery usage
- Show clear tracking status in the app
- Handle permission denied and permanently denied states

---

## Security

Required:

- Store tokens in secure storage
- Never store passwords
- Never log tokens, passwords, OTPs, or personal documents
- Validate server certificates normally
- Use HTTPS base URLs
- Sanitize upload filenames
- Restrict file picker to allowed upload types
- Clear sensitive state on logout
- Handle unauthorized responses globally
- Avoid exposing internal API errors directly to drivers

Recommended:

- App lock or biometric unlock if required by company policy
- Jailbreak/root detection only if required by business/security policy
- Certificate pinning only if backend infrastructure supports reliable rotation

---

## Screen-by-Screen Requirements

For every screen below:

1. Identify existing backend APIs.
2. Identify related database tables.
3. Create DTOs matching real backend responses.
4. Create domain models.
5. Create repository methods.
6. Create Riverpod providers.
7. Create ViewModel state and actions.
8. Build Material 3 UI.
9. Handle loading, error, empty, offline, and retry states.
10. Add tests for business logic and important UI states.

---

## 1. Splash Screen

### Purpose

Decide initial route.

### Data Needed

- Stored access token
- Refresh token if used
- Current driver profile endpoint
- App configuration if backend supports it

### Behavior

- Show branded loading state
- Check token availability
- Validate session
- Refresh token if supported
- Navigate to login or home
- If driver has active trip, optionally route to active trip

### States

- Loading
- Session valid
- Session expired
- Network unavailable
- Maintenance mode if backend supports it

---

## 2. Login Screen

### Purpose

Authenticate driver.

### Data Needed

- Login endpoint
- Driver auth table/user table
- FCM token registration endpoint

### UI

- Mobile/email field based on backend
- Password field
- Forgot password action
- Login button
- Secure error display

### Actions

- Validate input
- Call login API
- Store tokens
- Fetch driver profile
- Register FCM token
- Navigate to home

---

## 3. Forgot Password Screen

### Purpose

Allow password recovery if backend supports it.

### Data Needed

- Forgot password endpoint
- OTP endpoint if available
- Reset password endpoint if available

### UI

- Identifier field
- OTP verification if supported
- New password fields if supported
- Success confirmation

---

## 4. Home Dashboard

### Purpose

Show the driver's operational day at a glance.

### Data Needed

- Driver profile
- Availability/status
- Current active trip
- Next assigned trip
- Today's trip count
- Wallet or earning summary if supported
- Notifications count
- Assigned vehicle

### UI Sections

- Driver greeting
- Availability control: online, offline, break, on trip
- Active trip card
- Next assigned trip card
- Today summary
- Vehicle summary
- Alerts/notifications

### Actions

- Change availability
- Open assigned trip
- Resume active trip
- Refresh dashboard

### DB Mapping

Likely related tables:

- drivers
- users
- bookings
- trips
- driver_status or equivalent
- vehicles
- driver_vehicle_assignment
- notifications
- wallet ledger if present

Use exact table names from SQL analysis.

---

## 5. Assigned Trips Screen

### Purpose

Show trips assigned by company admin.

### Data Needed

- Assigned bookings endpoint
- Booking status values
- Pickup/drop data
- Customer/passenger display fields allowed for drivers

### UI

- Tabs or filters for upcoming, today, later
- Trip cards
- Pickup time
- Pickup and destination
- Status chip
- Company/admin assignment indicator
- Empty state when no assigned trips

### Actions

- Pull to refresh
- Open trip details
- Acknowledge/accept if backend has that workflow

---

## 6. Trip Details Screen

### Purpose

Show full assignment details and lifecycle actions.

### Data Needed

- Trip details endpoint
- Booking details table
- Trip status history table
- Customer/passenger contact fields allowed by business policy
- Route/pickup/drop fields
- Vehicle assignment
- Fare/payment summary if visible before completion

### UI Sections

- Status header
- Trip timeline
- Pickup details
- Destination details
- Passenger/company booking details
- Notes/instructions
- Vehicle details
- Action area

### Timeline

Use actual backend statuses, mapped into a driver-friendly lifecycle:

```txt
Assigned
Acknowledged or Accepted
On the Way
Reached Pickup
Ride Started
Reached Destination
Completed
Cancelled
```

Only show lifecycle steps supported by backend status values.

### Actions

Depending on backend support:

- Acknowledge trip
- Start navigation to pickup
- Mark on the way
- Mark reached pickup
- Call passenger/company contact if allowed
- Start ride
- Cancel reason flow only if driver cancellation is allowed

---

## 7. Start Ride and Odometer Screen

### Purpose

Capture required start-of-trip validation.

### Data Needed

- Start ride endpoint
- Odometer fields
- Required photo upload endpoint if present
- Current GPS location

### UI

- Current booking summary
- Start odometer input
- Optional odometer photo capture/upload
- Validation messages
- Confirm start ride button

### Rules

- Odometer must be numeric
- Odometer must be greater than or equal to previous end reading if backend provides it
- Require photo only if backend/business rules require it
- Submit location if endpoint accepts it
- Prevent duplicate submission

---

## 8. Active Trip Screen

### Purpose

Support the driver during the ride.

### Data Needed

- Active trip endpoint
- Location tracking endpoint
- Trip status update endpoint
- Route/pickup/drop details

### UI

- Active trip status
- Destination details
- Passenger/company booking summary
- Tracking status
- Primary action: reached destination or end ride
- Secondary actions: support, contact, report issue

### Behavior

- Keep active trip state resilient across app restarts
- Continue or resume location tracking as required
- Show offline state clearly
- Prevent invalid status transitions

---

## 9. End Ride and End Odometer Screen

### Purpose

Complete the ride with final validation.

### Data Needed

- Complete ride endpoint
- End odometer field
- Final location
- Optional end odometer photo endpoint

### UI

- Trip summary
- End odometer input
- Optional photo capture
- Distance preview if backend supports it
- Complete ride confirmation

### Rules

- End odometer must be numeric
- End odometer must be greater than start odometer
- Prevent duplicate completion
- Require online state unless backend supports safe queued completion

---

## 10. Ride Summary Screen

### Purpose

Show completion confirmation.

### Data Needed

- Payment summary API
- Completed trip details endpoint
- Fare, taxes, discounts, driver earnings, commission if allowed

### UI

- Completed status
- Pickup/drop summary
- Odometer start/end
- Distance
- Duration
- Payment status
- Fare summary
- Driver earning summary if supported

### Actions

- Back to home
- View history detail
- Report issue

---

## 11. Trip History Screen

### Purpose

Show completed, cancelled, and past assigned trips.

### Data Needed

- Trip history endpoint
- Pagination
- Date filters
- Status filters

### UI

- Date range filter
- Status filter
- Paginated list
- Empty state
- Pull to refresh

### Actions

- Open history details
- Download/share receipt only if backend supports it

---

## 12. Wallet Screen

### Purpose

Show driver's financial ledger where supported.

### Data Needed

- Wallet summary endpoint
- Ledger endpoint
- Earnings summary endpoint
- Commission/adjustment entries

### UI

- Current balance
- Today's earnings
- Weekly/monthly summary
- Ledger list
- Credit/debit indicators
- Pending payout amount

### Rules

- Use backend financial values exactly
- Do not calculate final payable amount on the client unless backend explicitly requires it
- Format currency consistently

---

## 13. Payout History Screen

### Purpose

Show payout requests and statuses.

### Data Needed

- Payout list endpoint
- Payout status enum
- Bank/account summary if visible

### UI

- Payout status cards
- Requested amount
- Paid amount
- Processing date
- Paid date
- Rejection reason if available

### Statuses

Use backend statuses. Common examples:

```txt
Requested
Processing
Paid
Rejected
Failed
```

---

## 14. Vehicle Details Screen

### Purpose

Show assigned vehicle details.

### Data Needed

- Vehicle endpoint
- Driver vehicle assignment table
- Vehicle documents/expiry fields

### UI

- Registration number
- Vehicle category
- Model/make if available
- Fuel type
- Seating capacity
- Insurance expiry
- Permit expiry
- Fitness/RC information if available

### Rules

- Read-only for drivers unless backend supports update requests
- Highlight expired or expiring documents

---

## 15. Driver Documents Screen

### Purpose

Show driver compliance documents.

### Data Needed

- Driver documents endpoint
- Upload endpoint if supported
- Verification status fields

### UI

- License
- Identity proof
- Address proof
- Badge/permit if applicable
- Status: verified, pending, rejected, expired
- Expiry dates
- Rejection reason
- Upload/replace action only if backend supports it

### Rules

- Use secure upload
- Restrict allowed file types
- Compress images reasonably
- Do not log document URLs or private metadata

---

## 16. Notifications Screen

### Purpose

Show operational messages.

### Data Needed

- Notifications endpoint
- Mark as read endpoint
- Notification type/status fields

### UI

- Notification list
- Unread indicator
- Type icon
- Date/time
- Empty state

### Actions

- Open related trip
- Mark as read
- Mark all as read if backend supports it

---

## 17. Profile Screen

### Purpose

Show driver account and employment details.

### Data Needed

- Current driver profile endpoint
- Driver table
- User/account table

### UI

- Name
- Photo
- Phone/email
- Employee/driver code if available
- Rating only if enterprise backend supports it
- Joined date
- Assigned branch/company if available
- Emergency contact if available

### Rules

- Editable fields only if backend supports update
- Sensitive fields must be masked where appropriate

---

## 18. Settings Screen

### Purpose

Allow app-level preferences.

### UI

- Theme mode
- Notification settings if backend supports it
- Language if localization exists
- Privacy/security links
- Logout

### Actions

- Change local theme
- Open app permissions
- Logout and clear secure data

---

## 19. Support Screen

### Purpose

Help drivers resolve operational issues.

### Data Needed

- Support ticket endpoint if available
- Support categories
- Existing issue list if available

### UI

- Create issue
- Category picker
- Trip selector if issue is trip-related
- Message field
- Attachment upload if supported
- Support contact shortcuts

### Rules

- Include booking ID when support is launched from a trip
- Show submitted ticket status if backend supports it

---

## 20. Permission Screens

### Purpose

Explain and request required app permissions.

### Permissions

- Location
- Notifications
- Camera for odometer/document photos
- Storage/photos depending on platform and upload flow

### Rules

- Request permissions only when needed
- Explain why the permission is needed
- Handle denied and permanently denied states
- Provide settings deep link when required

---

## State Requirements for Every Screen

Every screen must handle:

- Initial loading
- Pull-to-refresh loading
- Action button loading
- Empty data
- Network error
- Validation error
- Unauthorized/session expired
- Backend conflict
- Offline cached data
- Retry success

Use consistent widgets:

- `AppLoadingView`
- `AppErrorView`
- `AppEmptyView`
- `OfflineBanner`
- `PrimaryActionButton`
- `StatusChip`
- `TripTimeline`
- `InfoRow`
- `MetricTile`

---

## Trip Lifecycle Rules

Derive the actual lifecycle from the backend schema and API status values.

Do not hardcode statuses until SQL and API analysis is complete.

Create a mapping layer:

```dart
enum TripLifecycleStep {
  assigned,
  acknowledged,
  onTheWay,
  reachedPickup,
  rideStarted,
  reachedDestination,
  completed,
  cancelled,
}
```

Map backend status strings safely:

- Unknown backend statuses must not crash the app
- Unknown statuses should show a neutral label
- Invalid transitions should be blocked in the ViewModel
- Backend conflict responses should refresh trip details

---

## Model and DTO Rules

Use Freezed and json_serializable.

### DTOs

DTOs represent backend JSON exactly.

```dart
@freezed
class TripDto with _$TripDto {
  const factory TripDto({
    required String id,
    required String status,
    String? pickupAddress,
    String? dropAddress,
  }) = _TripDto;

  factory TripDto.fromJson(Map<String, dynamic> json) =>
      _$TripDtoFromJson(json);
}
```

### Domain Models

Domain models represent app-friendly business objects.

```dart
@freezed
class Trip with _$Trip {
  const factory Trip({
    required String id,
    required TripStatus status,
    required String pickupAddress,
    required String dropAddress,
  }) = _Trip;
}
```

### Mapping

Create mapper extensions:

```dart
extension TripDtoMapper on TripDto {
  Trip toDomain() {
    return Trip(
      id: id,
      status: TripStatusMapper.fromBackend(status),
      pickupAddress: pickupAddress ?? '',
      dropAddress: dropAddress ?? '',
    );
  }
}
```

---

## Validation Rules

Validate at both UI and ViewModel levels where appropriate.

Required validations:

- Required login fields
- Correct phone/email format based on backend
- Required odometer fields
- Numeric odometer
- End odometer greater than start odometer
- Required document/photo uploads
- Required support ticket message
- Valid status transition

Backend validation errors must appear next to fields when possible.

---

## Testing Requirements

### Unit Tests

Test:

- Repository mapping
- Status mapping
- Odometer validation
- Login ViewModel
- Trip lifecycle ViewModel
- Offline queue behavior
- Error mapping

### Widget Tests

Test:

- Login loading/error/success UI
- Empty assigned trips UI
- Trip details timeline
- Active trip action states
- Wallet empty/loading/error states

### Integration Tests

Test:

- Login to dashboard
- Open assigned trip
- Start ride
- Complete ride
- View ride summary
- Logout

Use mocked APIs unless a dedicated staging backend is provided.

---

## Performance Requirements

- Avoid unnecessary rebuilds
- Use `const` widgets where practical
- Paginate long lists
- Cache static profile/vehicle data
- Compress uploads
- Avoid blocking the UI thread
- Use isolates only for genuinely heavy parsing or compression
- Keep app startup fast

---

## Environment Configuration

Support:

- Development
- Staging
- Production

Use compile-time environment values:

```bash
flutter run --dart-define=APP_ENV=staging --dart-define=API_BASE_URL=https://...
```

Never hardcode production secrets in source code.

---

## Implementation Order

Follow this order:

1. Analyze backend APIs and SQL schema.
2. Produce API-to-screen mapping.
3. Identify backend gaps.
4. Create Flutter project architecture.
5. Add dependencies and code generation setup.
6. Build theme and design system.
7. Build networking, auth storage, and error handling.
8. Implement auth flow.
9. Implement dashboard.
10. Implement trip list and trip details.
11. Implement trip lifecycle actions.
12. Implement active trip and location updates.
13. Implement ride completion and summary.
14. Implement history.
15. Implement wallet and payouts if backend supports them.
16. Implement vehicle and documents.
17. Implement notifications and FCM.
18. Implement profile, settings, and support.
19. Add offline caching and sync queue.
20. Add tests.
21. Run analysis, formatting, tests, and Android build.

---

## Required Deliverables

The final implementation must include:

- Flutter app source code
- Backend API audit document
- SQL schema mapping document
- API-to-screen matrix
- Backend gaps document if needed
- Environment setup instructions
- Test instructions
- Android build instructions

---

## Final Implementation Rules

- Do not invent APIs before checking the backend.
- Do not duplicate existing models or endpoints.
- Do not hardcode status strings across UI files.
- Do not put API logic inside widgets.
- Do not store tokens in plain preferences.
- Do not show stack traces to drivers.
- Do not log sensitive data.
- Do not make marketplace ride-hailing UI.
- Do not add bidding or customer search.
- Do not block core trip actions behind unnecessary UI complexity.
- Do not calculate authoritative financial totals on the client.
- Do not allow invalid trip status transitions.
- Do not ignore offline and timeout states.
- Do not skip tests for lifecycle-critical logic.

The finished app must be clean, maintainable, secure, driver-friendly, and faithful to the existing backend and database design.

