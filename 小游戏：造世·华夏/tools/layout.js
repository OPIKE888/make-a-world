/* 聚落落位审计：六地块 × 五种民居 × 人口梯度，检查越界 / 压水 / 重叠 / 房子消失 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const CW = 480, TOP = 28, BOTTOM = 192;

const sandbox = {
  console,
  Math, Date, JSON, Object, Array, String, Number, Boolean, RegExp, Error, isNaN, parseInt, parseFloat,
  setTimeout: () => 0, clearTimeout: () => {},
  requestAnimationFrame: () => 0, cancelAnimationFrame: () => {},
  Image: function () { const self = this; this.width = 480; this.height = 270; setTimeout = null; Object.defineProperty(this, 'src', { set() { if (self.onload) self.onload(); } }); },
  document: { createElement: () => ({ getContext: () => null, width: 0, height: 0 }) }
};
sandbox.window = sandbox;
vm.createContext(sandbox);

function load(rel, patch) {
  let src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  if (patch) src = patch(src);
  vm.runInContext(src, sandbox, { filename: rel });
}

['js/data/lands.js', 'js/data/cards.js', 'js/data/acts.js', 'js/data/diplomacy.js', 'js/data/endings.js']
  .forEach(f => load(f));
load('js/scene.js', s => s.replace('Z.Scene = Scene;', 'Z.__V = V; Z.Scene = Scene;'));

const Z = sandbox.ZSX;
const V = Z.__V;
const SPRITES = ['pit', 'yaodong', 'stilt', 'stone', 'hide'];
const ALL_BUILD = ['hall', 'altar', 'granary', 'kiln', 'foundry', 'market', 'gate', 'well', 'wall', 'dam'];

let fails = 0, checks = 0;
function bad(msg) { fails++; console.log('  ✗ ' + msg); }

function rect(e) {
  const ww = e.w * e.s, hh = e.h * e.s;
  return { x0: e.x - ww * 0.46, x1: e.x + ww * 0.46, y0: e.y - Math.min(hh * 0.26, 9 * e.s), y1: e.y + 1 };
}
function spriteBox(e) {
  const ww = e.w * e.s, hh = e.h * e.s;
  return { x0: e.x - ww / 2, x1: e.x + ww / 2, y0: e.y - hh, y1: e.y };
}
function overlap(a, b) { return a.x0 < b.x1 - 0.5 && a.x1 > b.x0 + 0.5 && a.y0 < b.y1 - 0.5 && a.y1 > b.y0 + 0.5; }

function audit(code, dwell, pop, built, fields, livestock, tag) {
  checks++;
  Z.dwellingKey = () => dwell;   // 逐种民居穷举，不受聚落名推断影响
  Z.Scene.sync({
    landId: code, settlementId: null, stats: { pop }, built: built.slice(),
    fields, livestock, act: 5
  }, false);

  const ents = V.entities;
  const label = `${code}/${dwell}/pop${pop}/${tag}`;

  if (!ents.length) { bad(label + ' 没有任何实体'); return; }

  const wantHomes = Math.min(11, Math.max(1, 1 + Math.floor(pop / 10)));
  const homes = ents.filter(e => e.kind === 'home');
  if (homes.length !== wantHomes) bad(`${label} 民居 ${homes.length}/${wantHomes} 栋（有房子落不下）`);
  if (pop >= 60 && homes.length < 6) bad(`${label} 高人口只有 ${homes.length} 栋，看不出族群`);

  for (const b of ALL_BUILD) {
    if (built.indexOf(b) < 0) continue;
    if (b === 'dam') { if (!ents.some(e => e.key === 'dam')) bad(label + ' 堤不见了'); continue; }
    if (b === 'wall') {
      const n = ents.filter(e => e.key === 'wall').length;
      if (n !== 9) bad(`${label} 城墙 ${n}/9 段`);
      continue;
    }
    if (!ents.some(e => e.key === b)) bad(label + ' ' + b + ' 不见了');
  }
  const nf = ents.filter(e => e.kind === 'field').length;
  if (nf !== fields) bad(`${label} 田 ${nf}/${fields}`);
  const np = ents.filter(e => e.kind === 'pen').length;
  if (np !== livestock) bad(`${label} 栏 ${np}/${livestock}`);

  const g = V.land.ground, wa = V.land.water;
  for (const e of ents) {
    const sb = spriteBox(e);
    if (sb.y1 > BOTTOM + 1) bad(`${label} ${e.key}#${e.idx} 底边 ${sb.y1.toFixed(0)} 超出可视窗 ${BOTTOM}`);
    if (sb.y0 < TOP - 1) bad(`${label} ${e.key}#${e.idx} 顶边 ${sb.y0.toFixed(0)} 被 HUD 遮住`);
    if (sb.x0 < 0 || sb.x1 > CW) bad(`${label} ${e.key}#${e.idx} 横向出画 ${sb.x0.toFixed(0)}..${sb.x1.toFixed(0)}`);
    if (e.key === 'dam') continue;
    // 落点必须在各自地块的地面线以下
    if (e.y < V.land.view.groundY - 2) bad(`${label} ${e.key}#${e.idx} 落在天际线上 y=${e.y.toFixed(0)}`);
    // 侧向水湾不得压房
    if (wa && wa.x1 - wa.x0 < CW - 40) {
      const r = rect(e);
      if (overlap(r, { x0: wa.x0, x1: wa.x1, y0: wa.y0, y1: wa.y1 })) {
        bad(`${label} ${e.key}#${e.idx} 压在水面上`);
      }
    } else if (e.y < wa.y1) {
      bad(`${label} ${e.key}#${e.idx} 落在河面 y=${e.y.toFixed(0)} < ${wa.y1}`);
    }
  }

  // 民居之间、民居与公共建筑之间不得重叠（田/栏是地面贴片，允许贴边）
  const solid = ents.filter(e => e.kind !== 'field' && e.kind !== 'pen' && e.key !== 'dam');
  for (let i = 0; i < solid.length; i++) {
    for (let j = i + 1; j < solid.length; j++) {
      if (solid[i].key === 'wall' && solid[j].key === 'wall') continue; // 城墙本就该连成一片
      if (overlap(rect(solid[i]), rect(solid[j]))) {
        bad(`${label} ${solid[i].key}#${solid[i].idx} 与 ${solid[j].key}#${solid[j].idx} 重叠`);
      }
    }
  }

  // 深度排序：y 小的先画
  for (let i = 1; i < ents.length; i++) {
    const a = ents[i - 1], b = ents[i];
    const ay = a.y + (a.kind === 'field' ? -6 : 0), by = b.y + (b.kind === 'field' ? -6 : 0);
    if (ay > by + 0.001) { bad(`${label} 深度排序错乱`); break; }
  }

  // 聚落必须撑开纵深，不能排成一条横线
  if (homes.length >= 6) {
    const ys = homes.map(e => e.y), xs = homes.map(e => e.x);
    const dy = Math.max(...ys) - Math.min(...ys);
    const dx = Math.max(...xs) - Math.min(...xs);
    if (process.env.DUMP) {
      console.log(`  · ${label} 纵深${dy.toFixed(0)} 横向${dx.toFixed(0)} ` +
        homes.map(e => `${e.x.toFixed(0)},${e.y.toFixed(0)}`).join(' '));
    }
    if (dy < (g.y1 - g.y0) * 0.5) bad(`${label} 民居纵深仅 ${dy.toFixed(0)}px，排成了横线`);
    if (dx < 90) bad(`${label} 民居横向仅 ${dx.toFixed(0)}px，挤成一柱`);
  }
}

console.log('聚落落位审计');
const PAIRS = {};
Z.SETTLEMENTS.forEach(st => {
  ['A', 'B', 'C', 'D', 'E', 'F'].forEach(L => {
    (PAIRS[L] = PAIRS[L] || new Set()).add(Z.dwellingKey(st.id, L));
  });
});
const realDwellingKey = Z.dwellingKey;
for (const code of ['A', 'B', 'C', 'D', 'E', 'F']) {
  for (const dwell of [...PAIRS[code]].sort()) {
    audit(code, dwell, 8, [], 0, 0, '开局');
    audit(code, dwell, 34, ['hall', 'well'], 1, 1, '第二幕');
    audit(code, dwell, 110, ALL_BUILD, 4, 3, '满聚落');
  }
}
Z.dwellingKey = realDwellingKey;
console.log(`\n${checks} 组场景，${fails} 处问题`);
process.exit(fails ? 1 : 0);