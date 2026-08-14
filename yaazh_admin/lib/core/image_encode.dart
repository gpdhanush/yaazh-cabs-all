import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:image/image.dart' as img;
import 'package:image_cropper/image_cropper.dart';
import 'package:image_picker/image_picker.dart';
import 'package:yaazh_admin/core/jpeg_jfif.dart';

enum ImageCropShape { circle, rectangle }

class PreparedUpload {
  final String path;
  final String mimeType;
  final String filename;
  final int bytes;

  const PreparedUpload({
    required this.path,
    required this.mimeType,
    required this.filename,
    required this.bytes,
  });
}

void _log(String message) {
  if (kDebugMode) debugPrint('[PROFILE PHOTO] $message');
}

/// Pick, crop, then write a JFIF JPEG Android ImageDecoder can read.
Future<PreparedUpload?> pickAndPrepareImage({
  required ImageSource source,
  required Color toolbarColor,
  ImageCropShape shape = ImageCropShape.circle,
  String title = 'Crop photo',
}) async {
  final picked = await ImagePicker().pickImage(
    source: source,
    maxWidth: 2048,
    imageQuality: 95,
  );
  if (picked == null) return null;

  final original = File(picked.path);
  _log('Original file: ${picked.path}');
  _log('File size: ${await original.length()}');

  final cropped = await ImageCropper().cropImage(
    sourcePath: picked.path,
    aspectRatio: const CropAspectRatio(ratioX: 1, ratioY: 1),
    compressFormat: ImageCompressFormat.jpg,
    compressQuality: 90,
    maxWidth: 1080,
    maxHeight: 1080,
    uiSettings: [
      AndroidUiSettings(
        toolbarTitle: title,
        toolbarColor: toolbarColor,
        toolbarWidgetColor: Colors.white,
        activeControlsWidgetColor: toolbarColor,
        backgroundColor: Colors.black,
        statusBarLight: false,
        navBarLight: false,
        cropStyle: shape == ImageCropShape.circle ? CropStyle.circle : CropStyle.rectangle,
        initAspectRatio: CropAspectRatioPreset.square,
        lockAspectRatio: true,
        hideBottomControls: false,
      ),
      IOSUiSettings(
        title: title,
        aspectRatioLockEnabled: true,
        cropStyle: shape == ImageCropShape.circle ? CropStyle.circle : CropStyle.rectangle,
      ),
    ],
  );
  if (cropped == null) return null;

  _log('Cropped file: ${cropped.path}');
  return encodeUploadJpeg(cropped.path);
}

Future<PreparedUpload> encodeUploadJpeg(String path, {int maxWidth = 1080}) async {
  final file = File(path);
  if (!await file.exists()) {
    throw const FormatException('Cropped photo is missing. Try again.');
  }
  final raw = await file.readAsBytes();
  _log('File size: ${raw.length}');
  if (raw.isEmpty) {
    throw const FormatException('That photo file is empty.');
  }

  late final List<int> jpg;
  if (isJpegMagic(raw)) {
    jpg = toJfifJpeg(Uint8List.fromList(raw));
    _log('MIME type: image/jpeg (JFIF sanitized)');
  } else {
    final decoded = img.decodeImage(raw);
    if (decoded == null) {
      throw const FormatException('Could not read that photo. Try another image.');
    }
    final oriented = img.bakeOrientation(decoded);
    final resized = oriented.width > maxWidth
        ? img.copyResize(oriented, width: maxWidth)
        : oriented;
    jpg = img.encodeJpg(resized, quality: 85);
    _log('MIME type: image/jpeg (re-encoded from ${isPngMagic(raw) ? 'PNG' : 'other'})');
  }

  if (jpg.isEmpty || !isJpegMagic(jpg)) {
    throw const FormatException('Could not convert that photo.');
  }

  final out = File('${Directory.systemTemp.path}/yaazh_upload.jpg');
  await out.writeAsBytes(jpg, flush: true);
  if (!await out.exists() || await out.length() == 0) {
    throw const FormatException('Could not save the cropped photo.');
  }

  return PreparedUpload(
    path: out.path,
    mimeType: 'image/jpeg',
    filename: 'photo.jpg',
    bytes: jpg.length,
  );
}
