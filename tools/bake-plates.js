'use strict';
/*
 * 把 1792x1024 净地形底图按三段纵向映射烘成 480x270 画布图。
 * 天空压扁、近景地面拉开，聚落才有地方站；运行时 1:1 贴图，不再重采样。
 * 用法：node tools/bake-plates.js [--grid]
 */
const fs = require('fs');
const path = require('path');
const { decode, encode } = require('./png');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'assets/scenes');
const OUT = path.join(ROOT, 'assets/web');
const CW = 480, CH = 270;
const GRID = process.argv.includes('--grid');

/* skyEnd/groundStart 为原图归一化高度；skyY/groundY 为画布高度 */
const VIEW = {
  A: { file: 'plate-A-river-floodplain', skyEnd: 0.205, skyY: 46, groundStart: 0.545, groundY: 116 },
  B: { file: 'plate-B-loess-terraces', skyEnd: 0.14, skyY: 38, groundStart: 0.50, groundY: 114 },
  C: { file: 'plate-C-southern-wetland', skyEnd: 0.12, skyY: 32, groundStart: 0.46, groundY: 116 },
  D: { file: 'plate-D-steppe-margin', skyEnd: 0.22, skyY: 48, groundStart: 0.34, groundY: 106 },
  E: { file: 'plate-E-coast-peninsula', skyEnd: 0.13, skyY: 34, groundStart: 0.47, groundY: 120 },
  F: { file: 'plate-F-mountain-basin', skyEnd: 0.10, skyY: 28, groundStart: 0.50, groundY: 118 }
};

function bands(v) {
  return [
    { s0: 0, s1: v.skyEnd, d0: 0, d1: v.skyY },
    { s0: v.skyEnd, s1: v.groundStart, d0: v.skyY, d1: v.groundY },
    { s0: v.groundStart, s1: 1, d0: v.groundY, d1: CH }
  ];
}

function bake(img, v) {
  const out = Buffer.alloc(CW * CH * 4);
  const sw = img.width, sh = img.height;
  const bs = bands(v);
  for (const b of bs) {
    const sy0 = b.s0 * sh, sy1 = b.s1 * sh;
    for (let dy = Math.round(b.d0); dy < Math.round(b.d1); dy++) {
      const fy0 = sy0 + (dy - b.d0) / (b.d1 - b.d0) * (sy1 - sy0);
      const fy1 = sy0 + (dy + 1 - b.d0) / (b.d1 - b.d0) * (sy1 - sy0);
      const y0 = Math.max(0, Math.floor(fy0));
      const y1 = Math.min(sh, Math.max(Math.ceil(fy1), y0 + 1));
      for (let dx = 0; dx < CW; dx++) {
        const fx0 = dx / CW * sw, fx1 = (dx + 1) / CW * sw;
        const x0 = Math.floor(fx0), x1 = Math.min(sw, Math.max(Math.ceil(fx1), x0 + 1));
        let r = 0, g = 0, bl = 0, n = 0;
        for (let y = y0; y < y1; y++) {
          for (let x = x0; x < x1; x++) {
            const i = (y * sw + x) * 4;
            r += img.data[i]; g += img.data[i + 1]; bl += img.data[i + 2]; n++;
          }
        }
        const o = (dy * CW + dx) * 4;
        out[o] = Math.round(r / n); out[o + 1] = Math.round(g / n);
        out[o + 2] = Math.round(bl / n); out[o + 3] = 255;
      }
    }
  }
  return { width: CW, height: CH, data: out };
}

/* 中位切分调色板：把降采样后的连续色收回 64 色，像素画的块面才立得住，PNG 也小 */
function quantize(img, count) {
  const px = [];
  for (let i = 0; i < img.data.length; i += 4) {
    px.push([img.data[i], img.data[i + 1], img.data[i + 2]]);
  }
  let boxes = [px];
  while (boxes.length < count) {
    let bi = -1, best = -1, bc = 0;
    boxes.forEach((box, i) => {
      if (box.length < 2) return;
      for (let c = 0; c < 3; c++) {
        let lo = 255, hi = 0;
        for (const p of box) { if (p[c] < lo) lo = p[c]; if (p[c] > hi) hi = p[c]; }
        const r = (hi - lo) * Math.cbrt(box.length);
        if (r > best) { best = r; bi = i; bc = c; }
      }
    });
    if (bi < 0) break;
    const box = boxes[bi];
    box.sort((a, b) => a[bc] - b[bc]);
    const mid = box.length >> 1;
    boxes.splice(bi, 1, box.slice(0, mid), box.slice(mid));
  }
  const pal = boxes.map((box) => {
    let r = 0, g = 0, b = 0;
    for (const p of box) { r += p[0]; g += p[1]; b += p[2]; }
    const n = Math.max(1, box.length);
    return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
  });
  for (let i = 0; i < img.data.length; i += 4) {
    const r = img.data[i], g = img.data[i + 1], b = img.data[i + 2];
    let bi = 0, bd = Infinity;
    for (let k = 0; k < pal.length; k++) {
      const dr = r - pal[k][0], dg = g - pal[k][1], db = b - pal[k][2];
      const d = dr * dr * 2 + dg * dg * 3 + db * db;
      if (d < bd) { bd = d; bi = k; }
    }
    img.data[i] = pal[bi][0]; img.data[i + 1] = pal[bi][1]; img.data[i + 2] = pal[bi][2];
  }
  return img;
}

function grid(img) {
  const put = (x, y, r, g, b) => {
    if (x < 0 || y < 0 || x >= CW || y >= CH) return;
    const i = (y * CW + x) * 4;
    img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b;
  };
  for (let x = 0; x < CW; x++) { put(x, 28, 255, 60, 60); put(x, 192, 255, 60, 60); }
  for (let y = 0; y < CH; y++) { put(240, y, 60, 200, 255); }
  for (let y = 28; y < 192; y += 20) {
    for (let x = 0; x < CW; x += 4) put(x, y, 255, 220, 80);
  }
  return img;
}

fs.mkdirSync(OUT, { recursive: true });
for (const code of Object.keys(VIEW)) {
  const v = VIEW[code];
  const img = decode(fs.readFileSync(path.join(SRC, v.file + '.png')));
  let small = quantize(bake(img, v), 64);
  const name = GRID ? 'baked-' + code + '-grid.png' : 'baked-' + code + '.png';
  if (GRID) small = grid(small);
  fs.writeFileSync(path.join(OUT, name), encode(small));
  console.log(code, name, (fs.statSync(path.join(OUT, name)).size / 1024).toFixed(0) + 'KB');
}