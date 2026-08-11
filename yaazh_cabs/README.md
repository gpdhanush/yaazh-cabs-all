# Yaazh Cabs Driver

Enterprise Flutter driver app for Yaazh Cabs fleet drivers (Android-first).

Drivers only operate trips assigned by the company. There is no public ride marketplace, bidding, or customer search.

## Stack

- Flutter + Material 3
- Riverpod
- Dio + GoRouter
- Secure storage for tokens
- Geolocator for active-trip location sync

## Docs

- [Backend API audit](docs/BACKEND_API_AUDIT.md)
- [SQL schema mapping](docs/SQL_SCHEMA_MAPPING.md)
- [API → screen matrix & gaps](docs/API_TO_SCREEN_MATRIX.md)

## Setup

```bash
cd yaazh_cabs
flutter pub get
flutter test
```

### Run against local API

Android emulator (host machine API on port 3000):

```bash
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000/api/v1
```

iOS simulator / desktop:

```bash
flutter run --dart-define=API_BASE_URL=http://127.0.0.1:3000/api/v1
```

Staging / production:

```bash
flutter run --dart-define=APP_ENV=production --dart-define=API_BASE_URL=https://api.example.com/api/v1
```

### Android build

```bash
flutter build apk --release --dart-define=API_BASE_URL=https://api.example.com/api/v1
```

## Login

Use a driver account seeded in the backend (`POST /auth/driver/login` with phone + password).

## Core driver flow

1. Go online on Home
2. Accept offers (if admin offered) or open assigned trips
3. On the way → Arrived → Start (odometer) → Active trip (GPS sync)
4. End ride (end odometer) → Collect payment if balance due → Summary

## Firebase (optional)

`POST /driver/devices` is called after login. Until Firebase is configured, a stable local device token is registered. To enable real FCM:

1. Add Firebase Android/iOS apps and `google-services.json` / `GoogleService-Info.plist`
2. Add `firebase_core` + `firebase_messaging`
3. Replace token resolution in `lib/core/notifications/device_service.dart`
