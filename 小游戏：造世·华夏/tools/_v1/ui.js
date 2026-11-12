(function () {
  'use strict';
  var Z = window.ZSX = window.ZSX || {};

  /* ---------- 舞台常量（960×540 逻辑坐标，画布取其半以便像素倍增） ---------- */
  var SW = 960, SH = 540, CW = 480, CH = 270;
  var HUD_H = 62;          /* 顶部 HUD 高度 */
  var DIAL_TOP = 378;      /* 对话框上沿 */
  var BAND_TOP = HUD_H / 2;
  var BAND_BOTTOM = DIAL_TOP / 2;

  var state = null;
  var app = null;
  var els = {};
  var stageScale = 1;
  var motionReduced = false;
  if (window.matchMedia) motionReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var EFFECT_ORDER = ['pop', 'food', 'morale', 'craft', 'W', 'R', 'K'];
  var VISIBLE_KEYS = [['pop', '人口'], ['food', '粮储'], ['morale', '民心'], ['craft', '技艺']];
  var HIDDEN_KEYS = { K: true, W: true, R: true };
  var DIAL_SPEED = 26;

  /* ---------- DOM 工具（不用 innerHTML，兼容容器约束） ---------- */

  function h(tag, attrs, children) {
    var el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        var value = attrs[key];
        if (value === null || value === undefined || value === false) return;
        if (key === 'class') el.className = value;
        else if (key === 'text') el.textContent = value;
        else if (key === 'dataset') {
          Object.keys(value).forEach(function (name) { el.dataset[name] = value[name]; });
        } else if (key === 'style') el.style.cssText = value;
        else if (key === 'disabled') el.disabled = true;
        else if (key.slice(0, 2) === 'on') el.addEventListener(key.slice(2).toLowerCase(), value);
        else if (value === true) el.setAttribute(key, '');
        else el.setAttribute(key, value);
      });
    }
    if (children !== null && children !== undefined) {
      var list = Array.isArray(children) ? children : [children];
      list.forEach(function (child) {
        if (child === null || child === undefined || child === false) return;
        el.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
      });
    }
    return el;
  }

  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }
  function signed(v) { return (v > 0 ? '+' : '') + v; }
  function save() { if (state) Z.Save.write(state); }

  /* ---------- 图片 ---------- */

  var imgCache = {};

  function getImg(src, cb) {
    var rec = imgCache[src];
    if (rec) {
      if (rec.ok && cb) cb(rec.img);
      return rec;
    }
    rec = { img: null, ok: false };
    imgCache[src] = rec;
    var im = new Image();
    im.onload = function () { rec.img = im; rec.ok = true; if (cb) cb(im); };
    im.onerror = function () { rec.ok = false; };
    im.src = src;
    return rec;
  }

  /* ---------- 场景渲染循环 ---------- */

  var sceneNow = null, sceneNext = null;
  var settleSprite = null;

  function setScene(src) {
    var rec = getImg(src);
    if (sceneNow && sceneNow.rec === rec && !sceneNext) return;
    sceneNext = { rec: rec, p: 0 };
    if (motionReduced) { sceneNow = sceneNext; sceneNext = null; }
  }

  function showSettlementSprite(src) {
    settleSprite = { rec: getImg(src), t0: 0, born: performance.now() };
  }

  function paintImage(rec, alpha) {
    var ctx = els.ctx;
    if (!rec || !rec.ok) return;
    var img = rec.img;
    var s = Math.max(CW / img.naturalWidth, CH / img.naturalHeight);
    var w = img.naturalWidth * s, hh = img.naturalHeight * s;
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, (CW - w) / 2, (CH - hh) / 2, w, hh);
    ctx.globalAlpha = 1;
  }

  function paintFallback() {
    var ctx = els.ctx;
    var grad = ctx.createLinearGradient(0, 0, 0, CH);
    grad.addColorStop(0, '#26303d');
    grad.addColorStop(0.6, '#1a2029');
    grad.addColorStop(1, '#10151b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CW, CH);
    ctx.fillStyle = 'rgba(120,160,175,.35)';
    ctx.fillRect(0, 150, CW, 26);
  }

  function drawScene(t) {
    var ctx = els.ctx;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, CW, CH);

    if (sceneNext && sceneNow) {
      sceneNext.p = Math.min(1, sceneNext.p + (motionReduced ? 1 : 0.1));
      paintImage(sceneNow.rec, 1 - sceneNext.p);
      paintImage(sceneNext.rec, sceneNext.p);
      if (sceneNext.p >= 1) { sceneNow = sceneNext; sceneNext = null; }
    } else if (sceneNext) {
      sceneNext.p = Math.min(1, sceneNext.p + (motionReduced ? 1 : 0.12));
      paintImage(sceneNext.rec, sceneNext.p);
      if (sceneNext.p >= 1) { sceneNow = sceneNext; sceneNext = null; }
    } else if (sceneNow) {
      paintImage(sceneNow.rec, 1);
    }

    var live = (sceneNow && sceneNow.rec.ok) || (sceneNext && sceneNext.rec.ok);
    if (!live) paintFallback();

    var crisis = state ? state.currentCrisis : null;
    if (!motionReduced) drawAmbient(t, crisis);
    drawSettlement(t);
    if (crisis) drawCrisis(t, crisis);
  }

  function drawAmbient(t, crisis) {
    var ctx = els.ctx;

    ctx.fillStyle = crisis === 'flood' ? 'rgba(150,200,220,.5)' : 'rgba(150,190,205,.34)';
    for (var i = 0; i < 14; i++) {
      var speed = 0.012 + (i % 4) * 0.006;
      var x = ((i * 37 + t * speed) % (CW + 40)) - 20;
      var y = BAND_BOTTOM - 22 + ((i * 13) % 20);
      ctx.fillRect(x, y, 7 + (i % 3) * 3, 1);
    }

    var count = crisis === 'land' ? 34 : 16;
    ctx.fillStyle = crisis === 'land' ? 'rgba(190,155,95,.5)' : 'rgba(220,215,195,.28)';
    for (var j = 0; j < count; j++) {
      var px = (j * 61 + t * 0.017 * ((j % 3) + 1)) % CW;
      var py = BAND_TOP + ((j * 43 + t * 0.008) % (BAND_BOTTOM - BAND_TOP));
      ctx.fillRect(px, py, 2, 2);
    }
  }

  function drawSettlement(t) {
    if (!settleSprite) return;
    var ctx = els.ctx;
    var rec = settleSprite.rec;
    var size = 62;
    var cx = CW / 2 - size / 2;
    var cy = BAND_BOTTOM - size - 4;
    var e = Math.min(1, (t - settleSprite.born) / 800);

    if (!rec.ok) {
      ctx.fillStyle = 'rgba(200,168,107,.45)';
      ctx.fillRect(cx, cy, size, size);
      return;
    }
    if (e < 1) {
      var step = Math.floor(e * 6) / 6;
      var s = size * (0.3 + 0.7 * step);
      ctx.globalAlpha = 0.35 + 0.65 * step;
      ctx.drawImage(rec.img, cx + (size - s) / 2, cy + (size - s), s, s);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(231,205,140,.7)';
      ctx.lineWidth = 2;
      ctx.strokeRect(cx - 3 + (1 - step) * 6, cy - 3 + (1 - step) * 6, size + 6, size + 6);
      return;
    }
    ctx.drawImage(rec.img, cx, cy, size, size);

    var puffs = 5;
    for (var i = 0; i < puffs; i++) {
      var life = ((t * 0.0007 + i / puffs) % 1);
      var py = cy - 4 - life * 34;
      var w = 2 + life * 7;
      ctx.fillStyle = 'rgba(215,215,205,' + (0.32 * (1 - life)).toFixed(3) + ')';
      ctx.fillRect(cx + size * 0.68 - w / 2 + Math.sin(life * 6 + i) * 3, py, w, w * 0.7);
    }
  }

  function drawCrisis(t, crisis) {
    var ctx = els.ctx;
    if (crisis === 'flood') {
      ctx.fillStyle = 'rgba(48,96,132,.2)';
      ctx.fillRect(0, 0, CW, CH);
      ctx.strokeStyle = 'rgba(190,220,235,.55)';
      ctx.lineWidth = 1;
      for (var i = 0; i < 46; i++) {
        var x = (i * 29 + t * 0.26) % (CW + 30);
        var y = (i * 71 + t * 0.75) % CH;
        ctx.beginPath();
        ctx.moveTo(CW - x, y);
        ctx.lineTo(CW - x - 3, y + 11);
        ctx.stroke();
      }
    } else if (crisis === 'land') {
      ctx.fillStyle = 'rgba(158,118,62,.16)';
      ctx.fillRect(0, 0, CW, CH);
    } else if (crisis === 'ceiling') {
      ctx.fillStyle = 'rgba(210,170,90,' + (0.05 + 0.04 * Math.sin(t * 0.0018)).toFixed(3) + ')';
      ctx.fillRect(0, 0, CW, CH);
    }
  }

  function loop(t) {
    drawScene(t);
    requestAnimationFrame(loop);
  }

  /* ---------- HUD ---------- */

  var gaugeRefs = {};

  function buildHUD() {
    els.hudAct = h('div', { class: 'hud__act', text: '造世·华夏' });
    els.hudTurn = h('div', { class: 'hud__turn', text: '尚未立族' });
    els.hudLand = h('div', { class: 'hud__land', text: '未择地' });

    var stats = h('div', { class: 'hud__stats' });
    VISIBLE_KEYS.forEach(function (pair) {
      var key = pair[0];
      var valueEl = h('span', { class: 'gauge__value', text: '0' });
      var fillEl = h('div', { class: 'gauge__fill' });
      var gauge = h('div', { class: 'gauge gauge--' + key }, [
        h('div', { class: 'gauge__top' }, [h('span', { class: 'gauge__label', text: pair[1] }), valueEl]),
        h('div', { class: 'gauge__bar' }, [fillEl])
      ]);
      stats.appendChild(gauge);
      gaugeRefs[key] = { gauge: gauge, value: valueEl, fill: fillEl };
    });

    var hiddenBox = h('div', { class: 'hud__hidden' });
    els.hiddenRefs = {};
    [['K', '交融'], ['W', '武功'], ['R', '礼制']].forEach(function (pair) {
      var v = h('span', { class: 'hstat__v', text: '0' });
      hiddenBox.appendChild(h('div', { class: 'hstat' }, [h('span', { class: 'hstat__k', text: pair[1] }), v]));
      els.hiddenRefs[pair[0]] = v;
    });
    els.hiddenBox = hiddenBox;

    els.hud = h('div', { class: 'hud' }, [
      h('div', { class: 'hud__id' }, [els.hudAct, els.hudTurn, els.hudLand]),
      stats,
      hiddenBox
    ]);
    els.hud.style.display = 'none';

    els.flags = h('div', { class: 'hud__flags' });
    els.flags.style.display = 'none';
  }

  function showGameHud(on) {
    els.hud.style.display = on ? 'flex' : 'none';
    els.flags.style.display = on ? 'flex' : 'none';
  }

  function updateHUD(deltas) {
    if (!state) return;
    var act = Z.ACTS[0];
    var land = state.landId ? Z.LANDS[state.landId] : null;
    var caps = state.landId ? Z.Engine.visibleCaps(state) : { pop: 100, food: 100, morale: 100, craft: 100 };

    els.hudAct.textContent = '第' + act.no + '幕 · ' + act.name;
    els.hudTurn.textContent = state.turn
      ? '回合 ' + state.turn + ' / ' + act.turns + ' · ' + (act.dates[state.turn - 1] || act.range)
      : '尚未立族';
    els.hudLand.textContent = land ? land.code + ' · ' + land.short : '未择地';

    VISIBLE_KEYS.forEach(function (pair) {
      var key = pair[0];
      var ref = gaugeRefs[key];
      var v = state.stats[key];
      if (ref.value.textContent !== String(v)) {
        ref.value.textContent = String(v);
        ref.value.classList.remove('bump');
        void ref.value.offsetWidth;
        if (!motionReduced) ref.value.classList.add('bump');
      }
      ref.fill.style.width = Math.max(2, Math.min(100, v / caps[key] * 100)) + '%';
    });

    EFFECT_ORDER.forEach(function (key) {
      if (HIDDEN_KEYS[key]) els.hiddenRefs[key].textContent = String(state.stats[key]);
    });

    clear(els.flags);
    (state.flags || []).forEach(function (flag) {
      var parts = Object.keys(flag.effects || {}).map(function (k) {
        return Z.STAT_LABELS[k] + ' ' + signed(flag.effects[k]);
      });
      els.flags.appendChild(h('span', {
        class: 'flag-chip',
        text: flag.name + (parts.length ? ' ' + parts.join(' ') : '') + ' · 余 ' + (flag.turns > 90 ? '长期' : flag.turns)
      }));
    });

    if (deltas) floatDeltas(deltas);
  }

  function logicalCenter(el) {
    var r = el.getBoundingClientRect();
    var s = els.stage.getBoundingClientRect();
    return { x: (r.left + r.width / 2 - s.left) / stageScale, y: (r.top + r.height / 2 - s.top) / stageScale };
  }

  function floatDeltas(deltas) {
    if (!deltas) return;
    EFFECT_ORDER.forEach(function (key) {
      var v = deltas[key];
      if (!v) return;
      var anchor = gaugeRefs[key] ? gaugeRefs[key].gauge : (HIDDEN_KEYS[key] ? els.hiddenBox : null);
      if (!anchor || !els.fx.parentNode) return;
      var pos = logicalCenter(anchor);
      var node = h('span', {
        class: 'float-delta ' + (v > 0 ? 'float-delta--plus' : 'float-delta--minus'),
        style: 'left:' + Math.round(pos.x - 22) + 'px;top:' + Math.round(pos.y - 8) + 'px',
        text: Z.STAT_LABELS[key] + ' ' + signed(v)
      });
      els.fx.appendChild(node);
      window.setTimeout(function () {
        if (node.parentNode === els.fx) els.fx.removeChild(node);
      }, 1500);
    });
    while (els.fx.childNodes.length > 12) els.fx.removeChild(els.fx.firstChild);
  }

  /* ---------- 零件：效果标签 ---------- */

  function chipEl(key, value, prefix) {
    var cls = 'chip ' + (value > 0 ? 'chip--plus' : 'chip--minus');
    if (HIDDEN_KEYS[key]) cls += ' chip--hidden';
    return h('span', { class: cls, text: (prefix || '') + Z.STAT_LABELS[key] + ' ' + signed(value) });
  }

  function effectChips(effects, prefix) {
    return EFFECT_ORDER.filter(function (k) { return effects && effects[k]; })
      .map(function (k) { return chipEl(k, effects[k], prefix); });
  }

  function passiveChips(land) {
    return Object.keys(land.passive || {}).map(function (k) {
      return h('span', { class: 'chip chip--plus', text: Z.STAT_LABELS[k] + ' +' + land.passive[k] + '/回合' });
    });
  }

  function eventChips(crisis, flags) {
    var out = [];
    if (!crisis) return out;
    Object.keys(crisis.effects || {}).forEach(function (k) {
      if (crisis.effects[k]) out.push(chipEl(k, crisis.effects[k], '天 · '));
    });
    if (crisis.special === 'foodFreeze') {
      out.push(h('span', { class: 'chip chip--minus', text: '本回合无自然增产' }));
    }
    (flags || []).forEach(function (flag) {
      Object.keys(flag.effects || {}).forEach(function (k) {
        if (flag.effects[k]) {
          out.push(h('span', { class: 'chip chip--minus', text: '积弊 · ' + Z.STAT_LABELS[k] + ' ' + signed(flag.effects[k]) }));
        }
      });
    });
    return out;
  }

  function tagEl(text) {
    return h('span', { class: 'tag', dataset: { tag: text }, text: text });
  }

  function stars(count, max) {
    var box = h('span', { class: 'stars' });
    for (var i = 0; i < max; i++) {
      box.appendChild(h('span', {
        class: i < count ? '' : 'dim',
        style: 'animation-delay:' + (i * 0.08) + 's',
        text: i < count ? '★' : '☆'
      }));
    }
    return box;
  }

  /* ---------- 对话框 ---------- */

  function buildDialogue() {
    els.speaker = h('div', { class: 'dialogue__speaker', text: '史官' });
    els.text = h('div', { class: 'dialogue__text' });
    els.meta = h('div', { class: 'dialogue__meta' });
    els.next = h('div', { class: 'dialogue__next hidden', text: '▼' });
    els.dialogue = h('div', { class: 'dialogue hidden' }, [els.speaker, els.text, els.meta, els.next]);
  }

  function showDialogue() { els.dialogue.classList.remove('hidden'); }
  function hideDialogue() { stopTyping(); els.dialogue.classList.add('hidden'); }

  var typing = null;

  function stopTyping() {
    if (typing) { window.clearInterval(typing.timer); typing = null; }
  }

  function typeText(str, done) {
    stopTyping();
    clear(els.meta);
    els.next.classList.add('hidden');
    if (motionReduced || !str) {
      els.text.textContent = str || '';
      if (done) done();
      return;
    }
    var job = { str: str, i: 0, done: done };
    job.timer = window.setInterval(function () {
      job.i += 2;
      els.text.textContent = job.str.slice(0, job.i);
      if (job.i >= job.str.length) {
        window.clearInterval(job.timer);
        typing = null;
        if (job.done) job.done();
      }
    }, DIAL_SPEED);
    typing = job;
  }

  function completeTyping() {
    if (!typing) return;
    var job = typing;
    window.clearInterval(job.timer);
    typing = null;
    els.text.textContent = job.str;
    if (job.done) job.done();
  }

  function setMeta(chips) {
    clear(els.meta);
    (chips || []).forEach(function (c) { els.meta.appendChild(c); });
  }

  /* ---------- 选项面板（效果先显示，再选择） ---------- */

  function buildChoices() { els.choices = h('div', { class: 'choices hidden' }); }

  function hideChoices() {
    clear(els.choices);
    els.choices.classList.add('hidden');
    waitingChoice = false;
  }

  var waitingChoice = false;

  function choiceButton(opt, index) {
    var head = [];
    if (opt.tag) head.push(tagEl(opt.tag));
    head.push(h('span', { class: 'choice__name', text: (index != null ? (index + 1) + '. ' : '') + opt.name }));
    if (opt.badge) head.push(h('span', { class: opt.badgeClass || 'badge-lock', text: opt.badge }));

    var chips = (opt.chips || []).concat(opt.effects ? effectChips(opt.effects) : []);
    if (opt.note) chips.push(h('span', { class: 'chip', text: opt.note }));

    return h('button', {
      class: 'choice' + (opt.wide ? ' choice--wide' : '') + (opt.disabled ? ' choice--disabled' : ''),
      type: 'button',
      disabled: !!opt.disabled,
      onclick: function () {
        if (opt.disabled) return;
        hideChoices();
        if (opt.onPick) opt.onPick();
      }
    }, [
      h('div', { class: 'choice__head' }, head),
      opt.sub ? h('div', { class: 'choice__sub', text: opt.sub }) : null,
      chips.length ? h('div', { class: 'choice__effects' }, chips) : null,
      opt.anchor ? h('div', { class: 'choice__sub', text: '· ' + opt.anchor }) : null
    ]);
  }

  function showChoices(opts) {
    clear(els.choices);
    els.choices.classList.remove('hidden');
    waitingChoice = true;
    var perRow = opts.length > 6 ? 2 : 3;
    var row = null;
    opts.forEach(function (opt, i) {
      if (opt.wide || !row || row.childNodes.length >= perRow) {
        row = h('div', { class: 'choices__row' });
        els.choices.appendChild(row);
      }
      row.appendChild(choiceButton(opt, i));
    });
  }

  /* ---------- 节拍引擎 ---------- */

  var beats = [], bi = -1, beatsDone = null;

  function play(list, onDone) {
    beats = list;
    bi = -1;
    beatsDone = onDone || null;
    nextBeat();
  }

  function nextBeat() {
    bi += 1;
    if (bi >= beats.length) {
      var cb = beatsDone;
      beatsDone = null;
      beats = [];
      hideDialogue();
      if (cb) cb();
      return;
    }
    var b = beats[bi];
    showDialogue();
    els.speaker.textContent = b.speaker || '史官';
    if (b.scene) setScene(b.scene);
    if (b.onEnter) b.onEnter();
    var meta = b.meta || [];
    typeText(b.text || '', function () {
      setMeta(meta);
      if (b.choices) {
        showChoices(typeof b.choices === 'function' ? b.choices() : b.choices);
      } else {
        els.next.classList.remove('hidden');
      }
    });
  }

  function advance() {
    if (els.overlay.firstChild) return;
    if (waitingChoice) return;
    if (typing) { completeTyping(); return; }
    if (beats.length) nextBeat();
  }

  /* ---------- 勘察热点 ---------- */

  var hotspotNodes = {};

  function buildScoutLayer() {
    els.scoutLayer = h('div', { style: 'position:absolute;inset:0;z-index:5;pointer-events:none' });
    els.scoutCount = h('div', { class: 'scout-count', text: '' });
    els.scoutCount.style.display = 'none';
  }

  function showHotspots() {
    clear(els.scoutLayer);
    hotspotNodes = {};
    Z.SCOUT.forEach(function (spot) {
      var found = state.scouted.indexOf(spot.id) >= 0;
      var left = Math.round((spot.x / 100) * SW);
      var top = Math.round(HUD_H + (spot.y / 100) * (DIAL_TOP - HUD_H));
      var btn = h('button', {
        class: 'hotspot' + (found ? ' hotspot--found' : ''),
        type: 'button',
        style: 'left:' + left + 'px;top:' + top + 'px;pointer-events:auto',
        'aria-label': '勘察' + spot.resource,
        onclick: function () { scoutSpot(spot); }
      }, [h('span', { text: found ? '✓' : spot.char })]);
      hotspotNodes[spot.id] = btn;
      els.scoutLayer.appendChild(btn);
    });
    if (!els.scoutLayer.parentNode) els.stage.appendChild(els.scoutLayer);
    els.scoutCount.style.display = 'block';
    updateScoutCount();
  }

  function hideScout() {
    clear(els.scoutLayer);
    if (els.scoutLayer.parentNode) els.stage.removeChild(els.scoutLayer);
    els.scoutCount.style.display = 'none';
  }

  function updateScoutCount() {
    els.scoutCount.textContent = '勘察 ' + state.scouted.length + ' / ' + Z.SCOUT.length + ' · 点击标记';
  }

  function scoutSpot(spot) {
    if (state.scouted.indexOf(spot.id) >= 0) return;
    var res = Z.Engine.scout(state, spot.id);
    if (!res) return;
    save();
    updateHUD(res.deltas);
    updateScoutCount();
    var node = hotspotNodes[spot.id];
    if (node) {
      clear(node);
      node.className = 'hotspot hotspot--found';
      node.appendChild(h('span', { text: '✓' }));
    }
    var all = state.scouted.length >= Z.SCOUT.length;
    var list = [{
      speaker: '勘察 · ' + spot.resource,
      text: spot.text,
      meta: effectChips(spot.effect).concat(spot.scarce ? [h('span', { class: 'chip chip--minus', text: '此地少石，垒基难' })] : [])
    }];
    if (all) {
      list.push({
        speaker: '族长',
        text: '都看过了。家要安成什么样？三种住法，代价都写在牌面上。',
        onEnter: hideScout,
        choices: settlementChoices
      });
    }
    play(list);
  }

  /* ---------- 全屏层 ---------- */

  function showLayer(node) {
    clear(els.overlay);
    hideChoices();
    hideDialogue();
    beats = [];
    beatsDone = null;
    stopTyping();
    node.style.pointerEvents = 'auto';
    els.overlay.appendChild(node);
  }

  function closeLayer() { clear(els.overlay); }

  /* ---------- 标题 ---------- */

  function showTitle() {
    state = null;
    settleSprite = null;
    hideScout();
    showGameHud(false);
    setScene('assets/web/title-key-art-night.jpg');

    var saved = Z.Save.read();
    var actions = [h('button', { class: 'btn btn--primary', type: 'button', text: '开始新的万年', onclick: startNew })];
    if (saved) actions.push(h('button', { class: 'btn btn--ghost', type: 'button', text: '继续上次', onclick: function () { continueGame(saved); } }));

    showLayer(h('div', { class: 'fullayer' }, [
      h('div', { class: 'fullayer__veil' }),
      h('div', { class: 'fullayer__inner' }, [
        h('div', { class: 'title-kicker', text: 'M1 试玩 · 第一幕 · 定居' }),
        h('div', { class: 'title-logo' }, [
          h('div', { class: 'seal', text: '夏' }),
          h('h1', { text: '造世·华夏' })
        ]),
        h('p', { class: 'title-sub', text: '一块地、一群人、一万年。' }),
        h('div', { class: 'title-rule' }),
        h('div', { class: 'title-actions' }, actions),
        h('div', { class: 'title-foot' }, [
          '横屏 16:9 · 像素 · 点击或空格推进 · 数字键 1—9 选择',
          h('br'),
          saved ? '继续上次接着上回合；开始新的万年将覆盖进度。' : '本试玩仅开放 A 地块与第一幕，全程不出现真实考古文化名。'
        ])
      ])
    ]));
  }

  function startNew() {
    Z.Save.clear();
    state = Z.Engine.createState();
    save();
    closeLayer();
    introCutscene();
  }

  function continueGame(saved) {
    state = saved;
    closeLayer();
    restore();
  }

  function restore() {
    if (!state || !state.landId) { landSelect(); return; }
    setScene(Z.LANDS[state.landId].scene);
    showGameHud(true);
    updateHUD();
    var item = state.settlementId ? Z.Engine.findSettlement(state.settlementId) : null;
    if (item && state.phase !== 'founding') showSettlementSprite(item.sprite);
    switch (state.phase) {
      case 'founding':
        if (state.settlementId) settlementPrompt();
        else scoutingPrompt();
        break;
      case 'play': turnIntro(); break;
      case 'resolve': resolveBeats(state.lastResolution); break;
      case 'actEnd': actEndCutscene(); break;
      case 'collapse': collapseCutscene(); break;
      default: landSelect();
    }
  }

  /* ---------- 序幕 · 择地 ---------- */

  function introCutscene() {
    showGameHud(false);
    setScene('assets/web/scene-A-river-floodplain.jpg');
    play([
      { speaker: '史官', text: '万年之前，这里还没有"国"。有的只是一条河，和河边一群人。' },
      { speaker: '史官', text: '他们沿水而行，看土色，看林木，看石头。看够了，才决定在哪里睡下。' },
      { speaker: '史官', text: '你接手的，正是这群人的第一个决定。' }
    ], landSelect);
  }

  function landSelect() {
    showGameHud(false);
    hideScout();
    setScene('assets/web/scene-A-river-floodplain.jpg');
    play([
      { speaker: '族长', text: '六块地，六种活法。选一块——选哪块，就走哪条路。', choices: landChoices }
    ]);
  }

  function landChoices() {
    return Z.LAND_ORDER.map(function (code) {
      var land = Z.LANDS[code];
      var chips = [h('span', { class: 'chip chip--plus', text: land.longboard })];
      land.bottlenecks.forEach(function (b) {
        chips.push(h('span', { class: 'chip chip--minus', text: '瓶颈 · ' + b }));
      });
      return {
        name: land.code + ' · ' + land.short,
        sub: land.env + ' · 人口上限 ' + land.caps.pop,
        chips: chips,
        disabled: !land.playable,
        badge: land.playable ? null : 'M2 开放',
        onPick: function () { pickLand(code); }
      };
    });
  }

  function pickLand(code) {
    if (!Z.Engine.chooseLand(state, code)) { landSelect(); return; }
    save();
    updateHUD();
    showGameHud(true);
    enterFounding();
  }

  /* ---------- 勘察 · 立族 ---------- */

  function enterFounding() {
    var land = Z.LANDS[state.landId];
    setScene(land.scene);
    play([
      { speaker: '史官', text: land.code + ' · ' + land.name + '。' + land.env + '。' },
      { speaker: '史官', text: land.desc, meta: passiveChips(land) }
    ], scoutingPrompt);
  }

  function scoutingPrompt() {
    if (state.scouted.length >= Z.SCOUT.length) {
      hideScout();
      settlementPrompt();
      return;
    }
    play([
      {
        speaker: '族长',
        text: '先看看这片地。场景里有四处标记：水、土、林、石。点一下就知道。',
        onEnter: function () { showHotspots(); }
      }
    ]);
  }

  function settlementPrompt() {
    play([
      {
        speaker: '族长',
        text: '水、土、林、石都看过了。家要安成什么样？三种住法，代价都写在牌面上。',
        choices: settlementChoices
      }
    ]);
  }

  function settlementChoices() {
    return Z.SETTLEMENTS.map(function (item) {
      var known = null;
      Z.SCOUT.forEach(function (s) {
        if (s.resource === item.need && state.scouted.indexOf(s.id) >= 0) known = !s.scarce;
      });
      var fitChip;
      if (known === true) fitChip = h('span', { class: 'chip chip--plus', text: '此地相宜' });
      else if (known === false) fitChip = h('span', { class: 'chip chip--minus', text: '此地缺' + item.need });
      else fitChip = h('span', { class: 'chip', text: '需' + item.need + ' · 未勘察' });
      return {
        name: item.name,
        sub: item.desc + ' · ' + item.tag,
        chips: [fitChip].concat(effectChips(item.effects)),
        note: item.popCap ? '人口上限 +' + item.popCap : null,
        onPick: function () { chooseSettlement(item.id); }
      };
    });
  }

  function chooseSettlement(id) {
    var item = Z.Engine.findSettlement(id);
    if (!item) { settlementPrompt(); return; }
    Z.Engine.selectSettlement(state, id);
    Z.Engine.confirmSettlement(state);
    save();
    hideScout();
    showSettlementSprite(item.sprite);
    updateHUD(state.settlementDeltas);
    if (state.phase === 'collapse') { collapseCutscene(); return; }
    var fit = item.fit.indexOf(state.landId) >= 0;
    play([
      { speaker: '史官', text: item.narrative },
      {
        speaker: '史官',
        text: fit ? '此居与此地相宜，族人安心落业。' : '此地与此居不甚相宜。此后每回合民心 −4，直到迁居。',
        meta: fit ? [] : [h('span', { class: 'chip chip--minus', text: '居所失宜 · 民心 −4/回合' })]
      }
    ], function () { enterTurn(); });
  }

  /* ---------- 回合 ---------- */

  function enterTurn() {
    updateHUD(state.turnStartDeltas);
    turnIntro();
  }

  function turnIntro() {
    var act = Z.ACTS[0];
    var crisis = Z.CRISES[state.currentCrisis];
    if (!crisis) { actEndCutscene(); return; }
    showGameHud(true);
    hideScout();
    setScene(Z.LANDS[state.landId].scene);

    play([
      {
        speaker: '第' + act.no + '幕 · ' + act.name,
        text: (act.dates[state.turn - 1] || act.range) + '。回合 ' + state.turn + ' / ' + act.turns + '。'
      },
      {
        speaker: crisis.kicker,
        text: crisis.quote,
        meta: eventChips(crisis, state.flags)
      },
      {
        speaker: '族长',
        text: crisis.hint + ' 牌上三条路，得失都写清了。',
        choices: actionChoices
      }
    ]);
  }

  function actionChoices() {
    var opts = state.hand.map(function (id) {
      var card = Z.CARD_BY_ID[id];
      var syn = card.synergy && card.synergy.crisis === state.currentCrisis;
      var chips = effectChips(card.effects);
      if (syn) chips = chips.concat(effectChips(card.synergy.bonus, '应时 '));
      return {
        tag: card.tag,
        name: card.name,
        sub: card.desc,
        badge: syn ? '应时' : null,
        badgeClass: 'badge-good',
        chips: chips,
        anchor: card.anchor,
        onPick: function () { playCard(id); }
      };
    });
    if (state.rerollsLeft > 0) {
      opts.push({
        name: '换一批',
        sub: '另请高明 · 本回合只能再换一次',
        effects: { morale: -1 },
        wide: true,
        onPick: doReroll
      });
    }
    return opts;
  }

  function doReroll() {
    var res = Z.Engine.reroll(state);
    if (!res) { turnIntro(); return; }
    save();
    updateHUD(res.deltas);
    if (state.phase === 'collapse') { collapseCutscene(); return; }
    play([
      { speaker: '族长', text: '换了人上来。三条新路，得失照旧写在牌面上。', choices: actionChoices }
    ]);
  }

  function playCard(id) {
    var res = Z.Engine.playCard(state, id);
    if (!res) { turnIntro(); return; }
    save();
    updateHUD(res.deltas);
    if (state.phase === 'collapse') { collapseCutscene(); return; }
    resolveBeats(res);
  }

  function resolveBeats(res) {
    if (!res) { turnIntro(); return; }
    var isLast = state.turn >= Z.ACTS[0].turns;
    var meta = effectChips(res.deltas);
    if (res.synergyNote) meta.push(h('span', { class: 'chip chip--plus', text: '应时 · ' + res.synergyNote }));
    meta.push(h('span', {
      class: 'chip ' + (res.growth > 0 ? 'chip--plus' : 'chip--minus'),
      text: (res.growth > 0 ? '粮足，人口 +' : '粮缺，人口 ') + signed(res.growth)
    }));

    play([
      { speaker: '史官 · ' + res.cardName, text: res.narrative, meta: meta },
      {
        speaker: '史官',
        text: isLast ? '第三年过去。该看看这片河滩上留下了什么。' : '这一年过去了。明年，河还是那条河。',
        choices: [{
          name: isLast ? '结算第一幕 →' : '进入下一回合 →',
          sub: isLast ? '看族运评定与路线倾向' : (Z.ACTS[0].dates[state.turn] || ''),
          wide: true,
          onPick: nextTurnFlow
        }]
      }
    ]);
  }

  function nextTurnFlow() {
    var r = Z.Engine.nextTurn(state);
    if (!r.ok) { turnIntro(); return; }
    save();
    updateHUD();
    if (state.phase === 'collapse') { collapseCutscene(); return; }
    if (state.phase === 'actEnd') { actEndCutscene(); return; }
    enterTurn();
  }

  /* ---------- 幕末 · 崩盘 ---------- */

  function actEndCutscene() {
    var end = state.actEnd;
    if (!end) { showTitle(); return; }
    hideScout();
    showGameHud(false);
    setScene('assets/web/ending-01-huaxia-many-in-one.jpg');

    var statGrid = h('div', { class: 'end-stats' });
    VISIBLE_KEYS.forEach(function (pair) {
      statGrid.appendChild(h('div', { class: 'end-stat' }, [
        h('div', { class: 'end-stat__label', text: pair[1] }),
        h('div', { class: 'end-stat__value', text: String(state.stats[pair[0]]) })
      ]));
    });

    var routeBox = h('div', { class: 'route-line' }, [h('span', { text: '路线倾向' })]);
    if (end.routes.length) {
      end.routes.forEach(function (item) {
        routeBox.appendChild(tagEl(item.tag));
        routeBox.appendChild(h('span', { text: '× ' + item.count }));
      });
    } else routeBox.appendChild(h('span', { text: '尚未成形' }));

    function replay() {
      Z.Save.clear();
      state = Z.Engine.createState();
      save();
      closeLayer();
      introCutscene();
    }

    showLayer(h('div', { class: 'fullayer' }, [
      h('div', { class: 'fullayer__veil' }),
      h('div', { class: 'fullayer__inner' }, [
        h('div', { class: 'end-panel pixel-box' }, [
          h('div', { class: 'actend__kicker', text: '第一幕 · 定居 · 终' }),
          h('h2', { class: 'actend__title', text: '三千年，一聚落' }),
          h('p', { class: 'actend__lede', text: end.lede }),
          h('div', { class: 'grade' }, [
            h('div', { class: 'grade__seal', text: end.grade }),
            h('div', {}, [
              h('div', { class: 'grade__label', text: '族运评定' }),
              h('div', { class: 'grade__value', text: end.gradeLine })
            ]),
            stars(end.stars, end.maxStars)
          ]),
          statGrid,
          routeBox,
          h('div', { class: 'historian', text: '史官按语 · ' + end.historian }),
          h('div', { class: 'm1-note' }, [
            '第一幕目标：人口 ≥ 50、粮储 ≥ 40。本局' + (end.goalMet ? '已达成。' : '未完全达成。'),
            h('br'),
            'M1 试玩到此为止。第二幕「古国」、另五块地、邦交面板与 14 个结局，将在后续里程碑开放。'
          ]),
          h('div', { class: 'panel-actions' }, [
            h('button', { class: 'btn btn--ghost', type: 'button', text: '回到标题', onclick: function () { closeLayer(); showTitle(); } }),
            h('button', { class: 'btn btn--primary', type: 'button', text: '再玩一次', onclick: replay })
          ])
        ])
      ])
    ]));
  }

  function collapseCutscene() {
    var end = state.collapse;
    if (!end) { showTitle(); return; }
    hideScout();
    showGameHud(false);
    setScene(end.image);

    function replay() {
      Z.Save.clear();
      state = Z.Engine.createState();
      save();
      closeLayer();
      introCutscene();
    }

    showLayer(h('div', { class: 'fullayer' }, [
      h('div', { class: 'fullayer__veil' }),
      h('div', { class: 'fullayer__inner' }, [
        h('div', { class: 'ending-kicker', text: '本局终 · 史书无载' }),
        h('h2', { class: 'ending-title', text: end.title }),
        h('p', { class: 'ending-quote', text: end.quote }),
        h('p', { class: 'ending-text', text: end.text }),
        h('p', { class: 'ending-text', style: 'color:#9c9684', text: '直接原因：' + end.cause }),
        h('div', { class: 'title-actions' }, [
          h('button', { class: 'btn btn--primary', type: 'button', text: '重来一局', onclick: replay }),
          h('button', { class: 'btn btn--ghost', type: 'button', text: '回到标题', onclick: function () { closeLayer(); showTitle(); } })
        ])
      ])
    ]));
  }

  /* ---------- 缩放与输入 ---------- */

  function fitStage() {
    var vw = window.innerWidth, vh = window.innerHeight;
    stageScale = Math.min(vw / SW, vh / SH);
    els.stage.style.transform = 'translate(-50%,-50%) scale(' + stageScale + ')';
    els.rotate.style.display = (!els.rotateDismissed && vh > vw && vw < 820) ? 'flex' : 'none';
  }

  function onStageClick(e) {
    if (e.target.closest && e.target.closest('button')) return;
    advance();
  }

  function onKey(e) {
    var key = e.key;
    if (key === ' ' || key === 'Enter' || e.code === 'Space') {
      if (e.target && e.target.tagName === 'BUTTON') return;
      e.preventDefault();
      advance();
    } else if (/^[1-9]$/.test(key)) {
      if (!waitingChoice) return;
      var btns = els.choices.querySelectorAll('.choice');
      var btn = btns[Number(key) - 1];
      if (btn && !btn.disabled) btn.click();
    }
  }

  /* ---------- 建台 ---------- */

  function buildStage() {
    els.canvas = h('canvas', { width: String(CW), height: String(CH), class: 'scene-canvas', 'aria-hidden': 'true' });
    els.ctx = els.canvas.getContext('2d');

    buildHUD();
    buildScoutLayer();
    buildChoices();
    buildDialogue();

    els.fx = h('div', { class: 'fx-layer' });
    els.overlay = h('div', { style: 'position:absolute;inset:0;z-index:20;pointer-events:none' });
    els.rotateDismissed = false;
    els.rotate = h('div', { class: 'rotate-hint' }, [
      h('div', {}, ['请横屏持机', h('br'), '本作按 16:9 横屏设计']),
      h('button', {
        class: 'btn btn--small btn--ghost',
        type: 'button',
        style: 'margin-top:16px',
        text: '仍要竖屏继续',
        onclick: function () { els.rotateDismissed = true; fitStage(); }
      })
    ]);

    els.stage = h('div', { class: 'stage' }, [
      els.canvas,
      els.scoutLayer,
      els.scoutCount,
      els.hud,
      els.flags,
      els.choices,
      els.dialogue,
      els.fx,
      els.overlay,
      els.rotate
    ]);

    els.viewport = h('div', { class: 'viewport' }, [els.stage]);
    els.viewport.addEventListener('click', onStageClick);
    document.body.addEventListener('keydown', onKey);
    window.addEventListener('resize', fitStage);
    window.addEventListener('orientationchange', fitStage);

    app.appendChild(els.viewport);
    fitStage();
    requestAnimationFrame(loop);
  }

  function boot() {
    app = document.getElementById('app');
    buildStage();
    showTitle();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
