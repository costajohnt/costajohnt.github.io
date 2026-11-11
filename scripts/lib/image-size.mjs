/**
 * Intrinsic pixel size of a PNG, GIF, JPEG or WebP file, read from the header.
 * Used to emit width/height on in-post images so the page doesn't shift as
 * they load. Returns { width, height } or null for anything unrecognized.
 */
import { readFileSync } from 'fs';

export function imageSize(buf) {
  if (buf.length < 30) return null;

  // PNG: 8-byte signature, then IHDR with width/height as big-endian u32
  if (buf.readUInt32BE(0) === 0x89504e47) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }

  // GIF: "GIF8", then logical screen size as little-endian u16
  if (buf.toString('latin1', 0, 4) === 'GIF8') {
    return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
  }

  // WebP: RIFF....WEBP, then one of three chunk layouts
  if (buf.toString('latin1', 0, 4) === 'RIFF' && buf.toString('latin1', 8, 12) === 'WEBP') {
    const chunk = buf.toString('latin1', 12, 16);
    if (chunk === 'VP8X') return { width: buf.readUIntLE(24, 3) + 1, height: buf.readUIntLE(27, 3) + 1 };
    if (chunk === 'VP8 ') return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
    if (chunk === 'VP8L') {
      const bits = buf.readUInt32LE(21);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
    return null;
  }

  // JPEG: walk the segments to the first start-of-frame marker
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) return null;
      const marker = buf[i + 1];
      // SOF0-SOF15, minus DHT (C4), JPG (C8) and DAC (CC)
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { width: buf.readUInt16BE(i + 7), height: buf.readUInt16BE(i + 5) };
      }
      i += 2 + buf.readUInt16BE(i + 2);
    }
  }

  return null;
}

/** Size of the image file at `path`, or null when missing or unrecognized. */
export function imageSizeOf(path) {
  try {
    return imageSize(readFileSync(path));
  } catch {
    return null;
  }
}
