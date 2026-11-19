/* Trace the official GSC logo PNG into axis-aligned SVG rects. */
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

const file = process.argv[2] ?? 'ui-prototype/refs/05-logo-official.png';
const buf = readFileSync(file);

function decodePng(b) {
  const width = b.readUInt32BE(16);
  const height = b.readUInt32BE(20);
  const bitDepth = b[24];
  const colorType = b[25];
  const interlace = b[28];
  if (bitDepth !== 8 || colorType !== 6 || interlace !== 0) throw new Error(`unsupported png: depth=${bitDepth} type=${colorType} interlace=${interlace}`);
  const idat = [];
  let off = 8;
  while (off < b.length) {
    const len = b.readUInt32BE(off);
    const type = b.toString('ascii', off + 4, off + 8);
    if (type === 'IDAT') idat.push(b.subarray(off + 8, off + 8 + len));
    off += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const bpp = 4;
  const stride = width * bpp;
  const out = Buffer.alloc(height * stride);
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride);
    const cur = Buffer.alloc(stride);
    for (let x = 0; x < stride; x += 1) {
      const a = x >= bpp ? cur[x - bpp] : 0;
      const up = prev[x];
      const ul = x >= bpp ? prev[x - bpp] : 0;
      let v = line[x];
      if (filter === 1) v = (v + a) & 255;
      else if (filter === 2) v = (v + up) & 255;
      else if (filter === 3) v = (v + Math.floor((a + up) / 2)) & 255;
      else if (filter === 4) {
        const p = a + up - ul;
        const pa = Math.abs(p - a); const pb = Math.abs(p - up); const pc = Math.abs(p - ul);
        v = (v + (pa <= pb && pa <= pc ? a : pb <= pc ? up : ul)) & 255;
      }
      cur[x] = v;
    }
    cur.copy(out, y * stride);
    prev = cur;
  }
  return { width, height, rgba: out };
}

const { width, height, rgba } = decodePng(buf);

// binary map: dark = ink
const ink = new Uint8Array(width * height);
for (let i = 0; i < width * height; i += 1) {
  const r = rgba[i * 4]; const g = rgba[i * 4 + 1]; const bch = rgba[i * 4 + 2]; const a = rgba[i * 4 + 3];
  const lum = 0.299 * r + 0.587 * g + 0.114 * bch;
  ink[i] = a > 128 && lum < 128 ? 1 : 0;
}

// bounding box
let minX = width; let minY = height; let maxX = -1; let maxY = -1;
for (let y = 0; y < height; y += 1) {
  for (let x = 0; x < width; x += 1) {
    if (ink[y * width + x]) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
}
const w = maxX - minX + 1;
const h = maxY - minY + 1;
console.error(`bbox ${w}x${h} at (${minX},${minY})`);

// greedy rect decomposition over the bbox
const covered = new Uint8Array(w * h);
const rects = [];
for (let y = 0; y < h; y += 1) {
  for (let x = 0; x < w; x += 1) {
    const idx = y * w + x;
    if (covered[idx] || !ink[(y + minY) * width + x + minX]) continue;
    let rw = 1;
    while (x + rw < w && !covered[idx + rw] && ink[(y + minY) * width + x + minX + rw]) rw += 1;
    let rh = 1;
    grow: while (y + rh < h) {
      for (let k = 0; k < rw; k += 1) {
        const id = (y + rh) * w + x + k;
        if (covered[id] || !ink[(y + rh + minY) * width + x + minX + k]) break grow;
      }
      rh += 1;
    }
    for (let dy = 0; dy < rh; dy += 1) for (let dx = 0; dx < rw; dx += 1) covered[(y + dy) * w + x + dx] = 1;
    rects.push({ x, y, w: rw, h: rh });
  }
}

// sanity: covered area vs ink area
let inkArea = 0;
for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) if (ink[(y + minY) * width + x + minX]) inkArea += 1;
const rectArea = rects.reduce((s, r) => s + r.w * r.h, 0);
console.error(`rects=${rects.length} inkArea=${inkArea} rectArea=${rectArea}`);

// ascii preview (downsample ~72 cols)
const cols = 72;
const rows = Math.round((cols * h) / w / 2);
let ascii = '';
for (let r = 0; r < rows; r += 1) {
  for (let c = 0; c < cols; c += 1) {
    const x0 = Math.floor((c * w) / cols); const x1 = Math.max(x0 + 1, Math.floor(((c + 1) * w) / cols));
    const y0 = Math.floor((r * h) / rows); const y1 = Math.max(y0 + 1, Math.floor(((r + 1) * h) / rows));
    let hit = 0; let total = 0;
    for (let y = y0; y < y1; y += 1) for (let x = x0; x < x1; x += 1) { total += 1; if (ink[(y + minY) * width + x + minX]) hit += 1; }
    ascii += hit / total > 0.5 ? '#' : '.';
  }
  ascii += '\n';
}
console.log(ascii);
console.log('RECTS_JSON=' + JSON.stringify({ viewBox: `0 0 ${w} ${h}`, rects }));
