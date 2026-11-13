/* 无头跑批：验证引擎全流程、结局可达性、数值不越界。node tools/sim.js */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const store = {};
const sandbox = {
  console,
  Math, JSON, Date,
  localStorage: {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; }
  }
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

['js/data/lands.js', 'js/data/cards.js', 'js/data/acts.js', 'js/data/diplomacy.js',
 'js/data/endings.js', 'js/save.js', 'js/engine.js'].forEach(f => {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), sandbox, { filename: f });
});

const Z = sandbox.ZSX;
const E = Z.Engine;
const errs = [];
function assert(cond, msg) { if (!cond) errs.push(msg); }

/* ---------- 数据完整性 ---------- */
assert(Z.TOTAL_TURNS === 19, 'TOTAL_TURNS=' + Z.TOTAL_TURNS);
assert(Object.keys(Z.ACTIONS).length >= 40 || Z.ACTIONS.length >= 40, 'actions<40');
Z.LAND_ORDER.forEach(c => {
  const L = Z.LANDS[c];
  assert(L.playable, c + ' not playable');
  assert(Z.SCOUT_BY_LAND[c] && Z.SCOUT_BY_LAND[c].length === 4, c + ' scout spots');
  assert(Z.DIPLOMACY[c], c + ' diplomacy');
  const cov = Z.diploCoverage(c, Z.LAND_ORDER.filter(x => x !== c));
  assert(cov.every(x => x.covered), c + ' bottleneck uncoverable');
});

/* ---------- 单局模拟 ---------- */
function scoreCard(state, id, policy) {
  const c = Z.CARD_BY_ID[id];
  const caps = E.visibleCaps(state);
  let s = 0;
  const eff = Object.assign({}, c.effects);
  if (c.synergy && c.synergy.crisis === state.currentCrisis) {
    Object.keys(c.synergy.bonus).forEach(k => { eff[k] = (eff[k] || 0) + c.synergy.bonus[k]; });
    s += 8;
  }
  Object.keys(eff).forEach(k => {
    const v = eff[k];
    const cur = state.stats[k];
    const cap = k === 'K' || k === 'W' || k === 'R' ? 100 : caps[k];
    const room = v > 0 ? Math.min(v, Math.max(0, cap - cur)) : v;
    let w = 1;
    if (v < 0) w = cur < 25 ? 3 : 1.2;
    if (k === 'food' && cur < 30 && v > 0) w = 2.5;
    if (k === 'morale' && cur < 30 && v > 0) w = 2.5;
    if (policy === 'K' && (k === 'K')) w = 2.4;
    if (policy === 'W' && (k === 'W')) w = 2.4;
    if (policy === 'R' && (k === 'R')) w = 2.4;
    if (policy === 'craft' && k === 'craft') w = 2.2;
    s += room * w;
  });
  if (c.build && state.built.indexOf(c.build) < 0) s += 6;
  if (c.clearsFlag && state.flags.some(f => f.id === c.clearsFlag)) s += 10;
  if (policy === 'route' && c.tag === '礼') s += 5;
  /* 定向策略：为验证某个结局是否真的可达 */
  if (policy === 'trade' && c.tag === '商') s += 200;
  if (policy === 'war' && c.tag === '战') s += 200;
  if (policy === 'rites' && c.tag === '礼') s += 200;
  if (policy === 'migrate' && c.special === 'migrate') s += 400;
  if (policy === 'closed') {
    /* 神权 / 消融：闭门自守，只堆玉礼与百工，绝不通货 */
    if (c.id === 'jade-cong') s += 400;
    if (c.tag === '祭') s += 200;
    if (c.tag === '工') s += 90;
    if (c.tag === '商') s -= 400;
    if ((eff.K || 0) > 0) s -= eff.K * 25;
  }
  if (policy === 'mute') {
    // 断代：躲开一切文字与礼制成就
    const keys = Z.CARD_ACHIEVEMENTS[c.id] || [];
    if (keys.indexOf('writing') >= 0 || keys.indexOf('rites') >= 0) s -= 300;
    if (c.tag === '商') s -= 60;
  }
  if (policy === 'survive') {
    if ((eff.food || 0) < 0) s -= 25;
    if ((eff.morale || 0) < 0) s -= 25;
  }
  return s;
}

function run(landCode, settlementId, policy, opts) {
  opts = opts || {};
  const s = E.createState();
  assert(E.chooseLand(s, landCode), 'chooseLand ' + landCode);
  const spots = Z.SCOUT_BY_LAND[landCode];
  spots.slice(0, opts.scouts == null ? 2 : opts.scouts).forEach(sp => {
    const r = E.scout(s, sp.id);
    assert(r, 'scout ' + sp.id);
  });
  assert(E.selectSettlement(s, settlementId), 'settlement ' + settlementId);
  assert(E.confirmSettlement(s), 'confirmSettlement');

  const trace = [];
  let guard = 0;
  while (s.phase !== 'ending' && guard++ < 200) {
    if (s.phase === 'play') {
      assert(s.hand.length === 3, 'hand size ' + s.hand.length + ' @' + landCode + ' g' + s.gturn);
      s.hand.forEach(id => assert(!!Z.CARD_BY_ID[id], 'unknown card ' + id));
      if (opts.reroll && s.rerollsLeft > 0) {
        const before = s.hand.slice();
        const mBefore = s.stats.morale;
        const r = E.reroll(s);
        assert(r && (r.unchanged || r.hand.join() !== before.join()), 'reroll same hand');
        if (r && r.unchanged) { assert(s.stats.morale === mBefore, 'unchanged reroll charged morale'); assert(s.rerollsLeft === 1, 'unchanged reroll consumed quota'); }
        if (r && r.collapse) break;
      }
      const best = s.hand.slice().sort((a, b) => scoreCard(s, b, policy) - scoreCard(s, a, policy))[0];
      const res = E.playCard(s, best);
      assert(res, 'playCard null ' + best);
      trace.push({ g: s.gturn, act: s.act, turn: s.turn, crisis: s.currentCrisis, card: best, stats: Object.assign({}, s.stats) });
    } else if (s.phase === 'resolve') {
      E.nextTurn(s);
    } else if (s.phase === 'actEnd') {
      assert(s.actEnd && typeof s.actEnd.stars === 'number', 'actEnd missing');
      const r = E.advanceAct(s);
      assert(r.ok, 'advanceAct');
    } else if (s.phase === 'diplomacy') {
      if (opts.refuse) {
        E.refuseDiplomacy(s);
      } else {
        const avail = E.diploOptions(s);
        assert(avail.length === 5, 'diplo options ' + avail.length);
        const ranked = avail.slice().sort((a, b) => {
          const need = Z.diploCoverage(landCode, [b]).filter(x => x.covered).length -
                       Z.diploCoverage(landCode, [a]).filter(x => x.covered).length;
          return need;
        });
        const chosen = opts.diploPick === 'blind'
          ? avail.slice().sort(() => Math.random() - 0.5)
          : ranked;
        chosen.slice(0, 3).forEach(c => assert(E.togglePartner(s, c) === true, 'toggle ' + c));
        assert(E.togglePartner(s, avail.filter(c => s.partners.indexOf(c) < 0)[0]) === null, '4th partner allowed');
        const r = E.confirmDiplomacy(s);
        assert(r && r.coverage, 'confirmDiplomacy');
      }
      E.startActFive(s);
      assert(s.act === 5, 'act5 not entered');
    } else {
      errs.push('unknown phase ' + s.phase);
      break;
    }
    Object.keys(s.stats).forEach(k => {
      const v = s.stats[k];
      assert(typeof v === 'number' && !isNaN(v), 'NaN stat ' + k + ' @' + landCode);
      assert(v >= 0, 'negative ' + k + '=' + v + ' @' + landCode + ' g' + s.gturn);
      const cap = E.statMax(s, k);
      assert(v <= cap + 0.001, k + '=' + v + ' > cap ' + cap + ' @' + landCode + ' g' + s.gturn);
    });
  }
  assert(guard < 200, 'loop guard hit @' + landCode);
  assert(s.phase === 'ending', 'never reached ending @' + landCode + ' phase=' + s.phase);
  if (!s.collapse) assert(s.history.length === 19, 'history ' + s.history.length + ' @' + landCode);
  const d = E.endingDetail(s);
  assert(d.ending && d.ending.id, 'no ending detail');
  assert(d.grade && d.grade.word, 'no grade');
  assert(s.built.length >= 1, 'nothing built');
  return { s, d, trace };
}

/* ---------- 跑批 ---------- */
const results = [];
const endingHits = {};
const collapseHits = {};
const casualHits = {};
let casualN = 0, casualCollapse = 0;
const policies = ['balanced', 'K', 'W', 'R', 'craft', 'route'];
let runs = 0;
Z.LAND_ORDER.forEach(c => {
  const fit = Z.SETTLEMENTS.filter(st => st.fit.indexOf(c) >= 0).map(st => st.id);
  const all = Z.SETTLEMENTS.map(st => st.id);
  policies.forEach((p, pi) => {
    const st = all[pi % all.length];
    const r = run(c, st, p, { refuse: pi === 5, reroll: pi % 2 === 0, scouts: pi % 4 });
    runs++;
    const key = r.d.ending.id;
    endingHits[key] = (endingHits[key] || 0) + 1;
    if (r.s.collapse) collapseHits[r.s.collapse] = (collapseHits[r.s.collapse] || 0) + 1;
    results.push({
      land: c, st, policy: p, turns: r.s.history.length,
      ending: key, near: r.s.endingNear, stars: r.s.stars,
      grade: r.d.grade.word, collapse: r.s.collapse,
      route: r.s.route, built: r.s.built.length,
      stats: r.s.stats
    });
  });
  // 每块地补一批随机策略：这是「普通人乱点」的代理样本
  for (let i = 0; i < 40; i++) {
    const st = fit.length ? fit[i % fit.length] : 'earth';
    const r = runRandom(c, st, i);
    runs++;
    endingHits[r.d.ending.id] = (endingHits[r.d.ending.id] || 0) + 1;
    casualHits[r.d.ending.id] = (casualHits[r.d.ending.id] || 0) + 1;
    casualN++;
    if (r.s.collapse) { collapseHits[r.s.collapse] = (collapseHits[r.s.collapse] || 0) + 1; casualCollapse++; }
  }
});

function runRandom(landCode, settlementId, seed) {
  const s = E.createState();
  E.chooseLand(s, landCode);
  Z.SCOUT_BY_LAND[landCode].slice(0, seed % 5).forEach(sp => E.scout(s, sp.id));
  E.selectSettlement(s, settlementId);
  E.confirmSettlement(s);
  let guard = 0;
  while (s.phase !== 'ending' && guard++ < 200) {
    if (s.phase === 'play') {
      // 随机但避免自杀：粮/心低于 20 时优先补
      let pool = s.hand.slice();
      const low = s.stats.food < 22 || s.stats.morale < 22;
      if (low) {
        const safe = pool.filter(id => {
          const e = Z.CARD_BY_ID[id].effects;
          return (e.food || 0) >= 0 && (e.morale || 0) >= 0;
        });
        if (safe.length) pool = safe;
      }
      E.playCard(s, pool[Math.floor(Math.random() * pool.length)]);
    } else if (s.phase === 'resolve') E.nextTurn(s);
    else if (s.phase === 'actEnd') E.advanceAct(s);
    else if (s.phase === 'diplomacy') {
      if (seed % 4 === 0) E.refuseDiplomacy(s);
      else {
        E.diploOptions(s).sort(() => Math.random() - 0.5).slice(0, 3).forEach(c => E.togglePartner(s, c));
        E.confirmDiplomacy(s);
      }
      E.startActFive(s);
    } else break;
    Object.keys(s.stats).forEach(k => {
      assert(!isNaN(s.stats[k]), 'NaN ' + k + ' random @' + landCode);
      assert(s.stats[k] <= E.statMax(s, k) + 0.001, 'cap breach ' + k + ' random @' + landCode);
    });
  }
  assert(s.phase === 'ending', 'random never ended @' + landCode);
  return { s, d: E.endingDetail(s) };
}

/* ---------- 结局可达性定向探针 ---------- */
/* 每个结局配一套「这样打应该能出」的策略，跑 60 局看是否真的出得来 */
const PROBES = [
  { want: 'huaxia', land: 'A', st: 'earth', policy: 'K' },
  { want: 'liyue', land: 'B', st: 'earth', policy: 'rites', diploPick: 'blind' },
  { want: 'huozhi', land: 'E', st: 'stilt', policy: 'trade', diploPick: 'blind' },
  { want: 'baye', land: 'D', st: 'hide', policy: 'war', refuse: true },
  { want: 'shenquan', land: 'C', st: 'stilt', policy: 'closed', refuse: true },
  { want: 'nongmu', land: 'D', st: 'hide', policy: 'trade', diploPick: 'blind' },
  { want: 'duandai', land: 'A', st: 'pit', policy: 'mute', refuse: true },
  { want: 'pianan', land: 'F', st: 'stone', policy: 'migrate', refuse: true },
  { want: 'yinshan', land: 'F', st: 'stone', policy: 'survive', refuse: true },
  { want: 'xiaorong', land: 'B', st: 'earth', policy: 'closed', refuse: true }
];
const probeHits = {};
const samples = {};
console.log('\n--- 结局可达性探针（每个 60 局）---');
PROBES.forEach(p => {
  const hits = {};
  let survived = 0;
  let bestGap = Infinity;
  for (let i = 0; i < 60; i++) {
    const r = run(p.land, Z.SETTLEMENTS.some(s => s.id === p.st) ? p.st : 'earth', p.policy,
      { refuse: !!p.refuse, scouts: 4, diploPick: p.diploPick });
    hits[r.d.ending.id] = (hits[r.d.ending.id] || 0) + 1;
    if (!r.s.collapse) survived++;
    runs++;
    endingHits[r.d.ending.id] = (endingHits[r.d.ending.id] || 0) + 1;
    if (r.s.collapse) collapseHits[r.s.collapse] = (collapseHits[r.s.collapse] || 0) + 1;
    if (!r.s.collapse) {
      const g = Z.ENDING_BY_ID[p.want].gap(E.summary(r.s));
      if (g < bestGap) { bestGap = g; samples[p.want] = { sum: E.summary(r.s), got: r.d.ending.id }; }
    }
  }
  probeHits[p.want] = hits[p.want] || 0;
  const top = Object.keys(hits).sort((a, b) => hits[b] - hits[a]).slice(0, 4)
    .map(k => k + ':' + hits[k]).join(' ');
  console.log(p.want.padEnd(10), ('命中 ' + (hits[p.want] || 0) + '/60').padEnd(12),
    '存活' + String(survived).padStart(2), ' | ', top);
  if (!probeHits[p.want] && samples[p.want]) {
    const q = samples[p.want];
    const want = Z.ENDING_BY_ID[p.want];
    console.log('   样本 →', JSON.stringify(q.sum), 'route=' + q.sum.route,
      'moved=' + q.sum.moved, 'cov=' + JSON.stringify((q.sum.covered || []).map(c => c.id + ':' + c.covered)),
      '\n   gap(' + p.want + ')=' + want.gap(q.sum), '| 实得', q.got,
      '| ach=' + Object.keys(q.sum.ach).join(','));
  }
});
const unreachable = PROBES.filter(p => !probeHits[p.want]).map(p => p.want);

/* ---------- 存档 ---------- */
const probe = run('C', 'stilt', 'K', {});
Z.Save.write(probe.s);
const back = Z.Save.read();
assert(back && back.landId === 'C' && back.history.length === probe.s.history.length, 'save roundtrip');
Z.Save.unlockEnding(probe.d.ending.id, 'C');
Z.Save.unlockEnding(probe.d.ending.id, 'C');
const gal = Z.Save.gallery();
assert(gal[probe.d.ending.id] && gal[probe.d.ending.id].count === 2, 'gallery dedupe/count');
Z.Save.clear();
assert(Z.Save.read() === null, 'save clear');

/* ---------- 报告 ---------- */
console.log('runs:', runs);
console.log('\n--- 定向跑批 ---');
results.forEach(r => {
  console.log([r.land, r.st.padEnd(6), r.policy.padEnd(9), String(r.turns).padStart(2) + 'T',
    r.ending.padEnd(10), r.near ? 'near' : '    ', String(r.stars).padStart(2) + '★',
    r.grade, r.collapse ? 'COLLAPSE:' + r.collapse : '', 'route=' + r.route,
    'built=' + r.built, JSON.stringify(r.stats)].join(' '));
});
console.log('\n--- 结局命中 ---');
Z.ENDINGS.forEach(e => console.log(e.id.padEnd(11), String(endingHits[e.id] || 0).padStart(4), e.tier, e.title));
Object.keys(Z.COLLAPSE).forEach(k => console.log('collapse:' + k, collapseHits[k] || 0));
const unreached = Z.ENDINGS.filter(e => !endingHits[e.id]).map(e => e.id);
console.log('\n从未出现:', unreached.length ? unreached.join(', ') : '（无）');
console.log('定向探针也打不出:', unreachable.length ? unreachable.join(', ') : '（无）');
const total = Object.values(endingHits).reduce((a, b) => a + b, 0) +
  Object.values(collapseHits).reduce((a, b) => a + b, 0);
const collapses = Object.values(collapseHits).reduce((a, b) => a + b, 0);
console.log('\n崩盘率', (collapses / total * 100).toFixed(1) + '%',
  '| 最优结局 huaxia', ((endingHits.huaxia || 0) / total * 100).toFixed(1) + '%',
  '| A 级合计', ((['huaxia', 'liyue', 'huozhi'].reduce((a, k) => a + (endingHits[k] || 0), 0)) / total * 100).toFixed(1) + '%');
console.log('\n--- 乱点样本（' + casualN + ' 局，最接近真实首次试玩）---');
Z.ENDINGS.forEach(e => console.log('  ' + e.id.padEnd(11), String(casualHits[e.id] || 0).padStart(3),
  ((casualHits[e.id] || 0) / casualN * 100).toFixed(1) + '%'));
console.log('  崩盘      ', String(casualCollapse).padStart(3), (casualCollapse / casualN * 100).toFixed(1) + '%');
console.log('  huaxia 达成率', ((casualHits.huaxia || 0) / casualN * 100).toFixed(1) + '% （设计口径 15–25%）');
console.log('\n--- 断言 ---');
if (errs.length) {
  const uniq = [...new Set(errs)];
  console.log('FAIL', errs.length, '条，去重', uniq.length);
  uniq.slice(0, 40).forEach(e => console.log('  ✗', e));
  process.exitCode = 1;
} else {
  console.log('全部通过 ✓');
}