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

Future<String> encodeUploadJpeg(String path, {int maxWidth = 1080}) async {
  final bytes = await File(path).readAsBytes();
  if (bytes.isEmpty) {
    throw const FormatException('That photo file is empty.');
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
  final out = File('${Directory.systemTemp.path}/yaazh_upload.jpg');
  await out.writeAsBytes(jpg, flush: true);
  return out.path;
}
