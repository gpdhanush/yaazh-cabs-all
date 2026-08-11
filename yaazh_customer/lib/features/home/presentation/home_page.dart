import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:yaazh_customer/app/constants.dart';
import 'package:yaazh_customer/core/widgets/app_error_view.dart';
import 'package:yaazh_customer/core/widgets/ya_network_image.dart';
import 'package:yaazh_customer/features/auth/presentation/auth_viewmodel.dart';
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
    void openBook() {
      if (upcoming != null) {
        context.push('/trips/${upcoming.id}');
      } else {
        context.go('/book');
      }
    }

    return Scaffold(
      backgroundColor: AppConstants.bgLight,
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
            SliverToBoxAdapter(
              child: _HeroHeader(firstName: firstName, onSearch: openBook),
            ),
            SliverToBoxAdapter(
              child: _QuickActions(
                onBook: openBook,
                onTrips: () => context.go('/trips'),
                onPlaces: () => context.push('/saved-places'),
                onSupport: () => context.push('/support'),
              ),
            ),
            const SliverToBoxAdapter(
              child: _SectionHeader(title: 'Popular routes'),
            ),
            SliverToBoxAdapter(
              child: routes.when(
                data: (rows) => _RouteStrip(routes: rows, onOpen: openBook),
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
            const SliverToBoxAdapter(
              child: _SectionHeader(title: 'Our fleet'),
            ),
            SliverToBoxAdapter(
              child: fleet.when(
                data: (rows) => _FleetStrip(categories: rows, onOpen: openBook),
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
            const SliverToBoxAdapter(child: SizedBox(height: 36)),
          ],
        ),
      ),
    );
  }
}

class _HeroHeader extends StatelessWidget {
  final String firstName;
  final VoidCallback onSearch;

  const _HeroHeader({required this.firstName, required this.onSearch});

  @override
  Widget build(BuildContext context) {
    final today = DateFormat('EEEE, d MMM').format(DateTime.now());
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF0B1220), Color(0xFF1E293B)],
        ),
      ),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 18, 12, 0),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        today.toUpperCase(),
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.5),
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.8,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'Hi, $firstName',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 26,
                          fontWeight: FontWeight.w800,
                          letterSpacing: -0.4,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Book a cab from Udumalpet',
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.68),
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
          ),
          const SizedBox(height: 22),
          Transform.translate(
            offset: const Offset(0, 22),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Material(
                color: Colors.white,
                elevation: 10,
                shadowColor: Colors.black.withValues(alpha: 0.14),
                borderRadius: BorderRadius.circular(20),
                child: InkWell(
                  onTap: onSearch,
                  borderRadius: BorderRadius.circular(20),
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 16, 14, 16),
                    child: Row(
                      children: [
                        Column(
                          children: [
                            Container(
                              width: 10,
                              height: 10,
                              decoration: const BoxDecoration(
                                color: Color(0xFF16A34A),
                                shape: BoxShape.circle,
                              ),
                            ),
                            Container(
                              width: 2,
                              height: 22,
                              margin: const EdgeInsets.symmetric(vertical: 3),
                              color: const Color(0xFFE2E8F0),
                            ),
                            const Icon(Icons.location_on_rounded, size: 14, color: AppConstants.errorColor),
                          ],
                        ),
                        const SizedBox(width: 12),
                        const Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Pickup',
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                  color: AppConstants.textSecondaryLight,
                                ),
                              ),
                              Text(
                                'Current location',
                                style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
                              ),
                              SizedBox(height: 10),
                              Text(
                                'Drop',
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                  color: AppConstants.textSecondaryLight,
                                ),
                              ),
                              Text(
                                'Where are you going?',
                                style: TextStyle(
                                  fontWeight: FontWeight.w600,
                                  fontSize: 15,
                                  color: AppConstants.textSecondaryLight,
                                ),
                              ),
                            ],
                          ),
                        ),
                        Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(
                            color: AppConstants.accentColor,
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: const Icon(Icons.search_rounded, color: Colors.black),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _QuickActions extends StatelessWidget {
  final VoidCallback onBook;
  final VoidCallback onTrips;
  final VoidCallback onPlaces;
  final VoidCallback onSupport;

  const _QuickActions({
    required this.onBook,
    required this.onTrips,
    required this.onPlaces,
    required this.onSupport,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 40, 16, 0),
      child: Row(
        children: [
          _Action(icon: Icons.local_taxi_rounded, label: 'Book', onTap: onBook),
          _Action(icon: Icons.receipt_long_rounded, label: 'Trips', onTap: onTrips),
          _Action(icon: Icons.bookmark_rounded, label: 'Places', onTap: onPlaces),
          _Action(icon: Icons.headset_mic_rounded, label: 'Help', onTap: onSupport),
        ],
      ),
    );
  }
}

class _Action extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _Action({required this.icon, required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 4),
        child: Material(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          child: InkWell(
            onTap: onTap,
            borderRadius: BorderRadius.circular(16),
            child: Ink(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppConstants.borderLight),
              ),
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 14),
                child: Column(
                  children: [
                    Container(
                      width: 38,
                      height: 38,
                      decoration: BoxDecoration(
                        color: AppConstants.accentColor.withValues(alpha: 0.16),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(icon, size: 20, color: AppConstants.accentHover),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      label,
                      style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;

  const _SectionHeader({required this.title});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 26, 20, 12),
      child: Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
    );
  }
}

class _RouteStrip extends StatelessWidget {
  final List<PopularRoute> routes;
  final VoidCallback onOpen;

  const _RouteStrip({required this.routes, required this.onOpen});

  @override
  Widget build(BuildContext context) {
    if (routes.isEmpty) {
      return const Padding(
        padding: EdgeInsets.symmetric(horizontal: 20),
        child: Text('No popular routes yet.', style: TextStyle(color: AppConstants.textSecondaryLight)),
      );
    }
    return SizedBox(
      height: 188,
      child: ListView.separated(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        scrollDirection: Axis.horizontal,
        itemCount: routes.length,
        separatorBuilder: (_, _) => const SizedBox(width: 12),
        itemBuilder: (context, i) {
          final route = routes[i];
          return Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: onOpen,
              borderRadius: BorderRadius.circular(20),
              child: Ink(
                width: 236,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: AppConstants.borderLight),
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(19),
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      YaNetworkImage(
                        url: route.imageUrl,
                        height: 188,
                        width: 236,
                        fallbackIcon: Icons.route_rounded,
                      ),
                      const DecoratedBox(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: [Colors.transparent, Color(0xCC0F172A)],
                          ),
                        ),
                      ),
                      Padding(
                        padding: const EdgeInsets.fromLTRB(14, 12, 14, 14),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (route.startingFare != null)
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: AppConstants.accentColor,
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  'From ₹${route.startingFare!.toStringAsFixed(0)}',
                                  style: const TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w800,
                                    color: Colors.black,
                                  ),
                                ),
                              ),
                            const Spacer(),
                            Text(
                              route.title,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w800,
                                fontSize: 16,
                                height: 1.2,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              '${route.distanceKm.toStringAsFixed(0)} km'
                              '${route.durationMinutes != null ? ' · ${route.durationMinutes} min' : ''}',
                              style: TextStyle(
                                color: Colors.white.withValues(alpha: 0.78),
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
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
  final VoidCallback onOpen;

  const _FleetStrip({required this.categories, required this.onOpen});

  @override
  Widget build(BuildContext context) {
    if (categories.isEmpty) {
      return const Padding(
        padding: EdgeInsets.symmetric(horizontal: 20),
        child: Text('Fleet will appear here.', style: TextStyle(color: AppConstants.textSecondaryLight)),
      );
    }
    return SizedBox(
      height: 198,
      child: ListView.separated(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        scrollDirection: Axis.horizontal,
        itemCount: categories.length,
        separatorBuilder: (_, _) => const SizedBox(width: 12),
        itemBuilder: (context, i) {
          final cat = categories[i];
          return Material(
            color: Colors.white,
            borderRadius: BorderRadius.circular(18),
            child: InkWell(
              onTap: onOpen,
              borderRadius: BorderRadius.circular(18),
              child: Ink(
                width: 164,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: AppConstants.borderLight),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    YaNetworkImage(
                      url: cat.imageUrl,
                      height: 108,
                      width: 164,
                      fallbackIcon: Icons.directions_car_filled_rounded,
                      borderRadius: const BorderRadius.vertical(top: Radius.circular(17)),
                    ),
                    Padding(
                      padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            cat.name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontWeight: FontWeight.w800),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '${cat.seatingCapacity} seats',
                            style: const TextStyle(fontSize: 12, color: AppConstants.textSecondaryLight),
                          ),
                          Text(
                            '₹${cat.oneWayRatePerKm.toStringAsFixed(0)}/km',
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w800,
                              color: AppConstants.accentHover,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
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
      padding: const EdgeInsets.fromLTRB(16, 26, 16, 0),
      child: Material(
        color: const Color(0xFF0F172A),
        borderRadius: BorderRadius.circular(20),
        child: InkWell(
          onTap: () => launchUrl(Uri.parse('tel:$phone')),
          borderRadius: BorderRadius.circular(20),
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Row(
              children: [
                Container(
                  width: 46,
                  height: 46,
                  decoration: BoxDecoration(
                    color: AppConstants.accentColor.withValues(alpha: 0.16),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: const Icon(Icons.headset_mic_rounded, color: AppConstants.accentColor),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Need help booking?',
                        style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        hours ?? 'Call our Udumalpet desk',
                        style: TextStyle(color: Colors.white.withValues(alpha: 0.68), fontSize: 12),
                      ),
                    ],
                  ),
                ),
                Text(
                  phone!,
                  style: const TextStyle(color: AppConstants.accentColor, fontWeight: FontWeight.w800),
                ),
              ],
            ),
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
