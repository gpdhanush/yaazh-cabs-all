import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../app/constants.dart';
import '../../../core/widgets/app_error_view.dart';
import '../../../core/widgets/app_loading_view.dart';
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
  String _selectedFilter = 'all'; // all, completed, cancelled

  @override
  Widget build(BuildContext context) {
    final tripsState = ref.watch(tripListNotifierProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Trip History'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () =>
                ref.read(tripListNotifierProvider.notifier).refresh(),
          ),
        ],
      ),
      body: Column(
        children: [
          // Filter Row
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            color: Theme.of(context).cardTheme.color,
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
          const Divider(height: 1),

          Expanded(
            child: tripsState.when(
              loading: () => const AppLoadingView(message: 'Loading history...'),
              error: (error, st) => AppErrorView(
                message: error.toString(),
                onRetry: () =>
                    ref.read(tripListNotifierProvider.notifier).fetchTrips(),
              ),
              data: (trips) {
                var pastTrips = trips.where((t) => t.isCompleted || t.isCancelled).toList();

                if (_selectedFilter == 'completed') {
                  pastTrips = pastTrips.where((t) => t.isCompleted).toList();
                } else if (_selectedFilter == 'cancelled') {
                  pastTrips = pastTrips.where((t) => t.isCancelled).toList();
                }

                if (pastTrips.isEmpty) {
                  return ListView(
                    padding: const EdgeInsets.all(32),
                    children: [
                      const SizedBox(height: 60),
                      Icon(
                        Icons.history_rounded,
                        size: 64,
                        color: Colors.grey.shade400,
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        'No Past Trips',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'Your completed or cancelled trips will appear here.',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: Colors.grey),
                      ),
                    ],
                  );
                }

                return ListView.separated(
                  padding: const EdgeInsets.all(AppConstants.paddingM),
                  itemCount: pastTrips.length,
                  separatorBuilder: (context, index) => const SizedBox(height: 16),
                  itemBuilder: (context, index) {
                    final trip = pastTrips[index];
                    return _HistoryTripCard(trip: trip);
                  },
                );
              },
            ),
          ),
        ],
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
    return FilterChip(
      label: Text(label),
      selected: selected,
      onSelected: (_) => onTap(),
      selectedColor: AppConstants.accentColor,
      checkmarkColor: Colors.black,
      labelStyle: TextStyle(
        color: selected ? Colors.black : Theme.of(context).colorScheme.onSurface,
        fontWeight: selected ? FontWeight.bold : FontWeight.normal,
      ),
    );
  }
}

class _HistoryTripCard extends StatelessWidget {
  final Booking trip;

  const _HistoryTripCard({required this.trip});

  @override
  Widget build(BuildContext context) {
    final formattedDate = trip.pickupAt != null
        ? DateFormat('dd MMM yyyy, hh:mm a').format(trip.pickupAt!)
        : 'Past trip';

    return Card(
      child: InkWell(
        onTap: () => context.push('/summary/${trip.id}'),
        borderRadius: BorderRadius.circular(AppConstants.borderRadiusM),
        child: Padding(
          padding: const EdgeInsets.all(AppConstants.paddingM),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    trip.bookingCode,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  StatusChip.forStatus(trip.status),
                ],
              ),
              const SizedBox(height: 4),
              Text(
                formattedDate,
                style: const TextStyle(fontSize: 12, color: Colors.grey),
              ),
              const Divider(height: 20),
              TripTimeline(
                pickupAddress: trip.pickupAddress,
                dropAddress: trip.dropAddress,
              ),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Total Fare: ₹${trip.estimatedTotal.toStringAsFixed(2)}',
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const Text(
                    'View Summary →',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: AppConstants.accentHover,
                    ),
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
