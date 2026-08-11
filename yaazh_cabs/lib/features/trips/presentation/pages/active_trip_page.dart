import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:yaazh_cabs/app/constants.dart';
import 'package:yaazh_cabs/core/location/trip_location_tracker.dart';
import 'package:yaazh_cabs/core/widgets/app_error_view.dart';
import 'package:yaazh_cabs/core/widgets/app_loading_view.dart';
import 'package:yaazh_cabs/core/widgets/status_chip.dart';
import 'package:yaazh_cabs/core/widgets/trip_timeline.dart';
import 'package:yaazh_cabs/features/trips/presentation/pages/end_trip_page.dart';
import 'package:yaazh_cabs/features/trips/presentation/viewmodels/active_trip_viewmodel.dart';

class ActiveTripPage extends ConsumerStatefulWidget {
  final String bookingId;

  const ActiveTripPage({
    super.key,
    required this.bookingId,
  });

  @override
  ConsumerState<ActiveTripPage> createState() => _ActiveTripPageState();
}

class _ActiveTripPageState extends ConsumerState<ActiveTripPage> {
  Timer? _pulseTimer;
  bool _isTracking = false;

  @override
  void initState() {
    super.initState();
    Future.microtask(() async {
      await ref
          .read(activeTripNotifierProvider.notifier)
          .loadTripDetails(widget.bookingId);
      final tracker = ref.read(tripLocationTrackerProvider);
      await tracker.start(widget.bookingId);
      if (mounted) {
        setState(() => _isTracking = tracker.isTracking);
        _pulseTimer = Timer.periodic(const Duration(seconds: 5), (_) {
          if (mounted) {
            setState(() => _isTracking = tracker.isTracking);
          }
        });
      }
    });
  }

  @override
  void dispose() {
    _pulseTimer?.cancel();
    // Stop tracking when leaving the active trip screen after completion;
    // keep running if navigating to end-trip dialog briefly — stop in EndTrip success.
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final tripState = ref.watch(activeTripNotifierProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Active Trip'),
        actions: [
          IconButton(
            icon: const Icon(Icons.support_agent_rounded),
            onPressed: () => context.push('/support'),
          ),
        ],
      ),
      body: tripState.when(
        loading: () => const AppLoadingView(message: 'Loading active trip...'),
        error: (error, st) => AppErrorView(
          message: error.toString(),
          onRetry: () => ref
              .read(activeTripNotifierProvider.notifier)
              .loadTripDetails(widget.bookingId),
        ),
        data: (trip) {
          if (trip == null) {
            return const AppErrorView(message: 'Trip data unavailable.');
          }

          return SafeArea(
            child: Column(
              children: [
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  color: AppConstants.navy,
                  child: Row(
                    children: [
                      Container(
                        width: 10,
                        height: 10,
                        decoration: BoxDecoration(
                          color: _isTracking
                              ? AppConstants.gold
                              : AppConstants.lightGrey,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          _isTracking
                              ? 'GPS tracking active — location syncing'
                              : 'Waiting for GPS permission / signal',
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: AppConstants.white,
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            height: 1.3,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(AppConstants.paddingM),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Card(
                          child: Padding(
                            padding:
                                const EdgeInsets.all(AppConstants.paddingM),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        trip.bookingCode,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: const TextStyle(
                                          fontSize: 18,
                                          fontWeight: FontWeight.w800,
                                          color: AppConstants.navy,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        trip.customerName,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: const TextStyle(
                                          fontSize: 14,
                                          color:
                                              AppConstants.textSecondaryLight,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                StatusChip.forStatus(trip.status),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(height: 16),
                        Card(
                          child: Padding(
                            padding:
                                const EdgeInsets.all(AppConstants.paddingM),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'TRIP PROGRESS',
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.bold,
                                    color: AppConstants.textSecondaryLight,
                                    letterSpacing: 0.5,
                                  ),
                                ),
                                const SizedBox(height: 16),
                                TripTimeline(
                                  pickupAddress: trip.pickupAddress,
                                  dropAddress: trip.dropAddress,
                                ),
                                if (trip.startOdometerKm != null) ...[
                                  const Divider(height: 24),
                                  Row(
                                    mainAxisAlignment:
                                        MainAxisAlignment.spaceBetween,
                                    children: [
                                      const Text(
                                        'Start Odometer',
                                        style: TextStyle(fontSize: 13),
                                      ),
                                      Text(
                                        '${trip.startOdometerKm} km',
                                        style: const TextStyle(
                                          fontSize: 14,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.all(AppConstants.paddingM),
                  child: ElevatedButton.icon(
                    icon: const Icon(Icons.flag_rounded),
                    label: const Text('END RIDE'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppConstants.navy,
                      foregroundColor: AppConstants.white,
                    ),
                    onPressed: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (context) => EndTripPage(booking: trip),
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
