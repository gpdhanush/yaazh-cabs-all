import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:yaazh_cabs/core/config/remote_config.dart';
import 'package:yaazh_cabs/core/location/location_service.dart';
import 'package:yaazh_cabs/features/trips/data/trip_repository.dart';

final tripLocationTrackerProvider = Provider<TripLocationTracker>((ref) {
  final tracker = TripLocationTracker(
    ref.watch(locationServiceProvider),
    ref.watch(tripRepositoryProvider),
    ref.watch(remoteConfigServiceProvider),
  );
  ref.onDispose(tracker.stop);
  return tracker;
});

/// Pushes GPS samples to `POST /driver/location` (driver_locations table)
/// while the driver is on an assigned/active trip.
class TripLocationTracker {
  final LocationService _locationService;
  final TripRepository _tripRepository;
  final RemoteConfigService _remoteConfig;

  StreamSubscription<Position>? _subscription;
  String? _bookingId;
  DateTime? _lastSentAt;
  bool _lastSuccess = false;

  TripLocationTracker(
    this._locationService,
    this._tripRepository,
    this._remoteConfig,
  );

  bool get isTracking => _subscription != null;
  bool get lastSuccess => _lastSuccess;
  String? get bookingId => _bookingId;

  Future<void> start(String bookingId) async {
    final config = await _remoteConfig.fetch();
    if (!config.liveTrackingEnabled) {
      await stop();
      debugPrint('Live tracking disabled by remote config');
      return;
    }
    if (_bookingId == bookingId && _subscription != null) return;
    await stop();
    _bookingId = bookingId;

    final granted = await _locationService.requestLocationPermission();
    if (!granted) {
      debugPrint('Location permission denied — tracker idle');
      return;
    }

    final current = await _locationService.getCurrentPosition();
    if (current != null) {
      await _send(current, bookingId);
    }

    _subscription = _locationService.getPositionStream().listen(
      (position) async {
        final now = DateTime.now();
        if (_lastSentAt != null &&
            now.difference(_lastSentAt!) < const Duration(seconds: 8)) {
          return;
        }
        await _send(position, bookingId);
      },
      onError: (e) => debugPrint('Location stream error: $e'),
    );
  }

  Future<void> _send(Position position, String bookingId) async {
    try {
      await _tripRepository.updateDriverLocation(
        latitude: position.latitude,
        longitude: position.longitude,
        heading: position.heading.isNaN ? null : position.heading,
        speed: position.speed.isNaN ? null : position.speed,
        accuracy: position.accuracy.isNaN ? null : position.accuracy,
        bookingId: bookingId,
        recordedAt: DateTime.now().toUtc().toIso8601String(),
      );
      _lastSentAt = DateTime.now();
      _lastSuccess = true;
    } catch (e) {
      _lastSuccess = false;
      debugPrint('Failed to post /driver/location: $e');
    }
  }

  Future<void> stop() async {
    await _subscription?.cancel();
    _subscription = null;
    _bookingId = null;
  }
}
