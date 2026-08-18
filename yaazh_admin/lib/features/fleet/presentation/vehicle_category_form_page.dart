import 'dart:io';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_cropper/image_cropper.dart';
import 'package:image_picker/image_picker.dart';
import 'package:yaazh_admin/core/image_encode.dart';
import 'package:yaazh_admin/core/network/api_exception.dart';
import 'package:yaazh_admin/core/network/media_url.dart';
import 'package:yaazh_admin/core/widgets/app_toast.dart';
import 'package:yaazh_admin/core/widgets/confirm_sheet.dart';
import 'package:yaazh_admin/core/widgets/keyboard_dismiss.dart';
import 'package:yaazh_admin/core/widgets/ya_bottom_sheet.dart';
import 'package:yaazh_admin/core/widgets/ya_danger_button.dart';
import 'package:yaazh_admin/core/widgets/ya_dropdown.dart';
import 'package:yaazh_admin/core/widgets/ya_field.dart';
import 'package:yaazh_admin/core/widgets/ya_loader.dart';
import 'package:yaazh_admin/core/widgets/ya_number_field.dart';
import 'package:yaazh_admin/features/fleet/data/fleet_repository.dart';
import 'package:yaazh_admin/features/fleet/domain/vehicle.dart';

class VehicleCategoryFormPage extends ConsumerStatefulWidget {
  final String? categoryId;

  const VehicleCategoryFormPage({super.key, this.categoryId});

  bool get isEdit => categoryId != null && categoryId!.isNotEmpty;

  @override
  ConsumerState<VehicleCategoryFormPage> createState() =>
      _VehicleCategoryFormPageState();
}

class _VehicleCategoryFormPageState extends ConsumerState<VehicleCategoryFormPage> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _slug = TextEditingController();
  final _seating = TextEditingController();
  final _luggage = TextEditingController();
  final _description = TextEditingController();
  final _oneWay = TextEditingController();
  final _roundTrip = TextEditingController();
  final _batta = TextEditingController();
  final _minKm = TextEditingController();
  final _displayOrder = TextEditingController(text: '0');

  bool _isActive = true;
  bool _slugTouched = false;
  bool _saving = false;
  bool _hydrated = false;
  String? _imageUrl;
  String? _pendingImagePath;
  int? _imageBust;

  @override
  void initState() {
    super.initState();
    if (widget.isEdit) {
      Future.microtask(_load);
    } else {
      _hydrated = true;
    }
  }

  @override
  void dispose() {
    _name.dispose();
    _slug.dispose();
    _seating.dispose();
    _luggage.dispose();
    _description.dispose();
    _oneWay.dispose();
    _roundTrip.dispose();
    _batta.dispose();
    _minKm.dispose();
    _displayOrder.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final c = await ref
          .read(fleetRepositoryProvider)
          .getCategory(widget.categoryId!);
      if (!mounted) return;
      _name.text = c.name;
      _slug.text = c.slug;
      _seating.text = '${c.seatingCapacity}';
      _luggage.text = c.luggageCapacity ?? '';
      _description.text = c.description ?? '';
      _oneWay.text = _numText(c.oneWayRatePerKm);
      _roundTrip.text = _numText(c.roundTripRatePerKm);
      _batta.text = _numText(c.driverBatta);
      _minKm.text = _numText(c.minimumKmPerDay);
      _displayOrder.text = '${c.displayOrder}';
      _isActive = c.isActive;
      _imageUrl = c.imageUrl;
      _slugTouched = true;
      setState(() => _hydrated = true);
    } catch (e) {
      if (!mounted) return;
      showErrorToast(e is ApiException ? e.message : e.toString());
      setState(() => _hydrated = true);
    }
  }

  String _numText(double value) {
    if (value == value.roundToDouble()) return '${value.toInt()}';
    return value.toString();
  }

  double _numOrZero(String value) {
    final n = double.tryParse(value.trim());
    if (n == null || n.isNaN || n < 0) return 0;
    return n;
  }

  void _onNameChanged(String value) {
    if (_slugTouched) return;
    _slug.text = slugifyCategoryName(value);
  }

  Map<String, dynamic> _payload() {
    return {
      'name': _name.text.trim(),
      'slug': _slug.text.trim(),
      'seating_capacity': int.parse(_seating.text.trim()),
      'luggage_capacity':
          _luggage.text.trim().isEmpty ? null : _luggage.text.trim(),
      'description':
          _description.text.trim().isEmpty ? null : _description.text.trim(),
      'image_url': _imageUrl?.trim().isNotEmpty == true ? _imageUrl!.trim() : null,
      'one_way_rate_per_km': _numOrZero(_oneWay.text),
      'round_trip_rate_per_km': _numOrZero(_roundTrip.text),
      'driver_batta': _numOrZero(_batta.text),
      'minimum_km_per_day': _numOrZero(_minKm.text),
      'display_order': int.tryParse(_displayOrder.text.trim()) ?? 0,
      'is_active': _isActive,
    };
  }

  Future<void> _pickPhoto() async {
    hideKeyboard();
    final source = await showYaActionSheet<ImageSource>(
      context: context,
      title: 'Category photo',
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
      title: 'Crop category photo',
      aspectRatio: const CropAspectRatio(ratioX: 16, ratioY: 10),
      maxWidth: 1600,
      maxHeight: 1000,
    );
    if (prepared == null || !mounted) return;

    setState(() => _saving = true);
    try {
      final stored = await ref
          .read(fleetRepositoryProvider)
          .uploadCategoryImage(prepared.path);
      setState(() {
        _imageUrl = stored;
        _pendingImagePath = prepared.path;
        _imageBust = DateTime.now().millisecondsSinceEpoch;
      });
      showSuccessToast('Photo ready — save to apply');
    } catch (e) {
      showErrorToast(e is ApiException ? e.message : e.toString());
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _removePhoto() async {
    hideKeyboard();
    final ok = await showConfirmSheet(
      context,
      title: 'Remove photo?',
      message: 'This category will show without an image on the website fleet section.',
      actionLabel: 'Remove photo',
      icon: Icons.hide_image_outlined,
    );
    if (!ok) return;
    setState(() {
      _imageUrl = null;
      _pendingImagePath = null;
      _imageBust = DateTime.now().millisecondsSinceEpoch;
    });
  }

  Future<void> _save() async {
    hideKeyboard();
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    try {
      final repo = ref.read(fleetRepositoryProvider);
      final body = _payload();
      if (widget.isEdit) {
        await repo.updateCategory(widget.categoryId!, body);
      } else {
        await repo.createCategory(body);
      }
      invalidateFleetCaches(ref, categoryId: widget.categoryId);
      showSuccessToast(widget.isEdit ? 'Category updated' : 'Category created');
      if (mounted) context.pop();
    } catch (e) {
      showErrorToast(e is ApiException ? e.message : e.toString());
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _delete() async {
    hideKeyboard();
    final ok = await showConfirmSheet(
      context,
      title: 'Delete category?',
      message:
          'Delete this category? Vehicles using it must be reassigned first.',
      actionLabel: 'Delete',
      icon: Icons.delete_outline_rounded,
    );
    if (!ok) return;
    setState(() => _saving = true);
    try {
      await ref.read(fleetRepositoryProvider).deleteCategory(widget.categoryId!);
      invalidateFleetCaches(ref, categoryId: widget.categoryId);
      showSuccessToast('Category deleted');
      if (mounted) context.pop();
    } catch (e) {
      showErrorToast(e is ApiException ? e.message : e.toString());
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Widget _photoPreview(BuildContext context, String? previewUrl) {
    final theme = Theme.of(context);
    if (_pendingImagePath != null) {
      return Image.file(
        File(_pendingImagePath!),
        fit: BoxFit.cover,
        width: double.infinity,
        height: double.infinity,
      );
    }
    if (previewUrl == null) {
      return ColoredBox(
        color: theme.colorScheme.primary.withValues(alpha: 0.08),
        child: const Center(
          child: Icon(Icons.directions_car_outlined, size: 48),
        ),
      );
    }
    return CachedNetworkImage(
      imageUrl: previewUrl,
      fit: BoxFit.cover,
      width: double.infinity,
      height: double.infinity,
      placeholder: (_, _) => const Center(child: YaLoader()),
      errorWidget: (_, _, _) =>
          const Icon(Icons.broken_image_outlined, size: 48),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    var previewUrl = _pendingImagePath != null
        ? null
        : resolveMediaUrl(_imageUrl);
    if (previewUrl != null && _imageBust != null) {
      previewUrl = '$previewUrl${previewUrl.contains('?') ? '&' : '?'}t=$_imageBust';
    }
    final hasPhoto = previewUrl != null || _pendingImagePath != null;

    return KeyboardDismiss(
      child: Scaffold(
        appBar: AppBar(
          title: Text(widget.isEdit ? 'Edit category' : 'Add vehicle category'),
        ),
        body: !_hydrated
            ? const Center(child: YaLoader())
            : Form(
                key: _formKey,
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
                  children: [
                    Text(
                      'Categories power fleet cards on the website and vehicle assignment.',
                      style: theme.textTheme.bodySmall,
                    ),
                    const SizedBox(height: 16),
                    const _SectionTitle(title: 'Basics'),
                    const SizedBox(height: 10),
                    YaTextField(
                      label: 'Name',
                      required: true,
                      hint: 'e.g. Innova Crysta',
                      controller: _name,
                      textCapitalization: TextCapitalization.words,
                      onChanged: _onNameChanged,
                      validator: (v) => (v == null || v.trim().length < 2)
                          ? 'Name is required'
                          : null,
                    ),
                    const SizedBox(height: 14),
                    YaTextField(
                      label: 'Slug',
                      required: true,
                      hint: 'innova-crysta',
                      controller: _slug,
                      onChanged: (_) => _slugTouched = true,
                      validator: (v) => (v == null || v.trim().length < 2)
                          ? 'Slug is required'
                          : null,
                    ),
                    const SizedBox(height: 14),
                    YaNumberField(
                      label: 'Seating capacity',
                      required: true,
                      hint: '4',
                      controller: _seating,
                      maxLength: 2,
                      validator: (v) {
                        final n = int.tryParse(v?.trim() ?? '');
                        if (n == null || n < 1) return 'Enter seats (1–50)';
                        if (n > 50) return 'Maximum 50 seats';
                        return null;
                      },
                    ),
                    const SizedBox(height: 14),
                    YaTextField(
                      label: 'Luggage',
                      hint: '2 bags',
                      controller: _luggage,
                      maxLength: 80,
                    ),
                    const SizedBox(height: 14),
                    YaTextField(
                      label: 'Description',
                      hint: 'Short description for the website',
                      controller: _description,
                      minLines: 3,
                      maxLines: 6,
                      textInputAction: TextInputAction.newline,
                    ),
                    const SizedBox(height: 20),
                    const _SectionTitle(title: 'Rates'),
                    const SizedBox(height: 10),
                    YaNumberField(
                      label: 'One-way rate (₹/km)',
                      hint: '0',
                      controller: _oneWay,
                      decimal: true,
                      maxLength: 8,
                    ),
                    const SizedBox(height: 14),
                    YaNumberField(
                      label: 'Round-trip rate (₹/km)',
                      hint: '0',
                      controller: _roundTrip,
                      decimal: true,
                      maxLength: 8,
                    ),
                    const SizedBox(height: 14),
                    YaNumberField(
                      label: 'Driver batta (₹)',
                      hint: '0',
                      controller: _batta,
                      decimal: true,
                      maxLength: 8,
                    ),
                    const SizedBox(height: 14),
                    YaNumberField(
                      label: 'Minimum km per day',
                      hint: '0',
                      controller: _minKm,
                      decimal: true,
                      maxLength: 8,
                    ),
                    const SizedBox(height: 20),
                    const _SectionTitle(title: 'Display'),
                    const SizedBox(height: 10),
                    YaNumberField(
                      label: 'Display order',
                      hint: '0',
                      controller: _displayOrder,
                      maxLength: 4,
                    ),
                    const SizedBox(height: 14),
                    YaDropdown<bool>(
                      label: 'Active',
                      value: _isActive,
                      items: const [
                        DropdownMenuItem(value: true, child: Text('Yes')),
                        DropdownMenuItem(value: false, child: Text('No')),
                      ],
                      onChanged: (v) {
                        if (v != null) setState(() => _isActive = v);
                      },
                    ),
                    const SizedBox(height: 20),
                    const _SectionTitle(title: 'Photo'),
                    const SizedBox(height: 10),
                    AspectRatio(
                      aspectRatio: 16 / 10,
                      child: Material(
                        color: theme.colorScheme.surface,
                        clipBehavior: Clip.antiAlias,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                          side: BorderSide(color: theme.dividerColor),
                        ),
                        child: _photoPreview(context, previewUrl),
                      ),
                    ),
                    const SizedBox(height: 12),
                    ElevatedButton.icon(
                      onPressed: _saving ? null : _pickPhoto,
                      icon: const Icon(Icons.add_photo_alternate_rounded),
                      label: Text(hasPhoto ? 'CHANGE PHOTO' : 'UPLOAD PHOTO'),
                    ),
                    if (hasPhoto) ...[
                      const SizedBox(height: 10),
                      YaDangerButton(
                        onPressed: _saving ? null : _removePhoto,
                        icon: Icons.hide_image_outlined,
                        label: 'REMOVE PHOTO',
                      ),
                    ],
                    const SizedBox(height: 24),
                    ElevatedButton(
                      onPressed: _saving ? null : _save,
                      child: Text(_saving ? 'SAVING…' : 'SAVE CATEGORY'),
                    ),
                    if (widget.isEdit) ...[
                      const SizedBox(height: 12),
                      YaDangerButton(
                        onPressed: _saving ? null : _delete,
                        label: 'DELETE CATEGORY',
                      ),
                    ],
                  ],
                ),
              ),
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  final String title;

  const _SectionTitle({required this.title});

  @override
  Widget build(BuildContext context) {
    return Text(
      title,
      style: Theme.of(context).textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w700,
          ),
    );
  }
}
