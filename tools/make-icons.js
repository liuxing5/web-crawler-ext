/* 生成扩展图标（16/32/48/128）—— 纯 Node，无第三方依赖
 * 做法：4 倍超采样绘制 → 盒式降采样 → 手写 PNG 编码（zlib 压缩 IDAT） */
'use strict';

const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

/* ---------------- PNG 编码 ---------------- */
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}

function encodePNG(w, h, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // RGBA
  const stride = w * 4;
  const raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy ? rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride)
              : Buffer.from(rgba.buffer, y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

/* ---------------- 绘制 ---------------- */
function hex(c) {
  const h = c.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function makeBuf(w, h) {
  return { buf: Buffer.alloc(w * h * 4), w, h };
}

function blend(S, x, y, col, a) {
  x = x | 0; y = y | 0;
  if (x < 0 || y < 0 || x >= S.w || y >= S.h || a <= 0) return;
  const i = (y * S.w + x) * 4;
  const da = S.buf[i + 3] / 255;
  const oa = a + da * (1 - a);
  if (oa <= 0) return;
  for (let k = 0; k < 3; k++) {
    S.buf[i + k] = Math.round((col[k] * a + S.buf[i + k] * da * (1 - a)) / oa);
  }
  S.buf[i + 3] = Math.round(oa * 255);
}

function fillCircle(S, cx, cy, r, col, a) {
  const r2 = r * r;
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
      const d2 = dx * dx + dy * dy;
      if (d2 <= r2) blend(S, x, y, col, a);
    }
  }
}

function fillEllipse(S, cx, cy, rx, ry, rot, col, a) {
  const co = Math.cos(rot), si = Math.sin(rot);
  const R = Math.max(rx, ry) + 1;
  for (let y = Math.floor(cy - R); y <= Math.ceil(cy + R); y++) {
    for (let x = Math.floor(cx - R); x <= Math.ceil(cx + R); x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
      const u = (dx * co + dy * si) / rx;
      const v = (-dx * si + dy * co) / ry;
      if (u * u + v * v <= 1) blend(S, x, y, col, a);
    }
  }
}

function thickLine(S, x0, y0, x1, y1, w, col, a) {
  const len = Math.hypot(x1 - x0, y1 - y0);
  const steps = Math.max(1, Math.ceil(len / (w * 0.32)));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    fillCircle(S, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, w / 2, col, a);
  }
}

/* 两骨 IK：返回膝点（向外侧弯） */
function knee(hip, foot, a, b, cx, cy) {
  const dx = foot[0] - hip[0], dy = foot[1] - hip[1];
  const d = Math.max(0.001, Math.hypot(dx, dy));
  const dd = Math.min(d, a + b - 0.001);
  const proj = (dd * dd + a * a - b * b) / (2 * dd);
  const h = Math.sqrt(Math.max(0, a * a - proj * proj));
  const ux = dx / d, uy = dy / d;
  const mx = hip[0] + ux * proj, my = hip[1] + uy * proj;
  let px = -uy, py = ux;
  if (px * (mx - cx) + py * (my - cy) < 0) { px = -px; py = -py; }
  return [mx + px * h, my + py * h];
}

/* ---------------- 画一只蜘蛛图标 ---------------- */
const SKIN = { leg: hex('#43e8ff'), joint: hex('#ff2d55'), body: hex('#0a1230'), core: hex('#9ffbff') };
const BG = hex('#070b18');

function drawIcon(size) {
  const SS = 4;                       // 超采样倍数
  const S = makeBuf(size * SS, size * SS);
  const W = S.w, H = S.h;
  const cx = W / 2, cy = H / 2;

  /* 背景：圆角方块 */
  const rad = W * 0.22;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = Math.min(x, W - 1 - x), dy = Math.min(y, H - 1 - y);
      let inside = true;
      if (dx < rad && dy < rad) {
        const ex = rad - dx, ey = rad - dy;
        inside = ex * ex + ey * ey <= rad * rad;
      }
      if (inside) blend(S, x, y, BG, 1);
    }
  }
  // 顶部微光
  for (let y = 0; y < H * 0.45; y++) {
    for (let x = 0; x < W; x++) {
      const a = 0.16 * (1 - y / (H * 0.45));
      const i = (y * W + x) * 4;
      if (S.buf[i + 3] > 0) blend(S, x, y, hex('#1a3a55'), a);
    }
  }

  /* 蜘蛛几何（与引擎同一套公式，heading = -0.35 rad 朝右上） */
  const heading = -0.35;
  const bodyLen = 0.15 * W;
  const bodyWid = 0.072 * W;
  const femur = 0.175 * W;
  const tibia = 0.195 * W;
  const restLen = (femur + tibia) * 0.66;
  const lw = Math.max(1, 0.022 * W);
  const fs = Math.cos(heading), fn = Math.sin(heading);

  for (let i = 0; i < 8; i++) {
    const side = i < 4 ? -1 : 1;
    const j = i % 4;
    const f = (1.5 - j) * 0.30 * bodyLen;
    const lat = side * bodyWid * 0.46;
    const hip = [cx + fs * f - fn * lat, cy + fn * f + fs * lat];
    const fwd = 0.62 - j * 0.40;
    const ang = heading + side * Math.PI / 2 - side * fwd;
    const foot = [hip[0] + Math.cos(ang) * restLen, hip[1] + Math.sin(ang) * restLen];
    const kn = knee(hip, foot, femur, tibia, cx, cy);

    thickLine(S, hip[0], hip[1], kn[0], kn[1], lw, SKIN.leg, 1);
    thickLine(S, kn[0], kn[1], foot[0], foot[1], lw * 0.86, SKIN.leg, 1);
    fillCircle(S, kn[0], kn[1], lw * 1.15, SKIN.joint, 1);
    fillCircle(S, foot[0], foot[1], lw * 0.8, SKIN.joint, 1);
  }

  /* 身体 */
  fillEllipse(S, cx - fs * bodyLen * 0.24, cy - fn * bodyLen * 0.24,
    bodyLen * 0.44, bodyWid * 0.5, heading, SKIN.body, 1);
  fillEllipse(S, cx + fs * bodyLen * 0.32, cy + fn * bodyLen * 0.32,
    bodyLen * 0.3, bodyWid * 0.4, heading, SKIN.body, 1);
  // 描边（用稍大的青色椭圆垫底）
  fillEllipse(S, cx - fs * bodyLen * 0.24, cy - fn * bodyLen * 0.24,
    bodyLen * 0.44 + lw * 0.4, bodyWid * 0.5 + lw * 0.4, heading, SKIN.leg, 0.95);
  fillEllipse(S, cx - fs * bodyLen * 0.24, cy - fn * bodyLen * 0.24,
    bodyLen * 0.44, bodyWid * 0.5, heading, SKIN.body, 1);
  fillEllipse(S, cx + fs * bodyLen * 0.32, cy + fn * bodyLen * 0.32,
    bodyLen * 0.3 + lw * 0.4, bodyWid * 0.4 + lw * 0.4, heading, SKIN.leg, 0.95);
  fillEllipse(S, cx + fs * bodyLen * 0.32, cy + fn * bodyLen * 0.32,
    bodyLen * 0.3, bodyWid * 0.4, heading, SKIN.body, 1);
  fillCircle(S, cx + fs * bodyLen * 0.04, cy + fn * bodyLen * 0.04, bodyWid * 0.2, SKIN.core, 1);

  /* 降采样（盒式平均） */
  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const i = ((y * SS + sy) * W + (x * SS + sx)) * 4;
          const al = S.buf[i + 3];
          r += S.buf[i] * al; g += S.buf[i + 1] * al; b += S.buf[i + 2] * al; a += al;
        }
      }
      const o = (y * size + x) * 4;
      if (a > 0) {
        out[o] = Math.round(r / a);
        out[o + 1] = Math.round(g / a);
        out[o + 2] = Math.round(b / a);
      }
      out[o + 3] = Math.round(a / (SS * SS));
    }
  }
  return encodePNG(size, size, out);
}

/* ---------------- 主流程 ---------------- */
const outDir = path.join(__dirname, '..', 'icons');
fs.mkdirSync(outDir, { recursive: true });
for (const size of [16, 32, 48, 128]) {
  const png = drawIcon(size);
  const file = path.join(outDir, 'icon' + size + '.png');
  fs.writeFileSync(file, png);
  console.log('icon' + size + '.png  ' + png.length + ' bytes');
}
console.log('done ->', outDir);
