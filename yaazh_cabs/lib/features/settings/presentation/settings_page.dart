import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:yaazh_cabs/app/constants.dart';
import 'package:yaazh_cabs/core/firebase/analytics_service.dart';
import 'package:yaazh_cabs/core/widgets/app_surface.dart';
import 'package:yaazh_cabs/core/widgets/driver_avatar.dart';
import 'package:yaazh_cabs/core/widgets/logout_sheet.dart';
import 'package:yaazh_cabs/features/auth/presentation/auth_viewmodel.dart';

class SettingsPage extends ConsumerWidget {
  const SettingsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final user = ref.watch(authNotifierProvider).user;

    return Scaffold(
      backgroundColor: AppConstants.bgLight,
      appBar: AppBar(title: const Text('Settings')),
      body: SafeArea(
        top: false,
        child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
        children: [
          if (user != null) ...[
            AppSurfaceCard(
              child: Row(
                children: [
                  DriverAvatar(
                    name: user.name,
                    imageUrl: user.profileImageUrl,
                    radius: 24,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          user.name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: theme.textTheme.titleMedium,
                        ),
                        Text(
                          user.phone,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: theme.textTheme.bodySmall,
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
            const SizedBox(height: 20),
          ],
          const AppSectionLabel('Account'),
          const SizedBox(height: 8),
          _SettingsGroup(
            children: [
              _SettingsTile(
                icon: Icons.badge_outlined,
                title: 'Documents',
                subtitle: 'License, RC, insurance',
                onTap: () => context.push('/documents'),
              ),
              _SettingsTile(
                icon: Icons.notifications_outlined,
                title: 'Notifications',
                subtitle: 'Assignments and alerts',
                onTap: () => context.push('/notifications'),
              ),
            ],
          ),
          const SizedBox(height: 20),
          const AppSectionLabel('Support'),
          const SizedBox(height: 8),
          _SettingsGroup(
            children: [
              _SettingsTile(
                icon: Icons.headset_mic_outlined,
                title: 'Fleet support',
                subtitle: 'Call operations or log an issue',
                onTap: () => context.push('/support'),
              ),
              _SettingsTile(
                icon: Icons.privacy_tip_outlined,
                title: 'Privacy & security',
                subtitle: 'How we use driver data',
                onTap: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text(
                        'Tokens stay on this device. Location is sent only during assigned trips.',
                      ),
                    ),
                  );
                },
              ),
            ],
          ),
          const SizedBox(height: 20),
          const AppSectionLabel('About'),
          const SizedBox(height: 8),
          const _SettingsGroup(
            children: [
              _SettingsTile(
                icon: Icons.info_outline_rounded,
                title: 'App version',
                trailingText: AppConstants.appVersion,
              ),
            ],
          ),
          const SizedBox(height: 28),
          OutlinedButton.icon(
            icon: const Icon(Icons.logout_rounded, color: AppConstants.errorColor),
            label: const Text(
              'LOG OUT',
              style: TextStyle(
                color: AppConstants.errorColor,
                fontWeight: FontWeight.w800,
              ),
            ),
            style: OutlinedButton.styleFrom(
              side: const BorderSide(color: AppConstants.errorColor),
            ),
            onPressed: () async {
              final confirm = await showLogoutSheet(context);
              if (!confirm) return;
              await ref.read(analyticsServiceProvider).clearUser();
              await ref.read(authNotifierProvider.notifier).logout();
              if (context.mounted) context.go('/login');
            },
          ),
        ],
        ),
      ),
    );
  }
}

class _SettingsGroup extends StatelessWidget {
  final List<Widget> children;

  const _SettingsGroup({required this.children});

  @override
  Widget build(BuildContext context) {
    return AppSurfaceCard(
      padding: EdgeInsets.zero,
      child: Column(
        children: [
          for (var i = 0; i < children.length; i++) ...[
            if (i > 0) const Divider(height: 1, indent: 56),
            children[i],
          ],
        ],
      ),
    );
  }
}

class _SettingsTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? subtitle;
  final String? trailingText;
  final VoidCallback? onTap;

  const _SettingsTile({
    required this.icon,
    required this.title,
    this.subtitle,
    this.trailingText,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return ListTile(
      onTap: onTap,
      leading: Container(
        width: 36,
        height: 36,
        decoration: BoxDecoration(
          color: AppConstants.bgLight,
          borderRadius: BorderRadius.circular(10),
        ),
        child: Icon(icon, size: 20, color: AppConstants.navy),
      ),
      title: Text(
        title,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: theme.textTheme.titleMedium,
      ),
      subtitle: subtitle == null
          ? null
          : Text(
              subtitle!,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: theme.textTheme.bodySmall,
            ),
      trailing: trailingText != null
          ? Text(trailingText!, style: theme.textTheme.bodySmall)
          : (onTap == null
              ? null
              : const Icon(Icons.chevron_right_rounded,
                  color: AppConstants.textSecondaryLight)),
    );
  }
}
