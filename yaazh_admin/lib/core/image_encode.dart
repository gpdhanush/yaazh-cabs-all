import 'dart:io';
import 'dart:ui' as ui;

Future<String> encodeAvatarPng(String path, {int maxWidth = 720}) async {
  final bytes = await File(path).readAsBytes();
  if (bytes.isEmpty) {
    throw const FormatException('That photo file is empty.');
  }
  final codec = await ui.instantiateImageCodec(bytes, targetWidth: maxWidth);
  final frame = await codec.getNextFrame();
  final image = frame.image;
  try {
    final png = await image.toByteData(format: ui.ImageByteFormat.png);
    if (png == null) {
      throw const FormatException('Could not convert that photo.');
    }
    final out = File('${Directory.systemTemp.path}/yaazh_admin_avatar.png');
    await out.writeAsBytes(png.buffer.asUint8List(), flush: true);
    return out.path;
  } finally {
    image.dispose();
  }
}
