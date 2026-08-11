import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:yaazh_cabs/app/constants.dart';
import 'package:yaazh_cabs/core/widgets/app_error_view.dart';
import 'package:yaazh_cabs/core/widgets/app_loading_view.dart';
import 'package:yaazh_cabs/core/widgets/app_state_pages.dart';
import 'package:yaazh_cabs/core/widgets/app_surface.dart';
import 'package:yaazh_cabs/core/widgets/status_chip.dart';
import 'package:yaazh_cabs/core/config/remote_config.dart';
import 'package:yaazh_cabs/features/offers/presentation/offer_list_viewmodel.dart';
import 'package:yaazh_cabs/features/trips/presentation/viewmodels/trip_list_viewmodel.dart';

class OffersPage extends ConsumerWidget {
  const OffersPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final offersState = ref.watch(offerListNotifierProvider);
    final remote = ref.watch(remoteConfigProvider).valueOrNull;
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: AppConstants.bgLight,
      appBar: AppBar(
        title: const Text('Trip offers'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: () =>
                ref.read(offerListNotifierProvider.notifier).refresh(),
          ),
        ],
      ),
      body: SafeArea(
        top: false,
        child: offersState.when(
        loading: () => const AppLoadingView(message: 'Loading offers...'),
        error: (e, _) => AppErrorView(
          message: e.toString(),
          onRetry: () =>
              ref.read(offerListNotifierProvider.notifier).refresh(),
        ),
        data: (offers) {
          if (offers.isEmpty) {
            return AppEmptyView(
              icon: Icons.inbox_outlined,
              title: 'No pending offers',
              message: remote?.driverAutoOfferEnabled == false
                  ? 'Auto-offers are off. Dispatch will assign trips to you directly.'
                  : 'When fleet admin sends you a trip offer, it will appear here for accept or reject.',
            );
          }

          return RefreshIndicator(
            color: AppConstants.gold,
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

                return AppSurfaceCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              booking?.bookingCode ?? 'Offer #${offer.id}',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: theme.textTheme.titleMedium,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Flexible(child: StatusChip.forStatus(offer.status)),
                        ],
                      ),
                      if (booking != null) ...[
                        const SizedBox(height: 10),
                        Text(
                          '${booking.pickupAddress} → ${booking.dropAddress}',
                          maxLines: 3,
                          overflow: TextOverflow.ellipsis,
                          style: theme.textTheme.bodyMedium,
                        ),
                        if (booking.pickupAt != null) ...[
                          const SizedBox(height: 6),
                          Text(
                            'Pickup: ${DateFormat('dd MMM, hh:mm a').format(booking.pickupAt!)}',
                            style: theme.textTheme.bodySmall,
                          ),
                        ],
                      ],
                      if (offer.offeredFare != null) ...[
                        const SizedBox(height: 8),
                        Text(
                          'Offered fare: ₹${offer.offeredFare!.toStringAsFixed(0)}',
                          style: theme.textTheme.titleSmall?.copyWith(
                            color: AppConstants.navy,
                          ),
                        ),
                      ],
                      if (expires != null) ...[
                        const SizedBox(height: 4),
                        Text('Expires: $expires', style: theme.textTheme.bodySmall),
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
                                    final bookingId = offer.bookingId.isNotEmpty
                                        ? offer.bookingId
                                        : offer.booking?.id;
                                    if (bookingId != null &&
                                        bookingId.isNotEmpty) {
                                      context.push('/trips/$bookingId');
                                    }
                                  } else {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(
                                        content: Text('Could not accept offer'),
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
                );
              },
            ),
          );
        },
        ),
      ),
    );
  }
}
