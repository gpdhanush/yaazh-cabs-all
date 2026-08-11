import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import 'package:yaazh_cabs/app/constants.dart';
import 'package:yaazh_cabs/core/location/trip_location_tracker.dart';
import 'package:yaazh_cabs/core/widgets/app_error_view.dart';
import 'package:yaazh_cabs/core/widgets/app_loading_view.dart';
import 'package:yaazh_cabs/core/widgets/status_chip.dart';
import 'package:yaazh_cabs/core/widgets/trip_timeline.dart';
import 'package:yaazh_cabs/features/trips/domain/booking.dart';
import '../viewmodels/active_trip_viewmodel.dart';
import 'start_trip_dialog.dart';

class TripDetailsPage extends ConsumerStatefulWidget {
  final String bookingId;

  const TripDetailsPage({
    super.key,
    required this.bookingId,
  });

  @override
  ConsumerState<TripDetailsPage> createState() => _TripDetailsPageState();
}

class _TripDetailsPageState extends ConsumerState<TripDetailsPage> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() async {
      await ref
          .read(activeTripNotifierProvider.notifier)
          .loadTripDetails(widget.bookingId);
      _syncLocationTracking();
    });
  }

  void _syncLocationTracking() {
    final trip = ref.read(activeTripNotifierProvider).valueOrNull;
    if (trip == null) return;
    if (trip.status == 'on_the_way' ||
        trip.status == 'arrived' ||
        trip.status == 'trip_started') {
      ref.read(tripLocationTrackerProvider).start(trip.id);
    }
  }

  @override
  Widget build(BuildContext context) {
    final tripState = ref.watch(activeTripNotifierProvider);

    return Scaffold(
      backgroundColor: AppConstants.bgLight,
      appBar: AppBar(
        title: const Text('Trip details'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: () async {
              await ref
                  .read(activeTripNotifierProvider.notifier)
                  .loadTripDetails(widget.bookingId);
              _syncLocationTracking();
            },
          ),
        ],
      ),
      body: SafeArea(
        top: false,
        child: tripState.when(
        loading: () => const AppLoadingView(message: 'Loading trip…'),
        error: (error, st) => AppErrorView(
          message: error.toString(),
          onRetry: () => ref
              .read(activeTripNotifierProvider.notifier)
              .loadTripDetails(widget.bookingId),
        ),
        data: (trip) {
          if (trip == null) {
            return const AppErrorView(message: 'Trip details not found.');
          }

          final formattedDate = trip.pickupAt != null
              ? DateFormat('dd MMM yyyy, hh:mm a').format(trip.pickupAt!)
              : 'As scheduled';

          return SingleChildScrollView(
            padding: const EdgeInsets.all(AppConstants.paddingM),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _TripHeaderCard(trip: trip, formattedDate: formattedDate),
                const SizedBox(height: 14),
                _PassengerCard(trip: trip),
                const SizedBox(height: 14),
                _SectionCard(
                  title: 'ROUTE',
                  child: TripTimeline(
                    pickupAddress: trip.pickupAddress,
                    dropAddress: trip.dropAddress,
                  ),
                ),
                const SizedBox(height: 14),
                _FareCard(trip: trip),
                const SizedBox(height: 24),
                _buildActionButtons(context, trip),
              ],
            ),
          );
        },
        ),
      ),
    );
  }

  Widget _buildActionButtons(BuildContext context, Booking trip) {
    final notifier = ref.read(activeTripNotifierProvider.notifier);

    switch (trip.status) {
      case 'driver_assigned':
      case 'pending':
        return ElevatedButton.icon(
          icon: const Icon(Icons.navigation_rounded),
          label: const Text('START TO PICKUP'),
          onPressed: () async {
            final ok = await notifier.markOnTheWay(trip.id);
            if (ok) {
              await ref.read(tripLocationTrackerProvider).start(trip.id);
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('On the way — location syncing to dispatch'),
                  ),
                );
              }
            }
          },
        );

      case 'on_the_way':
        return ElevatedButton.icon(
          icon: const Icon(Icons.location_on_rounded),
          label: const Text('MARK ARRIVED'),
          style: ElevatedButton.styleFrom(
            backgroundColor: AppConstants.navy,
            foregroundColor: AppConstants.white,
          ),
          onPressed: () async {
            final ok = await notifier.markArrived(trip.id);
            if (ok) {
              await ref.read(tripLocationTrackerProvider).start(trip.id);
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Arrived at pickup')),
                );
              }
            }
          },
        );

      case 'arrived':
        return ElevatedButton.icon(
          icon: const Icon(Icons.play_arrow_rounded),
          label: const Text('START RIDE'),
          style: ElevatedButton.styleFrom(
            backgroundColor: AppConstants.gold,
            foregroundColor: AppConstants.black,
          ),
          onPressed: () {
            showDialog(
              context: context,
              builder: (ctx) => StartTripDialog(bookingId: trip.id),
            );
          },
        );

      case 'trip_started':
        return ElevatedButton.icon(
          icon: const Icon(Icons.navigation_rounded),
          label: const Text('OPEN ACTIVE TRIP'),
          style: ElevatedButton.styleFrom(
            backgroundColor: AppConstants.navy,
            foregroundColor: AppConstants.white,
          ),
          onPressed: () {
            ref.read(tripLocationTrackerProvider).start(trip.id);
            context.push('/active-trip/${trip.id}');
          },
        );

      case 'completed':
        if (trip.needsPayment) {
          return ElevatedButton.icon(
            icon: const Icon(Icons.payments_rounded),
            label: Text(
              'COLLECT ₹${trip.balanceDue.toStringAsFixed(0)}',
            ),
            onPressed: () => context.push('/payment/${trip.id}'),
          );
        }
        return OutlinedButton.icon(
          icon: const Icon(Icons.receipt_long_rounded),
          label: const Text('VIEW TRIP SUMMARY'),
          onPressed: () => context.push('/summary/${trip.id}'),
        );

      default:
        return const SizedBox.shrink();
    }
  }
}

class _TripHeaderCard extends StatelessWidget {
  final Booking trip;
  final String formattedDate;

  const _TripHeaderCard({required this.trip, required this.formattedDate});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppConstants.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppConstants.lightGrey),
      ),
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
                  style: theme.textTheme.titleLarge?.copyWith(
                    color: AppConstants.navy,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Flexible(child: StatusChip.forStatus(trip.status)),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            'Scheduled · $formattedDate',
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: theme.textTheme.bodySmall?.copyWith(
              color: AppConstants.textSecondaryLight,
            ),
          ),
        ],
      ),
    );
  }
}

class _PassengerCard extends StatelessWidget {
  final Booking trip;

  const _PassengerCard({required this.trip});

  @override
  Widget build(BuildContext context) {
    return _SectionCard(
      title: 'PASSENGER',
      child: Row(
        children: [
          CircleAvatar(
            backgroundColor: AppConstants.accentColor.withValues(alpha: 0.2),
            child: const Icon(Icons.person, color: Colors.black),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  trip.customerName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        color: AppConstants.navy,
                      ),
                ),
                if (trip.customerPhone.isNotEmpty)
                  Text(
                    trip.customerPhone,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: AppConstants.textSecondaryLight,
                        ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _FareCard extends StatelessWidget {
  final Booking trip;

  const _FareCard({required this.trip});

  @override
  Widget build(BuildContext context) {
    return _SectionCard(
      title: 'FARE',
      trailing: StatusChip.forStatus(trip.paymentStatus),
      child: Column(
        children: [
          _kv('Estimated total', '₹${trip.estimatedTotal.toStringAsFixed(2)}'),
          if (trip.startOdometerKm != null)
            _kv('Start odometer', '${trip.startOdometerKm} km'),
          if (trip.endOdometerKm != null)
            _kv('End odometer', '${trip.endOdometerKm} km'),
        ],
      ),
    );
  }

  Widget _kv(String k, String v) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Text(
              k,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(color: AppConstants.textSecondaryLight),
            ),
          ),
          const SizedBox(width: 8),
          Text(
            v,
            style: const TextStyle(
              fontWeight: FontWeight.w700,
              color: AppConstants.navy,
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  final String title;
  final Widget child;
  final Widget? trailing;

  const _SectionCard({
    required this.title,
    required this.child,
    this.trailing,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppConstants.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppConstants.lightGrey),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  title,
                  style: Theme.of(context).textTheme.labelMedium?.copyWith(
                        color: AppConstants.textSecondaryLight,
                      ),
                ),
              ),
              if (trailing != null) trailing!,
            ],
          ),
          const SizedBox(height: 12),
          child,
        ],
      ),
    );
  }
}
