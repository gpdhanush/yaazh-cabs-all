import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:yaazh_cabs/app/constants.dart';
import 'package:yaazh_cabs/core/network/connectivity_provider.dart';
import 'package:yaazh_cabs/core/widgets/app_error_view.dart';
import 'package:yaazh_cabs/core/widgets/app_loading_view.dart';
import 'package:yaazh_cabs/core/widgets/app_state_pages.dart';
import 'package:yaazh_cabs/core/widgets/status_chip.dart';
import 'package:yaazh_cabs/core/widgets/trip_timeline.dart';
import 'package:yaazh_cabs/features/trips/domain/booking.dart';
import 'package:yaazh_cabs/features/trips/presentation/viewmodels/trip_list_viewmodel.dart';

class AssignedTripsPage extends ConsumerWidget {
  const AssignedTripsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tripsState = ref.watch(tripListNotifierProvider);
    final online = ref.watch(isOnlineProvider);

    if (!online) {
      return Scaffold(
        appBar: AppBar(title: const Text('Trips')),
        body: OfflinePage(
          embedded: true,
          onRetry: () =>
              ref.read(tripListNotifierProvider.notifier).refresh(),
        ),
      );
    }

    return Scaffold(
      backgroundColor: AppConstants.bgLight,
      appBar: AppBar(
        title: const Text('Assigned trips'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: () =>
                ref.read(tripListNotifierProvider.notifier).refresh(),
          ),
        ],
      ),
      body: tripsState.when(
        loading: () =>
            const AppLoadingView(message: 'Loading assignments…'),
        error: (error, st) => AppErrorView(
          message: error.toString(),
          onRetry: () =>
              ref.read(tripListNotifierProvider.notifier).fetchTrips(),
        ),
        data: (trips) {
          final activeTrips =
              trips.where((t) => !t.isCompleted && !t.isCancelled).toList();

          if (activeTrips.isEmpty) {
            return RefreshIndicator(
              onRefresh: () =>
                  ref.read(tripListNotifierProvider.notifier).refresh(),
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                children: const [
                  SizedBox(
                    height: 480,
                    child: AppEmptyView(
                      icon: Icons.assignment_turned_in_outlined,
                      title: 'No assigned trips',
                      message:
                          'When dispatch assigns bookings, they will show up here.',
                    ),
                  ),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () =>
                ref.read(tripListNotifierProvider.notifier).refresh(),
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: activeTrips.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                return _AssignedTripCard(trip: activeTrips[index]);
              },
            ),
          );
        },
      ),
    );
  }
}

class _AssignedTripCard extends StatelessWidget {
  final Booking trip;

  const _AssignedTripCard({required this.trip});

  @override
  Widget build(BuildContext context) {
    final formattedDate = trip.pickupAt != null
        ? DateFormat('dd MMM yyyy, hh:mm a').format(trip.pickupAt!)
        : 'As scheduled';

    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(18),
      child: InkWell(
        onTap: () => context.push('/trips/${trip.id}'),
        borderRadius: BorderRadius.circular(18),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: const Color(0xFFE2E8F0)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      trip.bookingCode,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                  StatusChip.forStatus(trip.status),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  const Icon(
                    Icons.schedule_rounded,
                    size: 14,
                    color: AppConstants.accentHover,
                  ),
                  const SizedBox(width: 6),
                  Text(
                    formattedDate,
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppConstants.textSecondaryLight,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              TripTimeline(
                pickupAddress: trip.pickupAddress,
                dropAddress: trip.dropAddress,
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  Expanded(
                    child: Text(
                      trip.customerName,
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  const Text(
                    'Open',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w800,
                      color: AppConstants.accentHover,
                    ),
                  ),
                  const Icon(
                    Icons.chevron_right_rounded,
                    size: 18,
                    color: AppConstants.accentHover,
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
