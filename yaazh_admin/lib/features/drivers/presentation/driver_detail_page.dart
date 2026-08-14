import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:yaazh_admin/app/constants.dart';
import 'package:yaazh_admin/app/theme.dart';
import 'package:yaazh_admin/core/format.dart';
import 'package:yaazh_admin/core/network/api_exception.dart';
import 'package:yaazh_admin/core/widgets/app_toast.dart';
import 'package:yaazh_admin/core/widgets/coming_soon.dart';
import 'package:yaazh_admin/core/widgets/confirm_sheet.dart';
import 'package:yaazh_admin/core/widgets/driver_avatar.dart';
import 'package:yaazh_admin/core/widgets/keyboard_dismiss.dart';
import 'package:yaazh_admin/core/widgets/status_chip.dart';
import 'package:yaazh_admin/core/widgets/ya_loader.dart';
import 'package:yaazh_admin/features/drivers/data/driver_repository.dart';
import 'package:yaazh_admin/features/drivers/domain/driver.dart';

class DriverDetailPage extends ConsumerStatefulWidget {
  final String driverId;

  const DriverDetailPage({super.key, required this.driverId});

  @override
  ConsumerState<DriverDetailPage> createState() => _DriverDetailPageState();
}

class _DriverDetailPageState extends ConsumerState<DriverDetailPage> {
  int? _photoBust;

  Future<void> _reload() async {
    invalidateDriverCaches(ref, id: widget.driverId);
    await ref.read(driverDetailProvider(widget.driverId).future);
  }

  Future<void> _pickPhoto() async {
    hideKeyboard();
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        final theme = Theme.of(ctx);
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: theme.colorScheme.surface,
                borderRadius: BorderRadius.circular(24),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const SizedBox(height: 8),
                  ListTile(
                    leading: const Icon(Icons.photo_library_rounded),
                    title: const Text('Choose from gallery'),
                    onTap: () => Navigator.pop(ctx, ImageSource.gallery),
                  ),
                  ListTile(
                    leading: const Icon(Icons.photo_camera_rounded),
                    title: const Text('Take a photo'),
                    onTap: () => Navigator.pop(ctx, ImageSource.camera),
                  ),
                  const SizedBox(height: 8),
                ],
              ),
            ),
          ),
        );
      },
    );
    if (source == null) return;

    final file = await ImagePicker().pickImage(
      source: source,
      maxWidth: 1200,
      imageQuality: 85,
    );
    if (file == null) return;

    try {
      await ref.read(driverRepositoryProvider).uploadPhoto(widget.driverId, file.path);
      setState(() => _photoBust = DateTime.now().millisecondsSinceEpoch);
      invalidateDriverCaches(ref, id: widget.driverId);
      showSuccessToast('Driver photo updated');
    } catch (e) {
      showErrorToast(e is ApiException ? e.message : e.toString());
    }
  }

  Future<void> _run(
    Future<Driver> Function() action, {
    required String success,
  }) async {
    hideKeyboard();
    try {
      await action();
      invalidateDriverCaches(ref, id: widget.driverId);
      showSuccessToast(success);
    } catch (e) {
      showErrorToast(e is ApiException ? e.message : e.toString());
    }
  }

  Future<void> _delete(Driver d) async {
    hideKeyboard();
    final ok = await showConfirmSheet(
      context,
      title: 'Delete driver?',
      message: '${d.name} will be removed from the fleet. This cannot be undone.',
      actionLabel: 'Delete',
      icon: Icons.delete_outline_rounded,
    );
    if (!ok) return;
    try {
      await ref.read(driverRepositoryProvider).delete(d.id);
      invalidateDriverCaches(ref, id: d.id);
      showSuccessToast('Driver deleted');
      if (mounted) context.go('/drivers');
    } catch (e) {
      showErrorToast(e is ApiException ? e.message : e.toString());
    }
  }

  Future<void> _block(Driver d) async {
    hideKeyboard();
    final ok = await showConfirmSheet(
      context,
      title: 'Block driver?',
      message: '${d.name} will be blocked, set offline, and marked inactive.',
      actionLabel: 'Block',
      icon: Icons.block_rounded,
    );
    if (!ok) return;
    await _run(
      () => ref.read(driverRepositoryProvider).block(d.id),
      success: 'Driver blocked',
    );
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(driverDetailProvider(widget.driverId));

    return KeyboardDismiss(
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Driver'),
          actions: [
            IconButton(
              tooltip: 'Edit',
              onPressed: () {
                hideKeyboard();
                context.push('/drivers/${widget.driverId}/edit');
              },
              icon: const Icon(Icons.edit_rounded),
            ),
          ],
        ),
        body: async.when(
          loading: () => const Center(child: YaLoader()),
          error: (err, _) => EmptyState(
            title: 'Could not load driver',
            subtitle: err.toString(),
            icon: Icons.cloud_off_rounded,
          ),
          data: (d) => RefreshIndicator(
            onRefresh: _reload,
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
              children: [
                _HeroCard(
                  driver: d,
                  photoBust: _photoBust,
                  onPhoto: _pickPhoto,
                ),
                const SizedBox(height: 12),
                if (d.phone.isNotEmpty)
                  OutlinedButton.icon(
                    onPressed: () => launchUrl(Uri.parse('tel:${d.phone}')),
                    icon: const Icon(Icons.call_rounded),
                    label: Text('Call ${d.phone}'),
                  ),
                if (d.verificationStatus == 'pending') ...[
                  const SizedBox(height: 8),
                  ElevatedButton(
                    onPressed: () => _run(
                      () => ref.read(driverRepositoryProvider).approve(d.id),
                      success: 'Driver approved',
                    ),
                    child: const Text('APPROVE'),
                  ),
                  const SizedBox(height: 8),
                  OutlinedButton(
                    onPressed: () => _run(
                      () => ref.read(driverRepositoryProvider).reject(d.id),
                      success: 'Driver rejected',
                    ),
                    child: const Text('REJECT'),
                  ),
                ],
                if (d.verificationStatus != 'blocked') ...[
                  const SizedBox(height: 8),
                  OutlinedButton(
                    onPressed: () => _block(d),
                    child: const Text('BLOCK'),
                  ),
                ],
                const SizedBox(height: 12),
                _Panel(
                  title: 'Profile',
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _kv('Name', d.name),
                      _kv('Phone', d.phone),
                      _kv('Email', d.email?.isNotEmpty == true ? d.email! : 'Not provided'),
                      _kv('Address', d.address?.isNotEmpty == true ? d.address! : '—'),
                      _kv('Active', d.isActive ? 'Yes' : 'No'),
                      _kv('Joined', formatDateTime(d.createdAt)),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                _Panel(
                  title: 'License',
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _kv('Number', d.licenseNo?.isNotEmpty == true ? d.licenseNo! : '—'),
                      _kv('Expiry', formatDate(d.licenseExpiryDate)),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                _Panel(
                  title: 'Status',
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Wrap(
                        spacing: 6,
                        runSpacing: 6,
                        children: [
                          StatusChip(
                            status: d.availabilityStatus,
                            label: DriverMeta.availabilityLabel(d.availabilityStatus),
                            tone: DriverMeta.availabilityColor(d.availabilityStatus),
                          ),
                          StatusChip(
                            status: d.verificationStatus,
                            label: DriverMeta.verificationLabel(d.verificationStatus),
                            tone: DriverMeta.verificationColor(d.verificationStatus),
                          ),
                          StatusChip(
                            status: d.onlineStatus,
                            label: DriverMeta.onlineLabel(d.onlineStatus),
                            tone: DriverMeta.onlineColor(d.onlineStatus),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      _kv('Rating', d.ratingAvg.toStringAsFixed(1)),
                      _kv('Completed trips', '${d.totalCompletedTrips}'),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(foregroundColor: AppColors.salmon),
                  onPressed: () => _delete(d),
                  icon: const Icon(Icons.delete_outline_rounded),
                  label: const Text('Delete driver'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _HeroCard extends StatelessWidget {
  final Driver driver;
  final int? photoBust;
  final VoidCallback onPhoto;

  const _HeroCard({
    required this.driver,
    required this.photoBust,
    required this.onPhoto,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(AppConstants.radiusL),
        border: Border.all(color: theme.dividerColor),
      ),
      child: Row(
        children: [
          GestureDetector(
            onTap: onPhoto,
            child: Stack(
              children: [
                DriverAvatar(
                  id: driver.id,
                  name: driver.name,
                  photoUrl: driver.photoUrl,
                  radius: 36,
                  cacheBust: photoBust,
                ),
                Positioned(
                  right: 0,
                  bottom: 0,
                  child: Container(
                    width: 24,
                    height: 24,
                    decoration: BoxDecoration(
                      color: theme.colorScheme.primary,
                      shape: BoxShape.circle,
                      border: Border.all(color: theme.colorScheme.surface, width: 2),
                    ),
                    child: Icon(Icons.camera_alt_rounded, size: 12, color: AppTheme.onPrimaryOf(theme.colorScheme.primary)),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(driver.name, style: theme.textTheme.titleMedium),
                const SizedBox(height: 4),
                Text(driver.phone, style: theme.textTheme.bodySmall),
                const SizedBox(height: 8),
                StatusChip(
                  status: driver.availabilityStatus,
                  label: DriverMeta.availabilityLabel(driver.availabilityStatus),
                  tone: DriverMeta.availabilityColor(driver.availabilityStatus),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Panel extends StatelessWidget {
  final String title;
  final Widget child;

  const _Panel({required this.title, required this.child});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(AppConstants.radiusL),
        border: Border.all(color: theme.dividerColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: theme.textTheme.titleMedium),
          const SizedBox(height: 10),
          child,
        ],
      ),
    );
  }
}

Widget _kv(String label, String value) {
  return Padding(
    padding: const EdgeInsets.only(bottom: 8),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 110,
          child: Text(label, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
        ),
        Expanded(child: Text(value)),
      ],
    ),
  );
}
