# Yaazh Cabs — Customer app

Login-first Flutter app for booking and tracking Yaazh Cabs rides.

## Run

```bash
cd yaazh_customer
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000/api/v1
```

iOS simulator / desktop: use `http://127.0.0.1:3000/api/v1`.

Auth is phone + password against `/api/v1/auth/customer`. Maps use OpenStreetMap tiles and Nominatim search (no Google key).
