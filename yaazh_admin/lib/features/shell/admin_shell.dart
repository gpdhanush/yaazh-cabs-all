import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:yaazh_admin/app/constants.dart';
import 'package:yaazh_admin/app/theme.dart';
import 'package:yaazh_admin/core/widgets/app_logo.dart';
import 'package:yaazh_admin/core/widgets/coming_soon.dart';
import 'package:yaazh_admin/core/widgets/confirm_sheet.dart';
import 'package:yaazh_admin/core/widgets/keyboard_dismiss.dart';
import 'package:yaazh_admin/core/widgets/logout_sheet.dart';
import 'package:yaazh_admin/features/auth/presentation/auth_viewmodel.dart';

final GlobalKey<ScaffoldState> adminScaffoldKey = GlobalKey<ScaffoldState>();

bool _exitPromptOpen = false;

class YaDrawerButton extends StatelessWidget {
  const YaDrawerButton({super.key});

  @override
  Widget build(BuildContext context) {
    return IconButton(
      tooltip: 'Menu',
      icon: const Icon(Icons.menu_rounded),
      onPressed: () {
        hideKeyboard();
        adminScaffoldKey.currentState?.openDrawer();
      },
    );
  }
}

class AdminShell extends ConsumerWidget {
  final StatefulNavigationShell navigationShell;

  const AdminShell({super.key, required this.navigationShell});

  void _onTap(int index) {
    FocusManager.instance.primaryFocus?.unfocus();
    navigationShell.goBranch(
      index,
      initialLocation: index == navigationShell.currentIndex,
    );
  }

  Future<void> _onRootBack(BuildContext context) async {
    final scaffold = adminScaffoldKey.currentState;
    if (scaffold?.isDrawerOpen == true) {
      scaffold!.closeDrawer();
      return;
    }

    if (_exitPromptOpen) return;
    _exitPromptOpen = true;
    try {
      final ok = await showConfirmSheet(
        context,
        title: 'Exit app?',
        message: 'Close Yaazh Admin? You will stay signed in.',
        actionLabel: 'Exit',
        icon: Icons.logout_rounded,
        dangerColor: AppColors.primary,
      );
      if (ok) await SystemNavigator.pop();
    } finally {
      _exitPromptOpen = false;
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (didPop) return;
        _onRootBack(context);
      },
      child: Scaffold(
        key: adminScaffoldKey,
        drawer: _AdminDrawer(parentContext: context),
        body: navigationShell,
        bottomNavigationBar: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Divider(height: 1, color: theme.dividerColor),
            NavigationBar(
              selectedIndex: navigationShell.currentIndex,
              onDestinationSelected: _onTap,
              labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
              destinations: const [
                NavigationDestination(
                  icon: Icon(Icons.home_outlined),
                  selectedIcon: Icon(Icons.home_rounded),
                  label: 'Home',
                ),
                NavigationDestination(
                  icon: Icon(Icons.local_taxi_outlined),
                  selectedIcon: Icon(Icons.local_taxi_rounded),
                  label: 'Bookings',
                ),
                NavigationDestination(
                  icon: Icon(Icons.mail_outline_rounded),
                  selectedIcon: Icon(Icons.mail_rounded),
                  label: 'Enquiries',
                ),
                NavigationDestination(
                  icon: Icon(Icons.settings_outlined),
                  selectedIcon: Icon(Icons.settings_rounded),
                  label: 'Settings',
                ),
              ],
            ),
          ],
        ),
        backgroundColor: theme.scaffoldBackgroundColor,
      ),
    );
  }
}

class _AdminDrawer extends ConsumerWidget {
  final BuildContext parentContext;

  const _AdminDrawer({required this.parentContext});

  void _close() {
    adminScaffoldKey.currentState?.closeDrawer();
  }

  void _open(String route) {
    _close();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!parentContext.mounted) return;
      if (route.startsWith('soon:')) {
        showComingSoon(route.substring(5));
        return;
      }
      if (route == '/home' ||
          route == '/bookings' ||
          route == '/enquiries' ||
          route == '/settings') {
        parentContext.go(route);
      } else {
        parentContext.push(route);
      }
    });
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final onHeader = AppTheme.onPrimaryOf(theme.colorScheme.primary);
    final location = GoRouterState.of(context).uri.path;

    return Drawer(
      child: SafeArea(
        top: false,
        child: Column(
          children: [
            Container(
              width: double.infinity,
              color: theme.colorScheme.primary,
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 20),
              child: Row(
                children: [
                  ClipOval(
                    child: ColoredBox(
                      color: onHeader.withValues(alpha: 0.14),
                      child: const AppLogo(size: 48),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          AppConstants.appName,
                          style: theme.textTheme.titleMedium?.copyWith(
                            color: onHeader,
                          ),
                        ),
                        Text(
                          'Operations',
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: onHeader.withValues(alpha: 0.75),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(12, 12, 12, 8),
                children: [
                  _sectionLabel(context, 'Fleet'),
                  _item(
                    context,
                    icon: Icons.badge_rounded,
                    label: 'Drivers',
                    selected: location.startsWith('/drivers'),
                    onTap: () => _open('/drivers'),
                  ),
                  _item(
                    context,
                    icon: Icons.groups_rounded,
                    label: 'Customers',
                    selected: location.startsWith('/customers'),
                    onTap: () => _open('/customers'),
                  ),
                  _item(
                    context,
                    icon: Icons.directions_car_rounded,
                    label: 'Fleet',
                    selected: location.startsWith('/fleet'),
                    onTap: () => _open('/fleet'),
                  ),
                  _item(
                    context,
                    icon: Icons.explore_rounded,
                    label: 'Live tracking',
                    selected: location.startsWith('/tracking'),
                    onTap: () => _open('/tracking'),
                  ),
                  const SizedBox(height: 8),
                  _sectionLabel(context, 'Website'),
                  _item(
                    context,
                    icon: Icons.star_rounded,
                    label: 'Testimonials',
                    selected: location.startsWith('/testimonials'),
                    onTap: () => _open('/testimonials'),
                  ),
                  _item(
                    context,
                    icon: Icons.insights_rounded,
                    label: 'Reports',
                    selected: location.startsWith('/reports'),
                    onTap: () => _open('/reports'),
                  ),
                  _item(
                    context,
                    icon: Icons.notifications_rounded,
                    label: 'Push alerts',
                    selected: location.startsWith('/notifications'),
                    onTap: () => _open('/notifications'),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 16),
              child: OutlinedButton.icon(
                onPressed: () async {
                  final auth = ref.read(authNotifierProvider.notifier);
                  _close();
                  final ok = await showLogoutSheet(parentContext);
                  if (!ok) return;
                  await auth.logout();
                },
                icon: const Icon(Icons.logout_rounded),
                label: const Text('Sign out'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _sectionLabel(BuildContext context, String text) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 4, 12, 6),
      child: Text(
        text.toUpperCase(),
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
              fontWeight: FontWeight.w700,
              letterSpacing: 0.6,
            ),
      ),
    );
  }

  Widget _item(
    BuildContext context, {
    required IconData icon,
    required String label,
    required VoidCallback onTap,
    bool selected = false,
  }) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final accent = isDark ? AppColors.primaryLight : theme.colorScheme.primary;
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: ListTile(
        selected: selected,
        leading: Icon(icon, color: selected ? accent : null),
        title: Text(
          label,
          style: theme.textTheme.titleSmall?.copyWith(
            color: selected ? accent : theme.colorScheme.onSurface,
            fontWeight: selected ? FontWeight.w700 : FontWeight.w600,
          ),
        ),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        selectedTileColor: accent.withValues(alpha: isDark ? 0.16 : 0.1),
        onTap: onTap,
      ),
    );
  }
}
