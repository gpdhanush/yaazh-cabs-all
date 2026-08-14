import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:yaazh_admin/core/jpeg_jfif.dart';

void main() {
  test('strips EXIF APP1 and inserts JFIF', () {
    final input = Uint8List.fromList([
      0xFF, 0xD8,
      0xFF, 0xE1, 0x00, 0x06, 0x45, 0x78, 0x00, 0x00,
      0xFF, 0xD9,
    ]);
    final out = toJfifJpeg(input);
    expect(isJpegMagic(out), isTrue);
    expect(out[2], 0xFF);
    expect(out[3], 0xE0);
    expect(out.sublist(out.length - 2), [0xFF, 0xD9]);
    var hasExif = false;
    for (var i = 2; i < out.length - 1; i++) {
      if (out[i] == 0xFF && out[i + 1] == 0xE1) hasExif = true;
    }
    expect(hasExif, isFalse);
  });
}
