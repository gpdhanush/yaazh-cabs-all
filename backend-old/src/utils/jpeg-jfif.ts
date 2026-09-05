/**
 * uCrop / Android often writes JPEG with EXIF only (no JFIF) and orientation=0.
 * Huawei/Honor ImageDecoder then fails with "unimplemented".
 * Strip APP1 EXIF and ensure a JFIF APP0 so the bytes are a baseline JPEG.
 */
export function toJfifJpeg(input: Buffer): Buffer {
  if (input.length < 4 || input[0] !== 0xff || input[1] !== 0xd8) return input;

  const chunks: Buffer[] = [Buffer.from([0xff, 0xd8])];
  let i = 2;
  let hasJfif = false;

  while (i + 1 < input.length) {
    if (input[i] !== 0xff) {
      chunks.push(input.subarray(i));
      break;
    }
    const marker = input[i + 1] ?? 0;
    if (marker === 0xda) {
      chunks.push(input.subarray(i));
      break;
    }
    if (marker === 0xd9) {
      chunks.push(input.subarray(i, i + 2));
      break;
    }
    if (marker === 0x00 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      chunks.push(input.subarray(i, i + 2));
      i += 2;
      continue;
    }
    if (i + 3 >= input.length) {
      chunks.push(input.subarray(i));
      break;
    }
    const size = ((input[i + 2] ?? 0) << 8) | (input[i + 3] ?? 0);
    const end = i + 2 + size;
    if (end > input.length || size < 2) {
      chunks.push(input.subarray(i));
      break;
    }
    if (marker === 0xe1) {
      i = end;
      continue;
    }
    if (marker === 0xe0) hasJfif = true;
    chunks.push(input.subarray(i, end));
    i = end;
  }

  if (!hasJfif) {
    const jfif = Buffer.from([
      0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01,
      0x00, 0x00,
    ]);
    chunks.splice(1, 0, jfif);
  }

  return Buffer.concat(chunks);
}

export function prepareStoredImage(bytes: Buffer): Buffer {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return toJfifJpeg(bytes);
  }
  return bytes;
}
