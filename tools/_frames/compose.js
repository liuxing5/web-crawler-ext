/* 把透明覆盖层 PNG 合成到深色背景并裁剪到内容区域，输出 view_*.png */
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const t = new Int32Array(256);
for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; }
const crc32 = b => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = t[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const ty = Buffer.from(type); const cr = Buffer.alloc(4); cr.writeUInt32BE(crc32(Buffer.concat([ty, data]))); return Buffer.concat([len, ty, data, cr]); };

function decode(f) {
  const b = fs.readFileSync(f);
  let off = 8; const idat = [];
  const w = b.readUInt32BE(16), h = b.readUInt32BE(20);
  while (off < b.length) { const len = b.readUInt32BE(off); const ty = b.slice(off + 4, off + 8).toString(); if (ty === 'IDAT') idat.push(b.slice(off + 8, off + 8 + len)); off += 12 + len; }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * 4, out = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const ft = raw[y * (stride + 1)];
    for (let x = 0; x < stride; x++) {
      const v0 = raw[y * (stride + 1) + 1 + x];
      const a = x >= 4 ? out[y * stride + x - 4] : 0;
      const bb = y > 0 ? out[(y - 1) * stride + x] : 0;
      const c = (x >= 4 && y > 0) ? out[(y - 1) * stride + x - 4] : 0;
      let v = v0;
      if (ft === 1) v += a; else if (ft === 2) v += bb; else if (ft === 3) v += (a + bb) >> 1;
      else if (ft === 4) { const p = a + bb - c, pa = Math.abs(p - a), pb = Math.abs(p - bb), pc = Math.abs(p - c); v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? bb : c); }
      out[y * stride + x] = v & 255;
    }
  }
  return { w, h, out };
}

function encode(w, h, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ih = Buffer.alloc(13);
  ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 6;
  const stride = w * 4, raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (stride + 1)] = 0; rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride); }
  return Buffer.concat([sig, chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

const dir = __dirname;
const name = process.argv[2];
const files = name ? [name + '.png'] : fs.readdirSync(dir).filter(f => /^frame|^beauty/.test(f) && f.endsWith('.png'));
for (const f of files) {
  if (f.startsWith('view_')) continue;
  const { w, h, out } = decode(path.join(dir, f));
  let minX = 1e9, maxX = -1, minY = 1e9, maxY = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (out[(y * w + x) * 4 + 3] > 15) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
  }
  if (maxX < 0) { console.log(f, 'empty'); continue; }
  minX = Math.max(0, minX - 16); minY = Math.max(0, minY - 16);
  maxX = Math.min(w - 1, maxX + 16); maxY = Math.min(h - 1, maxY + 16);
  const cw = maxX - minX + 1, ch = maxY - minY + 1;
  const bg = [12, 14, 22], comp = Buffer.alloc(cw * ch * 4);
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    const si = ((y + minY) * w + (x + minX)) * 4, di = (y * cw + x) * 4;
    const a = out[si + 3] / 255;
    for (let k = 0; k < 3; k++) comp[di + k] = Math.round(out[si + k] * a + bg[k] * (1 - a));
    comp[di + 3] = 255;
  }
  fs.writeFileSync(path.join(dir, 'view_' + f), encode(cw, ch, comp));
  console.log('view_' + f, cw + 'x' + ch);
}
