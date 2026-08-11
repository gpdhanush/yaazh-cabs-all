import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:yaazh_cabs/app/constants.dart';
import 'package:yaazh_cabs/core/widgets/app_surface.dart';
import 'package:yaazh_cabs/core/widgets/driver_avatar.dart';
import 'package:yaazh_cabs/core/widgets/status_chip.dart';
import 'package:yaazh_cabs/features/auth/presentation/auth_viewmodel.dart';
import 'package:yaazh_cabs/features/profile/data/driver_profile_repository.dart';

class ProfilePage extends ConsumerWidget {
  const ProfilePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final user = ref.watch(authNotifierProvider).user;
    final vehicle = ref.watch(assignedVehicleProvider);

    return Scaffold(
      backgroundColor: AppConstants.bgLight,
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
          ? Center(
              child: Text('No profile loaded.', style: theme.textTheme.bodyMedium),
            )
          : SafeArea(
              top: false,
              child: RefreshIndicator(
                color: AppConstants.gold,
                onRefresh: () async {
                  await ref.read(authNotifierProvider.notifier).refreshProfile();
                  ref.invalidate(assignedVehicleProvider);
                },
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
                  children: [
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          colors: [AppConstants.navy, AppConstants.black],
                        ),
                        borderRadius: BorderRadius.circular(22),
                      ),
                      child: Column(
                        children: [
                          DriverAvatar(
                            name: user.name,
                            imageUrl: user.profileImageUrl,
                            radius: 42,
                          ),
                          const SizedBox(height: 12),
                          Text(
                            user.name,
                            textAlign: TextAlign.center,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: theme.textTheme.headlineSmall?.copyWith(
                              color: AppConstants.white,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            user.phone,
                            style: theme.textTheme.bodyMedium?.copyWith(
                              color: AppConstants.white.withValues(alpha: 0.72),
                            ),
                          ),
                          const SizedBox(height: 12),
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            alignment: WrapAlignment.center,
                            children: [
                              StatusChip.forStatus(user.verificationStatus),
                              StatusChip.forStatus(user.onlineStatus),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                    AppSurfaceCard(
                      padding: EdgeInsets.zero,
                      child: Column(
                        children: [
                          _InfoRow(
                            icon: Icons.star_rounded,
                            iconColor: AppConstants.gold,
                            label: 'Average rating',
                            value: '${user.ratingAvg.toStringAsFixed(1)} ★',
                            onTap: () => context.push('/ratings'),
                          ),
                          const Divider(height: 1),
                          _InfoRow(
                            icon: Icons.route_rounded,
                            label: 'Completed trips',
                            value: '${user.totalCompletedTrips}',
                          ),
                          const Divider(height: 1),
                          _InfoRow(
                            icon: Icons.email_outlined,
                            label: 'Email',
                            value: user.email?.isNotEmpty == true
                                ? user.email!
                                : 'Not specified',
                          ),
                          const Divider(height: 1),
                          _InfoRow(
                            icon: Icons.home_outlined,
                            label: 'Address',
                            value: user.address?.isNotEmpty == true
                                ? user.address!
                                : 'Not specified',
                          ),
                          const Divider(height: 1),
                          _InfoRow(
                            icon: Icons.badge_outlined,
                            label: 'License',
                            value: user.licenseNo?.isNotEmpty == true
                                ? '${user.licenseNo}${user.licenseExpiryDate != null ? ' · exp ${user.licenseExpiryDate}' : ''}'
                                : 'Set by fleet admin',
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                    vehicle.when(
                      loading: () => const AppSurfaceCard(
                        child: Text('Loading assigned vehicle…'),
                      ),
                      error: (_, _) => const SizedBox.shrink(),
                      data: (cab) {
                        if (cab == null) {
                          return AppSurfaceCard(
                            child: Text(
                              'No vehicle assigned yet. Fleet admin will link a cab to this profile.',
                              style: theme.textTheme.bodyMedium?.copyWith(
                                color: AppConstants.textSecondaryLight,
                              ),
                            ),
                          );
                        }
                        return AppSurfaceCard(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Assigned vehicle', style: theme.textTheme.titleMedium),
                              const SizedBox(height: 8),
                              Text(cab.vehicleName, style: theme.textTheme.headlineSmall),
                              const SizedBox(height: 4),
                              Text(
                                [
                                  if (cab.registrationNo != null) cab.registrationNo,
                                  if (cab.categoryName != null) cab.categoryName,
                                  if (cab.color != null) cab.color,
                                  if (cab.fuelType != null) cab.fuelType,
                                ].join(' · '),
                                style: theme.textTheme.bodySmall,
                              ),
                            ],
                          ),
                        );
                      },
                    ),
                    const SizedBox(height: 16),
                    ElevatedButton.icon(
                      icon: const Icon(Icons.edit_outlined),
                      label: const Text('EDIT PROFILE'),
                      onPressed: () => context.push('/profile/edit'),
                    ),
                    const SizedBox(height: 10),
                    OutlinedButton.icon(
                      icon: const Icon(Icons.star_outline_rounded),
                      label: const Text('RATINGS'),
                      onPressed: () => context.push('/ratings'),
                    ),
                    const SizedBox(height: 10),
                    OutlinedButton.icon(
                      icon: const Icon(Icons.settings_outlined),
                      label: const Text('SETTINGS'),
                      onPressed: () => context.push('/settings'),
                    ),
                  ],
                ),
              ),
            ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final Color? iconColor;
  final String label;
  final String value;
  final VoidCallback? onTap;

  const _InfoRow({
    required this.icon,
    required this.label,
    required this.value,
    this.iconColor,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return ListTile(
      onTap: onTap,
      leading: Icon(icon, color: iconColor ?? AppConstants.navy),
      title: Text(label, style: theme.textTheme.bodySmall),
      subtitle: Text(
        value,
        maxLines: 2,
        overflow: TextOverflow.ellipsis,
        style: theme.textTheme.titleMedium,
      ),
      trailing: onTap == null ? null : const Icon(Icons.chevron_right_rounded),
    );
  }
}
