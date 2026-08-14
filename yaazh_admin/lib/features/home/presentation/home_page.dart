import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:line_awesome_flutter/line_awesome_flutter.dart';
import 'package:yaazh_admin/app/constants.dart';
import 'package:yaazh_admin/core/widgets/admin_avatar.dart';
import 'package:yaazh_admin/core/widgets/coming_soon.dart';
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
          title: const Text('Home'),
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
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: _StatCard(
                label: 'Today',
                value: '${data.bookingsToday}',
                hint: 'Trips booked',
                icon: LineAwesomeIcons.calendar,
                onTap: () => context.go('/bookings'),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _StatCard(
                label: 'Pending',
                value: '${data.pendingBookings}',
                hint: 'Need action',
                icon: LineAwesomeIcons.clock,
                onTap: () => context.go('/bookings'),
              ),
            ),
          ],
        ),
        const SizedBox(height: 22),
        Text('Overview', style: theme.textTheme.titleMedium),
        const SizedBox(height: 12),
        GridView.count(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisCount: isTablet ? 4 : 2,
          mainAxisSpacing: 12,
          crossAxisSpacing: 12,
          childAspectRatio: isTablet ? 1.55 : 1.35,
          children: [
            _StatCard(
              label: 'Bookings',
              value: '${data.totalBookings}',
              icon: LineAwesomeIcons.taxi_solid,
              onTap: () => context.go('/bookings'),
            ),
            _StatCard(
              label: 'Drivers',
              value: '${data.activeDrivers}',
              icon: LineAwesomeIcons.id_card,
              onTap: () => context.push('/drivers'),
            ),
            _StatCard(
              label: 'Customers',
              value: '${data.customers}',
              icon: LineAwesomeIcons.users_solid,
              onTap: () => context.push('/customers'),
            ),
            _StatCard(
              label: 'Enquiries',
              value: '${data.enquiries}',
              icon: LineAwesomeIcons.envelope,
              onTap: () => context.go('/enquiries'),
            ),
          ],
        ),
        const SizedBox(height: 22),
        Text('Shortcuts', style: theme.textTheme.titleMedium),
        const SizedBox(height: 12),
        GridView.count(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisCount: isTablet ? 4 : 2,
          mainAxisSpacing: 12,
          crossAxisSpacing: 12,
          childAspectRatio: isTablet ? 1.8 : 1.7,
          children: [
            _ShortcutTile(
              icon: LineAwesomeIcons.user_check_solid,
              label: 'Assign driver',
              onTap: () => context.go('/bookings'),
            ),
            _ShortcutTile(
              icon: LineAwesomeIcons.map_marked_solid,
              label: 'Live tracking',
              onTap: () => context.push('/tracking'),
            ),
            _ShortcutTile(
              icon: LineAwesomeIcons.id_card,
              label: 'Drivers',
              onTap: () => context.push('/drivers'),
            ),
            _ShortcutTile(
              icon: LineAwesomeIcons.envelope,
              label: 'Enquiries',
              onTap: () => context.go('/enquiries'),
            ),
            _ShortcutTile(
              icon: LineAwesomeIcons.bullhorn_solid,
              label: 'Push alerts',
              onTap: () => context.push('/notifications'),
            ),
            _ShortcutTile(
              icon: LineAwesomeIcons.chart_bar,
              label: 'Reports',
              onTap: () => showComingSoon('Reports'),
            ),
          ],
        ),
      ],
    );
  }
}

class _StatCard extends StatelessWidget {
  final String label;
  final String value;
  final String? hint;
  final IconData icon;
  final VoidCallback onTap;

  const _StatCard({
    required this.label,
    required this.value,
    this.hint,
    required this.icon,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Material(
      color: theme.colorScheme.surface,
      borderRadius: BorderRadius.circular(AppConstants.radiusField),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppConstants.radiusField),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppConstants.radiusField),
            border: Border.all(color: theme.dividerColor, width: 1),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(icon, size: 22, color: theme.colorScheme.primary),
              const SizedBox(height: 12),
              Text(
                value,
                style: theme.textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 2),
              Text(label, style: theme.textTheme.titleSmall),
              if (hint != null)
                Text(hint!, style: theme.textTheme.bodySmall),
            ],
          ),
        ),
      ),
    );
  }
}

class _ShortcutTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _ShortcutTile({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Material(
      color: theme.colorScheme.surface,
      borderRadius: BorderRadius.circular(AppConstants.radiusField),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppConstants.radiusField),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppConstants.radiusField),
            border: Border.all(color: theme.dividerColor, width: 1),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(icon, color: theme.colorScheme.primary),
              const Spacer(),
              Text(label, style: theme.textTheme.titleSmall),
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
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(AppConstants.radiusField),
        border: Border.all(color: theme.dividerColor, width: 1),
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
