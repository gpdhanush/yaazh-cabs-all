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
            ListTile(
              tileColor: Theme.of(context).cardColor,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
                side: const BorderSide(color: AppConstants.borderLight),
              ),
              leading: CircleAvatar(
                backgroundColor: AppConstants.accentColor,
                child: Text(
                  user.name.isNotEmpty ? user.name[0].toUpperCase() : 'Y',
                  style: const TextStyle(fontWeight: FontWeight.w800, color: Colors.black),
                ),
              ),
              title: Text(user.name, style: const TextStyle(fontWeight: FontWeight.w800)),
              subtitle: Text(user.phone),
              trailing: TextButton(
                onPressed: () => context.push('/profile/edit'),
                child: const Text('Edit'),
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
          Container(
            decoration: BoxDecoration(
              color: Theme.of(context).cardColor,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppConstants.borderLight),
            ),
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
          ListTile(
            tileColor: Theme.of(context).cardColor,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
              side: const BorderSide(color: AppConstants.borderLight),
            ),
            leading: const Icon(Icons.info_outline_rounded),
            title: const Text('App version', style: TextStyle(fontWeight: FontWeight.w700)),
            trailing: const Text('1.0.0', style: TextStyle(color: AppConstants.textSecondaryLight)),
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
    return ListTile(
      onTap: onTap,
      title: Text(label, style: const TextStyle(fontWeight: FontWeight.w600)),
      trailing: Icon(
        selected ? Icons.check_circle_rounded : Icons.circle_outlined,
        color: selected ? AppConstants.accentHover : AppConstants.textSecondaryLight,
      ),
    );
  }
}
