import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:yaazh_admin/core/network/api_exception.dart';
import 'package:yaazh_admin/core/widgets/app_toast.dart';
import 'package:yaazh_admin/core/widgets/confirm_sheet.dart';
import 'package:yaazh_admin/core/widgets/keyboard_dismiss.dart';
import 'package:yaazh_admin/core/widgets/ya_date_picker.dart';
import 'package:yaazh_admin/core/widgets/ya_dropdown.dart';
import 'package:yaazh_admin/core/widgets/ya_field.dart';
import 'package:yaazh_admin/core/widgets/ya_loader.dart';
import 'package:yaazh_admin/features/fleet/data/fleet_repository.dart';
import 'package:yaazh_admin/features/fleet/domain/vehicle.dart';

class VehicleFormPage extends ConsumerStatefulWidget {
  final String? vehicleId;

  const VehicleFormPage({super.key, this.vehicleId});

  bool get isEdit => vehicleId != null && vehicleId!.isNotEmpty;

  @override
  ConsumerState<VehicleFormPage> createState() => _VehicleFormPageState();
}

class _VehicleFormPageState extends ConsumerState<VehicleFormPage> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _registration = TextEditingController();
  final _model = TextEditingController();
  final _color = TextEditingController();

  String? _categoryId;
  String _fuel = 'diesel';
  bool _isActive = true;
  DateTime? _rc;
  DateTime? _insurance;
  DateTime? _permit;
  DateTime? _pollution;
  bool _saving = false;
  bool _hydrated = false;

  static const _fuels = ['petrol', 'diesel', 'cng', 'electric', 'hybrid', 'other'];

  @override
  void initState() {
    super.initState();
    Future.microtask(_load);
  }

  @override
  void dispose() {
    _name.dispose();
    _registration.dispose();
    _model.dispose();
    _color.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      await ref.read(vehicleCategoriesProvider.future);
      if (widget.isEdit) {
        final v = await ref.read(fleetRepositoryProvider).getById(widget.vehicleId!);
        if (!mounted) return;
        _hydrate(v);
      }
    } catch (e) {
      if (!mounted) return;
      showErrorToast(e is ApiException ? e.message : e.toString());
    } finally {
      if (mounted) setState(() => _hydrated = true);
    }
  }

  void _hydrate(FleetVehicle v) {
    _name.text = v.vehicleName;
    _registration.text = v.registrationNo ?? '';
    _model.text = v.modelName ?? '';
    _color.text = v.color ?? '';
    _categoryId = v.categoryId;
    _fuel = v.fuelType;
    _isActive = v.isActive;
    _rc = DateTime.tryParse(v.rcExpiryDate ?? '');
    _insurance = DateTime.tryParse(v.insuranceExpiryDate ?? '');
    _permit = DateTime.tryParse(v.permitExpiryDate ?? '');
    _pollution = DateTime.tryParse(v.pollutionExpiryDate ?? '');
  }

  String _date(DateTime? value) =>
      value == null ? '' : DateFormat('yyyy-MM-dd').format(value);

  Future<void> _submit() async {
    hideKeyboard();
    if (!_formKey.currentState!.validate()) return;
    if (_categoryId == null || _categoryId!.isEmpty) {
      showErrorToast('Select a category');
      return;
    }

    final body = <String, dynamic>{
      'category_id': _categoryId,
      'vehicle_name': _name.text.trim(),
      'registration_no': _registration.text.trim().isEmpty ? null : _registration.text.trim(),
      'model_name': _model.text.trim().isEmpty ? null : _model.text.trim(),
      'color': _color.text.trim().isEmpty ? null : _color.text.trim(),
      'fuel_type': _fuel,
      'rc_expiry_date': _date(_rc).isEmpty ? null : _date(_rc),
      'insurance_expiry_date': _date(_insurance).isEmpty ? null : _date(_insurance),
      'permit_expiry_date': _date(_permit).isEmpty ? null : _date(_permit),
      'pollution_expiry_date': _date(_pollution).isEmpty ? null : _date(_pollution),
      'is_active': _isActive,
    };

    setState(() => _saving = true);
    try {
      final repo = ref.read(fleetRepositoryProvider);
      if (widget.isEdit) {
        await repo.update(widget.vehicleId!, body);
        invalidateFleetCaches(ref, id: widget.vehicleId);
        showSuccessToast('Vehicle updated');
      } else {
        final created = await repo.create(body);
        invalidateFleetCaches(ref, id: created.id);
        showSuccessToast('Vehicle added');
      }
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
      title: 'Delete vehicle?',
      message: 'This vehicle will be removed from the fleet.',
      actionLabel: 'Delete',
      icon: Icons.delete_outline_rounded,
    );
    if (!ok) return;
    try {
      await ref.read(fleetRepositoryProvider).delete(widget.vehicleId!);
      invalidateFleetCaches(ref, id: widget.vehicleId);
      showSuccessToast('Vehicle deleted');
      if (mounted) context.pop();
    } catch (e) {
      showErrorToast(e is ApiException ? e.message : e.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    final categories = ref.watch(vehicleCategoriesProvider).valueOrNull ?? const <VehicleCategory>[];

    return KeyboardDismiss(
      child: Scaffold(
        appBar: AppBar(
          title: Text(widget.isEdit ? 'Edit vehicle' : 'Add vehicle'),
          actions: [
            if (widget.isEdit)
              IconButton(
                tooltip: 'Delete',
                onPressed: _delete,
                icon: const Icon(Icons.delete_outline_rounded),
              ),
          ],
        ),
        body: !_hydrated
            ? const Center(child: YaLoader())
            : Form(
                key: _formKey,
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
                  children: [
                    YaTextField(
                      label: 'Vehicle name',
                      required: true,
                      controller: _name,
                      textCapitalization: TextCapitalization.words,
                      validator: (v) =>
                          v == null || v.trim().isEmpty ? 'Enter vehicle name' : null,
                    ),
                    const SizedBox(height: 14),
                    YaDropdown<String>(
                      label: 'Category',
                      required: true,
                      value: categories.any((c) => c.id == _categoryId) ? _categoryId : null,
                      hint: 'Select category',
                      items: [
                        for (final c in categories)
                          DropdownMenuItem(value: c.id, child: Text(c.name)),
                      ],
                      onChanged: (value) => setState(() => _categoryId = value),
                      validator: (v) => v == null || v.isEmpty ? 'Select a category' : null,
                    ),
                    const SizedBox(height: 14),
                    YaTextField(
                      label: 'Registration number',
                      controller: _registration,
                      textCapitalization: TextCapitalization.characters,
                    ),
                    const SizedBox(height: 14),
                    YaTextField(
                      label: 'Model',
                      controller: _model,
                    ),
                    const SizedBox(height: 14),
                    YaTextField(
                      label: 'Colour',
                      controller: _color,
                    ),
                    const SizedBox(height: 14),
                    YaDropdown<String>(
                      label: 'Fuel type',
                      required: true,
                      value: _fuel,
                      items: [
                        for (final f in _fuels)
                          DropdownMenuItem(
                            value: f,
                            child: Text(f[0].toUpperCase() + f.substring(1)),
                          ),
                      ],
                      onChanged: (value) {
                        if (value != null) setState(() => _fuel = value);
                      },
                    ),
                    const SizedBox(height: 14),
                    YaDateField(
                      label: 'RC expiry',
                      value: _rc,
                      onChanged: (d) => setState(() => _rc = d),
                    ),
                    const SizedBox(height: 14),
                    YaDateField(
                      label: 'Insurance expiry',
                      value: _insurance,
                      onChanged: (d) => setState(() => _insurance = d),
                    ),
                    const SizedBox(height: 14),
                    YaDateField(
                      label: 'Permit expiry',
                      value: _permit,
                      onChanged: (d) => setState(() => _permit = d),
                    ),
                    const SizedBox(height: 14),
                    YaDateField(
                      label: 'Pollution expiry',
                      value: _pollution,
                      onChanged: (d) => setState(() => _pollution = d),
                    ),
                    const SizedBox(height: 14),
                    SwitchListTile(
                      contentPadding: EdgeInsets.zero,
                      title: const Text('Active'),
                      value: _isActive,
                      onChanged: (v) => setState(() => _isActive = v),
                    ),
                    const SizedBox(height: 20),
                    ElevatedButton(
                      onPressed: _saving ? null : _submit,
                      child: Text(_saving ? 'SAVING…' : 'SAVE'),
                    ),
                  ],
                ),
              ),
      ),
    );
  }
}
