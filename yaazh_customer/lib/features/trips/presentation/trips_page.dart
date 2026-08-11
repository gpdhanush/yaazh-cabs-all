import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:yaazh_customer/app/constants.dart';
import 'package:yaazh_customer/core/widgets/app_error_view.dart';
import 'package:yaazh_customer/core/widgets/app_loading_view.dart';
import 'package:yaazh_customer/core/widgets/app_state_pages.dart';
import 'package:yaazh_customer/core/widgets/status_chip.dart';
import 'package:yaazh_customer/features/booking/domain/booking.dart';
import 'package:yaazh_customer/features/trips/presentation/trips_viewmodel.dart';

class TripsPage extends ConsumerWidget {
  const TripsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final trips = ref.watch(tripListProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('My trips')),
      body: trips.when(
        loading: () => const AppLoadingView(message: 'Loading trips…'),
        error: (e, _) => AppErrorView(
          message: e.toString(),
          onRetry: () => ref.read(tripListProvider.notifier).refresh(),
        ),
        data: (rows) {
          if (rows.isEmpty) {
            return AppEmptyView(
              icon: Icons.receipt_long_outlined,
              title: 'No trips yet',
              message: 'Book your first cab from Udumalpet and it will show up here.',
              actionLabel: 'Book a ride',
              onAction: () => context.go('/book'),
            );
          }
          return RefreshIndicator(
            color: AppConstants.accentColor,
            onRefresh: () => ref.read(tripListProvider.notifier).refresh(),
            child: ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
              itemCount: rows.length,
              separatorBuilder: (_, _) => const SizedBox(height: 10),
              itemBuilder: (context, i) => _TripTile(booking: rows[i]),
            ),
          );
        },
      ),
    );
  }
}

class _TripTile extends StatelessWidget {
  final Booking booking;
  const _TripTile({required this.booking});

  @override
  Widget build(BuildContext context) {
    final when = booking.pickupAt != null
        ? DateFormat('d MMM yyyy · h:mm a').format(booking.pickupAt!.toLocal())
        : booking.bookingReference;

    return InkWell(
      onTap: () => context.push('/trips/${booking.id}'),
      borderRadius: BorderRadius.circular(16),
      child: Ink(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Theme.of(context).cardColor,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppConstants.borderLight),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  booking.bookingReference,
                  style: const TextStyle(fontWeight: FontWeight.w800),
                ),
                const Spacer(),
                StatusChip.forStatus(booking.status),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              '${booking.pickupLocation} → ${booking.dropLocation}',
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 6),
            Text(
              '$when · ₹${booking.estimatedTotal.toStringAsFixed(0)}',
              style: const TextStyle(color: AppConstants.textSecondaryLight, fontSize: 13),
            ),
          ],
        ),
      ),
    );
  }
}
