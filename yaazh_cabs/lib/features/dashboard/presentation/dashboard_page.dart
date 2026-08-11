import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:yaazh_cabs/app/constants.dart';
import 'package:yaazh_cabs/app/theme.dart';
import 'package:yaazh_cabs/core/firebase/analytics_service.dart';
import 'package:yaazh_cabs/core/network/connectivity_provider.dart';
import 'package:yaazh_cabs/core/widgets/app_state_pages.dart';
import 'package:yaazh_cabs/core/widgets/app_surface.dart';
import 'package:yaazh_cabs/core/widgets/metric_tile.dart';
import 'package:yaazh_cabs/core/widgets/status_chip.dart';
import 'package:yaazh_cabs/core/widgets/trip_timeline.dart';
import 'package:yaazh_cabs/features/auth/presentation/auth_viewmodel.dart';
import 'package:yaazh_cabs/features/offers/presentation/offer_list_viewmodel.dart';
import 'package:yaazh_cabs/features/trips/data/trip_repository.dart';
import 'package:yaazh_cabs/features/trips/domain/booking.dart';
import 'package:yaazh_cabs/features/trips/presentation/viewmodels/trip_list_viewmodel.dart';
import 'package:yaazh_cabs/features/wallet/data/wallet_repository.dart';

class DashboardPage extends ConsumerStatefulWidget {
  const DashboardPage({super.key});

  @override
  ConsumerState<DashboardPage> createState() => _DashboardPageState();
}

class _DashboardPageState extends ConsumerState<DashboardPage> {
  double _walletBalance = 0.0;
  bool _isTogglingStatus = false;

  @override
  void initState() {
    super.initState();
    Future.microtask(_loadDashboardData);
  }

  Future<void> _loadDashboardData() async {
    ref.read(tripListNotifierProvider.notifier).refresh();
    ref.read(offerListNotifierProvider.notifier).refresh();
    ref.read(authNotifierProvider.notifier).refreshProfile();
    try {
      final balanceData =
          await ref.read(walletRepositoryProvider).getWalletBalance();
      if (mounted) setState(() => _walletBalance = balanceData);
    } catch (_) {}
  }

  Future<void> _setOnline(bool online) async {
    if (_isTogglingStatus) return;
    setState(() => _isTogglingStatus = true);
    final newStatus = online ? 'online' : 'offline';
    try {
      await ref
          .read(tripRepositoryProvider)
          .updateDriverStatus(onlineStatus: newStatus);
      ref
          .read(authNotifierProvider.notifier)
          .updateStatus(onlineStatus: newStatus);
      ref.read(analyticsServiceProvider).logDutyChanged(online: online);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not update duty status: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isTogglingStatus = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final authState = ref.watch(authNotifierProvider);
    final user = authState.user;
    final tripsState = ref.watch(tripListNotifierProvider);
    final offersState = ref.watch(offerListNotifierProvider);
    final hasNetwork = ref.watch(isOnlineProvider);
    final isOnline = user?.onlineStatus == 'online';
    final offerCount = offersState.maybeWhen(
      data: (o) => o.where((e) => e.isActionable).length,
      orElse: () => 0,
    );

    if (!hasNetwork) {
      return Scaffold(
        appBar: AppBar(title: const Text('Home')),
        body: OfflinePage(
          embedded: true,
          onRetry: _loadDashboardData,
        ),
      );
    }

    return Scaffold(
      backgroundColor: AppConstants.bgLight,
      body: RefreshIndicator(
        color: AppConstants.gold,
        onRefresh: _loadDashboardData,
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            SliverAppBar(
              floating: true,
              pinned: true,
              backgroundColor: AppConstants.navy,
              foregroundColor: AppConstants.white,
              systemOverlayStyle: AppTheme.statusOverlay,
              title: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    user != null
                        ? 'Hi, ${user.name.split(' ').first}'
                        : 'Driver',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.headlineSmall?.copyWith(
                      color: AppConstants.white,
                    ),
                  ),
                  Text(
                    isOnline ? 'On duty · ready for assignments' : 'Off duty',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: isOnline
                          ? AppConstants.gold
                          : AppConstants.lightGrey,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
              actions: [
                IconButton(
                  tooltip: 'Offers',
                  onPressed: () => context.push('/offers'),
                  icon: Badge(
                    isLabelVisible: offerCount > 0,
                    backgroundColor: AppConstants.gold,
                    textColor: AppConstants.black,
                    label: Text('$offerCount'),
                    child: const Icon(Icons.inbox_outlined),
                  ),
                ),
                IconButton(
                  tooltip: 'Notifications',
                  onPressed: () => context.push('/notifications'),
                  icon: const Icon(Icons.notifications_outlined),
                ),
              ],
            ),
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
              sliver: SliverList(
                delegate: SliverChildListDelegate([
                  _DutyStatusPanel(
                    isOnline: isOnline,
                    busy: _isTogglingStatus,
                    onGoOnline: () => _setOnline(true),
                    onGoOffline: () => _setOnline(false),
                  ),
                  const SizedBox(height: 16),
                  if (offerCount > 0) ...[
                    _OfferBanner(
                      count: offerCount,
                      onTap: () => context.push('/offers'),
                    ),
                    const SizedBox(height: 16),
                  ],
                  Row(
                    children: [
                      Expanded(
                        child: MetricTile(
                          title: 'WALLET',
                          value: '₹${_walletBalance.toStringAsFixed(0)}',
                          icon: Icons.account_balance_wallet_rounded,
                          iconColor: AppConstants.gold,
                          onTap: () => context.push('/wallet'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: MetricTile(
                          title: 'RATING',
                          value: user != null
                              ? '${user.ratingAvg.toStringAsFixed(1)} ★'
                              : '—',
                          icon: Icons.star_rounded,
                          iconColor: AppConstants.gold,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  tripsState.when(
                    loading: () => const Padding(
                      padding: EdgeInsets.all(32),
                      child: Center(child: CircularProgressIndicator()),
                    ),
                    error: (e, _) => ErrorPage(
                      message: e.toString(),
                      onRetry: _loadDashboardData,
                      embedded: true,
                    ),
                    data: (trips) {
                      final active = trips.where((t) => t.isActive).toList();
                      final Booking? highlight =
                          active.isNotEmpty ? active.first : null;
                      if (highlight == null) {
                        return const AppEmptyView(
                          icon: Icons.route_outlined,
                          title: 'No active assignment',
                          message:
                              'Stay online. Fleet admin will push trips and offers here.',
                        );
                      }
                      return _NextTripCard(trip: highlight);
                    },
                  ),
                  const SizedBox(height: 24),
                  const AppSectionLabel('Shortcuts'),
                  const SizedBox(height: 12),
                  GridView.count(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    crossAxisCount: 2,
                    childAspectRatio: 1.7,
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                    children: [
                      _ShortcutTile(
                        label: 'Offers',
                        icon: Icons.inbox_rounded,
                        onTap: () => context.push('/offers'),
                      ),
                      _ShortcutTile(
                        label: 'Trips',
                        icon: Icons.list_alt_rounded,
                        onTap: () => context.push('/trips'),
                      ),
                      _ShortcutTile(
                        label: 'Documents',
                        icon: Icons.badge_outlined,
                        onTap: () => context.push('/documents'),
                      ),
                      _ShortcutTile(
                        label: 'Support',
                        icon: Icons.headset_mic_rounded,
                        onTap: () => context.push('/support'),
                      ),
                    ],
                  ),
                ]),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _DutyStatusPanel extends StatelessWidget {
  final bool isOnline;
  final bool busy;
  final VoidCallback onGoOnline;
  final VoidCallback onGoOffline;

  const _DutyStatusPanel({
    required this.isOnline,
    required this.busy,
    required this.onGoOnline,
    required this.onGoOffline,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return AnimatedContainer(
      duration: const Duration(milliseconds: 280),
      curve: Curves.easeOutCubic,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [AppConstants.navy, AppConstants.black],
        ),
        boxShadow: [
          BoxShadow(
            color: AppConstants.black.withValues(alpha: 0.22),
            blurRadius: 18,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Container(
                width: 12,
                height: 12,
                decoration: BoxDecoration(
                  color: isOnline ? AppConstants.gold : AppConstants.lightGrey,
                  shape: BoxShape.circle,
                  boxShadow: isOnline
                      ? [
                          BoxShadow(
                            color: AppConstants.gold.withValues(alpha: 0.6),
                            blurRadius: 10,
                            spreadRadius: 1,
                          ),
                        ]
                      : null,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  isOnline ? 'ON DUTY' : 'OFF DUTY',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.labelMedium?.copyWith(
                    color: AppConstants.white,
                    letterSpacing: 1.2,
                  ),
                ),
              ),
              if (busy)
                const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: AppConstants.gold,
                  ),
                ),
            ],
          ),
          const SizedBox(height: 14),
          Text(
            isOnline
                ? 'You are visible to dispatch for new assignments.'
                : 'Go online when you are ready to take company trips.',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: AppConstants.white.withValues(alpha: 0.78),
            ),
          ),
          const SizedBox(height: 20),
          if (!isOnline)
            FilledButton(
              onPressed: busy ? null : onGoOnline,
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.bolt_rounded),
                  SizedBox(width: 8),
                  Text('GO ONLINE'),
                ],
              ),
            )
          else
            OutlinedButton(
              onPressed: busy ? null : onGoOffline,
              style: OutlinedButton.styleFrom(
                foregroundColor: AppConstants.white,
                side: BorderSide(
                  color: AppConstants.white.withValues(alpha: 0.4),
                ),
              ),
              child: const Text('END DUTY'),
            ),
        ],
      ),
    );
  }
}

class _OfferBanner extends StatelessWidget {
  final int count;
  final VoidCallback onTap;

  const _OfferBanner({required this.count, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return AppSurfaceCard(
      onTap: onTap,
      color: AppConstants.gold.withValues(alpha: 0.14),
      border: Border.all(color: AppConstants.gold.withValues(alpha: 0.35)),
      child: Row(
        children: [
          const Icon(Icons.assignment_turned_in_rounded,
              color: AppConstants.navy),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              '$count trip offer${count == 1 ? '' : 's'} waiting',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.titleMedium,
            ),
          ),
          const Icon(Icons.chevron_right_rounded, color: AppConstants.navy),
        ],
      ),
    );
  }
}

class _NextTripCard extends StatelessWidget {
  final Booking trip;

  const _NextTripCard({required this.trip});

  @override
  Widget build(BuildContext context) {
    final isRiding = trip.status == 'trip_started';
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        AppSectionLabel(isRiding ? 'Active trip' : 'Next assignment'),
        const SizedBox(height: 10),
        AppSurfaceCard(
          onTap: () {
            if (isRiding) {
              context.push('/active-trip/${trip.id}');
            } else {
              context.push('/trips/${trip.id}');
            }
          },
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      trip.bookingCode,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Flexible(child: StatusChip.forStatus(trip.status)),
                ],
              ),
              const SizedBox(height: 14),
              TripTimeline(
                pickupAddress: trip.pickupAddress,
                dropAddress: trip.dropAddress,
              ),
              const SizedBox(height: 14),
              ElevatedButton(
                onPressed: () {
                  if (isRiding) {
                    context.push('/active-trip/${trip.id}');
                  } else {
                    context.push('/trips/${trip.id}');
                  }
                },
                child: Text(isRiding ? 'RESUME TRIP' : 'OPEN TRIP'),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _ShortcutTile extends StatelessWidget {
  final String label;
  final IconData icon;
  final VoidCallback onTap;

  const _ShortcutTile({
    required this.label,
    required this.icon,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return AppSurfaceCard(
      onTap: onTap,
      padding: const EdgeInsets.all(14),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, color: AppConstants.navy, size: 24),
          const SizedBox(height: 8),
          Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: Theme.of(context).textTheme.titleSmall,
          ),
        ],
      ),
    );
  }
}
