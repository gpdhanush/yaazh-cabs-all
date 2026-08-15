import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:yaazh_admin/app/constants.dart';
import 'package:yaazh_admin/core/image_encode.dart';
import 'package:yaazh_admin/core/network/api_exception.dart';
import 'package:yaazh_admin/core/network/media_url.dart';
import 'package:yaazh_admin/core/widgets/app_toast.dart';
import 'package:yaazh_admin/core/widgets/coming_soon.dart';
import 'package:yaazh_admin/core/widgets/confirm_sheet.dart';
import 'package:yaazh_admin/core/widgets/keyboard_dismiss.dart';
import 'package:yaazh_admin/core/widgets/ya_bottom_sheet.dart';
import 'package:yaazh_admin/core/widgets/ya_dropdown.dart';
import 'package:yaazh_admin/core/widgets/ya_field.dart';
import 'package:yaazh_admin/core/widgets/ya_loader.dart';
import 'package:yaazh_admin/features/gallery/data/gallery_repository.dart';
import 'package:yaazh_admin/features/gallery/domain/gallery.dart';

class GalleryPage extends ConsumerStatefulWidget {
  const GalleryPage({super.key});

  @override
  ConsumerState<GalleryPage> createState() => _GalleryPageState();
}

class _GalleryPageState extends ConsumerState<GalleryPage> {
  final _caption = TextEditingController();
  bool _uploading = false;

  @override
  void dispose() {
    _caption.dispose();
    super.dispose();
  }

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
    final caption = _caption.text.trim();
    var added = 0;
    try {
      final repo = ref.read(galleryRepositoryProvider);
      for (var i = 0; i < files.length; i++) {
        final prepared = await encodeUploadJpeg(files[i].path, maxWidth: 1600);
        final stored = await repo.uploadImage(prepared.path);
        await repo.addImage(
          groupId: group.id,
          imageUrl: stored,
          caption: caption.isEmpty ? null : caption,
          displayOrder: group.images.length + i + 1,
        );
        added++;
      }
      _caption.clear();
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

    return KeyboardDismiss(
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Gallery'),
          actions: [
            IconButton(
              tooltip: 'Add group',
              onPressed: _createGroup,
              icon: const Icon(Icons.create_new_folder_outlined),
            ),
          ],
        ),
        floatingActionButton: async.maybeWhen(
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
        ),
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
                    const SliverFillRemaining(
                      child: EmptyState(
                        title: 'No gallery groups',
                        subtitle: 'Create a group such as Cars — Outside, then add photos for the website.',
                        icon: Icons.photo_library_outlined,
                      ),
                    )
                  else ...[
                    SliverToBoxAdapter(
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                        child: Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            for (final g in groups)
                              ChoiceChip(
                                label: Text('${g.title} (${g.images.length})'),
                                selected: selected?.id == g.id,
                                onSelected: (_) {
                                  ref.read(selectedGalleryGroupIdProvider.notifier).state = g.id;
                                },
                              ),
                          ],
                        ),
                      ),
                    ),
                    if (selected != null) ...[
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
                          child: Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      selected.title,
                                      style: Theme.of(context).textTheme.titleLarge,
                                    ),
                                    Text(
                                      selected.typeLabel,
                                      style: Theme.of(context).textTheme.bodySmall,
                                    ),
                                  ],
                                ),
                              ),
                              TextButton.icon(
                                onPressed: () => _deleteGroup(selected!),
                                icon: const Icon(Icons.delete_outline_rounded),
                                label: const Text('Delete'),
                                style: TextButton.styleFrom(foregroundColor: AppColors.salmon),
                              ),
                            ],
                          ),
                        ),
                      ),
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                          child: YaTextField(
                            controller: _caption,
                            label: 'Caption (optional)',
                            hint: 'Applies to the next photos you add',
                            textInputAction: TextInputAction.done,
                            enabled: !_uploading,
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
                      if (selected.images.isEmpty)
                        const SliverToBoxAdapter(
                          child: Padding(
                            padding: EdgeInsets.only(top: 24),
                            child: EmptyState(
                              title: 'No photos yet',
                              subtitle: 'Tap Add photos to upload images for this group.',
                              icon: Icons.add_photo_alternate_outlined,
                            ),
                          ),
                        )
                      else
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
                                  onEditCaption: () => _editCaption(image),
                                  onDelete: () => _deleteImage(image),
                                );
                              },
                              childCount: selected.images.length,
                            ),
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

class _PhotoTile extends StatelessWidget {
  final GalleryImage image;
  final VoidCallback onOpen;
  final VoidCallback onEditCaption;
  final VoidCallback onDelete;

  const _PhotoTile({
    required this.image,
    required this.onOpen,
    required this.onEditCaption,
    required this.onDelete,
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
                  Positioned(
                    top: 8,
                    right: 8,
                    child: Material(
                      color: Colors.white,
                      shape: const CircleBorder(),
                      child: IconButton(
                        visualDensity: VisualDensity.compact,
                        tooltip: 'Delete photo',
                        onPressed: onDelete,
                        icon: const Icon(Icons.delete_outline_rounded, color: AppColors.salmon),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
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
                          : 'No caption',
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
        YaTextField(
          controller: _caption,
          label: 'Caption',
          hint: 'e.g. Outside front · Inside dashboard',
          maxLength: 180,
          textInputAction: TextInputAction.done,
          enabled: !_saving,
          onFieldSubmitted: (_) => _save(),
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
