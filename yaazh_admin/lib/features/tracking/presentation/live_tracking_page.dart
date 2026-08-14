import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';
import 'package:yaazh_admin/app/constants.dart';
import 'package:yaazh_admin/core/widgets/coming_soon.dart';
import 'package:yaazh_admin/core/widgets/keyboard_dismiss.dart';
import 'package:yaazh_admin/core/widgets/status_chip.dart';
import 'package:yaazh_admin/core/widgets/ya_loader.dart';
import 'package:yaazh_admin/features/bookings/data/booking_repository.dart';
import 'package:yaazh_admin/features/bookings/domain/booking.dart';

class LiveTrackingPage extends ConsumerStatefulWidget {
  const LiveTrackingPage({super.key});

  @override
  ConsumerState<LiveTrackingPage> createState() => _LiveTrackingPageState();
}

class _LiveTrackingPageState extends ConsumerState<LiveTrackingPage> {
  final _mapController = MapController();
  Timer? _timer;
  String? _selectedId;
  List<LiveTrip> _trips = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    Future.microtask(() => _load());
    _timer = Timer.periodic(const Duration(seconds: 8), (_) => _load(silent: true));
  }

  @override
  void dispose() {
    _timer?.cancel();
    _mapController.dispose();
    super.dispose();
  }

  Future<void> _load({bool silent = false}) async {
    try {
      final trips = await ref.read(bookingRepositoryProvider).liveTracking(silent: silent);
      if (!mounted) return;
      setState(() {
        _trips = trips;
        _loading = false;
        _error = null;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        if (!silent) _error = e.toString();
      });
    }
  }

  void _focus(LiveTrip trip) {
    setState(() => _selectedId = trip.id);
    final loc = trip.location;
    if (loc != null) {
      _mapController.move(LatLng(loc.latitude, loc.longitude), 14);
    } else if (trip.pickupLatitude != null && trip.pickupLongitude != null) {
      _mapController.move(LatLng(trip.pickupLatitude!, trip.pickupLongitude!), 13);
    }
  }

  @override
  Widget build(BuildContext context) {
    final trips = _trips;
    LiveTrip? selected;
    for (final t in trips) {
      if (t.id == _selectedId) selected = t;
    }
    selected ??= trips.isEmpty ? null : trips.first;

    LatLng center = AppConstants.defaultCenter;
    if (selected?.location != null) {
      center = LatLng(selected!.location!.latitude, selected.location!.longitude);
    } else if (selected?.pickupLatitude != null && selected?.pickupLongitude != null) {
      center = LatLng(selected!.pickupLatitude!, selected.pickupLongitude!);
    }

    return KeyboardDismiss(
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Live tracking'),
          actions: [
            IconButton(
              tooltip: 'Refresh',
              onPressed: () => _load(),
              icon: const Icon(Icons.refresh_rounded),
            ),
          ],
        ),
        body: Column(
          children: [
            Expanded(
              flex: 5,
              child: FlutterMap(
                mapController: _mapController,
                options: MapOptions(
                  initialCenter: center,
                  initialZoom: 12.5,
                ),
                children: [
                  TileLayer(
                    urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                    userAgentPackageName: AppConstants.osmUserAgent,
                  ),
                  MarkerLayer(
                    markers: [
                      for (final trip in trips) ...[
                        if (trip.pickupLatitude != null && trip.pickupLongitude != null)
                          Marker(
                            point: LatLng(trip.pickupLatitude!, trip.pickupLongitude!),
                            width: 28,
                            height: 28,
                            child: const Icon(Icons.trip_origin_rounded, color: AppColors.success, size: 22),
                          ),
                        if (trip.dropLatitude != null && trip.dropLongitude != null)
                          Marker(
                            point: LatLng(trip.dropLatitude!, trip.dropLongitude!),
                            width: 28,
                            height: 28,
                            child: const Icon(Icons.location_on_rounded, color: AppColors.salmon, size: 24),
                          ),
                        if (trip.location != null)
                          Marker(
                            point: LatLng(trip.location!.latitude, trip.location!.longitude),
                            width: 44,
                            height: 44,
                            child: GestureDetector(
                              onTap: () => _focus(trip),
                              child: Icon(
                                Icons.local_taxi_rounded,
                                size: 36,
                                color: trip.id == selected?.id
                                    ? Theme.of(context).colorScheme.primary
                                    : AppColors.supportPurple,
                              ),
                            ),
                          ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
            Expanded(
              flex: 4,
              child: _loading && _trips.isEmpty
                  ? const Center(child: YaLoader())
                  : _error != null && _trips.isEmpty
                      ? EmptyState(
                          title: 'Tracking unavailable',
                          subtitle: _error!,
                          icon: Icons.explore_off_rounded,
                        )
                      : trips.isEmpty
                          ? const EmptyState(
                              title: 'No live trips',
                              subtitle: 'Pins appear when a driver is assigned and sharing GPS.',
                              icon: Icons.explore_off_rounded,
                            )
                          : ListView.separated(
                              padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
                              itemCount: trips.length,
                              separatorBuilder: (_, _) => const SizedBox(height: 8),
                              itemBuilder: (context, index) {
                                final trip = trips[index];
                                final active = trip.id == selected?.id;
                                return Material(
                                  color: active
                                      ? Theme.of(context).colorScheme.primary.withValues(alpha: 0.08)
                                      : Theme.of(context).colorScheme.surface,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(16),
                                    side: BorderSide(
                                      color: active
                                          ? Theme.of(context).colorScheme.primary
                                          : Theme.of(context).dividerColor,
                                    ),
                                  ),
                                  child: InkWell(
                                    borderRadius: BorderRadius.circular(16),
                                    onTap: () => _focus(trip),
                                    onLongPress: () => context.push('/bookings/${trip.id}'),
                                    child: Padding(
                                      padding: const EdgeInsets.all(12),
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Row(
                                            children: [
                                              Expanded(
                                                child: Text(
                                                  trip.bookingReference,
                                                  style: Theme.of(context).textTheme.titleSmall,
                                                ),
                                              ),
                                              StatusChip(status: trip.status),
                                            ],
                                          ),
                                          const SizedBox(height: 4),
                                          Text(trip.customerName),
                                          Text(
                                            '${trip.pickupLocation} → ${trip.dropLocation}',
                                            maxLines: 2,
                                            overflow: TextOverflow.ellipsis,
                                            style: Theme.of(context).textTheme.bodySmall,
                                          ),
                                          const SizedBox(height: 6),
                                          Text(
                                            [
                                              trip.driver?.name ?? 'No driver',
                                              if (trip.etaMin != null) 'ETA ${trip.etaMin} min',
                                              if (trip.location?.stale == true) 'GPS stale',
                                              if (trip.location == null) 'No GPS yet',
                                            ].join(' · '),
                                            style: Theme.of(context).textTheme.bodySmall,
                                          ),
                                          const SizedBox(height: 8),
                                          LinearProgressIndicator(
                                            value: (trip.progress.clamp(0, 100)) / 100,
                                            minHeight: 6,
                                            borderRadius: BorderRadius.circular(99),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                );
                              },
                            ),
            ),
          ],
        ),
      ),
    );
  }
}
