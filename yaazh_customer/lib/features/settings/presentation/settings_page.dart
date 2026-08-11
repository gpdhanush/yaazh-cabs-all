import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:yaazh_customer/app/constants.dart';
import 'package:yaazh_customer/core/widgets/logout_sheet.dart';
import 'package:yaazh_customer/features/auth/presentation/auth_viewmodel.dart';
import 'package:yaazh_customer/features/settings/presentation/theme_controller.dart';

class SettingsPage extends ConsumerWidget {
  const SettingsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authNotifierProvider).user;
    final themeMode = ref.watch(themeModeProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
        children: [
          if (user != null) ...[
            Material(
              color: Theme.of(context).cardColor,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
                side: const BorderSide(color: AppConstants.borderLight),
              ),
              child: InkWell(
                onTap: () => context.push('/profile/edit'),
                borderRadius: BorderRadius.circular(16),
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 14, 12, 14),
                  child: Row(
                    children: [
                      CircleAvatar(
                        backgroundColor: AppConstants.accentColor,
                        child: Text(
                          user.name.isNotEmpty ? user.name[0].toUpperCase() : 'Y',
                          style: const TextStyle(fontWeight: FontWeight.w800, color: Colors.black),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(user.name, style: const TextStyle(fontWeight: FontWeight.w800)),
                            Text(
                              user.phone,
                              style: const TextStyle(
                                color: AppConstants.textSecondaryLight,
                                fontSize: 13,
                              ),
                            ),
                          ],
                        ),
                      ),
                      TextButton(
                        onPressed: () => context.push('/profile/edit'),
                        child: const Text('Edit'),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(height: 20),
          ],
          const Text(
            'APPEARANCE',
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.7,
              color: AppConstants.textSecondaryLight,
            ),
          ),
          const SizedBox(height: 8),
          Material(
            color: Theme.of(context).cardColor,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
              side: const BorderSide(color: AppConstants.borderLight),
            ),
            clipBehavior: Clip.antiAlias,
            child: Column(
              children: [
                _ThemeTile(
                  label: 'System',
                  selected: themeMode == ThemeMode.system,
                  onTap: () => ref.read(themeModeProvider.notifier).setMode(ThemeMode.system),
                ),
                const Divider(height: 1),
                _ThemeTile(
                  label: 'Light',
                  selected: themeMode == ThemeMode.light,
                  onTap: () => ref.read(themeModeProvider.notifier).setMode(ThemeMode.light),
                ),
                const Divider(height: 1),
                _ThemeTile(
                  label: 'Dark',
                  selected: themeMode == ThemeMode.dark,
                  onTap: () => ref.read(themeModeProvider.notifier).setMode(ThemeMode.dark),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          Material(
            color: Theme.of(context).cardColor,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
              side: const BorderSide(color: AppConstants.borderLight),
            ),
            child: const Padding(
              padding: EdgeInsets.symmetric(horizontal: 16, vertical: 16),
              child: Row(
                children: [
                  Icon(Icons.info_outline_rounded),
                  SizedBox(width: 12),
                  Expanded(
                    child: Text('App version', style: TextStyle(fontWeight: FontWeight.w700)),
                  ),
                  Text(AppConstants.appVersion, style: TextStyle(color: AppConstants.textSecondaryLight)),
                ],
              ),
            ),
          ),
          const SizedBox(height: 28),
          OutlinedButton.icon(
            icon: const Icon(Icons.logout_rounded, color: AppConstants.errorColor),
            label: const Text(
              'LOG OUT',
              style: TextStyle(color: AppConstants.errorColor, fontWeight: FontWeight.w800),
            ),
            style: OutlinedButton.styleFrom(side: const BorderSide(color: AppConstants.errorColor)),
            onPressed: () async {
              final confirm = await showLogoutSheet(context);
              if (!confirm) return;
              await ref.read(authNotifierProvider.notifier).logout();
              if (context.mounted) context.go('/login');
            },
          ),
        ],
      ),
    );
  }
}

class _ThemeTile extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _ThemeTile({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Row(
          children: [
            Expanded(
              child: Text(label, style: const TextStyle(fontWeight: FontWeight.w600)),
            ),
            Icon(
              selected ? Icons.check_circle_rounded : Icons.circle_outlined,
              color: selected ? AppConstants.accentHover : AppConstants.textSecondaryLight,
            ),
          ],
        ),
      ),
    );
  }
}
