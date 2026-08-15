import zlib from "node:zlib";

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i]!;
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function chunk(type: string, data: Buffer): Buffer {
  const typeBuf = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

/** Turn near-black RGB pixels into transparency for invoice logos. */
export function pngBlackToTransparent(png: Buffer, threshold = 28): Buffer {
  if (png.length < 24 || png.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") {
    return png;
  }
  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 8;
  let colorType = 2;
  const idats: Buffer[] = [];
  while (offset + 8 <= png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.subarray(offset + 4, offset + 8).toString("ascii");
    const data = png.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8]!;
      colorType = data[9]!;
    } else if (type === "IDAT") {
      idats.push(data);
    } else if (type === "IEND") {
      break;
    }
    offset += 12 + length;
  }
  if (!width || !height || bitDepth !== 8 || (colorType !== 2 && colorType !== 6)) {
    return png;
  }

  const bpp = colorType === 6 ? 4 : 3;
  const raw = zlib.inflateSync(Buffer.concat(idats));
  const stride = width * bpp;
  const rgba = Buffer.alloc(width * height * 4);
  let src = 0;
  const prev = Buffer.alloc(stride);
  const row = Buffer.alloc(stride);

  for (let y = 0; y < height; y++) {
    const filter = raw[src++]!;
    for (let x = 0; x < stride; x++) {
      const byte = raw[src++]!;
      const a = x >= bpp ? row[x - bpp]! : 0;
      const b = prev[x]!;
      const c = x >= bpp ? prev[x - bpp]! : 0;
      let val = byte;
      if (filter === 1) val = (byte + a) & 255;
      else if (filter === 2) val = (byte + b) & 255;
      else if (filter === 3) val = (byte + Math.floor((a + b) / 2)) & 255;
      else if (filter === 4) val = (byte + paeth(a, b, c)) & 255;
      row[x] = val;
    }
    for (let x = 0; x < width; x++) {
      const i = x * bpp;
      const r = row[i]!;
      const g = row[i + 1]!;
      const bl = row[i + 2]!;
      const a = bpp === 4 ? row[i + 3]! : 255;
      const out = (y * width + x) * 4;
      const isBg = r <= threshold && g <= threshold && bl <= threshold;
      rgba[out] = r;
      rgba[out + 1] = g;
      rgba[out + 2] = bl;
      rgba[out + 3] = isBg ? 0 : a;
    }
    row.copy(prev);
  }

  const filtered = Buffer.alloc(height * (1 + width * 4));
  let d = 0;
  for (let y = 0; y < height; y++) {
    filtered[d++] = 0;
    rgba.copy(filtered, d, y * width * 4, (y + 1) * width * 4);
    d += width * 4;
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(filtered)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
