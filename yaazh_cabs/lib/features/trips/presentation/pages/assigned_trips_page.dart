import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:yaazh_cabs/app/constants.dart';
import 'package:yaazh_cabs/core/network/connectivity_provider.dart';
import 'package:yaazh_cabs/core/widgets/app_error_view.dart';
import 'package:yaazh_cabs/core/widgets/app_loading_view.dart';
import 'package:yaazh_cabs/core/widgets/app_state_pages.dart';
import 'package:yaazh_cabs/core/widgets/app_surface.dart';
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
      body: SafeArea(
        top: false,
        child: tripsState.when(
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
              color: AppConstants.gold,
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
            color: AppConstants.gold,
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
      ),
    );
  }
}

class _AssignedTripCard extends StatelessWidget {
  final Booking trip;

  const _AssignedTripCard({required this.trip});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final formattedDate = trip.pickupAt != null
        ? DateFormat('dd MMM yyyy, hh:mm a').format(trip.pickupAt!)
        : 'As scheduled';

    return AppSurfaceCard(
      onTap: () => context.push('/trips/${trip.id}'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  trip.bookingCode,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.titleMedium,
                ),
              ),
              const SizedBox(width: 8),
              Flexible(child: StatusChip.forStatus(trip.status)),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              const Icon(
                Icons.schedule_rounded,
                size: 14,
                color: AppConstants.gold,
              ),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  formattedDate,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.bodySmall,
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
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.titleSmall,
                ),
              ),
              Text(
                'Open',
                style: theme.textTheme.titleSmall?.copyWith(
                  color: AppConstants.navy,
                ),
              ),
              const Icon(
                Icons.chevron_right_rounded,
                size: 18,
                color: AppConstants.navy,
              ),
            ],
          ),
        ],
      ),
    );
  }
}
