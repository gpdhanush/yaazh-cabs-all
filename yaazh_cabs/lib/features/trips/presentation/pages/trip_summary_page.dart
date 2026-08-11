import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:yaazh_cabs/app/constants.dart';
import 'package:yaazh_cabs/core/widgets/app_error_view.dart';
import 'package:yaazh_cabs/core/widgets/app_loading_view.dart';
import 'package:yaazh_cabs/core/widgets/status_chip.dart';
import 'package:yaazh_cabs/core/widgets/trip_timeline.dart';
import '../viewmodels/active_trip_viewmodel.dart';

class TripSummaryPage extends ConsumerStatefulWidget {
  final String bookingId;

  const TripSummaryPage({super.key, required this.bookingId});

  @override
  ConsumerState<TripSummaryPage> createState() => _TripSummaryPageState();
}

class _TripSummaryPageState extends ConsumerState<TripSummaryPage> {
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
                          const Text(
                            'Trip Completed Successfully!',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            trip.bookingCode,
                            textAlign: TextAlign.center,
                            style: const TextStyle(color: Colors.grey),
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
                                      const Text(
                                        'FARE & PAYMENT SUMMARY',
                                        style: TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.bold,
                                          color:
                                              AppConstants.textSecondaryLight,
                                        ),
                                      ),
                                      StatusChip.forStatus(trip.paymentStatus),
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

                          // Route Summary Card
                          Card(
                            child: Padding(
                              padding: const EdgeInsets.all(
                                AppConstants.paddingM,
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    'ROUTE SUMMARY',
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.bold,
                                      color: AppConstants.textSecondaryLight,
                                    ),
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
          Text(label, style: const TextStyle(fontSize: 13)),
          Text(
            value,
            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }
}
