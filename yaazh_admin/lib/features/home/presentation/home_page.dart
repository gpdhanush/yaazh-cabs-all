import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:line_awesome_flutter/line_awesome_flutter.dart';
import 'package:yaazh_admin/app/constants.dart';
import 'package:yaazh_admin/core/widgets/admin_avatar.dart';
import 'package:yaazh_admin/core/widgets/keyboard_dismiss.dart';
import 'package:yaazh_admin/core/widgets/ya_loader.dart';
import 'package:yaazh_admin/features/auth/presentation/auth_viewmodel.dart';
import 'package:yaazh_admin/features/home/data/dashboard_repository.dart';
import 'package:yaazh_admin/features/home/domain/dashboard_stats.dart';
import 'package:yaazh_admin/features/shell/admin_shell.dart';

class HomePage extends ConsumerWidget {
  const HomePage({super.key});

  String _greeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
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
            await ref.read(dashboardStatsProvider.future);
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
