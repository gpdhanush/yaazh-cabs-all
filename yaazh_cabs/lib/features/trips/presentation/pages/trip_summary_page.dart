import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:yaazh_cabs/app/constants.dart';
import 'package:yaazh_cabs/core/widgets/app_error_view.dart';
import 'package:yaazh_cabs/core/widgets/app_loading_view.dart';
import 'package:yaazh_cabs/core/widgets/status_chip.dart';
import 'package:yaazh_cabs/core/widgets/trip_timeline.dart';
import 'package:yaazh_cabs/features/profile/data/driver_profile_repository.dart';
import '../viewmodels/active_trip_viewmodel.dart';

class TripSummaryPage extends ConsumerStatefulWidget {
  final String bookingId;

  const TripSummaryPage({super.key, required this.bookingId});

  @override
  ConsumerState<TripSummaryPage> createState() => _TripSummaryPageState();
}

class _TripSummaryPageState extends ConsumerState<TripSummaryPage> {
  int _rating = 5;
  final _review = TextEditingController();
  bool _submittingRating = false;
  bool _rated = false;

  @override
  void dispose() {
    _review.dispose();
    super.dispose();
  }

  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      ref
          .read(activeTripNotifierProvider.notifier)
          .loadTripDetails(widget.bookingId);
    });
  }

  @override
  Widget build(BuildContext context) {
    final tripState = ref.watch(activeTripNotifierProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Trip Summary'),
        automaticallyImplyLeading: false,
      ),
      body: tripState.when(
        loading: () => const AppLoadingView(message: 'Loading summary...'),
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

          return SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(AppConstants.paddingM),
              child: Column(
                children: [
                  Expanded(
                    child: SingleChildScrollView(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          const SizedBox(height: 16),
                          const Center(
                            child: Icon(
                              Icons.check_circle_rounded,
                              color: AppConstants.successColor,
                              size: 64,
                            ),
                          ),
                          const SizedBox(height: 12),
                          Text(
                            'Trip completed',
                            textAlign: TextAlign.center,
                            style: Theme.of(context).textTheme.headlineSmall,
                          ),
                          const SizedBox(height: 4),
                          Text(
                            trip.bookingCode,
                            textAlign: TextAlign.center,
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                          const SizedBox(height: 24),

                          // Summary Card
                          Card(
                            child: Padding(
                              padding: const EdgeInsets.all(
                                AppConstants.paddingM,
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment:
                                        MainAxisAlignment.spaceBetween,
                                    children: [
                                      Expanded(
                                        child: Text(
                                          'FARE SUMMARY',
                                          style: Theme.of(context)
                                              .textTheme
                                              .labelMedium,
                                        ),
                                      ),
                                      Flexible(
                                        child: StatusChip.forStatus(
                                          trip.paymentStatus,
                                        ),
                                      ),
                                    ],
                                  ),
                                  const Divider(height: 20),
                                  _RowItem(
                                    'Total Estimated Fare',
                                    '₹${trip.estimatedTotal.toStringAsFixed(2)}',
                                  ),
                                  _RowItem(
                                    'Amount Collected',
                                    '₹${trip.amountPaid.toStringAsFixed(2)}',
                                  ),
                                  _RowItem(
                                    'Balance Remaining',
                                    '₹${trip.balanceDue.toStringAsFixed(2)}',
                                  ),
                                  if (trip.startOdometerKm != null)
                                    _RowItem(
                                      'Start Odometer',
                                      '${trip.startOdometerKm} km',
                                    ),
                                  if (trip.endOdometerKm != null)
                                    _RowItem(
                                      'End Odometer',
                                      '${trip.endOdometerKm} km',
                                    ),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(height: 16),
                          if (trip.isCompleted)
                            _PassengerRateCard(
                              customerName: trip.customerName,
                              alreadyRated: _rated || trip.driverRating != null,
                              rating: _rating,
                              submitting: _submittingRating,
                              reviewController: _review,
                              onChanged: (v) => setState(() => _rating = v),
                              onSubmit: () => _submitRating(),
                            ),
                          const SizedBox(height: 16),

                          // Route Summary Card
                          Card(
                            child: Padding(
                              padding: const EdgeInsets.all(
                                AppConstants.paddingM,
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'ROUTE',
                                    style:
                                        Theme.of(context).textTheme.labelMedium,
                                  ),
                                  const SizedBox(height: 16),
                                  TripTimeline(
                                    pickupAddress: trip.pickupAddress,
                                    dropAddress: trip.dropAddress,
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  ElevatedButton(
                    onPressed: () => context.go('/home'),
                    child: const Text('BACK TO DASHBOARD'),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Future<void> _submitRating() async {
    FocusManager.instance.primaryFocus?.unfocus();
    setState(() => _submittingRating = true);
    try {
      await ref.read(driverProfileRepositoryProvider).ratePassenger(
            bookingId: widget.bookingId,
            rating: _rating,
            review: _review.text.trim(),
          );
      if (!mounted) return;
      setState(() => _rated = true);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Thanks for rating the passenger')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Could not submit rating: $e')),
      );
    } finally {
      if (mounted) setState(() => _submittingRating = false);
    }
  }
}

class _PassengerRateCard extends StatelessWidget {
  final String customerName;
  final bool alreadyRated;
  final int rating;
  final bool submitting;
  final TextEditingController reviewController;
  final ValueChanged<int> onChanged;
  final VoidCallback onSubmit;

  const _PassengerRateCard({
    required this.customerName,
    required this.alreadyRated,
    required this.rating,
    required this.submitting,
    required this.reviewController,
    required this.onChanged,
    required this.onSubmit,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(AppConstants.paddingM),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('RATE PASSENGER', style: Theme.of(context).textTheme.labelMedium),
            const SizedBox(height: 8),
            Text(customerName, style: Theme.of(context).textTheme.titleMedium),
            if (alreadyRated) ...[
              const SizedBox(height: 8),
              const Text('You already rated this trip.'),
            ] else ...[
              const SizedBox(height: 10),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  for (var i = 1; i <= 5; i++)
                    IconButton(
                      onPressed: () => onChanged(i),
                      icon: Icon(
                        i <= rating ? Icons.star_rounded : Icons.star_border_rounded,
                        color: AppConstants.gold,
                      ),
                    ),
                ],
              ),
              TextField(
                controller: reviewController,
                maxLines: 2,
                decoration: const InputDecoration(
                  hintText: 'Optional note about the passenger',
                  counterText: '',
                ),
              ),
              const SizedBox(height: 12),
              ElevatedButton(
                onPressed: submitting ? null : onSubmit,
                child: submitting
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black),
                      )
                    : const Text('SUBMIT RATING'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _RowItem extends StatelessWidget {
  final String label;
  final String value;

  const _RowItem(this.label, this.value);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ),
          const SizedBox(width: 8),
          Text(
            value,
            style: Theme.of(context).textTheme.titleSmall,
          ),
        ],
      ),
    );
  }
}
