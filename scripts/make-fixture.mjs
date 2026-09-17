import zlib from 'node:zlib';
import fs from 'node:fs/promises';

/** Writes a small RGBA PNG without any image dependency. */
export function encodePng(width, height, pixels) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    pixels.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const chunk = (type, data) => {
    const head = Buffer.alloc(8);
    head.writeUInt32BE(data.length, 0);
    head.write(type, 4, 'ascii');
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(zlib.crc32(Buffer.concat([Buffer.from(type, 'ascii'), data])) >>> 0, 0);
    return Buffer.concat([head, data, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 6 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** A stand-in "photo": a warm gradient with a couple of round objects. */
export async function writeSamplePhoto(target, size = 900) {
  const pixels = Buffer.alloc(size * size * 4);
  const put = (x, y, r, g, b) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    pixels[i] = r;
    pixels[i + 1] = g;
    pixels[i + 2] = b;
    pixels[i + 3] = 255;
  };
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      put(
        x,
        y,
        clamp(120 + 90 * Math.sin(x / 140) + 40 * (y / size)),
        clamp(90 + 70 * Math.cos(y / 120) + 50 * (x / size)),
        clamp(70 + 60 * Math.sin((x + y) / 190)),
      );
    }
  }
  for (const [cx, cy, r, color] of [
    [330, 430, 150, [238, 226, 208]],
    [330, 430, 120, [96, 62, 44]],
    [640, 520, 110, [226, 236, 240]],
  ]) {
    for (let y = cy - r; y <= cy + r; y++) {
      for (let x = cx - r; x <= cx + r; x++) {
        if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) put(x, y, color[0], color[1], color[2]);
      }
    }
  }
  await fs.writeFile(target, encodePng(size, size, pixels));
  return target;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const target = process.argv[2] ?? 'sample-photo.png';
  await writeSamplePhoto(target);
  console.log(`wrote ${target}`);
}
