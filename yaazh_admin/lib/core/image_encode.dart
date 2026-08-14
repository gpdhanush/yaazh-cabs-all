import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image/image.dart' as img;
import 'package:image_cropper/image_cropper.dart';
import 'package:image_picker/image_picker.dart';

enum ImageCropShape { circle, rectangle }

/// Pick, crop, then write a JPEG Android can decode (avoids HEIC/PNG decoder errors).
Future<String?> pickAndPrepareImage({
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
  return encodeUploadJpeg(cropped.path);
}

bool _isJpeg(List<int> bytes) {
  return bytes.length > 3 && bytes[0] == 0xFF && bytes[1] == 0xD8 && bytes[2] == 0xFF;
}

Future<String> encodeUploadJpeg(String path, {int maxWidth = 1080}) async {
  final bytes = await File(path).readAsBytes();
  if (bytes.isEmpty) {
    throw const FormatException('That photo file is empty.');
  }
  final out = File('${Directory.systemTemp.path}/yaazh_upload.jpg');
  // uCrop already writes a device JPEG. Re-encoding with dart `image` produces
  // files some Android ImageDecoders (Huawei/Honor) reject as "unimplemented".
  if (_isJpeg(bytes)) {
    await out.writeAsBytes(bytes, flush: true);
    return out.path;
  }
  final decoded = img.decodeImage(bytes);
  if (decoded == null) {
    throw const FormatException('Could not read that photo. Try another image.');
  }
  final oriented = img.bakeOrientation(decoded);
  final resized = oriented.width > maxWidth
      ? img.copyResize(oriented, width: maxWidth)
      : oriented;
  final jpg = img.encodeJpg(resized, quality: 85);
  if (jpg.isEmpty) {
    throw const FormatException('Could not convert that photo.');
  }
  await out.writeAsBytes(jpg, flush: true);
  return out.path;
}
