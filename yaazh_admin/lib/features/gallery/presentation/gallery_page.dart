import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:yaazh_admin/core/auth/permissions.dart';
import 'package:yaazh_admin/core/image_encode.dart';
import 'package:yaazh_admin/core/network/api_exception.dart';
import 'package:yaazh_admin/core/network/media_url.dart';
import 'package:yaazh_admin/core/widgets/app_toast.dart';
import 'package:yaazh_admin/core/widgets/coming_soon.dart';
import 'package:yaazh_admin/core/widgets/confirm_sheet.dart';
import 'package:yaazh_admin/core/widgets/keyboard_dismiss.dart';
import 'package:yaazh_admin/core/widgets/ya_bottom_sheet.dart';
import 'package:yaazh_admin/core/widgets/ya_danger_button.dart';
import 'package:yaazh_admin/core/widgets/ya_dropdown.dart';
import 'package:yaazh_admin/core/widgets/ya_field.dart';
import 'package:yaazh_admin/core/widgets/ya_loader.dart';
import 'package:yaazh_admin/features/auth/presentation/auth_viewmodel.dart';
import 'package:yaazh_admin/features/gallery/data/gallery_repository.dart';
import 'package:yaazh_admin/features/gallery/domain/gallery.dart';

class GalleryPage extends ConsumerStatefulWidget {
  const GalleryPage({super.key});

  @override
  ConsumerState<GalleryPage> createState() => _GalleryPageState();
}

class _GalleryPageState extends ConsumerState<GalleryPage> {
  bool _uploading = false;
  bool _gridView = true;

  GalleryGroup? _selected(List<GalleryGroup> groups) {
    final id = ref.read(selectedGalleryGroupIdProvider);
    if (id != null) {
      for (final g in groups) {
        if (g.id == id) return g;
      }
    }
    return groups.isEmpty ? null : groups.first;
  }

  Future<void> _createGroup() async {
    hideKeyboard();
    final created = await showYaSheet<GalleryGroup>(
      context: context,
      builder: (ctx) => _NewGroupSheet(
        nextOrder: (ref.read(galleryGroupsProvider).valueOrNull?.length ?? 0) + 1,
      ),
    );
    if (created == null) return;
    ref.read(selectedGalleryGroupIdProvider.notifier).state = created.id;
    invalidateGalleryCaches(ref);
    showSuccessToast('Group created');
  }

  Future<void> _deleteGroup(GalleryGroup group) async {
    hideKeyboard();
    final ok = await showConfirmSheet(
      context,
      title: 'Delete group?',
      message:
          '“${group.title}” and all ${group.images.length} photo${group.images.length == 1 ? '' : 's'} will be removed permanently.',
      actionLabel: 'Delete group',
      icon: Icons.folder_delete_rounded,
    );
    if (!ok) return;
    try {
      await ref.read(galleryRepositoryProvider).deleteGroup(group.id);
      ref.read(selectedGalleryGroupIdProvider.notifier).state = null;
      invalidateGalleryCaches(ref);
      showSuccessToast('Group deleted');
    } catch (e) {
      showErrorToast(e is ApiException ? e.message : e.toString());
    }
  }

  Future<void> _deleteImage(GalleryImage image) async {
    hideKeyboard();
    final ok = await showConfirmSheet(
      context,
      title: 'Delete photo?',
      message: image.caption?.trim().isNotEmpty == true
          ? 'Remove “${image.caption!.trim()}” from this group?'
          : 'This photo will be removed from the website gallery.',
      actionLabel: 'Delete photo',
      icon: Icons.delete_outline_rounded,
    );
    if (!ok) return;
    try {
      await ref.read(galleryRepositoryProvider).deleteImage(image.id);
      invalidateGalleryCaches(ref);
      showSuccessToast('Photo deleted');
    } catch (e) {
      showErrorToast(e is ApiException ? e.message : e.toString());
    }
  }

  Future<void> _editCaption(GalleryImage image) async {
    hideKeyboard();
    final saved = await showYaSheet<bool>(
      context: context,
      builder: (ctx) => _EditCaptionSheet(image: image),
    );
    if (saved == true) {
      invalidateGalleryCaches(ref);
      showSuccessToast('Caption saved');
    }
  }

  Future<void> _addPhotos(GalleryGroup group) async {
    hideKeyboard();
    final source = await showYaActionSheet<ImageSource>(
      context: context,
      title: 'Add photos',
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

    final picker = ImagePicker();
    final files = <XFile>[];
    if (source == ImageSource.camera) {
      final shot = await picker.pickImage(source: ImageSource.camera, imageQuality: 95);
      if (shot != null) files.add(shot);
    } else {
      files.addAll(await picker.pickMultiImage(imageQuality: 95));
    }
    if (files.isEmpty) return;

    setState(() => _uploading = true);
    var added = 0;
    try {
      final repo = ref.read(galleryRepositoryProvider);
      for (var i = 0; i < files.length; i++) {
        final prepared = await encodeUploadJpeg(files[i].path, maxWidth: 1600);
        final stored = await repo.uploadImage(prepared.path);
        await repo.addImage(
          groupId: group.id,
          imageUrl: stored,
          displayOrder: group.images.length + i + 1,
        );
        added++;
      }
      invalidateGalleryCaches(ref);
      showSuccessToast(added == 1 ? 'Photo added' : '$added photos added');
    } catch (e) {
      showErrorToast(e is ApiException ? e.message : e.toString());
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  void _preview(GalleryImage image) {
    final url = resolveMediaUrl(image.imageUrl);
    if (url == null) return;
    showDialog<void>(
      context: context,
      builder: (ctx) {
        return Dialog(
          insetPadding: const EdgeInsets.all(16),
          backgroundColor: Colors.black,
          child: Stack(
            children: [
              InteractiveViewer(
                child: CachedNetworkImage(
                  imageUrl: url,
                  fit: BoxFit.contain,
                  width: double.infinity,
                  height: MediaQuery.sizeOf(ctx).height * 0.7,
                ),
              ),
              Positioned(
                top: 8,
                right: 8,
                child: IconButton.filled(
                  style: IconButton.styleFrom(backgroundColor: Colors.black54),
                  onPressed: () => Navigator.of(ctx).pop(),
                  icon: const Icon(Icons.close_rounded),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(galleryGroupsProvider);
    final selectedId = ref.watch(selectedGalleryGroupIdProvider);
    final user = ref.watch(authNotifierProvider).user;
    final canManage = canManageGallery(user);

    return KeyboardDismiss(
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Gallery'),
          actions: [
            if (canManage)
              IconButton(
                tooltip: 'Add group',
                onPressed: _createGroup,
                icon: const Icon(Icons.create_new_folder_outlined),
              ),
          ],
        ),
        floatingActionButton: canManage
            ? async.maybeWhen(
                data: (groups) {
                  final group = _selected(groups);
                  if (group == null || _uploading) return null;
                  return FloatingActionButton.extended(
                    onPressed: () => _addPhotos(group),
                    icon: const Icon(Icons.add_photo_alternate_rounded),
                    label: const Text('Add photos'),
                  );
                },
                orElse: () => null,
              )
            : null,
        body: async.when(
          loading: () => const Center(child: YaLoader()),
          error: (err, _) => EmptyState(
            title: 'Could not load gallery',
            subtitle: err.toString(),
            icon: Icons.cloud_off_rounded,
          ),
          data: (groups) {
            GalleryGroup? selected;
            if (selectedId != null) {
              for (final g in groups) {
                if (g.id == selectedId) selected = g;
              }
            }
            selected ??= groups.isEmpty ? null : groups.first;

            return RefreshIndicator(
              onRefresh: () async {
                invalidateGalleryCaches(ref);
                await ref.read(galleryGroupsProvider.future);
              },
              child: CustomScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                slivers: [
                  if (groups.isEmpty)
                    SliverFillRemaining(
                      child: EmptyState(
                        title: 'No gallery groups',
                        subtitle: canManage
                            ? 'Create a group such as Cars — Outside, then add photos for the website.'
                            : 'No photos have been published yet.',
                        icon: Icons.photo_library_outlined,
                      ),
                    )
                  else ...[
                    SliverToBoxAdapter(
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                        child: YaDropdown<String>(
                          label: 'Group',
                          hint: 'Select a group',
                          value: selected?.id,
                          items: [
                            for (final g in groups)
                              DropdownMenuItem(
                                value: g.id,
                                child: Text('${g.title} (${g.images.length})'),
                              ),
                          ],
                          onChanged: (id) {
                            if (id == null) return;
                            ref.read(selectedGalleryGroupIdProvider.notifier).state = id;
                          },
                        ),
                      ),
                    ),
                    if (selected != null) ...[
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                          child: Row(
                            children: [
                              Expanded(
                                child: Text(
                                  selected.typeLabel,
                                  style: Theme.of(context).textTheme.bodySmall,
                                ),
                              ),
                              if (canManage)
                                YaDangerButton(
                                  expand: false,
                                  onPressed: () => _deleteGroup(selected!),
                                  icon: Icons.delete_outline_rounded,
                                  label: 'Delete',
                                ),
                            ],
                          ),
                        ),
                      ),
                      if (_uploading)
                        const SliverToBoxAdapter(
                          child: Padding(
                            padding: EdgeInsets.fromLTRB(16, 0, 16, 16),
                            child: Row(
                              children: [
                                YaLoader(size: 20),
                                SizedBox(width: 12),
                                Text('Uploading photos…'),
                              ],
                            ),
                          ),
                        ),
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                          child: Row(
                            children: [
                              Expanded(
                                child: Text(
                                  selected.images.isEmpty
                                      ? 'Photos'
                                      : '${selected.images.length} photo${selected.images.length == 1 ? '' : 's'}',
                                  style: Theme.of(context).textTheme.titleMedium,
                                ),
                              ),
                              _ViewSwitch(
                                grid: _gridView,
                                onChanged: (grid) => setState(() => _gridView = grid),
                              ),
                            ],
                          ),
                        ),
                      ),
                      if (selected.images.isEmpty)
                        SliverToBoxAdapter(
                          child: Padding(
                            padding: const EdgeInsets.only(top: 8),
                            child: EmptyState(
                              title: 'No photos yet',
                              subtitle: canManage
                                  ? 'Tap Add photos to upload images for this group.'
                                  : 'Photos will appear here when they are published.',
                              icon: Icons.add_photo_alternate_outlined,
                            ),
                          ),
                        )
                      else if (_gridView)
                        SliverPadding(
                          padding: const EdgeInsets.fromLTRB(16, 0, 16, 96),
                          sliver: SliverGrid(
                            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                              crossAxisCount: 2,
                              mainAxisSpacing: 10,
                              crossAxisSpacing: 10,
                              childAspectRatio: 0.86,
                            ),
                            delegate: SliverChildBuilderDelegate(
                              (context, index) {
                                final image = selected!.images[index];
                                return _PhotoTile(
                                  image: image,
                                  onOpen: () => _preview(image),
                                  onEditCaption: canManage ? () => _editCaption(image) : null,
                                  onDelete: canManage ? () => _deleteImage(image) : null,
                                );
                              },
                              childCount: selected.images.length,
                            ),
                          ),
                        )
                      else
                        SliverPadding(
                          padding: const EdgeInsets.fromLTRB(16, 0, 16, 96),
                          sliver: SliverList.separated(
                            itemCount: selected.images.length,
                            separatorBuilder: (_, _) => const SizedBox(height: 10),
                            itemBuilder: (context, index) {
                              final image = selected!.images[index];
                              return _PhotoListTile(
                                image: image,
                                onOpen: () => _preview(image),
                                onEditCaption: canManage ? () => _editCaption(image) : null,
                                onDelete: canManage ? () => _deleteImage(image) : null,
                              );
                            },
                          ),
                        ),
                    ],
                  ],
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}

class _OptionalCaptionField extends StatelessWidget {
  final TextEditingController controller;
  final bool enabled;
  final String hint;

  const _OptionalCaptionField({
    required this.controller,
    required this.enabled,
    this.hint = 'Applies to the next photos you add',
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text(
              'Caption',
              style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
            ),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: theme.colorScheme.secondaryContainer,
                borderRadius: BorderRadius.circular(999),
              ),
              child: Text(
                'Optional',
                style: theme.textTheme.labelSmall?.copyWith(
                  color: theme.colorScheme.onSecondaryContainer,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 6),
        TextFormField(
          controller: controller,
          enabled: enabled,
          textInputAction: TextInputAction.done,
          maxLength: 180,
          decoration: InputDecoration(
            hintText: hint,
            counterText: '',
            prefixIcon: const Icon(Icons.short_text_rounded),
            suffixIcon: ListenableBuilder(
              listenable: controller,
              builder: (context, _) {
                if (controller.text.isEmpty) return const SizedBox.shrink();
                return IconButton(
                  tooltip: 'Clear caption',
                  onPressed: enabled ? controller.clear : null,
                  icon: const Icon(Icons.close_rounded),
                );
              },
            ),
          ),
        ),
      ],
    );
  }
}

class _ViewSwitch extends StatelessWidget {
  final bool grid;
  final ValueChanged<bool> onChanged;

  const _ViewSwitch({
    required this.grid,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final selected = theme.colorScheme.primary;
    final onSelected = theme.colorScheme.onPrimary;
    final idle = theme.colorScheme.onSurfaceVariant;

    return Material(
      color: theme.colorScheme.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: theme.dividerColor),
      ),
      clipBehavior: Clip.antiAlias,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _ViewSwitchButton(
            tooltip: 'Grid view',
            icon: Icons.grid_view_rounded,
            selected: grid,
            selectedColor: selected,
            onSelectedColor: onSelected,
            idleColor: idle,
            onTap: () => onChanged(true),
          ),
          _ViewSwitchButton(
            tooltip: 'List view',
            icon: Icons.view_list_rounded,
            selected: !grid,
            selectedColor: selected,
            onSelectedColor: onSelected,
            idleColor: idle,
            onTap: () => onChanged(false),
          ),
        ],
      ),
    );
  }
}

class _ViewSwitchButton extends StatelessWidget {
  final String tooltip;
  final IconData icon;
  final bool selected;
  final Color selectedColor;
  final Color onSelectedColor;
  final Color idleColor;
  final VoidCallback onTap;

  const _ViewSwitchButton({
    required this.tooltip,
    required this.icon,
    required this.selected,
    required this.selectedColor,
    required this.onSelectedColor,
    required this.idleColor,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: tooltip,
      child: InkWell(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          width: 40,
          height: 36,
          color: selected ? selectedColor : Colors.transparent,
          child: Icon(
            icon,
            size: 20,
            color: selected ? onSelectedColor : idleColor,
          ),
        ),
      ),
    );
  }
}

class _PhotoListTile extends StatelessWidget {
  final GalleryImage image;
  final VoidCallback onOpen;
  final VoidCallback? onEditCaption;
  final VoidCallback? onDelete;

  const _PhotoListTile({
    required this.image,
    required this.onOpen,
    this.onEditCaption,
    this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final url = resolveMediaUrl(image.imageUrl);
    final caption = image.caption?.trim();
    final hasCaption = caption != null && caption.isNotEmpty;

    return Material(
      color: theme.colorScheme.surface,
      clipBehavior: Clip.antiAlias,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: theme.dividerColor),
      ),
      child: InkWell(
        onTap: onOpen,
        child: Padding(
          padding: const EdgeInsets.all(10),
          child: Row(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: SizedBox(
                  width: 72,
                  height: 72,
                  child: url == null
                      ? ColoredBox(
                          color: theme.colorScheme.primary.withValues(alpha: 0.08),
                          child: const Icon(Icons.broken_image_outlined),
                        )
                      : CachedNetworkImage(
                          imageUrl: url,
                          fit: BoxFit.cover,
                          placeholder: (_, _) => const Center(child: YaLoader(size: 18)),
                          errorWidget: (_, _, _) => const Icon(Icons.broken_image_outlined),
                        ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      hasCaption ? caption : 'No caption',
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: hasCaption
                          ? theme.textTheme.titleSmall
                          : theme.textTheme.titleSmall?.copyWith(
                              color: theme.colorScheme.onSurfaceVariant,
                              fontWeight: FontWeight.w500,
                            ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      hasCaption ? 'Tap to preview' : 'Caption optional',
                      style: theme.textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
              if (onEditCaption != null)
                IconButton(
                  tooltip: 'Edit caption',
                  onPressed: onEditCaption,
                  icon: Icon(Icons.edit_outlined, color: theme.colorScheme.primary),
                ),
              if (onDelete != null)
                YaDangerIconButton(
                  tooltip: 'Delete photo',
                  onPressed: onDelete,
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _PhotoTile extends StatelessWidget {
  final GalleryImage image;
  final VoidCallback onOpen;
  final VoidCallback? onEditCaption;
  final VoidCallback? onDelete;

  const _PhotoTile({
    required this.image,
    required this.onOpen,
    this.onEditCaption,
    this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final url = resolveMediaUrl(image.imageUrl);
    return Material(
      color: theme.colorScheme.surface,
      clipBehavior: Clip.antiAlias,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: theme.dividerColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Expanded(
            child: InkWell(
              onTap: onOpen,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  if (url == null)
                    ColoredBox(
                      color: theme.colorScheme.primary.withValues(alpha: 0.08),
                      child: const Icon(Icons.broken_image_outlined),
                    )
                  else
                    CachedNetworkImage(
                      imageUrl: url,
                      fit: BoxFit.cover,
                      placeholder: (_, _) => const Center(child: YaLoader(size: 22)),
                      errorWidget: (_, _, _) => const Icon(Icons.broken_image_outlined),
                    ),
                  if (onDelete != null)
                    Positioned(
                      top: 8,
                      right: 8,
                      child: YaDangerIconButton(
                        tooltip: 'Delete photo',
                        onPressed: onDelete,
                      ),
                    ),
                ],
              ),
            ),
          ),
          if (onEditCaption != null)
            InkWell(
              onTap: onEditCaption,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(6, 4, 4, 6),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        image.caption?.trim().isNotEmpty == true
                            ? image.caption!.trim()
                            : 'No caption · optional',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: theme.textTheme.bodySmall,
                      ),
                    ),
                    IconButton(
                      visualDensity: VisualDensity.compact,
                      tooltip: 'Edit caption',
                      onPressed: onEditCaption,
                      icon: Icon(
                        Icons.edit_outlined,
                        size: 18,
                        color: theme.colorScheme.primary,
                      ),
                    ),
                  ],
                ),
              ),
            )
          else if (image.caption?.trim().isNotEmpty == true)
            Padding(
              padding: const EdgeInsets.fromLTRB(10, 8, 10, 10),
              child: Text(
                image.caption!.trim(),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.bodySmall,
              ),
            ),
        ],
      ),
    );
  }
}

class _NewGroupSheet extends ConsumerStatefulWidget {
  final int nextOrder;

  const _NewGroupSheet({required this.nextOrder});

  @override
  ConsumerState<_NewGroupSheet> createState() => _NewGroupSheetState();
}

class _NewGroupSheetState extends ConsumerState<_NewGroupSheet> {
  final _title = TextEditingController();
  String _type = 'cars_outside';
  bool _saving = false;

  @override
  void dispose() {
    _title.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final title = _title.text.trim();
    if (title.length < 2) {
      showErrorToast('Enter a group title');
      return;
    }
    setState(() => _saving = true);
    try {
      final created = await ref.read(galleryRepositoryProvider).createGroup(
            title: title,
            groupType: _type,
            displayOrder: widget.nextOrder,
          );
      if (mounted) Navigator.of(context).pop(created);
    } catch (e) {
      setState(() => _saving = false);
      showErrorToast(e is ApiException ? e.message : e.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text('New group', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 16),
        YaTextField(
          controller: _title,
          label: 'Title',
          required: true,
          hint: 'e.g. Cars — Outside',
          textCapitalization: TextCapitalization.words,
          enabled: !_saving,
        ),
        const SizedBox(height: 12),
        YaDropdown<String>(
          label: 'Type',
          value: _type,
          items: [
            for (final t in galleryGroupTypes)
              DropdownMenuItem(value: t.value, child: Text(t.label)),
          ],
          onChanged: _saving
              ? null
              : (value) {
                  if (value != null) setState(() => _type = value);
                },
        ),
        const SizedBox(height: 20),
        ElevatedButton(
          onPressed: _saving ? null : _save,
          child: Text(_saving ? 'Saving…' : 'Create group'),
        ),
        TextButton(
          onPressed: _saving ? null : () => Navigator.of(context).pop(),
          child: const Text('Cancel'),
        ),
      ],
    );
  }
}

class _EditCaptionSheet extends ConsumerStatefulWidget {
  final GalleryImage image;

  const _EditCaptionSheet({required this.image});

  @override
  ConsumerState<_EditCaptionSheet> createState() => _EditCaptionSheetState();
}

class _EditCaptionSheetState extends ConsumerState<_EditCaptionSheet> {
  late final TextEditingController _caption;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _caption = TextEditingController(text: widget.image.caption ?? '');
  }

  @override
  void dispose() {
    _caption.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      final value = _caption.text.trim();
      await ref.read(galleryRepositoryProvider).updateImage(
            widget.image.id,
            caption: value.isEmpty ? null : value,
          );
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      setState(() => _saving = false);
      showErrorToast(e is ApiException ? e.message : e.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text('Edit caption', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 16),
        _OptionalCaptionField(
          controller: _caption,
          enabled: !_saving,
          hint: 'e.g. Outside front · Inside dashboard',
        ),
        const SizedBox(height: 20),
        ElevatedButton(
          onPressed: _saving ? null : _save,
          child: Text(_saving ? 'Saving…' : 'Save caption'),
        ),
        TextButton(
          onPressed: _saving ? null : () => Navigator.of(context).pop(false),
          child: const Text('Cancel'),
        ),
      ],
    );
  }
}
