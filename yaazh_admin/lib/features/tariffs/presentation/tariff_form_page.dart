import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:yaazh_admin/core/network/api_exception.dart';
import 'package:yaazh_admin/core/widgets/app_toast.dart';
import 'package:yaazh_admin/core/widgets/confirm_sheet.dart';
import 'package:yaazh_admin/core/widgets/keyboard_dismiss.dart';
import 'package:yaazh_admin/core/widgets/ya_danger_button.dart';
import 'package:yaazh_admin/core/widgets/ya_dropdown.dart';
import 'package:yaazh_admin/core/widgets/ya_loader.dart';
import 'package:yaazh_admin/core/widgets/ya_number_field.dart';
import 'package:yaazh_admin/features/fleet/data/fleet_repository.dart';
import 'package:yaazh_admin/features/fleet/domain/vehicle.dart';
import 'package:yaazh_admin/features/tariffs/data/tariff_repository.dart';
import 'package:yaazh_admin/features/tariffs/domain/tariff.dart';

class TariffFormPage extends ConsumerStatefulWidget {
  final String? tariffId;

  const TariffFormPage({super.key, this.tariffId});

  bool get isEdit => tariffId != null && tariffId!.isNotEmpty;

  @override
  ConsumerState<TariffFormPage> createState() => _TariffFormPageState();
}

class _TariffFormPageState extends ConsumerState<TariffFormPage> {
  final _formKey = GlobalKey<FormState>();
  final _ratePerKm = TextEditingController();
  final _baseFare = TextEditingController();
  final _driverBatta = TextEditingController();
  final _extraKmRate = TextEditingController();

  String? _categoryId;
  String? _tripType;
  String? _routeId;
  bool _isActive = true;
  bool _saving = false;
  bool _hydrated = false;

  static final _dateApi = DateFormat('yyyy-MM-dd');

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
    _ratePerKm.dispose();
    _baseFare.dispose();
    _driverBatta.dispose();
    _extraKmRate.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final t = await ref
          .read(tariffRepositoryProvider)
          .getById(widget.tariffId!);
      await Future.wait([
        ref.read(vehicleCategoriesProvider.future),
        ref.read(tariffRoutesProvider.future),
      ]);
      if (!mounted) return;
      _categoryId = t.vehicleCategoryId;
      _tripType = t.tripType;
      _routeId = t.routeId;
      _ratePerKm.text = _numText(t.ratePerKm);
      _baseFare.text = _numText(t.baseFare);
      _driverBatta.text = _numText(t.driverBatta);
      _extraKmRate.text = _numText(t.extraKmRate);
      _isActive = t.isActive;
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

  Map<String, dynamic> _payload() {
    final today = DateTime.now();
    return {
      'vehicle_category_id': _categoryId,
      'trip_type': _tripType,
      'route_id': _routeId,
      'rate_per_km': _numOrZero(_ratePerKm.text),
      'base_fare': _numOrZero(_baseFare.text),
      'driver_batta': _numOrZero(_driverBatta.text),
      'minimum_km': 0,
      'minimum_fare': 0,
      'extra_km_rate': _numOrZero(_extraKmRate.text),
      'night_charge': 0,
      'permit_charge': 0,
      'gst_percentage': 0,
      'effective_from': _dateApi.format(today),
      'effective_to': null,
      'is_active': _isActive,
    };
  }

  Future<void> _save() async {
    hideKeyboard();
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    try {
      final repo = ref.read(tariffRepositoryProvider);
      final body = _payload();
      if (widget.isEdit) {
        await repo.update(widget.tariffId!, body);
      } else {
        await repo.create(body);
      }
      invalidateTariffCaches(ref, id: widget.tariffId);
      showSuccessToast(widget.isEdit ? 'Tariff updated' : 'Tariff created');
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
      title: 'Delete tariff?',
      message: 'This fare rule will be removed permanently.',
      actionLabel: 'Delete',
      icon: Icons.delete_outline_rounded,
    );
    if (!ok) return;
    setState(() => _saving = true);
    try {
      await ref.read(tariffRepositoryProvider).delete(widget.tariffId!);
      invalidateTariffCaches(ref, id: widget.tariffId);
      showSuccessToast('Tariff deleted');
      if (mounted) context.pop();
    } catch (e) {
      showErrorToast(e is ApiException ? e.message : e.toString());
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final categories =
        ref.watch(vehicleCategoriesProvider).valueOrNull ??
        const <VehicleCategory>[];
    final routes =
        ref.watch(tariffRoutesProvider).valueOrNull ??
        const <TariffRouteOption>[];

    return KeyboardDismiss(
      child: Scaffold(
        appBar: AppBar(
          title: Text(widget.isEdit ? 'Edit tariff' : 'Add tariff'),
        ),
        body: !_hydrated
            ? const Center(child: YaLoader())
            : Form(
                key: _formKey,
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
                  children: [
                    Text(
                      'Rates used to estimate fare when a customer books. Leave Route empty for a category-wide default.',
                      style: theme.textTheme.bodySmall,
                    ),
                    const SizedBox(height: 16),
                    const _SectionTitle(title: 'Trip'),
                    const SizedBox(height: 10),
                    YaDropdown<String>(
                      label: 'Vehicle category',
                      required: true,
                      hint: 'Select category',
                      value: categories.any((c) => c.id == _categoryId)
                          ? _categoryId
                          : null,
                      items: [
                        for (final c in categories)
                          DropdownMenuItem(value: c.id, child: Text(c.name)),
                      ],
                      onChanged: (v) => setState(() => _categoryId = v),
                      validator: (v) =>
                          v == null || v.isEmpty ? 'Select a category' : null,
                    ),
                    const SizedBox(height: 14),
                    YaDropdown<String>(
                      label: 'Trip type',
                      required: true,
                      hint: 'Select trip type',
                      value: TariffMeta.tripTypes.any((t) => t.$1 == _tripType)
                          ? _tripType
                          : null,
                      items: [
                        for (final t in TariffMeta.tripTypes)
                          DropdownMenuItem(value: t.$1, child: Text(t.$2)),
                      ],
                      onChanged: (v) => setState(() => _tripType = v),
                      validator: (v) =>
                          v == null || v.isEmpty ? 'Select trip type' : null,
                    ),
                    const SizedBox(height: 14),
                    YaDropdown<String?>(
                      label: 'Route (optional)',
                      hint: 'All routes (category default)',
                      value:
                          _routeId != null &&
                              routes.any((r) => r.id == _routeId)
                          ? _routeId
                          : null,
                      items: [
                        const DropdownMenuItem<String?>(
                          value: null,
                          child: Text('All routes (category default)'),
                        ),
                        for (final r in routes)
                          DropdownMenuItem<String?>(
                            value: r.id,
                            child: Text(r.label),
                          ),
                      ],
                      onChanged: (v) => setState(() => _routeId = v),
                    ),
                    const SizedBox(height: 20),
                    const _SectionTitle(title: 'Rates'),
                    const SizedBox(height: 10),
                    YaNumberField(
                      label: 'Rate per km (₹)',
                      required: true,
                      hint: '0',
                      controller: _ratePerKm,
                      decimal: true,
                      maxLength: 8,
                      validator: (v) {
                        final n = double.tryParse(v?.trim() ?? '');
                        if (n == null || n < 0) return 'Enter a valid rate';
                        return null;
                      },
                    ),
                    const SizedBox(height: 14),
                    YaNumberField(
                      label: 'Base fare (₹)',
                      hint: '0',
                      controller: _baseFare,
                      decimal: true,
                      maxLength: 8,
                    ),
                    const SizedBox(height: 14),
                    YaNumberField(
                      label: 'Driver batta (₹)',
                      hint: '0',
                      controller: _driverBatta,
                      decimal: true,
                      maxLength: 8,
                    ),
                    const SizedBox(height: 14),
                    YaNumberField(
                      label: 'Extra km rate (₹)',
                      hint: '0',
                      controller: _extraKmRate,
                      decimal: true,
                      maxLength: 8,
                    ),
                    // const SizedBox(height: 14),
                    // YaDropdown<bool>(
                    //   label: 'Active',
                    //   value: _isActive,
                    //   items: const [
                    //     DropdownMenuItem(value: true, child: Text('Yes')),
                    //     DropdownMenuItem(value: false, child: Text('No')),
                    //   ],
                    //   onChanged: (v) {
                    //     if (v != null) setState(() => _isActive = v);
                    //   },
                    // ),
                    const SizedBox(height: 24),
                    ElevatedButton(
                      onPressed: _saving ? null : _save,
                      child: Text(_saving ? 'SAVING…' : 'SAVE TARIFF'),
                    ),
                    if (widget.isEdit) ...[
                      const SizedBox(height: 12),
                      YaDangerButton(
                        onPressed: _saving ? null : _delete,
                        label: 'DELETE TARIFF',
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
      style: Theme.of(
        context,
      ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
    );
  }
}
