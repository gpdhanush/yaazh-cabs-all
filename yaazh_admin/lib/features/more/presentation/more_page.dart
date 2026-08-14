import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:yaazh_admin/app/constants.dart';
import 'package:yaazh_admin/core/widgets/admin_avatar.dart';
import 'package:yaazh_admin/core/widgets/coming_soon.dart';
import 'package:yaazh_admin/core/widgets/keyboard_dismiss.dart';
import 'package:yaazh_admin/core/widgets/logout_sheet.dart';
import 'package:yaazh_admin/features/auth/presentation/auth_viewmodel.dart';

class MorePage extends ConsumerWidget {
  const MorePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authNotifierProvider).user;
    final theme = Theme.of(context);
    final isTablet = Breakpoints.isTablet(context);

    final items = <_MoreItem>[
      _MoreItem(Icons.explore_rounded, 'Live tracking', '/tracking', () => context.push('/tracking')),
      _MoreItem(Icons.insights_rounded, 'Reports', null, () => showComingSoon('Reports')),
      _MoreItem(Icons.star_rounded, 'Testimonials', '/testimonials', () => context.push('/testimonials')),
      _MoreItem(Icons.mail_rounded, 'Enquiries', '/enquiries', () => context.go('/enquiries')),
      _MoreItem(Icons.notifications_rounded, 'Push alerts', '/notifications', () => context.push('/notifications')),
      _MoreItem(Icons.language_rounded, 'Web settings', '/web-settings', () => context.push('/web-settings')),
      _MoreItem(Icons.badge_rounded, 'Drivers', '/drivers', () => context.push('/drivers')),
      _MoreItem(Icons.directions_car_rounded, 'Fleet', null, () => showComingSoon('Fleet')),
      _MoreItem(Icons.person_rounded, 'Profile', '/profile', () => context.push('/profile')),
      _MoreItem(Icons.tune_rounded, 'App settings', '/settings', () => context.push('/settings')),
    ];

    return KeyboardDismiss(
      child: Scaffold(
        appBar: AppBar(title: const Text('More')),
        body: ListView(
          padding: EdgeInsets.fromLTRB(isTablet ? 28 : 16, 8, isTablet ? 28 : 16, 32),
          children: [
            Material(
              color: theme.colorScheme.surface,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(20),
                side: BorderSide(color: theme.dividerColor),
              ),
              child: InkWell(
                onTap: () => context.push('/profile'),
                borderRadius: BorderRadius.circular(20),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      AdminAvatar(user: user, radius: 26),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(user?.name ?? 'Admin', style: theme.textTheme.titleMedium),
                            Text(user?.email ?? '', style: theme.textTheme.bodySmall),
                          ],
                        ),
                      ),
                      const Icon(Icons.chevron_right_rounded),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(height: 20),
            GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: items.length,
              gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: isTablet ? 4 : 2,
                mainAxisSpacing: 12,
                crossAxisSpacing: 12,
                childAspectRatio: isTablet ? 1.4 : 1.55,
              ),
              itemBuilder: (context, index) {
                final item = items[index];
                return _MoreTile(item: item);
              },
            ),
            const SizedBox(height: 20),
            OutlinedButton.icon(
              onPressed: () async {
                hideKeyboard();
                final ok = await showLogoutSheet(context);
                if (ok && context.mounted) {
                  await ref.read(authNotifierProvider.notifier).logout();
                }
              },
              icon: const Icon(Icons.logout_rounded),
              label: const Text('Sign out'),
            ),
          ],
        ),
      ),
    );
  }
}

class _MoreItem {
  final IconData icon;
  final String label;
  final String? route;
  final VoidCallback onTap;

  const _MoreItem(this.icon, this.label, this.route, this.onTap);
}

class _MoreTile extends StatelessWidget {
  final _MoreItem item;

  const _MoreTile({required this.item});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Material(
      color: theme.colorScheme.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(18),
        side: BorderSide(color: theme.dividerColor),
      ),
      child: InkWell(
        onTap: item.onTap,
        borderRadius: BorderRadius.circular(18),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(item.icon, color: theme.colorScheme.primary),
              const Spacer(),
              Text(item.label, style: theme.textTheme.titleSmall),
              if (item.route == null)
                Text(
                  'Soon',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.primary,
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
