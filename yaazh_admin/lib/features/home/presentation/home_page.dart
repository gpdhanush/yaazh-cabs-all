import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:line_awesome_flutter/line_awesome_flutter.dart';
import 'package:yaazh_admin/app/constants.dart';
import 'package:yaazh_admin/core/widgets/admin_avatar.dart';
import 'package:yaazh_admin/core/widgets/driver_avatar.dart';
import 'package:yaazh_admin/core/widgets/keyboard_dismiss.dart';
import 'package:yaazh_admin/core/widgets/status_chip.dart';
import 'package:yaazh_admin/core/widgets/ya_loader.dart';
import 'package:yaazh_admin/features/auth/presentation/auth_viewmodel.dart';
import 'package:yaazh_admin/features/bookings/data/booking_repository.dart';
import 'package:yaazh_admin/features/bookings/domain/booking.dart';
import 'package:yaazh_admin/features/home/data/dashboard_repository.dart';
import 'package:yaazh_admin/features/home/domain/dashboard_stats.dart';
import 'package:yaazh_admin/features/shell/admin_shell.dart';

class HomePage extends ConsumerStatefulWidget {
  const HomePage({super.key});

  @override
  ConsumerState<HomePage> createState() => _HomePageState();
}

class _HomePageState extends ConsumerState<HomePage> {
  Timer? _liveTimer;
  List<LiveTrip> _liveTrips = [];

  String _greeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  @override
  void initState() {
    super.initState();
    Future.microtask(() => _loadLiveTrips());
    _liveTimer = Timer.periodic(const Duration(seconds: 10), (_) {
      _loadLiveTrips(silent: true);
    });
  }

  @override
  void dispose() {
    _liveTimer?.cancel();
    super.dispose();
  }

  Future<void> _loadLiveTrips({bool silent = false}) async {
    try {
      final trips = await ref
          .read(bookingRepositoryProvider)
          .liveTracking(silent: silent);
      if (!mounted) return;
      setState(() => _liveTrips = trips);
    } catch (_) {
      // Keep the last known list on a silent poll failure.
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authNotifierProvider).user;
    final stats = ref.watch(dashboardStatsProvider);
    final theme = Theme.of(context);
    final isTablet = Breakpoints.isTablet(context);
    final pad = isTablet ? 28.0 : 16.0;
    final today = DateFormat('EEEE, d MMM').format(DateTime.now());

    return KeyboardDismiss(
      child: Scaffold(
        appBar: AppBar(
          leading: const YaDrawerButton(),
          automaticallyImplyLeading: false,
          actions: [
            IconButton(
              tooltip: 'Notifications',
              onPressed: () => context.push('/notifications'),
              icon: const Icon(LineAwesomeIcons.bell),
            ),
            Padding(
              padding: const EdgeInsets.only(right: 12),
              child: GestureDetector(
                onTap: () => context.push('/profile'),
                child: AdminAvatar(user: user, radius: 16),
              ),
            ),
          ],
        ),
        body: RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(dashboardStatsProvider);
            await Future.wait([
              ref.read(dashboardStatsProvider.future),
              _loadLiveTrips(silent: true),
            ]);
          },
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: EdgeInsets.fromLTRB(pad, 16, pad, 28),
            children: [
              Text(_greeting(), style: theme.textTheme.headlineSmall),
              const SizedBox(height: 4),
              Text(
                today,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.textTheme.bodySmall?.color,
                ),
              ),
              if (_liveTrips.isNotEmpty) ...[
                const SizedBox(height: 20),
                _OngoingRidesSection(trips: _liveTrips),
              ],
              const SizedBox(height: 20),
              stats.when(
                loading: () => const Padding(
                  padding: EdgeInsets.symmetric(vertical: 48),
                  child: Center(child: YaLoader()),
                ),
                error: (err, _) => _ErrorBanner(
                  message: err.toString(),
                  onRetry: () => ref.invalidate(dashboardStatsProvider),
                ),
                data: (data) => _DashboardBody(data: data, isTablet: isTablet),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _OngoingRidesSection extends StatelessWidget {
  final List<LiveTrip> trips;

  const _OngoingRidesSection({required this.trips});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Container(
              width: 8,
              height: 8,
              decoration: const BoxDecoration(
                color: AppColors.success,
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                '${trips.length} on ride${trips.length == 1 ? '' : 's'}',
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            TextButton(
              onPressed: () => context.push('/tracking'),
              child: const Text('Live map'),
            ),
          ],
        ),
        const SizedBox(height: 8),
        for (var i = 0; i < trips.length; i++) ...[
          if (i > 0) const SizedBox(height: 10),
          _OngoingRideCard(trip: trips[i]),
        ],
      ],
    );
  }
}

class _OngoingRideCard extends StatelessWidget {
  final LiveTrip trip;

  const _OngoingRideCard({required this.trip});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final driverName = trip.driver?.name.trim();
    final vehicle = [
      trip.vehicle?.name,
      trip.vehicle?.registration,
    ].where((v) => v != null && v.trim().isNotEmpty).join(' · ');
    final eta = trip.etaMin != null && trip.etaMin! > 0
        ? '${trip.etaMin} min'
        : null;
    final progress = (trip.progress.clamp(0, 100)) / 100;

    return Material(
      color: theme.colorScheme.surface,
      clipBehavior: Clip.antiAlias,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: theme.dividerColor),
      ),
      child: InkWell(
        onTap: () => context.push('/bookings/${trip.id}'),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  DriverAvatar(driver: trip.driver, radius: 18),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          trip.bookingReference.isNotEmpty
                              ? trip.bookingReference
                              : 'Booking',
                          style: theme.textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        Text(
                          trip.customerName.isNotEmpty
                              ? trip.customerName
                              : 'Customer',
                          style: theme.textTheme.bodySmall,
                        ),
                      ],
                    ),
                  ),
                  StatusChip(status: trip.status),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                trip.pickupLocation,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.bodyMedium,
              ),
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 2),
                child: Icon(
                  LineAwesomeIcons.arrow_down_solid,
                  size: 14,
                  color: theme.textTheme.bodySmall?.color,
                ),
              ),
              Text(
                trip.dropLocation,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.bodyMedium,
              ),
              if (driverName != null && driverName.isNotEmpty) ...[
                const SizedBox(height: 8),
                Text(
                  [
                    driverName,
                    if (vehicle.isNotEmpty) vehicle,
                    if (eta != null) 'ETA $eta',
                  ].join(' · '),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.bodySmall,
                ),
              ],
              const SizedBox(height: 10),
              ClipRRect(
                borderRadius: BorderRadius.circular(99),
                child: LinearProgressIndicator(
                  value: progress,
                  minHeight: 6,
                  backgroundColor: AppColors.success.withValues(alpha: 0.14),
                  color: AppColors.success,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DashboardBody extends StatelessWidget {
  final DashboardStats data;
  final bool isTablet;

  const _DashboardBody({required this.data, required this.isTablet});

  @override
  Widget build(BuildContext context) {
    final metrics = <_Metric>[
      _Metric(
        label: 'Today',
        hint: 'Trips booked today',
        value: '${data.bookingsToday}',
        icon: LineAwesomeIcons.calendar,
        color: AppColors.primary,
        onTap: () => context.go('/bookings'),
      ),
      _Metric(
        label: 'Pending',
        hint: 'Need action',
        value: '${data.pendingBookings}',
        icon: LineAwesomeIcons.clock,
        color: AppColors.warning,
        onTap: () => context.go('/bookings'),
      ),
      _Metric(
        label: 'Bookings',
        hint: 'All time',
        value: '${data.totalBookings}',
        icon: LineAwesomeIcons.taxi_solid,
        color: AppColors.supportBlue,
        onTap: () => context.go('/bookings'),
      ),
      _Metric(
        label: 'Drivers',
        hint: 'Active now',
        value: '${data.activeDrivers}',
        icon: LineAwesomeIcons.id_card,
        color: AppColors.success,
        onTap: () => context.push('/drivers'),
      ),
      _Metric(
        label: 'Customers',
        hint: 'Registered',
        value: '${data.customers}',
        icon: LineAwesomeIcons.users_solid,
        color: AppColors.supportPurple,
        onTap: () => context.push('/customers'),
      ),
      _Metric(
        label: 'Enquiries',
        hint: 'Website form',
        value: '${data.enquiries}',
        icon: LineAwesomeIcons.envelope,
        color: AppColors.salmon,
        onTap: () => context.go('/enquiries'),
      ),
    ];

    return GridView.count(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisCount: isTablet ? 3 : 2,
      mainAxisSpacing: 12,
      crossAxisSpacing: 12,
      childAspectRatio: isTablet ? 1.7 : 1.35,
      children: [
        for (final metric in metrics) _StatCard(metric: metric),
      ],
    );
  }
}

class _Metric {
  final String label;
  final String hint;
  final String value;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  const _Metric({
    required this.label,
    required this.hint,
    required this.value,
    required this.icon,
    required this.color,
    required this.onTap,
  });
}

class _StatCard extends StatelessWidget {
  final _Metric metric;

  const _StatCard({required this.metric});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Material(
      color: theme.colorScheme.surface,
      clipBehavior: Clip.antiAlias,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: theme.dividerColor),
      ),
      child: InkWell(
        onTap: metric.onTap,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: metric.color.withValues(alpha: 0.14),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(metric.icon, size: 20, color: metric.color),
              ),
              const Spacer(),
              Text(
                metric.value,
                style: theme.textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 2),
              Text(metric.label, style: theme.textTheme.titleSmall),
              Text(metric.hint, style: theme.textTheme.bodySmall),
            ],
          ),
        ),
      ),
    );
  }
}

class _ErrorBanner extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;

  const _ErrorBanner({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.salmon.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(message, style: const TextStyle(fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          TextButton(onPressed: onRetry, child: const Text('Try again')),
        ],
      ),
    );
  }
}
