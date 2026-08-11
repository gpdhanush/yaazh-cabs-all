import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:yaazh_cabs/app/constants.dart';
import 'package:yaazh_cabs/core/widgets/app_error_view.dart';
import 'package:yaazh_cabs/core/widgets/app_loading_view.dart';
import 'package:yaazh_cabs/core/widgets/app_state_pages.dart';
import 'package:yaazh_cabs/core/widgets/app_surface.dart';
import 'package:yaazh_cabs/features/auth/presentation/auth_viewmodel.dart';
import 'package:yaazh_cabs/features/profile/data/driver_profile_repository.dart';

class RatingsPage extends ConsumerWidget {
  const RatingsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authNotifierProvider).user;
    final ratings = ref.watch(driverRatingsProvider);
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: AppConstants.bgLight,
      appBar: AppBar(title: const Text('Ratings')),
      body: ratings.when(
        loading: () => const AppLoadingView(message: 'Loading ratings…'),
        error: (e, _) => AppErrorView(
          message: e.toString(),
          onRetry: () => ref.invalidate(driverRatingsProvider),
        ),
        data: (rows) {
          final received = rows.where((r) => r.customerRating != null).toList();
          if (received.isEmpty) {
            return const AppEmptyView(
              icon: Icons.star_border_rounded,
              title: 'No ratings yet',
              message: 'Passenger ratings appear here after completed trips.',
            );
          }
          return RefreshIndicator(
            color: AppConstants.gold,
            onRefresh: () async => ref.invalidate(driverRatingsProvider),
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
              children: [
                AppSurfaceCard(
                  child: Row(
                    children: [
                      const Icon(Icons.star_rounded, color: AppConstants.gold, size: 36),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '${user?.ratingAvg.toStringAsFixed(1) ?? '0.0'} average',
                              style: theme.textTheme.titleLarge,
                            ),
                            Text(
                              '${received.length} passenger review${received.length == 1 ? '' : 's'}',
                              style: theme.textTheme.bodySmall,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                for (final row in received) ...[
                  AppSurfaceCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                row.customerName ?? 'Passenger',
                                style: theme.textTheme.titleMedium,
                              ),
                            ),
                            Text(
                              '${row.customerRating} ★',
                              style: theme.textTheme.titleMedium?.copyWith(
                                color: AppConstants.gold,
                              ),
                            ),
                          ],
                        ),
                        if ((row.customerReview ?? '').trim().isNotEmpty) ...[
                          const SizedBox(height: 6),
                          Text(row.customerReview!, style: theme.textTheme.bodyMedium),
                        ],
                        const SizedBox(height: 6),
                        Text(
                          [
                            if (row.bookingReference != null) row.bookingReference,
                            if (row.createdAt != null)
                              DateFormat('dd MMM yyyy').format(row.createdAt!.toLocal()),
                          ].join(' · '),
                          style: theme.textTheme.bodySmall,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 10),
                ],
              ],
            ),
          );
        },
      ),
    );
  }
}
