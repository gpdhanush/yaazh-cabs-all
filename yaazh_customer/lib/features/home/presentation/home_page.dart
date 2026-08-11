import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:yaazh_customer/app/constants.dart';
import 'package:yaazh_customer/core/widgets/app_error_view.dart';
import 'package:yaazh_customer/core/widgets/status_chip.dart';
import 'package:yaazh_customer/features/auth/presentation/auth_viewmodel.dart';
import 'package:yaazh_customer/features/booking/domain/booking.dart';
import 'package:yaazh_customer/features/home/data/catalog_repository.dart';
import 'package:yaazh_customer/features/home/domain/catalog.dart';
import 'package:yaazh_customer/features/trips/presentation/trips_viewmodel.dart';

class HomePage extends ConsumerWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authNotifierProvider).user;
    final upcoming = ref.watch(upcomingTripProvider);
    final routes = ref.watch(popularRoutesProvider);
    final fleet = ref.watch(vehicleCategoriesProvider);
    final config = ref.watch(appConfigProvider);
    final firstName = (user?.name ?? 'there').split(' ').first;

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: RefreshIndicator(
        color: AppConstants.accentColor,
        onRefresh: () async {
          ref.invalidate(popularRoutesProvider);
          ref.invalidate(vehicleCategoriesProvider);
          ref.invalidate(appConfigProvider);
          await ref.read(tripListProvider.notifier).refresh();
        },
        child: CustomScrollView(
          slivers: [
            SliverToBoxAdapter(child: _HeroHeader(firstName: firstName)),
            if (upcoming != null)
              SliverToBoxAdapter(child: _UpcomingCard(booking: upcoming)),
            SliverToBoxAdapter(
              child: _SectionHeader(
                title: 'Popular routes',
                onSeeAll: () => context.go('/book'),
              ),
            ),
            SliverToBoxAdapter(
              child: routes.when(
                data: (rows) => _RouteStrip(routes: rows),
                loading: () => const _HScrollSkeleton(),
                error: (e, _) => Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: AppErrorView(
                    message: e.toString(),
                    onRetry: () => ref.invalidate(popularRoutesProvider),
                  ),
                ),
              ),
            ),
            SliverToBoxAdapter(
              child: _SectionHeader(
                title: 'Our fleet',
                onSeeAll: () => context.go('/book'),
              ),
            ),
            SliverToBoxAdapter(
              child: fleet.when(
                data: (rows) => _FleetStrip(categories: rows),
                loading: () => const _HScrollSkeleton(),
                error: (e, _) => Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Text(e.toString()),
                ),
              ),
            ),
            SliverToBoxAdapter(
              child: config.maybeWhen(
                data: (data) => _SupportCard(
                  phone: data.supportPhone,
                  hours: data.businessHours,
                ),
                orElse: () => const SizedBox(height: 24),
              ),
            ),
            const SliverToBoxAdapter(child: SizedBox(height: 32)),
          ],
        ),
      ),
    );
  }
}

class _HeroHeader extends StatelessWidget {
  final String firstName;

  const _HeroHeader({required this.firstName});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
        ),
        borderRadius: BorderRadius.vertical(bottom: Radius.circular(28)),
      ),
      child: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Hi, $firstName',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 26,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Where are you heading today?',
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.7),
                          fontSize: 14,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  onPressed: () => context.push('/notifications'),
                  icon: const Icon(Icons.notifications_none_rounded, color: Colors.white),
                ),
              ],
            ),
            const SizedBox(height: 20),
            Material(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              child: InkWell(
                onTap: () => context.go('/book'),
                borderRadius: BorderRadius.circular(16),
                child: const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                  child: Row(
                    children: [
                      Icon(Icons.search_rounded, color: AppConstants.textSecondaryLight),
                      SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          'Search pickup & drop',
                          style: TextStyle(
                            color: AppConstants.textSecondaryLight,
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                      Icon(Icons.arrow_forward_rounded, color: AppConstants.accentHover),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _UpcomingCard extends StatelessWidget {
  final Booking booking;

  const _UpcomingCard({required this.booking});

  @override
  Widget build(BuildContext context) {
    final when = booking.pickupAt != null
        ? DateFormat('EEE, d MMM · h:mm a').format(booking.pickupAt!.toLocal())
        : 'Scheduled';

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 0),
      child: InkWell(
        onTap: () => context.push('/trips/${booking.id}'),
        borderRadius: BorderRadius.circular(18),
        child: Ink(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Theme.of(context).cardColor,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: AppConstants.accentColor.withValues(alpha: 0.4)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Text(
                    'Upcoming trip',
                    style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
                  ),
                  const Spacer(),
                  StatusChip.forStatus(booking.status),
                ],
              ),
              const SizedBox(height: 10),
              Text(when, style: const TextStyle(color: AppConstants.textSecondaryLight)),
              const SizedBox(height: 8),
              Text(
                '${booking.pickupLocation} → ${booking.dropLocation}',
                style: const TextStyle(fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 12),
              Text(
                '₹${booking.estimatedTotal.toStringAsFixed(0)} · ${booking.bookingReference}',
                style: const TextStyle(fontWeight: FontWeight.w700),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  final VoidCallback? onSeeAll;

  const _SectionHeader({required this.title, this.onSeeAll});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 24, 12, 10),
      child: Row(
        children: [
          Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
          const Spacer(),
          if (onSeeAll != null)
            TextButton(onPressed: onSeeAll, child: const Text('See all')),
        ],
      ),
    );
  }
}

class _RouteStrip extends StatelessWidget {
  final List<PopularRoute> routes;

  const _RouteStrip({required this.routes});

  @override
  Widget build(BuildContext context) {
    if (routes.isEmpty) {
      return const Padding(
        padding: EdgeInsets.symmetric(horizontal: 20),
        child: Text('No popular routes yet.', style: TextStyle(color: AppConstants.textSecondaryLight)),
      );
    }
    return SizedBox(
      height: 148,
      child: ListView.separated(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        scrollDirection: Axis.horizontal,
        itemCount: routes.length,
        separatorBuilder: (_, _) => const SizedBox(width: 12),
        itemBuilder: (context, i) {
          final route = routes[i];
          return InkWell(
            onTap: () => context.go('/book'),
            borderRadius: BorderRadius.circular(16),
            child: Ink(
              width: 220,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Theme.of(context).cardColor,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppConstants.borderLight),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    route.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
                  ),
                  const Spacer(),
                  Text(
                    '${route.distanceKm.toStringAsFixed(0)} km'
                    '${route.durationMinutes != null ? ' · ${route.durationMinutes} min' : ''}',
                    style: const TextStyle(color: AppConstants.textSecondaryLight, fontSize: 13),
                  ),
                  if (route.startingFare != null)
                    Text(
                      'From ₹${route.startingFare!.toStringAsFixed(0)}',
                      style: const TextStyle(fontWeight: FontWeight.w700, color: AppConstants.accentHover),
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

class _FleetStrip extends StatelessWidget {
  final List<VehicleCategory> categories;

  const _FleetStrip({required this.categories});

  @override
  Widget build(BuildContext context) {
    if (categories.isEmpty) {
      return const Padding(
        padding: EdgeInsets.symmetric(horizontal: 20),
        child: Text('Fleet will appear here.', style: TextStyle(color: AppConstants.textSecondaryLight)),
      );
    }
    return SizedBox(
      height: 168,
      child: ListView.separated(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        scrollDirection: Axis.horizontal,
        itemCount: categories.length,
        separatorBuilder: (_, _) => const SizedBox(width: 12),
        itemBuilder: (context, i) {
          final cat = categories[i];
          return InkWell(
            onTap: () => context.go('/book'),
            borderRadius: BorderRadius.circular(16),
            child: Ink(
              width: 160,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Theme.of(context).cardColor,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppConstants.borderLight),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (cat.imageUrl != null && cat.imageUrl!.isNotEmpty)
                    ClipRRect(
                      borderRadius: BorderRadius.circular(10),
                      child: CachedNetworkImage(
                        imageUrl: cat.imageUrl!,
                        height: 64,
                        width: double.infinity,
                        fit: BoxFit.cover,
                        errorWidget: (_, _, _) => const Icon(Icons.directions_car_rounded),
                      ),
                    )
                  else
                    const Icon(Icons.directions_car_filled_rounded, size: 36, color: AppConstants.accentHover),
                  const Spacer(),
                  Text(cat.name, style: const TextStyle(fontWeight: FontWeight.w800)),
                  Text(
                    '${cat.seatingCapacity} seats · ₹${cat.oneWayRatePerKm.toStringAsFixed(0)}/km',
                    style: const TextStyle(fontSize: 12, color: AppConstants.textSecondaryLight),
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

class _SupportCard extends StatelessWidget {
  final String? phone;
  final String? hours;

  const _SupportCard({this.phone, this.hours});

  @override
  Widget build(BuildContext context) {
    if (phone == null || phone!.isEmpty) return const SizedBox(height: 16);
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 24, 16, 0),
      child: InkWell(
        onTap: () => launchUrl(Uri.parse('tel:$phone')),
        borderRadius: BorderRadius.circular(16),
        child: Ink(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: const Color(0xFF0F172A),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Row(
            children: [
              const Icon(Icons.headset_mic_rounded, color: AppConstants.accentColor),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Need help booking?',
                      style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800),
                    ),
                    Text(
                      hours ?? 'Call our Udumalpet desk',
                      style: TextStyle(color: Colors.white.withValues(alpha: 0.7), fontSize: 12),
                    ),
                  ],
                ),
              ),
              Text(phone!, style: const TextStyle(color: AppConstants.accentColor, fontWeight: FontWeight.w800)),
            ],
          ),
        ),
      ),
    );
  }
}

class _HScrollSkeleton extends StatelessWidget {
  const _HScrollSkeleton();

  @override
  Widget build(BuildContext context) {
    return const SizedBox(
      height: 120,
      child: Center(
        child: CircularProgressIndicator(color: AppConstants.accentColor, strokeWidth: 2.5),
      ),
    );
  }
}
