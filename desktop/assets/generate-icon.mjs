// Generates assets/icon.png (1024×1024) with no image libraries — just Node's
// zlib. A paper crescent on an aurora tile: the forskAI "ink & paper" palette.
// electron-builder derives the platform icons (.icns/.ico) from this PNG.
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SIZE = 1024;
const AURORA = [70, 160, 133]; // #46a085
const PAPER = [244, 241, 234]; // #f4f1ea
const RADIUS = 220; // rounded-tile corner radius

const cx1 = SIZE * 0.5, cy1 = SIZE * 0.5, r1 = SIZE * 0.30; // paper disc
const cx2 = SIZE * 0.62, cy2 = SIZE * 0.40, r2 = SIZE * 0.30; // carving disc

function insideRoundedTile(x, y) {
  const dx = Math.max(RADIUS - x, x - (SIZE - RADIUS), 0);
  const dy = Math.max(RADIUS - y, y - (SIZE - RADIUS), 0);
  return dx * dx + dy * dy <= RADIUS * RADIUS;
}
const within = (x, y, cx, cy, r) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r;

// Build RGBA scanlines, each prefixed with a 0 (no-filter) byte.
const raw = Buffer.alloc((SIZE * 4 + 1) * SIZE);
let o = 0;
for (let y = 0; y < SIZE; y++) {
  raw[o++] = 0;
  for (let x = 0; x < SIZE; x++) {
    let rgb = AURORA;
    let a = 255;
    if (!insideRoundedTile(x, y)) {
      a = 0;
    } else if (within(x, y, cx1, cy1, r1) && !within(x, y, cx2, cy2, r2)) {
      rgb = PAPER; // the crescent
    }
    raw[o++] = rgb[0];
    raw[o++] = rgb[1];
    raw[o++] = rgb[2];
    raw[o++] = a;
  }
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body) >>> 0, 0);
  return Buffer.concat([len, body, crc]);
}
function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c;
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // RGBA
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);

const out = join(dirname(fileURLToPath(import.meta.url)), 'icon.png');
writeFileSync(out, png);
console.log('wrote', out, png.length, 'bytes');
