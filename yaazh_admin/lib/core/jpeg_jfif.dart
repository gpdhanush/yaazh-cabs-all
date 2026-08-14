import 'dart:typed_data';

bool isJpegMagic(List<int> bytes) {
  return bytes.length > 3 && bytes[0] == 0xFF && bytes[1] == 0xD8 && bytes[2] == 0xFF;
}

bool isPngMagic(List<int> bytes) {
  return bytes.length > 3 &&
      bytes[0] == 0x89 &&
      bytes[1] == 0x50 &&
      bytes[2] == 0x4E &&
      bytes[3] == 0x47;
}

/// uCrop JPEGs often have EXIF orientation=0 and no JFIF header.
/// Android ImageDecoder (Huawei/Honor) rejects those with "unimplemented".
Uint8List toJfifJpeg(Uint8List input) {
  if (input.length < 4 || input[0] != 0xFF || input[1] != 0xD8) return input;

  final chunks = <int>[0xFF, 0xD8];
  var i = 2;
  var hasJfif = false;

  while (i + 1 < input.length) {
    if (input[i] != 0xFF) {
      chunks.addAll(input.sublist(i));
      break;
    }
    final marker = input[i + 1];
    if (marker == 0xDA) {
      chunks.addAll(input.sublist(i));
      break;
    }
    if (marker == 0xD9) {
      chunks.addAll(input.sublist(i, i + 2));
      break;
    }
    if (marker == 0x00 || marker == 0x01 || (marker >= 0xD0 && marker <= 0xD7)) {
      chunks.addAll(input.sublist(i, i + 2));
      i += 2;
      continue;
    }
    if (i + 3 >= input.length) {
      chunks.addAll(input.sublist(i));
      break;
    }
    final size = (input[i + 2] << 8) | input[i + 3];
    final end = i + 2 + size;
    if (end > input.length || size < 2) {
      chunks.addAll(input.sublist(i));
      break;
    }
    if (marker == 0xE1) {
      i = end;
      continue;
    }
    if (marker == 0xE0) hasJfif = true;
    chunks.addAll(input.sublist(i, end));
    i = end;
  }

  if (!hasJfif) {
    const jfif = <int>[
      0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00,
      0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
    ];
    chunks.insertAll(2, jfif);
  }

  return Uint8List.fromList(chunks);
}
