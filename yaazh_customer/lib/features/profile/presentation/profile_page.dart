import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:yaazh_customer/app/constants.dart';
import 'package:yaazh_customer/features/auth/presentation/auth_viewmodel.dart';

class ProfilePage extends ConsumerWidget {
  const ProfilePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authNotifierProvider).user;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Profile'),
        actions: [
          IconButton(
            tooltip: 'Settings',
            icon: const Icon(Icons.settings_outlined),
            onPressed: () => context.push('/settings'),
          ),
        ],
      ),
      body: user == null
          ? const Center(child: Text('No profile loaded.'))
          : ListView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
              children: [
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
                    ),
                    borderRadius: BorderRadius.circular(22),
                  ),
                  child: Column(
                    children: [
                      CircleAvatar(
                        radius: 38,
                        backgroundColor: AppConstants.accentColor,
                        child: Text(
                          user.name.isNotEmpty ? user.name[0].toUpperCase() : 'Y',
                          style: const TextStyle(
                            fontSize: 28,
                            fontWeight: FontWeight.w800,
                            color: Colors.black,
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        user.name,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 22,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        user.phone,
                        style: TextStyle(color: Colors.white.withValues(alpha: 0.7)),
                      ),
                      if (user.email != null && user.email!.isNotEmpty)
                        Text(
                          user.email!,
                          style: TextStyle(color: Colors.white.withValues(alpha: 0.55), fontSize: 13),
                        ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                _Tile(
                  icon: Icons.edit_outlined,
                  title: 'Edit profile',
                  subtitle: 'Name, email, city',
                  onTap: () => context.push('/profile/edit'),
                ),
                _Tile(
                  icon: Icons.bookmark_outline_rounded,
                  title: 'Saved places',
                  subtitle: 'Home, work, and frequent stops',
                  onTap: () => context.push('/saved-places'),
                ),
                _Tile(
                  icon: Icons.notifications_outlined,
                  title: 'Notifications',
                  subtitle: 'Trip updates and alerts',
                  onTap: () => context.push('/notifications'),
                ),
                _Tile(
                  icon: Icons.headset_mic_outlined,
                  title: 'Support',
                  subtitle: 'Tickets and messages',
                  onTap: () => context.push('/support'),
                ),
                _Tile(
                  icon: Icons.settings_outlined,
                  title: 'Settings',
                  subtitle: 'Theme and sign out',
                  onTap: () => context.push('/settings'),
                ),
              ],
            ),
    );
  }
}

class _Tile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  const _Tile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Material(
        color: Theme.of(context).cardColor,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
          side: const BorderSide(color: AppConstants.borderLight),
        ),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(14),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              children: [
                Icon(icon, color: AppConstants.primaryColor),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
                      Text(subtitle, style: const TextStyle(fontSize: 12, color: AppConstants.textSecondaryLight)),
                    ],
                  ),
                ),
                const Icon(Icons.chevron_right_rounded),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
