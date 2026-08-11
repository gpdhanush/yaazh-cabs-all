import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:yaazh_cabs/app/constants.dart';
import 'package:yaazh_cabs/core/network/connectivity_provider.dart';
import 'package:yaazh_cabs/core/widgets/app_state_pages.dart';
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
        onRefresh: _loadDashboardData,
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            SliverAppBar(
              floating: true,
              backgroundColor: AppConstants.bgLight,
              title: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    user != null
                        ? 'Hi, ${user.name.split(' ').first}'
                        : 'Driver',
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -0.3,
                    ),
                  ),
                  Text(
                    isOnline ? 'On duty · ready for assignments' : 'Off duty',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                      color: isOnline
                          ? AppConstants.successColor
                          : AppConstants.textSecondaryLight,
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
                          iconColor: Colors.amber.shade700,
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
                          iconColor: Colors.orangeAccent,
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
                      final active =
                          trips.where((t) => t.isActive).toList();
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
                  const Text(
                    'Shortcuts',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: AppConstants.textSecondaryLight,
                    ),
                  ),
                  const SizedBox(height: 12),
                  GridView.count(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    crossAxisCount: 2,
                    childAspectRatio: 1.55,
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                    children: [
                      _ShortcutTile(
                        label: 'Offers',
                        icon: Icons.inbox_rounded,
                        color: Colors.deepOrange,
                        onTap: () => context.push('/offers'),
                      ),
                      _ShortcutTile(
                        label: 'Trips',
                        icon: Icons.list_alt_rounded,
                        color: Colors.blue,
                        onTap: () => context.push('/trips'),
                      ),
                      _ShortcutTile(
                        label: 'Documents',
                        icon: Icons.badge_outlined,
                        color: const Color(0xFF059669),
                        onTap: () => context.push('/documents'),
                      ),
                      _ShortcutTile(
                        label: 'Support',
                        icon: Icons.headset_mic_rounded,
                        color: const Color(0xFF7C3AED),
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

/// Modern duty control — large GO ONLINE / END DUTY actions (not a switch).
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
    return AnimatedContainer(
      duration: const Duration(milliseconds: 280),
      curve: Curves.easeOutCubic,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: isOnline
              ? const [Color(0xFF064E3B), Color(0xFF0F766E)]
              : const [Color(0xFF1E293B), Color(0xFF0F172A)],
        ),
        boxShadow: [
          BoxShadow(
            color: (isOnline ? const Color(0xFF059669) : Colors.black)
                .withValues(alpha: 0.22),
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
                  color: isOnline
                      ? const Color(0xFF6EE7B7)
                      : const Color(0xFF94A3B8),
                  shape: BoxShape.circle,
                  boxShadow: isOnline
                      ? [
                          BoxShadow(
                            color: const Color(0xFF6EE7B7).withValues(alpha: 0.7),
                            blurRadius: 10,
                            spreadRadius: 1,
                          ),
                        ]
                      : null,
                ),
              ),
              const SizedBox(width: 10),
              Text(
                isOnline ? 'ON DUTY' : 'OFF DUTY',
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 1.2,
                  fontSize: 13,
                ),
              ),
              const Spacer(),
              if (busy)
                const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Colors.white,
                  ),
                ),
            ],
          ),
          const SizedBox(height: 14),
          Text(
            isOnline
                ? 'You are visible to dispatch for new assignments.'
                : 'Go online when you are ready to take company trips.',
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.78),
              fontSize: 14,
              height: 1.35,
            ),
          ),
          const SizedBox(height: 20),
          if (!isOnline)
            FilledButton(
              onPressed: busy ? null : onGoOnline,
              style: FilledButton.styleFrom(
                backgroundColor: AppConstants.accentColor,
                foregroundColor: Colors.black,
                minimumSize: const Size.fromHeight(52),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.bolt_rounded),
                  SizedBox(width: 8),
                  Text(
                    'GO ONLINE',
                    style: TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 16,
                      letterSpacing: 0.4,
                    ),
                  ),
                ],
              ),
            )
          else
            OutlinedButton(
              onPressed: busy ? null : onGoOffline,
              style: OutlinedButton.styleFrom(
                foregroundColor: Colors.white,
                side: BorderSide(color: Colors.white.withValues(alpha: 0.45)),
                minimumSize: const Size.fromHeight(52),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
              child: const Text(
                'END DUTY',
                style: TextStyle(
                  fontWeight: FontWeight.w700,
                  fontSize: 15,
                  letterSpacing: 0.4,
                ),
              ),
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
    return Material(
      color: AppConstants.accentColor.withValues(alpha: 0.14),
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              const Icon(Icons.assignment_turned_in_rounded),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  '$count trip offer${count == 1 ? '' : 's'} waiting',
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
              ),
              const Icon(Icons.chevron_right_rounded),
            ],
          ),
        ),
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
        Text(
          isRiding ? 'Active trip' : 'Next assignment',
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w700,
            color: AppConstants.textSecondaryLight,
          ),
        ),
        const SizedBox(height: 10),
        Material(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          child: InkWell(
            borderRadius: BorderRadius.circular(18),
            onTap: () {
              if (isRiding) {
                context.push('/active-trip/${trip.id}');
              } else {
                context.push('/trips/${trip.id}');
              }
            },
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          trip.bookingCode,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                      StatusChip.forStatus(trip.status),
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
          ),
        ),
      ],
    );
  }
}

class _ShortcutTile extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  const _ShortcutTile({
    required this.label,
    required this.icon,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFE2E8F0)),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, color: color, size: 26),
              const SizedBox(height: 8),
              Text(
                label,
                style: const TextStyle(
                  fontWeight: FontWeight.w700,
                  fontSize: 13,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
