import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:line_awesome_flutter/line_awesome_flutter.dart';
import 'package:yaazh_admin/app/constants.dart';
import 'package:yaazh_admin/app/theme.dart';
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
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: _GlassCard(
                label: 'Today',
                value: '${data.bookingsToday}',
                hint: 'Trips booked',
                icon: LineAwesomeIcons.calendar,
                color: AppColors.primary,
                onTap: () => context.go('/bookings'),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _GlassCard(
                label: 'Pending',
                value: '${data.pendingBookings}',
                hint: 'Need action',
                icon: LineAwesomeIcons.clock,
                color: AppColors.warning,
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
          childAspectRatio: isTablet ? 1.55 : 1.28,
          children: [
            _GlassCard(
              label: 'Bookings',
              value: '${data.totalBookings}',
              icon: LineAwesomeIcons.taxi_solid,
              color: AppColors.primary,
              onTap: () => context.go('/bookings'),
            ),
            _GlassCard(
              label: 'Drivers',
              value: '${data.activeDrivers}',
              icon: LineAwesomeIcons.id_card,
              color: AppColors.supportBlue,
              onTap: () => context.push('/drivers'),
            ),
            _GlassCard(
              label: 'Customers',
              value: '${data.customers}',
              icon: LineAwesomeIcons.users_solid,
              color: AppColors.supportPurple,
              onTap: () => context.push('/customers'),
            ),
            _GlassCard(
              label: 'Enquiries',
              value: '${data.enquiries}',
              icon: LineAwesomeIcons.envelope,
              color: AppColors.salmon,
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
          childAspectRatio: isTablet ? 1.8 : 1.65,
          children: [
            _GlassShortcut(
              icon: LineAwesomeIcons.user_check_solid,
              label: 'Assign driver',
              color: AppColors.primary,
              onTap: () => context.go('/bookings'),
            ),
            _GlassShortcut(
              icon: LineAwesomeIcons.car_solid,
              label: 'Fleet',
              color: AppColors.supportBlue,
              onTap: () => context.push('/fleet'),
            ),
            _GlassShortcut(
              icon: LineAwesomeIcons.map_marked_solid,
              label: 'Live tracking',
              color: AppColors.supportPurple,
              onTap: () => context.push('/tracking'),
            ),
            _GlassShortcut(
              icon: LineAwesomeIcons.id_card,
              label: 'Drivers',
              color: AppColors.warning,
              onTap: () => context.push('/drivers'),
            ),
            _GlassShortcut(
              icon: LineAwesomeIcons.bullhorn_solid,
              label: 'Push alerts',
              color: AppColors.salmon,
              onTap: () => context.push('/notifications'),
            ),
            _GlassShortcut(
              icon: LineAwesomeIcons.chart_bar,
              label: 'Reports',
              color: AppColors.primary,
              onTap: () => context.push('/reports'),
            ),
          ],
        ),
      ],
    );
  }
}

class _GlassCard extends StatelessWidget {
  final String label;
  final String value;
  final String? hint;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  const _GlassCard({
    required this.label,
    required this.value,
    this.hint,
    required this.icon,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final onColor = AppTheme.onPrimaryOf(color);
    return _GlassSurface(
      color: color,
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 22, color: onColor.withValues(alpha: 0.95)),
          const SizedBox(height: 14),
          Text(
            value,
            style: TextStyle(
              color: onColor,
              fontSize: 26,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: TextStyle(
              color: onColor,
              fontWeight: FontWeight.w700,
              fontSize: 14,
            ),
          ),
          if (hint != null)
            Text(
              hint!,
              style: TextStyle(color: onColor.withValues(alpha: 0.78), fontSize: 12),
            ),
        ],
      ),
    );
  }
}

class _GlassShortcut extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _GlassShortcut({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final onColor = AppTheme.onPrimaryOf(color);
    return _GlassSurface(
      color: color,
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: onColor),
          const Spacer(),
          Text(
            label,
            style: TextStyle(
              color: onColor,
              fontWeight: FontWeight.w700,
              fontSize: 14,
            ),
          ),
        ],
      ),
    );
  }
}

class _GlassSurface extends StatelessWidget {
  final Color color;
  final VoidCallback onTap;
  final Widget child;

  const _GlassSurface({
    required this.color,
    required this.onTap,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(18),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          child: Ink(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(18),
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  Color.alphaBlend(Colors.white.withValues(alpha: 0.28), color),
                  color.withValues(alpha: 0.88),
                ],
              ),
              border: Border.all(color: Colors.white.withValues(alpha: 0.38)),
            ),
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: child,
            ),
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
