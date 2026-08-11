import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../app/constants.dart';
import '../../../core/widgets/app_error_view.dart';
import '../../../core/widgets/app_loading_view.dart';
import '../../../core/widgets/app_state_pages.dart';
import '../../../core/widgets/app_surface.dart';
import '../../../core/widgets/status_chip.dart';
import '../../../core/widgets/trip_timeline.dart';
import '../../trips/presentation/viewmodels/trip_list_viewmodel.dart';
import '../../trips/domain/booking.dart';

class HistoryPage extends ConsumerStatefulWidget {
  const HistoryPage({super.key});

  @override
  ConsumerState<HistoryPage> createState() => _HistoryPageState();
}

class _HistoryPageState extends ConsumerState<HistoryPage> {
  String _selectedFilter = 'all';

  @override
  Widget build(BuildContext context) {
    final tripsState = ref.watch(tripListNotifierProvider);

    return Scaffold(
      backgroundColor: AppConstants.bgLight,
      appBar: AppBar(
        title: const Text('Trip history'),
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
        child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
            child: Row(
              children: [
                _FilterChip(
                  label: 'All',
                  selected: _selectedFilter == 'all',
                  onTap: () => setState(() => _selectedFilter = 'all'),
                ),
                const SizedBox(width: 8),
                _FilterChip(
                  label: 'Completed',
                  selected: _selectedFilter == 'completed',
                  onTap: () => setState(() => _selectedFilter = 'completed'),
                ),
                const SizedBox(width: 8),
                _FilterChip(
                  label: 'Cancelled',
                  selected: _selectedFilter == 'cancelled',
                  onTap: () => setState(() => _selectedFilter = 'cancelled'),
                ),
              ],
            ),
          ),
          Expanded(
            child: tripsState.when(
              loading: () =>
                  const AppLoadingView(message: 'Loading history...'),
              error: (error, st) => AppErrorView(
                message: error.toString(),
                onRetry: () =>
                    ref.read(tripListNotifierProvider.notifier).fetchTrips(),
              ),
              data: (trips) {
                var pastTrips =
                    trips.where((t) => t.isCompleted || t.isCancelled).toList();

                if (_selectedFilter == 'completed') {
                  pastTrips = pastTrips.where((t) => t.isCompleted).toList();
                } else if (_selectedFilter == 'cancelled') {
                  pastTrips = pastTrips.where((t) => t.isCancelled).toList();
                }

                if (pastTrips.isEmpty) {
                  return const AppEmptyView(
                    icon: Icons.history_rounded,
                    title: 'No past trips',
                    message:
                        'Your completed or cancelled trips will appear here.',
                  );
                }

                return ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                  itemCount: pastTrips.length,
                  separatorBuilder: (context, index) =>
                      const SizedBox(height: 12),
                  itemBuilder: (context, index) {
                    return _HistoryTripCard(trip: pastTrips[index]);
                  },
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

class _FilterChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _FilterChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: FilterChip(
        label: SizedBox(
          width: double.infinity,
          child: Text(
            label,
            textAlign: TextAlign.center,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ),
        selected: selected,
        showCheckmark: false,
        onSelected: (_) => onTap(),
        selectedColor: AppConstants.gold,
        backgroundColor: AppConstants.white,
        side: BorderSide(
          color: selected ? AppConstants.gold : AppConstants.lightGrey,
        ),
        labelStyle: TextStyle(
          color: AppConstants.navy,
          fontWeight: selected ? FontWeight.w800 : FontWeight.w600,
          fontSize: 12,
        ),
      ),
    );
  }
}

class _HistoryTripCard extends StatelessWidget {
  final Booking trip;

  const _HistoryTripCard({required this.trip});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final formattedDate = trip.pickupAt != null
        ? DateFormat('dd MMM yyyy, hh:mm a').format(trip.pickupAt!)
        : 'Past trip';

    return AppSurfaceCard(
      onTap: () => context.push('/summary/${trip.id}'),
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
          const SizedBox(height: 4),
          Text(formattedDate, style: theme.textTheme.bodySmall),
          const Divider(height: 20),
          TripTimeline(
            pickupAddress: trip.pickupAddress,
            dropAddress: trip.dropAddress,
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: Text(
                  '₹${trip.estimatedTotal.toStringAsFixed(0)}',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.titleMedium,
                ),
              ),
              Text(
                'Summary',
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
