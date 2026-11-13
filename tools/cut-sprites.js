'use strict';
/*
 * 建筑 sprite 去背：从四边泛洪吃掉纯色底，再对边缘做反混合（unmatte），
 * 裁到主体包围盒，最后盒式降采样 + alpha 阈值，得到硬边像素图。
 * 用法：node tools/cut-sprites.js
 */
const fs = require('fs');
const path = require('path');
const { decode, encode } = require('./png');

const ROOT = path.join(__dirname, '..');
const SRC_DIRS = [path.join(ROOT, 'assets/sprites'), path.join(ROOT, 'vibe_images')];
const OUT = path.join(ROOT, 'assets/sprites/cut');
const TARGET = 128;
const FLOOD_TOL = 30;
const EDGE_LO = 10;
const EDGE_HI = 58;
const EDGE_PASSES = 4;
const COVERAGE = 0.42;

function centerSquare(img) {
  if (img.height <= img.width) return img;
  const side = img.width;
  const top = Math.floor((img.height - side) / 2);
  const data = Buffer.alloc(side * side * 4);
  for (let y = 0; y < side; y++) {
    img.data.copy(data, y * side * 4, ((top + y) * img.width) * 4, ((top + y) * img.width + side) * 4);
  }
  return { width: side, height: side, data };
}

function borderColor(img) {
  const { width: w, height: h, data } = img;
  const rs = [], gs = [], bs = [];
  const push = (x, y) => { const i = (y * w + x) * 4; rs.push(data[i]); gs.push(data[i + 1]); bs.push(data[i + 2]); };
  for (let x = 0; x < w; x += 3) { push(x, 0); push(x, h - 1); }
  for (let y = 0; y < h; y += 3) { push(0, y); push(w - 1, y); }
  const med = (a) => { a.sort((p, q) => p - q); return a[a.length >> 1]; };
  return [med(rs), med(gs), med(bs)];
}

function maxDiff(data, i, bg) {
  return Math.max(
    Math.abs(data[i] - bg[0]),
    Math.abs(data[i + 1] - bg[1]),
    Math.abs(data[i + 2] - bg[2])
  );
}

function cut(img) {
  const { width: w, height: h, data } = img;
  const bg = borderColor(img);
  const state = new Uint8Array(w * h); /* 0 主体 1 已去 2 软边 */
  const alpha = new Uint8Array(w * h).fill(255);
  const stack = [];

  const seed = (x, y) => {
    const p = y * w + x;
    if (state[p]) return;
    if (maxDiff(data, p * 4, bg) <= FLOOD_TOL) { state[p] = 1; alpha[p] = 0; stack.push(p); }
  };
  for (let x = 0; x < w; x++) { seed(x, 0); seed(x, h - 1); }
  for (let y = 0; y < h; y++) { seed(0, y); seed(w - 1, y); }

  while (stack.length) {
    const p = stack.pop();
    const x = p % w, y = (p / w) | 0;
    if (x > 0) seed(x - 1, y);
    if (x < w - 1) seed(x + 1, y);
    if (y > 0) seed(x, y - 1);
    if (y < h - 1) seed(x, y + 1);
  }

  for (let pass = 0; pass < EDGE_PASSES; pass++) {
    const frontier = [];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const p = y * w + x;
        if (state[p] !== 0) continue;
        let touch = false;
        for (let dy = -1; dy <= 1 && !touch; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
            if (state[ny * w + nx] === 1) { touch = true; break; }
          }
        }
        if (touch) frontier.push(p);
      }
    }
    if (!frontier.length) break;
    for (const p of frontier) {
      const i = p * 4;
      const d = maxDiff(data, i, bg);
      if (d <= EDGE_LO) { state[p] = 1; alpha[p] = 0; continue; }
      if (d >= EDGE_HI) { state[p] = 2; continue; }
      const a = (d - EDGE_LO) / (EDGE_HI - EDGE_LO);
      alpha[p] = Math.round(a * 255);
      for (let c = 0; c < 3; c++) {
        const v = (data[i + c] - (1 - a) * bg[c]) / a;
        data[i + c] = Math.max(0, Math.min(255, Math.round(v)));
      }
      state[p] = 2;
    }
  }

  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (alpha[y * w + x] > 24) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) throw new Error('everything keyed out');
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1, alpha, src: img };
}

function downsample(region) {
  const { x: ox, y: oy, w: rw, h: rh, alpha, src } = region;
  const scale = TARGET / Math.max(rw, rh);
  const tw = Math.max(1, Math.round(rw * scale));
  const th = Math.max(1, Math.round(rh * scale));
  const out = Buffer.alloc(tw * th * 4);
  const sw = src.width;
  for (let ty = 0; ty < th; ty++) {
    const y0 = oy + Math.floor(ty * rh / th);
    const y1 = oy + Math.max(Math.floor((ty + 1) * rh / th), Math.floor(ty * rh / th) + 1);
    for (let tx = 0; tx < tw; tx++) {
      const x0 = ox + Math.floor(tx * rw / tw);
      const x1 = ox + Math.max(Math.floor((tx + 1) * rw / tw), Math.floor(tx * rw / tw) + 1);
      let sum = 0, n = 0, r = 0, g = 0, b = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const a = alpha[y * sw + x];
          n++;
          if (a < 24) continue;
          const wt = a / 255;
          sum += wt;
          const i = (y * sw + x) * 4;
          r += src.data[i] * wt; g += src.data[i + 1] * wt; b += src.data[i + 2] * wt;
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

function collectSources() {
  const found = new Map();
  for (const dir of SRC_DIRS) {
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      const m = /^(sprite-\d\d-[a-z-]+?)(?:_\d+_[0-9a-f]+)?\.png$/.exec(f);
      if (!m) continue;
      found.set(m[1], path.join(dir, f));
    }
  }
  return [...found.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

function contactSheet(items) {
  const cols = 5, cell = 140;
  const rows = Math.ceil(items.length / cols);
  const W = cols * cell, H = rows * cell;
  const data = Buffer.alloc(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const check = ((x >> 3) + (y >> 3)) % 2;
      const v = check ? 46 : 32;
      data[i] = v; data[i + 1] = v + 4; data[i + 2] = v + 10; data[i + 3] = 255;
    }
  }
  items.forEach((item, idx) => {
    const cx = (idx % cols) * cell, cy = Math.floor(idx / cols) * cell;
    const img = item.img;
    const px = cx + Math.floor((cell - img.width) / 2);
    const py = cy + Math.floor((cell - img.height) / 2);
    for (let y = 0; y < img.height; y++) {
      for (let x = 0; x < img.width; x++) {
        const s = (y * img.width + x) * 4;
        if (!img.data[s + 3]) continue;
        const dx = px + x, dy = py + y;
        if (dx < 0 || dy < 0 || dx >= W || dy >= H) continue;
        const d = (dy * W + dx) * 4;
        data[d] = img.data[s]; data[d + 1] = img.data[s + 1]; data[d + 2] = img.data[s + 2]; data[d + 3] = 255;
      }
    }
  });
  return { width: W, height: H, data };
}

function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const sources = collectSources();
  const sheet = [];
  for (const [name, file] of sources) {
    const img = centerSquare(decode(fs.readFileSync(file)));
    const small = downsample(cut(img));
    fs.writeFileSync(path.join(OUT, name + '.png'), encode(small));
    sheet.push({ name, img: small });
    console.log(name.padEnd(34), small.width + 'x' + small.height);
  }
  fs.writeFileSync(path.join(ROOT, 'tools/cut-preview.png'), encode(contactSheet(sheet)));
  console.log('\ncontact sheet -> tools/cut-preview.png');
}

main();