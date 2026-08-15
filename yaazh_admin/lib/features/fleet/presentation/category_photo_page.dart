import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_cropper/image_cropper.dart';
import 'package:image_picker/image_picker.dart';
import 'package:yaazh_admin/core/image_encode.dart';
import 'package:yaazh_admin/core/network/api_exception.dart';
import 'package:yaazh_admin/core/network/media_url.dart';
import 'package:yaazh_admin/core/widgets/app_toast.dart';
import 'package:yaazh_admin/core/widgets/coming_soon.dart';
import 'package:yaazh_admin/core/widgets/confirm_sheet.dart';
import 'package:yaazh_admin/core/widgets/keyboard_dismiss.dart';
import 'package:yaazh_admin/core/widgets/ya_bottom_sheet.dart';
import 'package:yaazh_admin/core/widgets/ya_danger_button.dart';
import 'package:yaazh_admin/core/widgets/ya_loader.dart';
import 'package:yaazh_admin/features/fleet/data/fleet_repository.dart';
import 'package:yaazh_admin/features/fleet/domain/vehicle.dart';

class CategoryPhotoPage extends ConsumerStatefulWidget {
  final String categoryId;

  const CategoryPhotoPage({super.key, required this.categoryId});

  @override
  ConsumerState<CategoryPhotoPage> createState() => _CategoryPhotoPageState();
}

class _CategoryPhotoPageState extends ConsumerState<CategoryPhotoPage> {
  bool _busy = false;
  int? _bust;

  Future<void> _pickPhoto(VehicleCategory category) async {
    hideKeyboard();
    final source = await showYaActionSheet<ImageSource>(
      context: context,
      title: 'Fleet photo',
      actions: const [
        YaSheetAction(
          value: ImageSource.gallery,
          label: 'Choose from gallery',
          icon: Icons.photo_library_rounded,
        ),
        YaSheetAction(
          value: ImageSource.camera,
          label: 'Take a photo',
          icon: Icons.photo_camera_rounded,
        ),
      ],
    );
    if (source == null || !mounted) return;
    final toolbarColor = Theme.of(context).colorScheme.primary;
    final prepared = await pickAndPrepareImage(
      source: source,
      toolbarColor: toolbarColor,
      shape: ImageCropShape.rectangle,
      title: 'Crop fleet photo',
      aspectRatio: const CropAspectRatio(ratioX: 16, ratioY: 10),
      maxWidth: 1600,
      maxHeight: 1000,
    );
    if (prepared == null) return;

    setState(() => _busy = true);
    try {
      final repo = ref.read(fleetRepositoryProvider);
      final stored = await repo.uploadCategoryImage(prepared.path);
      await repo.updateCategory(category.id, {'image_url': stored});
      invalidateFleetCaches(ref, categoryId: category.id);
      setState(() => _bust = DateTime.now().millisecondsSinceEpoch);
      showSuccessToast('Fleet photo updated');
    } catch (e) {
      showErrorToast(e is ApiException ? e.message : e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _removePhoto(VehicleCategory category) async {
    hideKeyboard();
    final ok = await showConfirmSheet(
      context,
      title: 'Remove photo?',
      message: 'This category will show without an image on the website fleet section.',
      actionLabel: 'Remove photo',
      icon: Icons.hide_image_outlined,
    );
    if (!ok) return;
    setState(() => _busy = true);
    try {
      await ref.read(fleetRepositoryProvider).updateCategory(category.id, {
        'image_url': null,
      });
      invalidateFleetCaches(ref, categoryId: category.id);
      setState(() => _bust = DateTime.now().millisecondsSinceEpoch);
      showSuccessToast('Fleet photo removed');
    } catch (e) {
      showErrorToast(e is ApiException ? e.message : e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(vehicleCategoryDetailProvider(widget.categoryId));
    final theme = Theme.of(context);

    return KeyboardDismiss(
      child: Scaffold(
        appBar: AppBar(title: const Text('Fleet photo')),
        body: async.when(
          loading: () => const Center(child: YaLoader()),
          error: (err, _) => EmptyState(
            title: 'Could not load category',
            subtitle: err.toString(),
            icon: Icons.cloud_off_rounded,
          ),
          data: (category) {
            var url = resolveMediaUrl(category.imageUrl);
            if (url != null && _bust != null) {
              url = '$url${url.contains('?') ? '&' : '?'}t=$_bust';
            }
            return ListView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
              children: [
                Text(category.name, style: theme.textTheme.headlineSmall),
                const SizedBox(height: 4),
                Text(
                  '${category.seatingCapacity} seats · shown on the website fleet section',
                  style: theme.textTheme.bodySmall,
                ),
                const SizedBox(height: 16),
                AspectRatio(
                  aspectRatio: 16 / 10,
                  child: Material(
                    color: theme.colorScheme.surface,
                    clipBehavior: Clip.antiAlias,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                      side: BorderSide(color: theme.dividerColor),
                    ),
                    child: url == null
                        ? ColoredBox(
                            color: theme.colorScheme.primary.withValues(alpha: 0.08),
                            child: const Center(
                              child: Icon(Icons.directions_car_outlined, size: 48),
                            ),
                          )
                        : CachedNetworkImage(
                            imageUrl: url,
                            fit: BoxFit.cover,
                            placeholder: (_, _) => const Center(child: YaLoader()),
                            errorWidget: (_, _, _) =>
                                const Icon(Icons.broken_image_outlined, size: 48),
                          ),
                  ),
                ),
                const SizedBox(height: 20),
                ElevatedButton.icon(
                  onPressed: _busy ? null : () => _pickPhoto(category),
                  icon: const Icon(Icons.add_photo_alternate_rounded),
                  label: Text(_busy
                      ? 'UPLOADING…'
                      : url == null
                          ? 'UPLOAD PHOTO'
                          : 'CHANGE PHOTO'),
                ),
                if (url != null) ...[
                  const SizedBox(height: 10),
                  YaDangerButton(
                    onPressed: _busy ? null : () => _removePhoto(category),
                    icon: Icons.hide_image_outlined,
                    label: 'REMOVE PHOTO',
                  ),
                ],
              ],
            );
          },
        ),
      ),
    );
  }
}
