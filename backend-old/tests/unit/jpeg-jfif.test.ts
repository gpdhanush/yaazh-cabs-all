import { describe, expect, it } from "vitest";
import { toJfifJpeg } from "../../src/utils/jpeg-jfif.js";

describe("toJfifJpeg", () => {
  it("strips APP1 EXIF and inserts JFIF", () => {
    const input = Buffer.from([
      0xff, 0xd8, 0xff, 0xe1, 0x00, 0x06, 0x45, 0x78, 0x00, 0x00, 0xff, 0xd9,
    ]);
    const out = toJfifJpeg(input);
    expect(out[0]).toBe(0xff);
    expect(out[1]).toBe(0xd8);
    expect(out[2]).toBe(0xff);
    expect(out[3]).toBe(0xe0);
    expect(out.includes(Buffer.from([0xff, 0xe1]))).toBe(false);
  });
});
