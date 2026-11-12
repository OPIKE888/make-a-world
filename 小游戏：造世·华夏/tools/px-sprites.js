'use strict';
/*
 * 把 128px 抠好的建筑图降到画布上的实际像素尺寸，
 * 渲染时近景 1:1 不重采样，远景只做轻微缩小，像素边才干净。
 * 用法：node tools/px-sprites.js
 */
const fs = require('fs');
const path = require('path');
const { decode, encode } = require('./png');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'assets/sprites/cut');
const OUT = path.join(ROOT, 'assets/sprites/px');

/* key -> [源文件名后缀, 画布上的基准宽度] */
const SPEC = {
  pit: ['sprite-01-pit-house', 46],
  yaodong: ['sprite-02-yaodong-cave-dwelling', 52],
  stilt: ['sprite-03-stilt-house', 48],
  stone: ['sprite-04-stone-timber-house', 50],
  hide: ['sprite-05-hide-shelter', 46],
  hall: ['sprite-06-rammed-earth-hall', 60],
  gate: ['sprite-07-earth-wall-gate', 52],
  granary: ['sprite-08-raised-granary', 40],
  kiln: ['sprite-09-pottery-kiln', 42],
  dam: ['sprite-10-pile-earth-dam', 58],
  foundry: ['sprite-11-bronze-foundry', 50],
  altar: ['sprite-12-altar-mound', 46],
  wall: ['sprite-13-wall-segment', 56],
  market: ['sprite-14-market-stalls', 48]
};

const COVERAGE = 0.45;

function resize(img, tw) {
  const th = Math.max(1, Math.round(img.height * tw / img.width));
  const out = Buffer.alloc(tw * th * 4);
  const sw = img.width, sh = img.height;
  for (let ty = 0; ty < th; ty++) {
    const y0 = Math.floor(ty * sh / th);
    const y1 = Math.max(Math.floor((ty + 1) * sh / th), y0 + 1);
    for (let tx = 0; tx < tw; tx++) {
      const x0 = Math.floor(tx * sw / tw);
      const x1 = Math.max(Math.floor((tx + 1) * sw / tw), x0 + 1);
      let sum = 0, n = 0, r = 0, g = 0, b = 0;
      for (let y = y0; y < y1 && y < sh; y++) {
        for (let x = x0; x < x1 && x < sw; x++) {
          const i = (y * sw + x) * 4;
          n++;
          const a = img.data[i + 3];
          if (a < 32) continue;
          const wt = a / 255;
          sum += wt;
          r += img.data[i] * wt; g += img.data[i + 1] * wt; b += img.data[i + 2] * wt;
        }
      }
      const o = (ty * tw + tx) * 4;
      if (n && sum / n >= COVERAGE) {
        out[o] = Math.round(r / sum);
        out[o + 1] = Math.round(g / sum);
        out[o + 2] = Math.round(b / sum);
        out[o + 3] = 255;
      }
    }
  }
  return { width: tw, height: th, data: out };
}

function sheet(items) {
  const cols = 5, cell = 76;
  const rows = Math.ceil(items.length / cols);
  const W = cols * cell, H = rows * cell;
  const data = Buffer.alloc(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const v = ((x >> 3) + (y >> 3)) % 2 ? 60 : 44;
      data[i] = v; data[i + 1] = v + 5; data[i + 2] = v + 12; data[i + 3] = 255;
    }
  }
  items.forEach((it, idx) => {
    const cx = (idx % cols) * cell, cy = Math.floor(idx / cols) * cell;
    const px = cx + Math.floor((cell - it.img.width) / 2);
    const py = cy + cell - 8 - it.img.height;
    for (let y = 0; y < it.img.height; y++) {
      for (let x = 0; x < it.img.width; x++) {
        const s = (y * it.img.width + x) * 4;
        if (!it.img.data[s + 3]) continue;
        const dx = px + x, dy = py + y;
        if (dx < 0 || dy < 0 || dx >= W || dy >= H) continue;
        const d = (dy * W + dx) * 4;
        data[d] = it.img.data[s]; data[d + 1] = it.img.data[s + 1]; data[d + 2] = it.img.data[s + 2]; data[d + 3] = 255;
      }
    }
  });
  return { width: W, height: H, data };
}

fs.mkdirSync(OUT, { recursive: true });
const items = [];
const manifest = {};
for (const key of Object.keys(SPEC)) {
  const [name, width] = SPEC[key];
  const img = resize(decode(fs.readFileSync(path.join(SRC, name + '.png'))), width);
  fs.writeFileSync(path.join(OUT, key + '.png'), encode(img));
  manifest[key] = { file: 'assets/sprites/px/' + key + '.png', w: img.width, h: img.height };
  items.push({ key, img });
  console.log(key.padEnd(10), img.width + 'x' + img.height);
}
fs.writeFileSync(path.join(ROOT, 'tools/px-preview.png'), encode(sheet(items)));
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log('\n-> assets/sprites/px/  +  tools/px-preview.png');