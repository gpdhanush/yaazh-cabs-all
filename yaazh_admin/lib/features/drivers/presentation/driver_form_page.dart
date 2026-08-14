import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';
import 'package:yaazh_admin/app/theme.dart';
import 'package:yaazh_admin/core/image_encode.dart';
import 'package:yaazh_admin/core/network/api_exception.dart';
import 'package:yaazh_admin/core/widgets/app_toast.dart';
import 'package:yaazh_admin/core/widgets/driver_avatar.dart';
import 'package:yaazh_admin/core/widgets/keyboard_dismiss.dart';
import 'package:yaazh_admin/core/widgets/ya_bottom_sheet.dart';
import 'package:yaazh_admin/core/widgets/ya_date_picker.dart';
import 'package:yaazh_admin/core/widgets/ya_dropdown.dart';
import 'package:yaazh_admin/core/widgets/ya_field.dart';
import 'package:yaazh_admin/core/widgets/ya_loader.dart';
import 'package:yaazh_admin/core/widgets/ya_number_field.dart';
import 'package:yaazh_admin/features/drivers/data/driver_repository.dart';
import 'package:yaazh_admin/features/drivers/domain/driver.dart';

class DriverFormPage extends ConsumerStatefulWidget {
  final String? driverId;

  const DriverFormPage({super.key, this.driverId});

  bool get isEdit => driverId != null && driverId!.isNotEmpty;

  @override
  ConsumerState<DriverFormPage> createState() => _DriverFormPageState();
}

class _DriverFormPageState extends ConsumerState<DriverFormPage> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _phone = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _license = TextEditingController();
  final _address = TextEditingController();

  String _verification = 'pending';
  String _availability = 'available';
  String _online = 'offline';
  bool _isActive = true;
  DateTime? _expiry;
  bool _saving = false;
  bool _hydrated = false;
  int? _photoBust;
  Driver? _driver;

  @override
  void initState() {
    super.initState();
    if (widget.isEdit) {
      Future.microtask(_load);
    } else {
      _hydrated = true;
    }
  }

  Future<void> _load() async {
    try {
      final d = await ref.read(driverRepositoryProvider).getById(widget.driverId!);
      if (!mounted) return;
      _hydrate(d);
    } catch (e) {
      if (!mounted) return;
      showErrorToast(e is ApiException ? e.message : e.toString());
      setState(() => _hydrated = true);
    }
  }

  void _hydrate(Driver d) {
    var verification = d.verificationStatus;
    var isActive = d.isActive;
    if (verification == 'blocked') {
      verification = 'rejected';
      isActive = false;
    }
    _name.text = d.name;
    _phone.text = _normalizePhone(d.phone);
    _email.text = d.email ?? '';
    _license.text = d.licenseNo ?? '';
    _address.text = d.address ?? '';
    _verification = verification;
    _availability = d.availabilityStatus;
    _online = d.onlineStatus;
    _isActive = isActive;
    _expiry = DateTime.tryParse(d.licenseExpiryDate ?? '');
    _driver = d;
    _hydrated = true;
    setState(() {});
  }

  String _normalizePhone(String raw) {
    final digits = raw.replaceAll(RegExp(r'\D'), '');
    if (digits.length >= 10) return digits.substring(digits.length - 10);
    return digits;
  }

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    _email.dispose();
    _password.dispose();
    _license.dispose();
    _address.dispose();
    super.dispose();
  }

  Future<void> _pickPhoto() async {
    hideKeyboard();
    if (!widget.isEdit) return;
    final source = await showYaActionSheet<ImageSource>(
      context: context,
      title: 'Driver photo',
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
    if (source == null) return;
    if (!mounted) return;
    final toolbarColor = Theme.of(context).colorScheme.primary;

    final prepared = await pickAndPrepareImage(
      source: source,
      toolbarColor: toolbarColor,
      title: 'Crop driver photo',
    );
    if (prepared == null) return;

    try {
      final updated = await ref
          .read(driverRepositoryProvider)
          .uploadPhoto(widget.driverId!, prepared.path);
      invalidateDriverCaches(ref, id: widget.driverId);
      setState(() {
        _driver = updated;
        _photoBust = DateTime.now().millisecondsSinceEpoch;
      });
      showSuccessToast('Driver photo updated');
    } catch (e) {
      showErrorToast(e is ApiException ? e.message : e.toString());
    }
  }

  Future<void> _submit() async {
    hideKeyboard();
    if (!_formKey.currentState!.validate()) return;

    final body = <String, dynamic>{
      'name': _name.text.trim(),
      'phone': _phone.text.trim(),
      'email': _email.text.trim().isEmpty ? null : _email.text.trim(),
      'license_no': _license.text.trim().isEmpty ? null : _license.text.trim(),
      'license_expiry_date':
          _expiry == null ? null : DateFormat('yyyy-MM-dd').format(_expiry!),
      'address': _address.text.trim().isEmpty ? null : _address.text.trim(),
      'verification_status': _verification,
      'availability_status': _availability,
      'online_status': _online,
      'is_active': _isActive,
    };
    final password = _password.text.trim();
    if (password.isNotEmpty) body['password'] = password;

    setState(() => _saving = true);
    try {
      final repo = ref.read(driverRepositoryProvider);
      if (widget.isEdit) {
        await repo.update(widget.driverId!, body);
        invalidateDriverCaches(ref, id: widget.driverId);
        showSuccessToast('Driver updated');
        if (mounted) context.pop();
      } else {
        final created = await repo.create({...body, 'password': password});
        invalidateDriverCaches(ref, id: created.id);
        showSuccessToast('Driver created');
        if (mounted) context.pushReplacement('/drivers/${created.id}');
      }
    } catch (e) {
      showErrorToast(e is ApiException ? e.message : e.toString());
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return KeyboardDismiss(
      child: Scaffold(
        appBar: AppBar(
          title: Text(widget.isEdit ? 'Edit driver' : 'Add driver'),
        ),
        body: !_hydrated
            ? const Center(child: YaLoader())
            : Form(
                key: _formKey,
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
                  children: [
                    if (widget.isEdit) ...[
                      Center(
                        child: GestureDetector(
                          onTap: _pickPhoto,
                          child: Stack(
                            children: [
                              DriverAvatar(
                                id: widget.driverId,
                                name: _name.text,
                                photoUrl: _driver?.photoUrl,
                                radius: 44,
                                cacheBust: _photoBust,
                              ),
                              Positioned(
                                right: 2,
                                bottom: 2,
                                child: Container(
                                  width: 28,
                                  height: 28,
                                  decoration: BoxDecoration(
                                    color: theme.colorScheme.primary,
                                    shape: BoxShape.circle,
                                    border: Border.all(
                                      color: theme.colorScheme.surface,
                                      width: 2,
                                    ),
                                  ),
                                  child: Icon(
                                    Icons.camera_alt_rounded,
                                    size: 14,
                                    color: AppTheme.onPrimaryOf(theme.colorScheme.primary),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Center(
                        child: Text(
                          'Tap to change photo',
                          style: theme.textTheme.bodySmall,
                        ),
                      ),
                      const SizedBox(height: 20),
                    ],
                    YaTextField(
                      label: 'Full name',
                      required: true,
                      hint: 'Enter full name',
                      controller: _name,
                      textCapitalization: TextCapitalization.words,
                      validator: (v) {
                        final value = v?.trim() ?? '';
                        if (value.length < 2) return 'Enter the driver name';
                        if (value.length > 120) return 'Name is too long';
                        return null;
                      },
                    ),
                    const SizedBox(height: 14),
                    YaNumberField(
                      controller: _phone,
                      label: 'Phone',
                      required: true,
                      hint: '10-digit mobile number',
                      maxLength: 10,
                      prefixIcon: const Icon(Icons.call_outlined),
                      validator: (v) {
                        final value = v?.trim() ?? '';
                        if (!RegExp(r'^\d{10}$').hasMatch(value)) {
                          return 'Enter a valid 10-digit phone number';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 14),
                    YaTextField(
                      label: 'Email',
                      hint: 'Enter email',
                      controller: _email,
                      keyboardType: TextInputType.emailAddress,
                      validator: (v) {
                        final value = v?.trim() ?? '';
                        if (value.isEmpty) return null;
                        if (!RegExp(r'^[^@]+@[^@]+\.[^@]+$').hasMatch(value)) {
                          return 'Enter a valid email address';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 14),
                    YaPasswordField(
                      label: widget.isEdit ? 'New password' : 'Password',
                      required: !widget.isEdit,
                      hint: widget.isEdit
                          ? 'Leave blank to keep current'
                          : 'Minimum 8 characters',
                      controller: _password,
                      validator: (v) {
                        final value = v?.trim() ?? '';
                        if (!widget.isEdit && value.length < 8) {
                          return 'Password must be at least 8 characters';
                        }
                        if (value.isNotEmpty && value.length < 8) {
                          return 'Password must be at least 8 characters';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 14),
                    YaTextField(
                      label: 'License no',
                      hint: 'Enter license no',
                      controller: _license,
                      textCapitalization: TextCapitalization.characters,
                    ),
                    const SizedBox(height: 14),
                    YaDateField(
                      label: 'License expiry',
                      hint: 'Select expiry date',
                      value: _expiry,
                      minDate: DateTime(DateTime.now().year - 10),
                      maxDate: DateTime(DateTime.now().year + 40),
                      onChanged: (d) => setState(() => _expiry = d),
                    ),
                    const SizedBox(height: 14),
                    YaTextField(
                      label: 'Address',
                      hint: 'Enter address',
                      controller: _address,
                      minLines: 3,
                      maxLines: 5,
                      textCapitalization: TextCapitalization.sentences,
                      textInputAction: TextInputAction.newline,
                    ),
                    const SizedBox(height: 14),
                    YaDropdown<String>(
                      label: 'Verification status',
                      required: true,
                      value: _verification,
                      items: const [
                        DropdownMenuItem(value: 'pending', child: Text('Pending')),
                        DropdownMenuItem(value: 'approved', child: Text('Approved')),
                        DropdownMenuItem(value: 'rejected', child: Text('Rejected')),
                      ],
                      onChanged: (v) {
                        if (v != null) setState(() => _verification = v);
                      },
                    ),
                    const SizedBox(height: 14),
                    YaDropdown<String>(
                      label: 'Availability',
                      required: true,
                      value: _availability,
                      items: const [
                        DropdownMenuItem(value: 'available', child: Text('Available')),
                        DropdownMenuItem(value: 'on_trip', child: Text('On ride')),
                        DropdownMenuItem(value: 'on_leave', child: Text('Leave')),
                        DropdownMenuItem(value: 'suspended', child: Text('Suspend')),
                      ],
                      onChanged: (v) {
                        if (v != null) setState(() => _availability = v);
                      },
                    ),
                    const SizedBox(height: 14),
                    YaDropdown<String>(
                      label: 'Online status',
                      required: true,
                      value: _online,
                      items: const [
                        DropdownMenuItem(value: 'offline', child: Text('Offline')),
                        DropdownMenuItem(value: 'online', child: Text('Online')),
                        DropdownMenuItem(value: 'busy', child: Text('Busy')),
                      ],
                      onChanged: (v) {
                        if (v != null) setState(() => _online = v);
                      },
                    ),
                    const SizedBox(height: 8),
                    SwitchListTile(
                      contentPadding: EdgeInsets.zero,
                      title: const Text('Active'),
                      subtitle: Text(
                        _isActive
                            ? 'Driver can receive assignments'
                            : 'Driver is inactive',
                      ),
                      value: _isActive,
                      onChanged: (v) => setState(() => _isActive = v),
                    ),
                    const SizedBox(height: 20),
                    ElevatedButton(
                      onPressed: _saving ? null : _submit,
                      child: Text(
                        widget.isEdit ? 'SAVE CHANGES' : 'CREATE DRIVER',
                      ),
                    ),
                  ],
                ),
              ),
      ),
    );
  }
}
