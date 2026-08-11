import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:yaazh_cabs/app/constants.dart';
import 'package:yaazh_cabs/core/widgets/app_error_view.dart';
import 'package:yaazh_cabs/core/widgets/app_loading_view.dart';
import 'package:yaazh_cabs/core/widgets/status_chip.dart';
import 'package:yaazh_cabs/features/offers/presentation/offer_list_viewmodel.dart';
import 'package:yaazh_cabs/features/trips/presentation/viewmodels/trip_list_viewmodel.dart';

class OffersPage extends ConsumerWidget {
  const OffersPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final offersState = ref.watch(offerListNotifierProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Trip Offers'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () =>
                ref.read(offerListNotifierProvider.notifier).refresh(),
          ),
        ],
      ),
      body: offersState.when(
        loading: () => const AppLoadingView(message: 'Loading offers...'),
        error: (e, _) => AppErrorView(
          message: e.toString(),
          onRetry: () =>
              ref.read(offerListNotifierProvider.notifier).refresh(),
        ),
        data: (offers) {
          if (offers.isEmpty) {
            return const Center(
              child: Padding(
                padding: EdgeInsets.all(32),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.inbox_outlined, size: 56, color: Colors.grey),
                    SizedBox(height: 12),
                    Text(
                      'No pending offers',
                      style:
                          TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    SizedBox(height: 8),
                    Text(
                      'When fleet admin sends you a trip offer, it will appear here for accept or reject.',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Colors.grey),
                    ),
                  ],
                ),
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () =>
                ref.read(offerListNotifierProvider.notifier).refresh(),
            child: ListView.separated(
              padding: const EdgeInsets.all(AppConstants.paddingM),
              itemCount: offers.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                final offer = offers[index];
                final booking = offer.booking;
                final expires = offer.expiresAt != null
                    ? DateFormat('dd MMM, hh:mm a').format(offer.expiresAt!)
                    : null;

                return Card(
                  child: Padding(
                    padding: const EdgeInsets.all(AppConstants.paddingM),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              booking?.bookingCode ?? 'Offer #${offer.id}',
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            StatusChip.forStatus(offer.status),
                          ],
                        ),
                        if (booking != null) ...[
                          const SizedBox(height: 8),
                          Text(
                            '${booking.pickupAddress} → ${booking.dropAddress}',
                            style: const TextStyle(fontSize: 13),
                          ),
                          if (booking.pickupAt != null) ...[
                            const SizedBox(height: 4),
                            Text(
                              'Pickup: ${DateFormat('dd MMM, hh:mm a').format(booking.pickupAt!)}',
                              style: const TextStyle(
                                fontSize: 12,
                                color: Colors.grey,
                              ),
                            ),
                          ],
                        ],
                        if (offer.offeredFare != null) ...[
                          const SizedBox(height: 8),
                          Text(
                            'Offered fare: ₹${offer.offeredFare!.toStringAsFixed(0)}',
                            style: const TextStyle(fontWeight: FontWeight.w600),
                          ),
                        ],
                        if (expires != null) ...[
                          const SizedBox(height: 4),
                          Text(
                            'Expires: $expires',
                            style: const TextStyle(
                              fontSize: 12,
                              color: Colors.grey,
                            ),
                          ),
                        ],
                        if (offer.isActionable) ...[
                          const SizedBox(height: 16),
                          Row(
                            children: [
                              Expanded(
                                child: OutlinedButton(
                                  onPressed: () async {
                                    final ok = await ref
                                        .read(offerListNotifierProvider.notifier)
                                        .reject(offer.id);
                                    if (context.mounted) {
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        SnackBar(
                                          content: Text(
                                            ok
                                                ? 'Offer rejected'
                                                : 'Could not reject offer',
                                          ),
                                        ),
                                      );
                                    }
                                  },
                                  child: const Text('REJECT'),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: ElevatedButton(
                                  onPressed: () async {
                                    final ok = await ref
                                        .read(offerListNotifierProvider.notifier)
                                        .accept(offer.id);
                                    if (!context.mounted) return;
                                    if (ok) {
                                      ref
                                          .read(tripListNotifierProvider.notifier)
                                          .refresh();
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        const SnackBar(
                                          content: Text('Offer accepted'),
                                        ),
                                      );
                                      final bookingId =
                                          offer.bookingId.isNotEmpty
                                              ? offer.bookingId
                                              : offer.booking?.id;
                                      if (bookingId != null &&
                                          bookingId.isNotEmpty) {
                                        context.push('/trips/$bookingId');
                                      }
                                    } else {
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        const SnackBar(
                                          content:
                                              Text('Could not accept offer'),
                                        ),
                                      );
                                    }
                                  },
                                  child: const Text('ACCEPT'),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ],
                    ),
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }
}
