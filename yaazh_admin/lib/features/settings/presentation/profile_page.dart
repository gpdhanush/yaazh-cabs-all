import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:yaazh_admin/app/constants.dart';
import 'package:yaazh_admin/core/network/api_exception.dart';
import 'package:yaazh_admin/core/widgets/admin_avatar.dart';
import 'package:yaazh_admin/core/widgets/app_toast.dart';
import 'package:yaazh_admin/core/widgets/keyboard_dismiss.dart';
import 'package:yaazh_admin/core/widgets/ya_field.dart';
import 'package:yaazh_admin/core/widgets/ya_loader.dart';
import 'package:yaazh_admin/features/auth/data/auth_repository.dart';
import 'package:yaazh_admin/features/auth/domain/admin_user.dart';
import 'package:yaazh_admin/features/auth/presentation/auth_viewmodel.dart';

class ProfilePage extends ConsumerStatefulWidget {
  const ProfilePage({super.key});

  @override
  ConsumerState<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends ConsumerState<ProfilePage> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _phone = TextEditingController();
  final _password = TextEditingController();

  bool _loading = true;
  bool _saving = false;
  int? _photoBust;
  AdminUser? _profile;

  @override
  void initState() {
    super.initState();
    Future.microtask(_load);
  }

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _phone.dispose();
    _password.dispose();
    super.dispose();
  }

  void _bind(AdminUser user) {
    _name.text = user.name;
    _email.text = user.email;
    _phone.text = user.phone ?? '';
    _profile = user;
  }

  Future<void> _load() async {
    try {
      final user = await ref.read(authNotifierProvider.notifier).refreshProfile();
      if (!mounted) return;
      _bind(user);
    } catch (e) {
      final cached = ref.read(authNotifierProvider).user;
      if (cached != null) {
        _bind(cached);
      } else if (mounted) {
        showErrorToast(e is ApiException ? e.message : e.toString());
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
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
                borderRadius: BorderRadius.circular(AppConstants.radiusField),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
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
      final user = await ref.read(authRepositoryProvider).uploadPhoto(file.path);
      ref.read(authNotifierProvider.notifier).setUser(user);
      if (!mounted) return;
      setState(() {
        _profile = user;
        _photoBust = DateTime.now().millisecondsSinceEpoch;
      });
      showSuccessToast('Profile photo updated');
    } catch (e) {
      showErrorToast(e is ApiException ? e.message : e.toString());
    }
  }

  Future<void> _save() async {
    hideKeyboard();
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    try {
      final user = await ref.read(authRepositoryProvider).updateProfile(
            name: _name.text.trim(),
            email: _email.text.trim(),
            phone: _phone.text.trim().isEmpty ? null : _phone.text.trim(),
            password: _password.text.trim().isEmpty ? null : _password.text.trim(),
          );
      ref.read(authNotifierProvider.notifier).setUser(user);
      _password.clear();
      if (!mounted) return;
      setState(() => _profile = user);
      showSuccessToast('Profile updated');
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
        appBar: AppBar(title: const Text('Profile')),
        body: _loading
            ? const Center(child: YaLoader())
            : Form(
                key: _formKey,
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
                  children: [
                    Center(
                      child: Stack(
                        children: [
                          AdminAvatar(
                            user: _profile,
                            radius: 44,
                            cacheBust: _photoBust,
                          ),
                          Positioned(
                            right: 0,
                            bottom: 0,
                            child: Material(
                              color: theme.colorScheme.primary,
                              shape: const CircleBorder(),
                              child: InkWell(
                                customBorder: const CircleBorder(),
                                onTap: _pickPhoto,
                                child: const Padding(
                                  padding: EdgeInsets.all(8),
                                  child: Icon(
                                    Icons.camera_alt_rounded,
                                    size: 16,
                                    color: Colors.white,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Tap the camera to change photo',
                      textAlign: TextAlign.center,
                      style: theme.textTheme.bodySmall,
                    ),
                    const SizedBox(height: 24),
                    YaTextField(
                      label: 'Name',
                      required: true,
                      controller: _name,
                      textCapitalization: TextCapitalization.words,
                      validator: (v) =>
                          v == null || v.trim().length < 2 ? 'Enter your name' : null,
                    ),
                    const SizedBox(height: 14),
                    YaTextField(
                      label: 'Email',
                      required: true,
                      controller: _email,
                      keyboardType: TextInputType.emailAddress,
                      validator: (v) {
                        final value = v?.trim() ?? '';
                        if (value.isEmpty || !value.contains('@')) {
                          return 'Enter a valid email';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 14),
                    YaTextField(
                      label: 'Mobile',
                      controller: _phone,
                      keyboardType: TextInputType.phone,
                    ),
                    const SizedBox(height: 14),
                    YaPasswordField(
                      label: 'New password',
                      hint: 'Leave blank to keep current',
                      controller: _password,
                      textInputAction: TextInputAction.done,
                      validator: (v) {
                        final value = v?.trim() ?? '';
                        if (value.isEmpty) return null;
                        if (value.length < 8) return 'At least 8 characters';
                        return null;
                      },
                    ),
                    const SizedBox(height: 24),
                    ElevatedButton(
                      onPressed: _saving ? null : _save,
                      child: Text(_saving ? 'SAVING…' : 'SAVE'),
                    ),
                  ],
                ),
              ),
        ),
    );
  }
}
