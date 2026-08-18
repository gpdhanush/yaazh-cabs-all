import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:yaazh_admin/app/constants.dart';
import 'package:yaazh_admin/core/auth/permissions.dart';
import 'package:yaazh_admin/core/widgets/admin_avatar.dart';
import 'package:yaazh_admin/core/widgets/keyboard_dismiss.dart';
import 'package:yaazh_admin/core/widgets/ya_loader.dart';
import 'package:yaazh_admin/features/auth/presentation/auth_viewmodel.dart';
import 'package:yaazh_admin/features/auth/domain/admin_user.dart';
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
          title: const Text('Home'),
          leading: const YaDrawerButton(),
          automaticallyImplyLeading: false,
          actions: [
            if (user?.hasPermission(AdminPermissions.notificationsSend) == true)
              IconButton(
                tooltip: 'Notifications',
                onPressed: () => context.push('/notifications'),
                icon: const Icon(Icons.notifications_none_rounded),
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
            padding: EdgeInsets.fromLTRB(pad, 16, pad, 32),
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
                  padding: EdgeInsets.symmetric(vertical: 64),
                  child: Center(child: YaLoader()),
                ),
                error: (err, _) => _ErrorBanner(
                  message: err.toString(),
                  onRetry: () => ref.invalidate(dashboardStatsProvider),
                ),
                data: (data) => _DashboardBody(
                  data: data,
                  isTablet: isTablet,
                  user: user,
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
  final AdminUser? user;

  const _DashboardBody({
    required this.data,
    required this.isTablet,
    required this.user,
  });

  bool _can(String permission) => user?.hasPermission(permission) == true;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final metrics = <_Metric>[
      if (_can(AdminPermissions.bookingsView)) ...[
        _Metric(
          label: 'Today',
          hint: 'Booked today',
          value: '${data.bookingsToday}',
          icon: Icons.calendar_today_rounded,
          color: AppColors.primary,
          onTap: () => context.go('/bookings'),
        ),
        _Metric(
          label: 'Pending',
          hint: 'Need action',
          value: '${data.pendingBookings}',
          icon: Icons.schedule_rounded,
          color: AppColors.warning,
          onTap: () => context.go('/bookings'),
        ),
        _Metric(
          label: 'Bookings',
          hint: 'All time',
          value: '${data.totalBookings}',
          icon: Icons.local_taxi_rounded,
          color: AppColors.supportBlue,
          onTap: () => context.go('/bookings'),
        ),
      ],
      if (_can(AdminPermissions.driversView))
        _Metric(
          label: 'Drivers',
          hint: 'Active now',
          value: '${data.activeDrivers}',
          icon: Icons.badge_rounded,
          color: AppColors.success,
          onTap: () => context.push('/drivers'),
        ),
      if (_can(AdminPermissions.customersView))
        _Metric(
          label: 'Customers',
          hint: 'Registered',
          value: '${data.customers}',
          icon: Icons.groups_rounded,
          color: AppColors.supportPurple,
          onTap: () => context.push('/customers'),
        ),
      if (_can(AdminPermissions.supportManage))
        _Metric(
          label: 'Enquiries',
          hint: 'Website form',
          value: '${data.enquiries}',
          icon: Icons.mail_outline_rounded,
          color: AppColors.salmon,
          onTap: () => context.go('/enquiries'),
        ),
    ];

    final actions = <_QuickAction>[
      if (_can(AdminPermissions.bookingsView))
        _QuickAction(
          label: 'Bookings',
          icon: Icons.local_taxi_rounded,
          onTap: () => context.go('/bookings'),
        ),
      if (_can(AdminPermissions.reportsView))
        _QuickAction(
          label: 'Reports',
          icon: Icons.insights_rounded,
          onTap: () => context.push('/reports'),
        ),
      if (_can(AdminPermissions.driversView))
        _QuickAction(
          label: 'Drivers',
          icon: Icons.badge_rounded,
          onTap: () => context.push('/drivers'),
        ),
      if (_can(AdminPermissions.customersView))
        _QuickAction(
          label: 'Customers',
          icon: Icons.groups_rounded,
          onTap: () => context.push('/customers'),
        ),
    ];

    if (metrics.isEmpty && actions.isEmpty) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 24),
        child: Text(
          'No dashboard modules are assigned to your role yet.',
          style: theme.textTheme.bodyMedium,
          textAlign: TextAlign.center,
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (_can(AdminPermissions.bookingsView) && data.pendingBookings > 0) ...[
          _AttentionBanner(count: data.pendingBookings),
          const SizedBox(height: 18),
        ],
        if (metrics.isNotEmpty) ...[
          Text('Overview', style: theme.textTheme.titleMedium),
          const SizedBox(height: 10),
          GridView.count(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisCount: isTablet ? 3 : 2,
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: isTablet ? 1.7 : 1.38,
            children: [
              for (final metric in metrics) _StatCard(metric: metric),
            ],
          ),
        ],
        if (actions.isNotEmpty) ...[
          const SizedBox(height: 22),
          Text('Quick actions', style: theme.textTheme.titleMedium),
          const SizedBox(height: 10),
          for (final action in actions) ...[
            _ActionRow(action: action),
            const SizedBox(height: 8),
          ],
        ],
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

class _QuickAction {
  final String label;
  final IconData icon;
  final VoidCallback onTap;

  const _QuickAction({
    required this.label,
    required this.icon,
    required this.onTap,
  });
}

class _AttentionBanner extends StatelessWidget {
  final int count;

  const _AttentionBanner({required this.count});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Material(
      color: AppColors.warning.withValues(alpha: 0.12),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(18),
        side: BorderSide(color: AppColors.warning.withValues(alpha: 0.28)),
      ),
      child: InkWell(
        onTap: () => context.go('/bookings'),
        borderRadius: BorderRadius.circular(18),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(14, 12, 12, 12),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: AppColors.warning.withValues(alpha: 0.18),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(
                  Icons.priority_high_rounded,
                  color: AppColors.warning,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '$count pending booking${count == 1 ? '' : 's'}',
                      style: theme.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    Text(
                      'Needs confirmation or assignment',
                      style: theme.textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
              Icon(
                Icons.chevron_right_rounded,
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ],
          ),
        ),
      ),
    );
  }
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
        borderRadius: BorderRadius.circular(22),
        side: BorderSide(color: theme.dividerColor.withValues(alpha: 0.7)),
      ),
      child: InkWell(
        onTap: metric.onTap,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(14, 14, 14, 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 34,
                height: 34,
                decoration: BoxDecoration(
                  color: metric.color.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(11),
                ),
                child: Icon(metric.icon, size: 18, color: metric.color),
              ),
              const Spacer(),
              Text(
                metric.value,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w800,
                  letterSpacing: -0.4,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                metric.label,
                style: theme.textTheme.titleSmall,
              ),
              Text(metric.hint, style: theme.textTheme.bodySmall),
            ],
          ),
        ),
      ),
    );
  }
}

class _ActionRow extends StatelessWidget {
  final _QuickAction action;

  const _ActionRow({required this.action});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Material(
      color: theme.colorScheme.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(18),
        side: BorderSide(color: theme.dividerColor.withValues(alpha: 0.7)),
      ),
      child: InkWell(
        onTap: action.onTap,
        borderRadius: BorderRadius.circular(18),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(14, 12, 10, 12),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: theme.colorScheme.primary.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  action.icon,
                  color: theme.colorScheme.primary,
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  action.label,
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              Icon(
                Icons.chevron_right_rounded,
                color: theme.colorScheme.onSurfaceVariant,
              ),
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
        borderRadius: BorderRadius.circular(18),
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
