/* 开发探针：全流程实测。走真实 DOM 点击，不用内部 API 抄近路。
   每一步都检查越界 / 裁字 / 遮挡 / 空内容 / 控制台报错。 */
(function () {
  'use strict';
  var Z = window.ZSX;
  var problems = [];
  var log = [];
  var SW = 960, SH = 540;

  var origErr = console.error;
  window.__errors = [];
  console.error = function () { window.__errors.push([...arguments].join(' ')); origErr.apply(console, arguments); };
  window.addEventListener('error', e => window.__errors.push('window.onerror: ' + e.message));
  window.addEventListener('unhandledrejection', e => window.__errors.push('unhandled: ' + e.reason));

  function bad(step, msg) { problems.push(step + ': ' + msg); }
  /* 祖先的 opacity / pointer-events 会盖过元素自身的计算值，要一路看到舞台 */
  function eff(el) {
    let o = 1, pe = true, n = el;
    while (n && n.nodeType === 1) {
      const s = getComputedStyle(n);
      if (s.display === 'none' || s.visibility === 'hidden') return { o: 0, pe: false };
      o *= +s.opacity;
      if (s.pointerEvents === 'none') pe = false;
      if (n.classList && n.classList.contains('stage')) break;
      n = n.parentElement;
    }
    return { o, pe };
  }
  function vis(el) {
    if (!el) return false;
    if (eff(el).o < 0.02) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }
  function clickable(el) { return vis(el) && eff(el).pe; }
  function txt(el) { return (el ? el.textContent : '') || ''; }

  /* 舞台内所有可见元素必须落在 960×540 之内，文字不能被裁掉 */
  function scrollParent(el) {
    let n = el.parentElement;
    while (n && n.nodeType === 1) {
      const s = getComputedStyle(n);
      if (/(auto|scroll)/.test(s.overflowY) && n.scrollHeight > n.clientHeight + 2) return n;
      if (n.classList && n.classList.contains('stage')) break;
      n = n.parentElement;
    }
    return null;
  }
  function auditLayout(step) {
    const stage = document.querySelector('.stage');
    if (!stage) { bad(step, '没有 .stage'); return 0; }
    const sr = stage.getBoundingClientRect();
    const scale = sr.width / SW;
    const modal = layer();
    const inner = modal && modal.querySelector('.fullayer__inner');
    let visible = 0;
    stage.querySelectorAll('*').forEach(el => {
      if (!vis(el)) return;
      if (el.classList.contains('rotate-hint') || el.classList.contains('scene-canvas')) return;
      visible++;
      const r = el.getBoundingClientRect();
      const x0 = (r.left - sr.left) / scale, x1 = (r.right - sr.left) / scale;
      const y0 = (r.top - sr.top) / scale, y1 = (r.bottom - sr.top) / scale;
      const id = (typeof el.className === 'string' && el.className) || el.tagName;
      const sp = scrollParent(el);
      /* 滚动容器里的内容可以超出舞台，滚得到就行；容器本身必须完整可见 */
      if (!sp && (x0 < -1 || x1 > SW + 1 || y0 < -1 || y1 > SH + 1)) {
        bad(step, `${id} 越出舞台 [${x0.toFixed(0)},${y0.toFixed(0)},${x1.toFixed(0)},${y1.toFixed(0)}]`);
      }
      const cs = getComputedStyle(el);
      if (cs.overflow !== 'visible' && cs.overflowY !== 'auto' && cs.overflowY !== 'scroll') {
        if (el.scrollHeight > el.clientHeight + 2 && el.clientHeight > 0) {
          bad(step, `${id} 文字被裁 scrollH=${el.scrollHeight} clientH=${el.clientHeight} «${txt(el).trim().slice(0, 24)}»`);
        }
      }
      /* 模态打开时，被遮罩盖住的 HUD 本就不该点得到 */
      if (inner && !inner.contains(el)) return;
      if ((el.tagName === 'BUTTON' || el.classList.contains('choice')) && !el.disabled && clickable(el)) {
        const cx = (r.left + r.right) / 2, cy = (r.top + r.bottom) / 2;
        const top = document.elementFromPoint(cx, cy);
        if (top && top !== el && !el.contains(top) && !top.contains(el)) {
          bad(step, `${id} 被 ${((typeof top.className === 'string' && top.className) || top.tagName)} 挡住，点不到`);
        }
      }
    });
    /* 长面板的主操作必须留在滚动视口里，不能滚到看不见的地方 */
    if (inner) {
      const ir = inner.getBoundingClientRect();
      const ix0 = (ir.left - sr.left) / scale, ix1 = (ir.right - sr.left) / scale;
      const iy0 = (ir.top - sr.top) / scale, iy1 = (ir.bottom - sr.top) / scale;
      if (ix0 < -1 || ix1 > SW + 1 || iy0 < -1 || iy1 > SH + 1) {
        bad(step, `面板容器越出舞台 [${ix0.toFixed(0)},${iy0.toFixed(0)},${ix1.toFixed(0)},${iy1.toFixed(0)}]`);
      }
      inner.querySelectorAll('.panel-actions').forEach(pa => {
        const pr = pa.getBoundingClientRect();
        if (pr.bottom > ir.bottom + 2 || pr.top < ir.top - 2) {
          bad(step, '主操作按钮不在可视区内，玩家需要滚动才能点到');
        }
      });
    }
    if (!visible) bad(step, '整屏没有任何可见内容');
    return visible;
  }

  function snap(step) {
    const n = auditLayout(step);
    const S = Z.UI.state();
    log.push({ step, nodes: n, phase: S && S.phase, act: S && S.act, turn: S && S.turn });
  }

  const wait = ms => new Promise(r => setTimeout(r, ms));
  function click(el) {
    if (!el) return false;
    el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    el.click();
    return true;
  }
  function key(k) { document.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })); }
  function btnByText(re, root) {
    return [...(root || document).querySelectorAll('button')].find(b => vis(b) && !b.disabled && re.test(txt(b)));
  }
  function choices() { return [...document.querySelectorAll('.choice')].filter(b => clickable(b) && !b.disabled); }
  function dlg() { const d = document.querySelector('.dialogue'); return vis(d) ? d : null; }
  function layer() { const l = document.querySelector('.fullayer'); return vis(l) ? l : null; }
  function layerBtns() { const l = layer(); return l ? [...l.querySelectorAll('button')].filter(b => clickable(b) && !b.disabled) : []; }

  /* 推进对话直到出现选项、可点的对白按钮，或全屏层 */
  async function advanceToChoices(step, limit) {
    for (let i = 0; i < (limit || 60); i++) {
      if (layer()) return 'layer';
      if (choices().length) return 'choices';
      const d = dlg();
      if (d) {
        if (d.querySelector('.dialogue__meta button')) return 'buttons';
        click(d); await wait(10); continue;
      }
      await wait(16);
    }
    bad(step, '对话推进 ' + (limit || 60) + ' 次仍没有选项');
    return 'stuck';
  }

  /* 后台标签页里 CSS 动画会被冻在 opacity:0，量不到落位。
     测试量的是动画结束后的稳定布局，所以直接关掉动画。 */
  function freezeAnimations() {
    if (document.getElementById('__noanim')) return;
    const st = document.createElement('style');
    st.id = '__noanim';
    st.textContent = '*,*::before,*::after{animation:none !important;transition:none !important;}';
    document.head.appendChild(st);
  }

  /* 真实视口可能是竖的，会正确地弹出「横屏而观」。
     测试要跑横屏逻辑，就把 innerWidth/Height 改成能塞进真实视口的 16:9。 */
  function forceLandscape() {
    const vw = window.innerWidth, vh = window.innerHeight;
    const w = Math.min(vw, vh * 16 / 9), h = w * 9 / 16;
    Object.defineProperty(window, 'innerWidth', { configurable: true, get: () => Math.round(w) });
    Object.defineProperty(window, 'innerHeight', { configurable: true, get: () => Math.round(h) });
    window.dispatchEvent(new Event('resize'));
    return { w: Math.round(w), h: Math.round(h) };
  }
  function esc(step, expectRe) {
    key('Escape');
    const l = layer();
    if (!l || !expectRe.test(txt(l))) bad(step, 'Esc 没有回到预期界面');
  }

  async function run() {
    problems.length = 0; log.length = 0;
    const vp = forceLandscape();
    freezeAnimations();
    Z.UI.setFast(true);
    Z.UI.goto('title');
    await wait(90); snap('标题');
    if (vis(document.querySelector('.rotate-hint'))) bad('适配', '横屏下仍显示竖屏提示');
    if (!/开创新世/.test(txt(layer()))) bad('标题', '标题层没有开局入口');

    /* 玩法说明：Esc 应回到标题 */
    click(btnByText(/^玩法$/)); await wait(90); snap('玩法');
    if (!/玩法/.test(txt(layer()))) bad('玩法', '说明层没打开');
    esc('玩法', /开创新世/); await wait(50);

    /* 图鉴（空） */
    click(btnByText(/结局图鉴/)); await wait(90); snap('图鉴-空');
    if (!/图鉴|结局/.test(txt(layer()))) bad('图鉴', '图鉴层没打开');
    esc('图鉴', /开创新世/); await wait(50);

    /* 静音开关 */
    const muteBefore = Z.Audio.isMuted();
    key('m'); await wait(30);
    if (Z.Audio.isMuted() === muteBefore) bad('音频', 'M 键没有切换静音');
    key('m'); await wait(30);

    /* 开局 → 六块地 */
    click(btnByText(/开创新世/)); await wait(160); snap('择地');
    const cards = () => [...document.querySelectorAll('.land-card')].filter(vis);
    if (cards().length !== 6) bad('择地', `地块卡 ${cards().length} 张，应为 6`);
    esc('择地', /开创新世/); await wait(60);
    click(btnByText(/开创新世/)); await wait(160);

    /* 选地 → 详情 → Esc 回择地 → 再进 → 择此而居 */
    const landIdx = (window.__landIdx || 0) % 6;
    click(cards()[landIdx]); await wait(160); snap('地块详情');
    if (!/择此而居/.test(txt(layer()))) bad('地块详情', '没有「择此而居」');
    esc('地块详情', /地块 [A-F]/); await wait(60);
    if (cards().length !== 6) bad('地块详情', 'Esc 后择地卡不全');
    click(cards()[landIdx]); await wait(160);
    const landCode = (txt(layer()).match(/地块 ([A-F])/) || [])[1];
    click(btnByText(/择此而居/)); await wait(200);

    /* 立村勘察 */
    let mode0 = await advanceToChoices('立村开场', 40);
    if (mode0 === 'layer') bad('立村', '开场不该有全屏层');
    if (mode0 === 'stuck') bad('立村', '开场卡住');
    snap('立村勘察');
    for (let i = 0; i < 8; i++) {
      const spots = [...document.querySelectorAll('.hotspot')].filter(b => vis(b) && !b.classList.contains('hotspot--found'));
      if (!spots.length) break;
      click(spots[0]); await wait(70);
      snap('勘察' + i);
      for (let k = 0; k < 24; k++) {
        const d = dlg();
        if (!d) break;
        if (d.querySelector('.dialogue__meta button')) break;
        click(d); await wait(10);
      }
    }
    const found = document.querySelectorAll('.hotspot--found').length;
    if (found < 4) bad('勘察', `只勘察到 ${found}/4 处`);

    /* 定聚落形态 */
    const settle = btnByText(/择居/);
    if (!settle) bad('勘察', '找不到「择居」入口');
    else {
      click(settle); await wait(160); snap('择居');
      const opts = choices();
      if (opts.length !== 3) bad('择居', `聚落形态 ${opts.length} 种，应为 3`);
      else click(opts[window.__settleIdx || 0]);
      await wait(200);
    }

    /* 十九回合 */
    let turns = 0, diplo = 0, actEnds = 0, guardSeen = false, buildSeen = false, rerolled = false, peeked = false;
    let lastSig = '', repeats = 0;
    for (let step = 0; step < 300; step++) {
      const S = Z.UI.state();
      if (S && S.phase === 'ending') break;
      const sig = (S ? S.phase + ':' + S.act + ':' + S.turn : '?') + '|' + txt(layer()).slice(0, 60) + '|' + choices().map(txt).join(',').slice(0, 60);
      if (sig === lastSig) { repeats++; } else { repeats = 0; lastSig = sig; }
      if (repeats >= 5) { bad('流程', '同一界面连续出现 5 次，卡死：' + sig.slice(0, 80)); break; }
      const m = await advanceToChoices('回合' + turns, 90);
      if (m === 'stuck') break;
      if (m === 'buttons') {
        const d = dlg();
        const bs = [...d.querySelectorAll('button')].filter(b => vis(b) && !b.disabled);
        if (!bs.length) { bad('回合' + turns, '对白按钮全不可点'); break; }
        snap('回合' + turns + '-对白按钮');
        click(bs[bs.length - 1]); await wait(140);
        continue;
      }
      if (m === 'layer') {
        const l = layer();
        if (l.querySelector('.partner')) {
          diplo++;
          snap('邦交-择伴');
          const ps = () => [...l.querySelectorAll('.partner')].filter(vis);
          if (ps().length < 4) bad('邦交', `可选邻邦只有 ${ps().length}`);
          for (let i = 0; i < 3; i++) {
            const un = ps().find(p => !p.classList.contains('sel'));
            if (!un) break;
            click(un); await wait(60);
          }
          snap('邦交-已择三');
          const ok = btnByText(/立盟|通商/, l);
          if (!ok) bad('邦交', '选满三家后确认键仍不可点');
          else { click(ok); await wait(200); }
          if (layer() && layer().querySelector('.partner')) bad('邦交', '立盟后仍停在择伴面板');
        } else if (l.querySelector('.diplo')) {
          diplo++;
          snap('邦交-问询');
          const accept = [...l.querySelectorAll('button')].filter(b => vis(b) && !b.disabled).pop();
          click(accept); await wait(160);
        } else if (l.querySelector('.end-panel')) {
          actEnds++;
          snap('幕末结算' + actEnds);
          if (!peeked) {
            peeked = true;
            const pk = btnByText(/看聚落/, l);
            if (!pk) bad('幕末', '没有「看聚落」');
            else {
              click(pk); await wait(140);
              if (layer()) bad('看聚落', '看聚落后结算层没关');
              if (!document.querySelector('.peek-exit')) bad('看聚落', '没有退出看聚落的按钮');
              snap('看聚落');
              click(btnByText(/回到局中/)); await wait(160);
              if (!layer() || !layer().querySelector('.end-panel')) bad('看聚落', '退出看聚落后回不到幕末结算，整局会卡死');
              snap('看聚落-返回');
            }
            continue;
          }
          const nx = [...l.querySelectorAll('.panel-actions button')].filter(b => vis(b) && !b.disabled).pop();
          if (!nx) { bad('幕末', '结算层没有可点的按钮'); break; }
          click(nx); await wait(180);
        } else {
          const b = layerBtns();
          if (!b.length) { bad('全屏层', '没有可点的按钮'); break; }
          snap('全屏层');
          click(b[b.length - 1]); await wait(160);
        }
        continue;
      }
      const cs = choices();
      if (!cs.length) { bad('回合' + turns, '没有可选策略'); break; }
      if (cs.length !== 3) bad('回合' + turns, `手牌 ${cs.length} 张，应为 3`);
      const body = txt(document.querySelector('.dock'));
      if (/已有防备|防备/.test(body)) guardSeen = true;
      if (/起新建筑/.test(body)) buildSeen = true;
      snap('回合' + turns + '-选策');
      if (!rerolled && turns === 2) {
        const rr = btnByText(/换策/);
        if (rr) {
          const before = cs.map(txt).join('|');
          click(rr); await wait(140);
          const after = choices().map(txt).join('|');
          if (before === after) bad('换策', '换策后手牌没变');
          rerolled = true;
          snap('换策后');
        } else bad('换策', '第一幕找不到换策键');
      }
      const hand = choices();
      /* 像个真人那样补短板：哪项显值最低就补哪项，而不是一味囤粮 */
      const st = Z.UI.state();
      const LABEL = { pop: '人口', food: '粮储', morale: '民心', craft: '技艺' };
      const low = Object.keys(LABEL).sort((a, b) => st.stats[a] - st.stats[b])[0];
      const want = new RegExp(LABEL[low] + '\\s*\\+');
      const pick = hand.find(c => want.test(txt(c))) || hand.find(c => /粮储?\s*\+/.test(txt(c))) || hand[turns % hand.length];
      click(pick);
      turns++;
      if (turns === 1) {
        const sv = Z.Save.read();
        if (!sv) bad('存档', '第一回合后没有可续的存档');
        else if (sv.landId !== landCode || sv.history.length !== 1) bad('存档', `存档内容不对 land=${sv.landId} hist=${sv.history.length}`);
      }
      await wait(80);
      for (let k = 0; k < 50; k++) {
        if (choices().length || layer()) break;
        const S2 = Z.UI.state();
        if (S2 && S2.phase === 'ending') break;
        const d = dlg();
        if (d) { click(d); await wait(8); } else await wait(14);
      }
    }

    const S = Z.UI.state();
    if (!S) bad('流程', '状态丢了');
    else {
      if (S.phase !== 'ending') bad('流程', `跑了 ${turns} 次选策仍未到结局，phase=${S.phase} act=${S.act} turn=${S.turn}`);
      else if (!S.collapse && S.history.length !== 19) bad('流程', `完整通关应 19 条历史，实为 ${S.history.length}`);
    }
    /* 崩盘是先把败亡对白走完才开结局层，要推进到面板真的出现 */
    for (let i = 0; i < 60 && !(layer() && layer().querySelector('.end-panel')); i++) {
      const d = dlg();
      if (d) { click(d); await wait(12); } else await wait(20);
    }
    await wait(120); snap('结局页');
    if (!/终章 · 揭晓/.test(txt(layer()))) bad('结局页', '结局层没有终章揭晓入口');
    if (!S.collapse && diplo < 1) bad('邦交', '走到第五幕却没触发邦交面板');
    if (!S.collapse && actEnds < 4) bad('幕末', `只结算了 ${actEnds} 幕`);
    if (!buildSeen) bad('建筑', '整局没出现「起新建筑」标记');

    /* 终章揭晓 */
    click(btnByText(/终章 · 揭晓/)); await wait(180); snap('终章揭晓');
    const rv = layer();
    if (!rv || !rv.querySelector('.reveal')) bad('揭晓', '揭晓层没打开');
    else {
      if (!rv.querySelector('.relic')) bad('揭晓', '没有出土文物');
      if (!/真实|名字|多元一体/.test(txt(rv))) bad('揭晓', '没有考古实证文案');
    }
    click(btnByText(/回到结局/, rv)); await wait(150);

    /* 图鉴：这一局的结局必须已解锁 */
    click(btnByText(/结局图鉴/)); await wait(150); snap('图鉴-有解锁');
    const gal = Z.Save.gallery();
    if (!gal || !Object.keys(gal).length) bad('图鉴', '通关后图鉴没有任何解锁');
    if (S && S.ending && !(gal && gal[S.ending])) bad('图鉴', '本局结局 ' + S.ending + ' 没有记入图鉴');
    esc('图鉴-有解锁', /终章 · 揭晓/); await wait(80);

    /* 存档：终局后应清掉本局进度，但图鉴要留着 */
    if (Z.Save.has()) bad('存档', '通关后旧存档没清，继续会读到已结束的局');
    if (!localStorage.getItem('zshx_gallery_v2')) bad('存档', '图鉴没有落盘');

    /* 重开 */
    const again = btnByText(/重开一世/);
    if (!again) bad('结局页', '找不到重开入口');
    else { click(again); await wait(180); snap('重开'); if (cards().length !== 6) bad('重开', '重开后没有回到六地块'); }

    Z.UI.goto('title'); await wait(120); snap('回到标题');
    if (!document.querySelector('.rotate-hint')) bad('适配', '没有竖屏提示元素');
    if (window.__errors.length) bad('控制台', window.__errors.slice(0, 6).join(' | '));

    return {
      vp, land: landCode, turns, diplo, actEnds, guardSeen, buildSeen, rerolled,
      ending: S && S.ending, collapsed: S && S.collapsed,
      steps: log.length, problems
    };
  }

  /* 六地块 × 三种居所，每条路都真跑一遍 */
  async function runMatrix() {
    const rows = [];
    for (let li = 0; li < 6; li++) {
      for (let si = 0; si < 3; si++) {
        window.__landIdx = li; window.__settleIdx = si;
        let r;
        try { r = await run(); }
        catch (e) { r = { fatal: String(e && e.stack || e), problems: problems.slice() }; }
        rows.push({
          land: 'ABCDEF'[li], settle: ['earth', 'stilt', 'stone'][si],
          turns: r.turns, ending: r.ending, diplo: r.diplo, actEnds: r.actEnds,
          problems: (r.problems || []).slice()
        });
      }
    }
    return rows;
  }

  window.__uicheck = { run, runMatrix, problems, log, snap, forceLandscape };
  window.__uicheckReady = true;
})();