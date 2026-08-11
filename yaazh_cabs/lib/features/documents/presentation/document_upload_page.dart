import 'dart:io';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';
import 'package:path/path.dart' as p;
import 'package:permission_handler/permission_handler.dart';
import 'package:yaazh_cabs/app/constants.dart';
import 'package:yaazh_cabs/core/widgets/app_loading_view.dart';
import 'package:yaazh_cabs/features/documents/data/document_repository.dart';

class DocumentUploadPage extends ConsumerStatefulWidget {
  const DocumentUploadPage({super.key});

  @override
  ConsumerState<DocumentUploadPage> createState() => _DocumentUploadPageState();
}

class _DocumentUploadPageState extends ConsumerState<DocumentUploadPage> {
  final _formKey = GlobalKey<FormState>();
  final _noController = TextEditingController();
  final _picker = ImagePicker();

  String _selectedType = 'license';
  DateTime? _expiry;
  bool _submitting = false;
  File? _pickedFile;
  String? _pickedLabel;

  static const _types = <String, String>{
    'license': 'Driving License',
    'aadhaar': 'Aadhaar Card',
    'pan': 'PAN Card',
    'rc': 'Vehicle RC',
    'insurance': 'Insurance Policy',
    'permit': 'Commercial Permit',
    'fitness': 'Fitness Certificate',
    'pollution': 'Pollution Certificate',
    'profile_photo': 'Profile Photo',
    'other': 'Other',
  };

  @override
  void dispose() {
    _noController.dispose();
    super.dispose();
  }

  Future<bool> _ensureCameraPermission() async {
    var status = await Permission.camera.status;
    if (status.isGranted) return true;
    status = await Permission.camera.request();
    if (status.isGranted) return true;
    if (status.isPermanentlyDenied && mounted) {
      await _openSettingsPrompt('Camera permission is required to take document photos.');
    }
    return false;
  }

  Future<bool> _ensurePhotosPermission() async {
    Permission permission = Permission.photos;
    if (Platform.isAndroid) {
      // Android 13+ uses photos; older falls back via permission_handler.
      permission = Permission.photos;
    }
    var status = await permission.status;
    if (status.isGranted || status.isLimited) return true;
    status = await permission.request();
    if (status.isGranted || status.isLimited) return true;
    // Fallback for older Android storage permission
    if (Platform.isAndroid) {
      final storage = await Permission.storage.request();
      if (storage.isGranted) return true;
    }
    if (mounted) {
      await _openSettingsPrompt(
        'Photo library permission is required to choose document images.',
      );
    }
    return false;
  }

  Future<void> _openSettingsPrompt(String message) async {
    await showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Permission needed'),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              openAppSettings();
            },
            child: const Text('Open settings'),
          ),
        ],
      ),
    );
  }

  Future<void> _pickFromCamera() async {
    final ok = await _ensureCameraPermission();
    if (!ok) return;
    final shot = await _picker.pickImage(
      source: ImageSource.camera,
      imageQuality: 85,
      maxWidth: 2000,
    );
    if (shot == null) return;
    setState(() {
      _pickedFile = File(shot.path);
      _pickedLabel = p.basename(shot.path);
    });
  }

  Future<void> _pickFromGallery() async {
    final ok = await _ensurePhotosPermission();
    if (!ok) return;
    final image = await _picker.pickImage(
      source: ImageSource.gallery,
      imageQuality: 85,
      maxWidth: 2000,
    );
    if (image == null) return;
    setState(() {
      _pickedFile = File(image.path);
      _pickedLabel = p.basename(image.path);
    });
  }

  Future<void> _pickFromFiles() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: const ['jpg', 'jpeg', 'png', 'webp', 'gif', 'pdf'],
      withData: false,
    );
    if (result == null || result.files.isEmpty) return;
    final file = result.files.single;
    if (file.path == null) return;
    setState(() {
      _pickedFile = File(file.path!);
      _pickedLabel = file.name;
    });
  }

  Future<void> _showSourceSheet() async {
    await showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.photo_camera_rounded),
              title: const Text('Take photo'),
              subtitle: const Text('Use camera'),
              onTap: () {
                Navigator.pop(ctx);
                _pickFromCamera();
              },
            ),
            ListTile(
              leading: const Icon(Icons.photo_library_outlined),
              title: const Text('Choose from gallery'),
              onTap: () {
                Navigator.pop(ctx);
                _pickFromGallery();
              },
            ),
            ListTile(
              leading: const Icon(Icons.attach_file_rounded),
              title: const Text('Choose file'),
              subtitle: const Text('JPG, PNG, or PDF'),
              onTap: () {
                Navigator.pop(ctx);
                _pickFromFiles();
              },
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }

  Future<void> _pickExpiry() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _expiry ?? DateTime(now.year + 1),
      firstDate: now,
      lastDate: DateTime(now.year + 20),
    );
    if (picked != null) setState(() => _expiry = picked);
  }

  bool get _isImage {
    final name = (_pickedLabel ?? _pickedFile?.path ?? '').toLowerCase();
    return name.endsWith('.jpg') ||
        name.endsWith('.jpeg') ||
        name.endsWith('.png') ||
        name.endsWith('.webp') ||
        name.endsWith('.gif');
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_pickedFile == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please attach a photo or file first.')),
      );
      return;
    }

    setState(() => _submitting = true);
    try {
      final repo = ref.read(documentRepositoryProvider);
      final fileUrl = await repo.uploadFile(
        _pickedFile!.path,
        filename: _pickedLabel ?? p.basename(_pickedFile!.path),
      );
      await repo.uploadDocument(
        documentType: _selectedType,
        fileUrl: fileUrl,
        documentNo: _noController.text.trim().isEmpty
            ? null
            : _noController.text.trim(),
        expiryDate: _expiry?.toIso8601String().split('T').first,
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Document submitted for verification')),
      );
      context.pop(true);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Upload failed: $e')),
      );
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppConstants.bgLight,
      appBar: AppBar(title: const Text('Upload document')),
      body: _submitting
          ? const AppLoadingView(message: 'Uploading document…')
          : SingleChildScrollView(
              padding: const EdgeInsets.all(AppConstants.paddingL),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppConstants.infoColor.withValues(alpha: 0.08),
                        borderRadius:
                            BorderRadius.circular(AppConstants.borderRadiusL),
                        border: Border.all(
                          color: AppConstants.infoColor.withValues(alpha: 0.2),
                        ),
                      ),
                      child: const Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Icon(Icons.info_outline_rounded,
                              color: AppConstants.infoColor),
                          SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              'Capture or select a clear photo of your document. Fleet admin will verify it before approval.',
                              style: TextStyle(fontSize: 13, height: 1.4),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),
                    DropdownButtonFormField<String>(
                      initialValue: _selectedType,
                      decoration: const InputDecoration(
                        labelText: 'Document type',
                        prefixIcon: Icon(Icons.description_outlined),
                      ),
                      items: _types.entries
                          .map(
                            (e) => DropdownMenuItem(
                              value: e.key,
                              child: Text(e.value),
                            ),
                          )
                          .toList(),
                      onChanged: (v) {
                        if (v != null) setState(() => _selectedType = v);
                      },
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _noController,
                      decoration: const InputDecoration(
                        labelText: 'Document number (optional)',
                        hintText: 'e.g. TN38 2021000001',
                        prefixIcon: Icon(Icons.tag_rounded),
                      ),
                    ),
                    const SizedBox(height: 16),
                    InkWell(
                      onTap: _pickExpiry,
                      borderRadius:
                          BorderRadius.circular(AppConstants.borderRadiusM),
                      child: InputDecorator(
                        decoration: const InputDecoration(
                          labelText: 'Expiry date (optional)',
                          prefixIcon: Icon(Icons.event_outlined),
                        ),
                        child: Text(
                          _expiry == null
                              ? 'Tap to select'
                              : DateFormat('dd MMM yyyy').format(_expiry!),
                          style: TextStyle(
                            color: _expiry == null
                                ? AppConstants.textSecondaryLight
                                : AppConstants.textPrimaryLight,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),
                    const Text(
                      'Document file',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: AppConstants.textSecondaryLight,
                      ),
                    ),
                    const SizedBox(height: 10),
                    InkWell(
                      onTap: _showSourceSheet,
                      borderRadius: BorderRadius.circular(16),
                      child: Container(
                        height: 200,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: _pickedFile == null
                                ? const Color(0xFFCBD5E1)
                                : AppConstants.successColor,
                            width: 1.5,
                          ),
                        ),
                        clipBehavior: Clip.antiAlias,
                        child: _pickedFile == null
                            ? const Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(
                                    Icons.add_a_photo_outlined,
                                    size: 40,
                                    color: AppConstants.textSecondaryLight,
                                  ),
                                  SizedBox(height: 10),
                                  Text(
                                    'Tap to add photo or file',
                                    style: TextStyle(
                                      fontWeight: FontWeight.w700,
                                      fontSize: 15,
                                    ),
                                  ),
                                  SizedBox(height: 4),
                                  Text(
                                    'Camera · Gallery · PDF',
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: AppConstants.textSecondaryLight,
                                    ),
                                  ),
                                ],
                              )
                            : _isImage
                                ? Stack(
                                    fit: StackFit.expand,
                                    children: [
                                      Image.file(
                                        _pickedFile!,
                                        fit: BoxFit.cover,
                                      ),
                                      Positioned(
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        child: Container(
                                          color: Colors.black54,
                                          padding: const EdgeInsets.symmetric(
                                            horizontal: 12,
                                            vertical: 8,
                                          ),
                                          child: Text(
                                            _pickedLabel ?? 'Selected image',
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                            style: const TextStyle(
                                              color: Colors.white,
                                              fontSize: 12,
                                              fontWeight: FontWeight.w600,
                                            ),
                                          ),
                                        ),
                                      ),
                                    ],
                                  )
                                : Column(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      const Icon(
                                        Icons.picture_as_pdf_rounded,
                                        size: 48,
                                        color: AppConstants.errorColor,
                                      ),
                                      const SizedBox(height: 10),
                                      Padding(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 16,
                                        ),
                                        child: Text(
                                          _pickedLabel ?? 'Selected file',
                                          textAlign: TextAlign.center,
                                          style: const TextStyle(
                                            fontWeight: FontWeight.w700,
                                          ),
                                        ),
                                      ),
                                      const SizedBox(height: 8),
                                      TextButton(
                                        onPressed: _showSourceSheet,
                                        child: const Text('Change file'),
                                      ),
                                    ],
                                  ),
                      ),
                    ),
                    if (_pickedFile != null) ...[
                      const SizedBox(height: 8),
                      Align(
                        alignment: Alignment.centerRight,
                        child: TextButton.icon(
                          onPressed: _showSourceSheet,
                          icon: const Icon(Icons.sync_rounded, size: 18),
                          label: const Text('Replace'),
                        ),
                      ),
                    ],
                    const SizedBox(height: 24),
                    ElevatedButton.icon(
                      onPressed: _submit,
                      icon: const Icon(Icons.cloud_upload_rounded),
                      label: const Text('SUBMIT DOCUMENT'),
                    ),
                  ],
                ),
              ),
            ),
    );
  }
}
