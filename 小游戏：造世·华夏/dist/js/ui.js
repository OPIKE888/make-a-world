(function () {
  'use strict';
  var Z = window.ZSX = window.ZSX || {};
  var E = Z.Engine;

  var SW = 960, SH = 540, CX = 2;
  var DIAL_SPEED = 24;

  var S = null;
  var els = {};
  var beats = [], beatIdx = 0, beatDone = null;
  var typing = null, typed = 0, fullText = '';
  var mode = 'title';
  var prefs = { muted: false, fast: false };
  var peeking = false;
  var peekReturn = null;
  var layerCloser = null;
  var layerEscape = null;
  var choiceHandlers = [];
  var stickyScout = false;

  /* ---------- DOM ---------- */

  function h(tag, attrs, children) {
    var el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v === null || v === undefined || v === false) return;
        if (k === 'class') el.className = v;
        else if (k === 'text') el.textContent = v;
        else if (k === 'style' && typeof v === 'object') Object.keys(v).forEach(function (p) { el.style[p] = v[p]; });
        else if (k === 'dataset') Object.keys(v).forEach(function (p) { el.dataset[p] = v[p]; });
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
        else if (v === true) el.setAttribute(k, '');
        else el.setAttribute(k, v);
      });
    }
    (children || []).forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return el;
  }

  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }
  function show(el, on) { el.classList.toggle('hidden', !on); }

  function btn(label, onClick, kind, small) {
    return h('button', {
      class: 'btn' + (kind ? ' btn--' + kind : '') + (small ? ' btn--small' : ''),
      type: 'button',
      onclick: function (ev) { ev.stopPropagation(); Z.Audio.play('click'); onClick(ev); }
    }, [label]);
  }

  function chip(text, kind) {
    return h('span', { class: 'chip' + (kind ? ' chip--' + kind : ''), text: text });
  }

  function tagEl(t) { return h('span', { class: 'tag', dataset: { tag: t }, text: t }); }

  function isHidden(k) { return k === 'K' || k === 'W' || k === 'R'; }

  function deltaChips(deltas) {
    var out = [];
    Object.keys(deltas || {}).forEach(function (k) {
      var v = deltas[k];
      if (!v) return;
      var label = Z.STAT_LABELS[k] || k;
      if (isHidden(k)) {
        var mag = Math.abs(v) >= 12 ? '↑↑' : '↑';
        out.push(chip(label + ' ' + (v > 0 ? mag : mag.replace(/↑/g, '↓')), 'hidden'));
      } else {
        out.push(chip(label + ' ' + (v > 0 ? '+' : '') + v, v > 0 ? 'plus' : 'minus'));
      }
    });
    return out;
  }

  function effectChips(effects) {
    var out = [];
    Object.keys(effects || {}).forEach(function (k) {
      var v = effects[k];
      if (!v) return;
      var label = Z.STAT_LABELS[k] || k;
      if (isHidden(k)) {
        out.push(chip(label + (v > 0 ? ' ↑' : ' ↓'), 'hidden'));
      } else {
        out.push(chip(label + ' ' + (v > 0 ? '+' : '') + v, v > 0 ? 'plus' : 'minus'));
      }
    });
    return out;
  }

  /* ---------- 舞台 ---------- */

  function mount() {
    var app = document.getElementById('app');
    var canvas = h('canvas', { class: 'scene-canvas' });
    var hud = h('div', { class: 'hud' });
    var flags = h('div', { class: 'hud__flags' });
    var sky = h('div', { class: 'sky-chip' });
    var fx = h('div', { class: 'fx-layer' });
    var hot = h('div', { class: 'hot-layer' });
    var dock = h('div', { class: 'dock hidden' });
    var dialogue = h('div', { class: 'dialogue hidden', onclick: function () { advance(); } });
    var choices = h('div', { class: 'choices hidden' });
    dock.appendChild(dialogue);
    dock.appendChild(choices);
    var layer = h('div', { class: 'fullayer hidden' });
    var rotate = h('div', { class: 'rotate-hint' }, [
      h('div', { text: '◦ 横屏而观 ◦' }),
      h('div', { style: { fontSize: '13px', color: 'var(--muted)' }, text: '此局为 16:9 横屏而作\n请把设备转过来' })
    ]);
    var stage = h('div', { class: 'stage' }, [canvas, hud, flags, sky, hot, fx, dock, layer, rotate]);
    var viewport = h('div', { class: 'viewport' }, [stage]);
    app.appendChild(viewport);

    els = {
      app: app, viewport: viewport, stage: stage, canvas: canvas,
      hud: hud, flags: flags, sky: sky, fx: fx, hot: hot,
      dock: dock, dialogue: dialogue, choices: choices, layer: layer, rotate: rotate
    };

    Z.Scene.init(canvas);
    Z.Scene.start();
    fitStage();
    window.addEventListener('resize', fitStage);
    window.addEventListener('orientationchange', function () { setTimeout(fitStage, 220); });
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', function () { Z.Audio.unlock(); }, { once: true });
  }

  function fitStage() {
    var vw = window.innerWidth, vh = window.innerHeight;
    var scale = Math.min(vw / SW, vh / SH);
    els.stage.style.transform = 'translate(-50%,-50%) scale(' + scale + ')';
    var portrait = vh > vw && vw < 820;
    els.rotate.style.display = portrait ? 'flex' : 'none';
  }

  function onKey(ev) {
    var k = ev.key;
    if (k === 'm' || k === 'M') { toggleMute(); return; }
    if (k === 'v' || k === 'V') { togglePeek(); return; }
    if (k === 'Escape') {
      if (peeking) { togglePeek(); return; }
      if (layerCloser) { layerCloser(); return; }
      if (layerEscape) { layerEscape(); return; }
      return;
    }
    if (!els.layer.classList.contains('hidden')) return;
    if (k === ' ' || k === 'Enter') { ev.preventDefault(); advance(); return; }
    var n = parseInt(k, 10);
    if (n >= 1 && n <= choiceHandlers.length) { choiceHandlers[n - 1](); }
  }

  /* ---------- 全屏层 ---------- */

  function openLayer(node, opts) {
    opts = opts || {};
    clear(els.layer);
    var veil = h('div', { class: 'fullayer__veil' + (opts.deep ? ' deep' : '') });
    if (opts.dismiss) veil.addEventListener('click', function () { closeLayer(); });
    var inner = h('div', { class: 'fullayer__inner fade-in' }, [node]);
    els.layer.appendChild(veil);
    els.layer.appendChild(inner);
    show(els.layer, true);
    layerCloser = opts.dismiss ? closeLayer : null;
    layerEscape = opts.escape || null;
    show(els.dock, false);
  }

  function closeLayer() {
    show(els.layer, false);
    clear(els.layer);
    layerCloser = null;
    layerEscape = null;
  }

  /* ---------- 对白节拍 ---------- */

  function play(list, onDone) {
    beats = list || [];
    beatIdx = 0;
    beatDone = onDone || null;
    show(els.dock, true);
    renderBeat();
  }

  function stopBeats() {
    beats = []; beatIdx = 0; beatDone = null;
    stopTyping();
  }

  function renderBeat() {
    var b = beats[beatIdx];
    if (!b) { finishBeats(); return; }
    choiceHandlers = [];
    if (b.onEnter) b.onEnter();
    if (b.choices) {
      show(els.dialogue, false);
      show(els.choices, true);
      renderChoices(b);
    } else {
      show(els.choices, false);
      show(els.dialogue, true);
      renderDialogue(b);
    }
  }

  function finishBeats() {
    var f = beatDone;
    beats = []; beatDone = null;
    if (f) f();
  }

  function advance() {
    if (!els.layer.classList.contains('hidden')) return;
    if (typing) { completeTyping(); return; }
    var b = beats[beatIdx];
    if (!b) { return; }
    if (b.choices || b.sticky) return;
    Z.Audio.play('page');
    if (b.onNext) { beats = []; beatDone = null; b.onNext(); return; }
    beatIdx += 1;
    if (beatIdx >= beats.length) finishBeats();
    else renderBeat();
  }

  function stopTyping() {
    if (typing) { clearInterval(typing); typing = null; }
  }

  function completeTyping() {
    stopTyping();
    els.dtext.textContent = fullText;
    show(els.dnext, !beats[beatIdx] || (!beats[beatIdx].choices && !beats[beatIdx].sticky));
  }

  function renderDialogue(b) {
    clear(els.dialogue);
    var speaker = h('div', { class: 'dialogue__speaker', text: b.speaker || '' });
    var text = h('div', { class: 'dialogue__text' + (b.small ? ' small' : '') });
    var meta = h('div', { class: 'dialogue__meta' }, b.meta || []);
    var next = h('div', { class: 'dialogue__next hidden', text: '▼ 继续' });
    els.dtext = text; els.dnext = next;
    els.dialogue.appendChild(speaker);
    els.dialogue.appendChild(text);
    els.dialogue.appendChild(meta);
    if (b.buttons && b.buttons.length) {
      els.dialogue.appendChild(h('div', { class: 'dialogue__meta' }, b.buttons));
    }
    els.dialogue.appendChild(next);

    fullText = b.text || '';
    stopTyping();
    if (prefs.fast || fullText.length < 4) {
      text.textContent = fullText;
      show(next, !b.sticky);
      return;
    }
    typed = 0;
    text.textContent = '';
    typing = setInterval(function () {
      typed += 1;
      text.textContent = fullText.slice(0, typed);
      if (typed % 3 === 0) Z.Audio.play('hover');
      if (typed >= fullText.length) {
        stopTyping();
        show(next, !b.sticky);
      }
    }, DIAL_SPEED);
  }

  function renderChoices(b) {
    clear(els.choices);
    var ribbon = h('div', { class: 'crisis-ribbon' }, [
      h('span', { class: 'crisis-ribbon__k', text: b.ribbonK || '' }),
      h('span', { class: 'crisis-ribbon__t', text: b.ribbonT || '' }),
      h('span', { class: 'crisis-ribbon__h', text: b.ribbonH || '' })
    ]);
    if (b.ribbonBtn) ribbon.appendChild(h('span', { class: 'crisis-ribbon__btn' }, [b.ribbonBtn]));
    var row = h('div', { class: 'choices__row' });
    choiceHandlers = [];
    b.choices.forEach(function (c, i) {
      var kids = [
        h('div', { class: 'choice__head' }, [
          h('span', { class: 'choice__name', text: (i + 1) + ' · ' + c.name })
        ].concat(c.tag ? [tagEl(c.tag)] : []).concat(c.badges || []))
      ];
      if (c.sub) kids.push(h('div', { class: 'choice__sub', text: c.sub, title: c.sub }));
      var eff = effectChips(c.effects).concat(c.chips || []);
      if (eff.length) kids.push(h('div', { class: 'choice__effects' }, eff));
      var handler = function () {
        if (c.disabled) return;
        Z.Audio.play('card');
        choiceHandlers = [];
        c.onPick();
      };
      var el = h('button', {
        class: 'choice' + (c.disabled ? ' choice--disabled' : ''),
        type: 'button', disabled: !!c.disabled,
        onclick: function (ev) { ev.stopPropagation(); handler(); },
        onmouseenter: function () { if (!c.disabled) { Z.Audio.play('hover'); if (c.onHover) c.onHover(); } }
      }, kids);
      row.appendChild(el);
      choiceHandlers.push(handler);
    });
    els.choices.appendChild(ribbon);
    els.choices.appendChild(row);
  }

  /* ---------- HUD ---------- */

  var GAUGES = [
    { k: 'pop', label: '人口' }, { k: 'food', label: '粮储' },
    { k: 'morale', label: '民心' }, { k: 'craft', label: '技艺' }
  ];

  function renderHud() {
    clear(els.hud);
    if (!S || !S.landId || mode === 'title' || mode === 'select') {
      els.hud.style.display = 'none';
      clear(els.flags);
      els.sky.textContent = '';
      els.sky.style.display = 'none';
      return;
    }
    els.hud.style.display = 'flex';
    els.sky.style.display = 'block';

    var A = E.actDef(S);
    var L = E.land(S);
    var date = A.dates[S.turn - 1] || A.range;
    els.hud.appendChild(h('div', { class: 'hud__id' }, [
      h('div', { class: 'hud__act', text: '第' + '一二三四五'[S.act - 1] + '幕 · ' + A.name }),
      h('div', { class: 'hud__turn', text: date + ' · 第 ' + S.gturn + '/' + Z.TOTAL_TURNS + ' 回合' }),
      h('div', { class: 'hud__land', text: L.code + ' · ' + L.short })
    ]));

    var caps = E.visibleCaps(S);
    var stats = h('div', { class: 'hud__stats' });
    GAUGES.forEach(function (g) {
      var v = S.stats[g.k], cap = caps[g.k];
      var fill = h('div', { class: 'gauge__fill' + (v <= cap * 0.2 ? ' low' : ''), style: { width: Math.min(100, v / cap * 100) + '%' } });
      stats.appendChild(h('div', { class: 'gauge gauge--' + g.k }, [
        h('div', { class: 'gauge__top' }, [
          h('span', { class: 'gauge__label', text: g.label }),
          h('span', {}, [
            h('span', { class: 'gauge__value', text: String(v) }),
            h('span', { class: 'gauge__cap', text: '/' + cap })
          ])
        ]),
        h('div', { class: 'gauge__bar' }, [fill])
      ]));
    });
    els.hud.appendChild(stats);

    var muteBtn = h('button', {
      class: 'icon-btn' + (prefs.muted ? ' off' : ''), type: 'button',
      title: prefs.muted ? '开启声音 (M)' : '静音 (M)',
      onclick: function (ev) { ev.stopPropagation(); toggleMute(); }
    }, [prefs.muted ? '静' : '音']);
    els.hud.appendChild(h('div', { class: 'hud__tools' }, [
      h('button', { class: 'icon-btn', type: 'button', title: '太史卜辞：看三项隐值', onclick: function (ev) { ev.stopPropagation(); screenOracle(); } }, ['卜']),
      h('button', { class: 'icon-btn', type: 'button', title: '看聚落 (V)', onclick: function (ev) { ev.stopPropagation(); togglePeek(); } }, ['看']),
      h('button', { class: 'icon-btn', type: 'button', title: '结局图鉴', onclick: function (ev) { ev.stopPropagation(); screenGallery(); } }, ['录']),
      muteBtn,
      h('button', { class: 'icon-btn', type: 'button', title: '回到标题', onclick: function (ev) { ev.stopPropagation(); confirmQuit(); } }, ['归'])
    ]));

    clear(els.flags);
    S.flags.forEach(function (f) {
      els.flags.appendChild(h('span', { class: 'flag-chip', text: f.name + ' · ' + (f.turns > 90 ? '长方' : f.turns + '回合') }));
    });
    if (S.isolated) els.flags.appendChild(h('span', { class: 'flag-chip', text: '孤立线 · 产出 −20%' }));
    S.partners.forEach(function (c) {
      els.flags.appendChild(h('span', { class: 'flag-chip good', text: '盟 · ' + Z.DIPLOMACY[c].short }));
    });
    if (S.ceilingBroken) els.flags.appendChild(h('span', { class: 'flag-chip good', text: '铁器牛耕 · 上限已解' }));

    var skyKey = (A.sky && A.sky[S.turn - 1]) || 'noon';
    els.sky.textContent = (Z.SKY_LABEL[skyKey] || '') + (S.currentCrisis ? ' · ' + Z.CRISES[S.currentCrisis].title : '');
  }

  function toggleMute() {
    prefs.muted = !prefs.muted;
    Z.Audio.unlock();
    Z.Audio.setMuted(prefs.muted);
    Z.Save.setPrefs(prefs);
    if (!prefs.muted) Z.Audio.play('click');
    renderHud();
    if (mode === 'title') screenTitle();
  }

  function togglePeek() {
    if (!S || !S.landId) return;
    peeking = !peeking;
    els.stage.classList.toggle('peek', peeking);
    var old = els.stage.querySelector('.peek-exit');
    if (old) old.remove();
    if (peeking) {
      els.stage.appendChild(h('div', { class: 'peek-exit' }, [
        btn('回到局中 (V / Esc)', function () { togglePeek(); }, 'small', true)
      ]));
    } else if (peekReturn) {
      /* 从幕末结算里出来看聚落的，退出时要回到那张结算表，否则整局卡死 */
      var back = peekReturn;
      peekReturn = null;
      back();
    }
  }

  function floatDeltas(deltas) {
    var keys = Object.keys(deltas || {}).filter(function (k) { return deltas[k]; });
    keys.forEach(function (k, i) {
      var v = deltas[k];
      var label = Z.STAT_LABELS[k] || k;
      var txt = isHidden(k) ? label + (v > 0 ? ' ↑' : ' ↓') : label + ' ' + (v > 0 ? '+' : '') + v;
      var el = h('div', {
        class: 'float-delta float-delta--' + (v > 0 ? 'plus' : 'minus'),
        style: { left: (200 + i * 118) + 'px', top: '78px' },
        text: txt
      });
      els.fx.appendChild(el);
      setTimeout(function () { if (el.parentNode) el.remove(); }, 1600);
    });
  }

  function floatText(txt, kind) {
    var el = h('div', {
      class: 'float-delta float-delta--' + (kind === 'plus' ? 'plus' : 'minus'),
      style: { left: '300px', top: '78px' },
      text: txt
    });
    els.fx.appendChild(el);
    setTimeout(function () { if (el.parentNode) el.remove(); }, 1600);
  }

  /* ---------- 场景同步 ---------- */

  function syncScene(animate) {
    if (!S || !S.landId) return;
    Z.Scene.sync(S, animate);
    var A = E.actDef(S);
    Z.Scene.setSky((A.sky && A.sky[S.turn - 1]) || 'noon');
    var crisis = Z.CRISES[S.currentCrisis];
    Z.Scene.setWeather(crisis ? crisis.weather : 'clear');
    var skyKey = (A.sky && A.sky[S.turn - 1]) || 'noon';
    var L = E.land(S);
    var amb = skyKey === 'night' ? 'night'
      : (crisis && crisis.weather === 'storm') ? 'storm'
        : (L.code === 'E' ? 'coast' : (L.code === 'A' || L.code === 'C' ? 'water' : 'plain'));
    Z.Audio.ambience(amb);
  }

  function persist() { Z.Save.write(S); }

  /* ---------- 标题 ---------- */

  function screenTitle() {
    mode = 'title';
    S = null;
    stopBeats();
    show(els.dock, false);
    clear(els.hot);
    renderHud();
    Z.Scene.setLand('A');
    Z.Scene.setSky('dusk');
    Z.Scene.setWeather('clear');
    Z.Scene.preview('A', 'earth', 62);

    var hasSave = Z.Save.has();
    var gal = Z.Save.gallery();
    var got = Object.keys(gal).length;

    var node = h('div', {}, [
      h('div', { class: 'title-kicker', text: '一 局 一 万 年' }),
      h('div', { class: 'title-logo' }, [
        h('div', { class: 'seal', text: '夏' }),
        h('h1', { text: '造世 · 华夏' })
      ]),
      h('div', { class: 'title-rule' }),
      h('div', { class: 'title-sub', text: '择一块地，领一族人，从一万年前的第一把粟，走到两千年前的第一场变法。' }),
      h('div', { class: 'title-sub', style: { fontSize: '14px', color: 'var(--muted)' }, text: '五幕 · 十九回合 · 六地等权 · 十四结局' }),
      h('div', { class: 'title-actions' }, [
        btn('开创新世', function () { closeLayer(); screenSelect(); }, 'primary'),
        hasSave ? btn('继续前缘', function () { closeLayer(); continueGame(); }) : null,
        btn('结局图鉴 ' + got + '/14', function () { screenGallery(true); }),
        btn('玩法', function () { screenHelp(true); }),
        btn(prefs.muted ? '声音：关' : '声音：开', function () { toggleMute(); }, 'ghost')
      ]),
      h('div', { class: 'title-foot', text: '空格 / 回车 推进对白 · 数字键 1–3 选策 · V 看聚落 · M 静音\n全程化名，终章揭晓真实考古文化' })
    ]);
    openLayer(node, { deep: false });
  }

  function confirmQuit() {
    var node = h('div', { class: 'end-panel pixel-box' }, [
      h('div', { class: 'actend__kicker', text: '归 · 回到标题' }),
      h('div', { class: 'actend__title', text: '此局尚未走完' }),
      h('div', { class: 'actend__lede', text: '进度已存。回到标题后可从「继续前缘」接着走；也可另起一世。' }),
      h('div', { class: 'panel-actions' }, [
        btn('继续此局', function () { closeLayer(); }, 'primary'),
        btn('回到标题', function () { persist(); closeLayer(); screenTitle(); })
      ])
    ]);
    openLayer(node, { dismiss: true });
  }

  /* ---------- 选地 ---------- */

  function screenSelect() {
    mode = 'select';
    S = E.createState();
    stopBeats();
    clear(els.hot);
    show(els.dock, false);
    renderHud();

    var grid = h('div', { class: 'land-grid' });
    Z.LAND_ORDER.forEach(function (code) {
      var L = Z.LANDS[code];
      grid.appendChild(h('button', {
        class: 'land-card', type: 'button',
        onclick: function () { Z.Audio.play('click'); screenLandDetail(code); },
        onmouseenter: function () {
          Z.Audio.play('hover');
          Z.Scene.setLand(code);
          Z.Scene.setSky('morning');
          Z.Scene.setWeather('clear');
          Z.Scene.preview(code, L.dwelling === 'yaodong' || L.dwelling === 'hide' || L.dwelling === 'pit' ? 'earth' : (L.dwelling === 'stone' ? 'stone' : 'stilt'), 40);
        }
      }, [
        h('div', { class: 'land-card__img', style: { backgroundImage: 'url(' + L.plate + ')' } }),
        h('div', { class: 'land-card__body' }, [
          h('div', { class: 'land-card__code', text: '地块 ' + L.code }),
          h('div', { class: 'land-card__name', text: L.name }),
          h('div', { class: 'land-card__env', text: L.env }),
          h('div', { class: 'land-card__long', text: L.longboard })
        ])
      ]));
    });

    var node = h('div', {}, [
      h('div', { class: 'actend__kicker', style: { textAlign: 'center' }, text: '第一步 · 择地' }),
      h('div', { class: 'actend__title', style: { textAlign: 'center' }, text: '六块地，各有长板，各有两道过不去的坎' }),
      h('div', { style: { height: '8px' } }),
      grid,
      h('div', { class: 'title-foot', text: '没有最好的地，只有不同的路。你选的那块，会决定你能种什么、缺什么、最后成为谁。' }),
      h('div', { class: 'title-actions' }, [btn('返回', function () { screenTitle(); }, 'ghost', true)])
    ]);
    openLayer(node, { deep: true, escape: screenTitle });
  }

  function screenLandDetail(code) {
    var L = Z.LANDS[code];
    var node = h('div', { class: 'land-detail pixel-box' }, [
      h('div', { class: 'land-detail__head' }, [
        h('span', { class: 'tag', text: '地块 ' + L.code }),
        h('span', { class: 'land-detail__title', text: L.name }),
        h('span', { class: 'chip', text: L.env })
      ]),
      h('div', { class: 'land-detail__desc', text: L.desc }),
      h('div', { class: 'route-line' }, [
        h('span', { text: '主食：' }), h('span', { class: 'chip chip--plus', text: L.food }),
        h('span', { text: '路线：' }), h('span', { class: 'chip', text: L.routes })
      ]),
      h('div', { class: 'historian', text: L.foodWhy }),
      h('div', { class: 'route-line' }, [h('span', { class: 'badge-good', text: '长板 ' + L.longboard })]),
      h('div', { class: 'bn-row' }, L.bottlenecks.map(function (b) {
        return h('div', { class: 'bn' }, [
          h('div', { class: 'bn__n', text: '硬瓶颈 · ' + b.name }),
          h('div', { class: 'bn__d', text: b.desc })
        ]);
      })),
      h('div', { class: 'panel-actions' }, [
        btn('另择一块', function () { screenSelect(); }, 'ghost'),
        btn('择此而居', function () { closeLayer(); beginFounding(code); }, 'primary')
      ])
    ]);
    openLayer(node, { deep: true, escape: screenSelect });
  }

  /* ---------- 立村 ---------- */

  function beginFounding(code) {
    mode = 'founding';
    S = E.createState();
    E.chooseLand(S, code);
    Z.Scene.setLand(code);
    Z.Scene.setSky('dawn');
    Z.Scene.setWeather('clear');
    Z.Scene.preview(code, null, 0);
    Z.Audio.ambience(code === 'E' ? 'coast' : (code === 'A' || code === 'C' ? 'water' : 'plain'));
    renderHud();
    persist();
    var L = Z.LANDS[code];
    play([
      {
        speaker: '立村 · 勘察',
        text: L.name + '。\n' + L.desc,
        small: true,
        meta: [chip('主食 ' + L.food, 'plus'), chip('长板 ' + L.longboard)]
      },
      {
        speaker: '立村 · 勘察',
        text: '先别急着落脚。点场景里的四处标记，看看这块地到底给了什么、又藏了什么。',
        small: true,
        onNext: enterScout
      }
    ]);
  }

  function enterScout() {
    mode = 'scout';
    stickyScout = true;
    renderHotspots();
    showScoutHint();
  }

  function renderHotspots() {
    clear(els.hot);
    var spots = Z.SCOUT_BY_LAND[S.landId] || [];
    spots.forEach(function (sp) {
      var found = S.scouted.indexOf(sp.id) >= 0;
      els.hot.appendChild(h('button', {
        class: 'hotspot' + (found ? ' hotspot--found' : ''),
        type: 'button',
        style: { left: (sp.x * CX) + 'px', top: (sp.y * CX) + 'px' },
        title: sp.resource,
        onclick: function (ev) { ev.stopPropagation(); onScout(sp.id); }
      }, [sp.char]));
    });
    var old = els.stage.querySelector('.scout-count');
    if (old) old.remove();
    els.stage.appendChild(h('div', { class: 'scout-count', text: '已勘察 ' + S.scouted.length + '/' + spots.length }));
  }

  function showScoutHint() {
    var n = S.scouted.length;
    var total = (Z.SCOUT_BY_LAND[S.landId] || []).length;
    play([{
      speaker: '立村 · 勘察',
      sticky: true,
      small: true,
      text: n === 0 ? '点场景中的四处标记，勘察此地。'
        : n < total ? '已看 ' + n + ' 处。看够了就可以择居——至少看两处。'
          : '四处都看过了。这块地给了什么、缺什么，你心里有数了。',
      buttons: [
        btn(n >= 2 ? '择居 · 定聚落形态' : '再看 ' + (2 - n) + ' 处', function () { chooseDwelling(); }, n >= 2 ? 'primary' : '', true)
      ]
    }]);
    var b = beats[0];
    if (b) b.buttons[0].disabled = n < 2;
  }

  function onScout(id) {
    var r = E.scout(S, id);
    if (!r) return;
    Z.Audio.play('click');
    Z.Scene.flash('good');
    renderHotspots();
    renderHud();
    floatDeltas(r.deltas);
    persist();
    play([{
      speaker: '勘察 · ' + r.spot.resource,
      text: r.spot.text,
      small: true,
      meta: effectChips(r.spot.effect).concat(r.spot.scarce ? [h('span', { class: 'badge-lock', text: '此物稀缺' })] : []),
      onNext: function () { renderHotspots(); showScoutHint(); }
    }]);
  }

  function chooseDwelling() {
    stickyScout = false;
    clear(els.hot);
    var sc = els.stage.querySelector('.scout-count');
    if (sc) sc.remove();
    var L = E.land(S);
    var opts = Z.SETTLEMENTS.map(function (st) {
      var fit = st.fit.indexOf(S.landId) >= 0;
      var key = Z.dwellingKey(st.id, S.landId);
      return {
        name: st.name,
        sub: st.desc,
        effects: st.effects,
        badges: [
          h('span', { class: fit ? 'badge-good' : 'badge-lock', text: fit ? '合此地 · 需' + st.need : '不合此地 · 需' + st.need })
        ],
        chips: st.popCap ? [h('span', { class: 'chip chip--plus', text: '人口上限 +' + st.popCap })] : [],
        onHover: function () { Z.Scene.preview(S.landId, st.id, 34); },
        onPick: function () { confirmDwelling(st); }
      };
    });
    play([{
      ribbonK: '立村 · 择居',
      ribbonT: '住什么样的屋子',
      ribbonH: '居所随环境而定。选错了不会立刻死，但会一直拖着民心与技艺。',
      choices: opts
    }]);
  }

  function confirmDwelling(st) {
    E.selectSettlement(S, st.id);
    E.confirmSettlement(S);
    mode = 'play';
    Z.Scene.sync(S, true);
    Z.Scene.flash('build');
    Z.Audio.play('build');
    renderHud();
    floatDeltas(S.settlementDeltas);
    persist();
    var list = [{
      speaker: '立村 · ' + st.name,
      text: st.narrative,
      small: true,
      meta: deltaChips(S.settlementDeltas)
    }];
    if (S.mismatch) {
      list.push({
        speaker: '太史 · 记',
        text: '此屋不合此地。' + (st.mismatch && st.mismatch.name ? st.mismatch.name : '居所失宜') + '——此后每回合都要为此付代价。',
        small: true,
        onEnter: function () { Z.Scene.flash('bad'); Z.Audio.play('bad'); }
      });
    }
    list[list.length - 1].onNext = function () { enterTurn(true); };
    play(list);
  }

  /* ---------- 回合 ---------- */

  function enterTurn(first) {
    mode = 'play';
    closeLayer();
    syncScene(true);
    renderHud();
    persist();
    if (S.phase === 'ending') { screenEnding(); return; }

    var crisis = Z.CRISES[S.currentCrisis];
    var A = E.actDef(S);
    var severe = ['flood', 'white', 'quake', 'storm', 'raid', 'revolt', 'plague'].indexOf(crisis.id) >= 0;

    var meta = deltaChips(S.turnStartDeltas);
    var grew = false;
    (S.bottleneckNotes || []).forEach(function (n) {
      if (n.kind === 'build') grew = true;
      var cls = n.kind === 'build' ? 'badge-build' : n.kind === 'good' ? 'badge-good' : 'badge-lock';
      meta.push(h('span', { class: cls, text: n.name + '：' + n.text }));
    });

    var intro = {
      speaker: '天时 · ' + (A.dates[S.turn - 1] || ''),
      text: crisis.quote,
      small: true,
      meta: meta,
      onEnter: function () {
        floatDeltas(S.turnStartDeltas);
        if (grew) { Z.Audio.play('build'); Z.Scene.flash('build'); }
        if (severe) { Z.Audio.play('drum'); Z.Scene.shake(3.2); Z.Scene.flash('bad'); }
        else if (!grew) Z.Audio.play('page');
      },
      onNext: function () { showHand(crisis); }
    };

    var list = [];
    if (first) {
      list.push({
        speaker: '第一幕 · 定居',
        text: A.theme + '。\n此后三回合，你要在这块地上把聚落立起来。目标：' + A.goalText + '。',
        small: true
      });
    }
    list.push(intro);
    play(list);
  }

  function showHand(crisis) {
    crisis = crisis || Z.CRISES[S.currentCrisis];
    var opts = S.hand.map(function (id) {
      var c = Z.CARD_BY_ID[id];
      var syn = c.synergy && c.synergy.crisis === S.currentCrisis;
      var badges = [];
      if (syn) badges.push(h('span', { class: 'badge-good', text: '应此危机', title: c.synergy.note }));
      if (c.build && S.built.indexOf(c.build) < 0) badges.push(h('span', { class: 'badge-build', text: '起新建筑' }));
      if (c.special === 'breakceiling') badges.push(h('span', { class: 'badge-good', text: '解产量之顶' }));
      return {
        name: c.name, tag: c.tag, sub: c.desc, effects: c.effects, badges: badges,
        onPick: function () { pickCard(id); }
      };
    });
    var rerollBtn = btn(S.rerollsLeft > 0 ? '换策（民心 −2）' : '本回合已换策', function () { doReroll(); }, 'small', true);
    rerollBtn.disabled = S.rerollsLeft <= 0;
    play([{
      ribbonK: crisis.kicker,
      ribbonT: crisis.title,
      ribbonH: crisis.hint,
      ribbonBtn: rerollBtn,
      choices: opts
    }]);
  }

  function doReroll() {
    var r = E.reroll(S);
    if (!r) return;
    if (r.unchanged) {
      Z.Audio.play('bad');
      floatText('此幕之策已尽，无可换者', 'minus');
      return;
    }
    Z.Audio.play('page');
    floatDeltas(r.deltas);
    renderHud();
    persist();
    if (r.collapse) { screenEnding(); return; }
    showHand();
  }

  function pickCard(id) {
    var res = E.playCard(S, id);
    if (!res) return;
    syncScene(true);
    renderHud();
    floatDeltas(res.deltas);
    persist();
    if (res.built) { Z.Audio.play('build'); Z.Scene.flash('build'); }
    else { Z.Audio.play('good'); Z.Scene.flash('good'); }

    var meta = deltaChips(res.deltas);
    if (res.synergyApplied) meta.push(h('span', { class: 'badge-good', text: '应变合宜 · ' + res.synergyNote }));
    res.gained.forEach(function (k) {
      meta.push(h('span', { class: 'badge-build', text: '成就 · ' + (Z.ACHIEVEMENT_LABELS[k] || k) }));
    });
    if (res.built) meta.push(h('span', { class: 'badge-build', text: '聚落新增建筑' }));

    var list = [{
      speaker: res.cardName + ' · ' + res.tag,
      text: res.narrative,
      small: true,
      meta: meta
    }];
    if (res.anchor) {
      list.push({
        speaker: '典 · 出处',
        text: res.anchor,
        small: true
      });
    }
    list[list.length - 1].onNext = proceed;
    play(list);
  }

  function proceed() {
    if (S.phase === 'ending') { screenEnding(); return; }
    var r = E.nextTurn(S);
    persist();
    if (!r.ok) return;
    if (r.actEnd) { screenActEnd(); return; }
    enterTurn(false);
  }

  /* ---------- 幕末 ---------- */

  function starRow(n, max) {
    var kids = [];
    for (var i = 0; i < max; i++) {
      kids.push(h('span', { class: i < n ? '' : 'dim', style: { animationDelay: (i * 0.09) + 's' }, text: '★' }));
    }
    return h('div', { class: 'stars' }, kids);
  }

  function screenActEnd() {
    mode = 'actEnd';
    stopBeats();
    show(els.dock, false);
    var a = S.actEnd;
    Z.Audio.play('chime');
    for (var si = 0; si < Math.min(5, a.stars); si++) {
      setTimeout(function () { if (mode === 'actEnd') Z.Audio.play('star'); }, 300 + si * 90);
    }
    Z.Scene.celebrate();
    Z.Scene.setSky('dusk');
    Z.Scene.setWeather('clear');

    var grade = Z.gradeFor(a.stars * 5);
    var stats = h('div', { class: 'end-stats' }, GAUGES.map(function (g) {
      return h('div', { class: 'end-stat' }, [
        h('div', { class: 'end-stat__label', text: g.label }),
        h('div', { class: 'end-stat__value', style: { color: 'var(--' + g.k + ')' }, text: String(S.stats[g.k]) })
      ]);
    }));

    var routes = h('div', { class: 'route-line' }, [h('span', { text: '至今路线：' })].concat(
      a.routes.slice(0, 5).map(function (r) { return h('span', {}, [tagEl(r.tag), h('span', { class: 'chip', text: '×' + r.count })]); })
    ));

    var nextLabel = S.act === 4 ? '幕末结算 · 邦交' : S.act >= 5 ? '看结局' : '进入第' + '一二三四五'[S.act] + '幕 · ' + Z.ACTS[S.act].name;

    var node = h('div', { class: 'end-panel pixel-box' }, [
      h('div', { class: 'actend__kicker', text: '第' + '一二三四五'[a.act - 1] + '幕 · ' + a.range }),
      h('div', { class: 'actend__title', text: a.name + ' · 幕末结算' }),
      h('div', { class: 'actend__lede', text: a.lede }),
      h('div', { class: 'grade' }, [
        h('div', { class: 'grade__seal', text: grade.word }),
        h('div', {}, [
          h('div', { class: 'grade__label', text: '本幕目标 · ' + a.goalText + (a.goalMet ? ' · 已达成' : ' · 未达成') }),
          h('div', { class: 'grade__value', text: grade.line })
        ]),
        starRow(a.stars, a.maxStars)
      ]),
      stats,
      routes,
      h('div', { class: 'historian', text: '太史曰：' + a.historian }),
      h('div', { class: 'callback', text: a.unlock }),
      h('div', { style: { height: '10px' } }),
      h('div', { class: 'panel-actions' }, [
        btn('看聚落', function () { peekReturn = screenActEnd; closeLayer(); togglePeek(); }, 'ghost'),
        btn(nextLabel, function () {
          closeLayer();
          var r = E.advanceAct(S);
          persist();
          if (r.diplomacy) { screenDiplomacy(); return; }
          if (r.done) { screenEnding(); return; }
          enterTurn(false);
        }, 'primary')
      ])
    ]);
    openLayer(node, { deep: false });
  }

  /* ---------- 邦交 ---------- */

  function screenDiplomacy() {
    mode = 'diplomacy';
    stopBeats();
    Z.Audio.play('chime');
    var D = Z.DIPLO_INTRO;
    var node = h('div', { class: 'diplo pixel-box' }, [
      h('div', { class: 'actend__kicker', text: D.kicker }),
      h('div', { class: 'actend__title', text: D.title }),
      h('div', { class: 'actend__lede', text: D.lines[0] }),
      h('div', { class: 'diplo__warn', text: D.lines[1] }),
      h('div', { class: 'actend__lede', text: D.ask }),
      h('div', { class: 'panel-actions' }, [
        btn(D.refuse, function () { doRefuse(); }, 'danger'),
        btn(D.accept, function () { screenDiploPick(); }, 'primary')
      ]),
      h('div', { class: 'title-foot', style: { textAlign: 'left' }, text: D.refuseWarn })
    ]);
    openLayer(node, { deep: false });
  }

  function screenDiploPick() {
    var D = Z.DIPLO_INTRO;
    var L = E.land(S);
    var costScale = Z.diploCostScale(S.landId);
    var wrap = h('div', { class: 'diplo pixel-box' });
    var grid = h('div', { class: 'diplo__grid' });
    var cov = h('div', { class: 'coverage' });
    var foot = h('div', { class: 'diplo__foot' });
    var confirmBtn = btn(D.confirm, function () { doConfirmDiplo(); }, 'primary');

    function refresh() {
      clear(grid);
      E.diploOptions(S).forEach(function (code) {
        var d = Z.DIPLOMACY[code];
        var sel = S.partners.indexOf(code) >= 0;
        var full = !sel && S.partners.length >= Z.DIPLO_PICK;
        var rel = d.relieves.filter(function (b) {
          return L.bottlenecks.some(function (x) { return x.id === b; });
        }).map(function (b) {
          var found = L.bottlenecks.filter(function (x) { return x.id === b; })[0];
          return found ? found.name : b;
        });
        var payTxt = d.cost;
        if (costScale !== 1) payTxt += costScale < 1 ? '（水运之便，代价减半）' : '（群山封闭，代价翻倍）';
        grid.appendChild(h('button', {
          class: 'partner' + (sel ? ' sel' : '') + (full ? ' full' : ''),
          type: 'button',
          onclick: function () {
            var r = E.togglePartner(S, code);
            if (r === null) { Z.Audio.play('bad'); return; }
            Z.Audio.play(r ? 'coin' : 'click');
            refresh();
          }
        }, [
          h('div', { class: 'partner__icon', text: d.icon }),
          h('div', { class: 'partner__code', text: '地块 ' + code + (sel ? ' · 已选' : '') }),
          h('div', { class: 'partner__name', text: d.short }),
          h('div', { class: 'partner__give', text: '补：' + d.supply }),
          h('div', { class: 'partner__pay', text: '付：' + payTxt }),
          rel.length ? h('div', { class: 'partner__rel', text: '正解你的「' + rel.join('、') + '」' }) : null,
          h('div', { class: 'partner__goods', text: d.goods })
        ]));
      });

      clear(cov);
      var coverage = Z.diploCoverage(S.landId, S.partners);
      cov.appendChild(h('span', { class: 'chip', text: '你的硬瓶颈：' }));
      coverage.forEach(function (c) {
        cov.appendChild(h('span', {
          class: 'cov' + (c.covered ? ' ok' : ''),
          text: c.name + (c.covered ? ' ✓ ' + c.by.join('/') + ' 可解' : ' 未解')
        }));
      });
      confirmBtn.disabled = S.partners.length !== Z.DIPLO_PICK;
      counter.textContent = '已择 ' + S.partners.length + '/' + Z.DIPLO_PICK;
    }

    var counter = h('span', { class: 'chip chip--plus', text: '已择 0/3' });
    foot.appendChild(counter);
    foot.appendChild(cov);
    foot.appendChild(h('span', { style: { flex: '1' } }));
    foot.appendChild(btn(D.back, function () { S.partners = []; screenDiploPick(); }, 'ghost', true));
    foot.appendChild(confirmBtn);

    wrap.appendChild(h('div', { class: 'actend__kicker', text: D.kicker }));
    wrap.appendChild(h('div', { class: 'actend__title', text: '择三地而通好' }));
    wrap.appendChild(h('div', { class: 'actend__lede', text: D.pickHint }));
    wrap.appendChild(grid);
    wrap.appendChild(foot);
    refresh();
    openLayer(wrap, { deep: true });
  }

  function doConfirmDiplo() {
    var r = E.confirmDiplomacy(S);
    if (!r) return;
    closeLayer();
    Z.Audio.play('chime');
    Z.Scene.celebrate();
    Z.Scene.flash('good');
    renderHud();
    floatDeltas(r.deltas);
    persist();
    if (S.phase === 'ending') { screenEnding(); return; }

    var pacts = S.partners.map(function (c) { return Z.DIPLOMACY[c]; });
    var meta = deltaChips(r.deltas);
    r.coverage.forEach(function (c) {
      meta.push(h('span', { class: c.covered ? 'badge-good' : 'badge-lock', text: c.name + (c.covered ? ' 已解' : ' 未解') }));
    });
    var list = [{
      speaker: '邦交 · 三地之盟',
      text: pacts.map(function (d) { return d.short + '：' + d.pact; }).join('\n') + '\n\n' + Z.ALLIANCE.line,
      small: true,
      meta: meta
    }, {
      speaker: '太史 · 记',
      text: Z.ALLIANCE.historian + (r.delayed ? '\n\n' + Z.DIPLOMACY[r.delayed.code].short + '的铜锡要等栈道凿通，两回合后才到。' : ''),
      small: true,
      onNext: function () { E.startActFive(S); persist(); enterTurn(false); }
    }];
    play(list);
  }

  function doRefuse() {
    E.refuseDiplomacy(S);
    closeLayer();
    Z.Audio.play('bad');
    Z.Scene.flash('bad');
    Z.Scene.shake(2.4);
    renderHud();
    persist();
    play([{
      speaker: '邦交 · 闭关',
      text: Z.ISOLATION.line + '\n\n使者被遣回。门关上了，门外的世界仍在往前走。',
      small: true,
      meta: [h('span', { class: 'badge-lock', text: '孤立线' })]
    }, {
      speaker: '太史 · 记',
      text: Z.ISOLATION.historian,
      small: true,
      onNext: function () { E.startActFive(S); persist(); enterTurn(false); }
    }]);
  }

  /* ---------- 结局 ---------- */

  function screenEnding() {
    mode = 'ending';
    stopBeats();
    show(els.dock, false);
    clear(els.hot);
    var d = E.endingDetail(S);
    var e = d.ending;
    Z.Save.unlockEnding(e.id, S.landId);
    Z.Save.clear();
    Z.Audio.play(e.tier === 'X' ? 'bad' : 'xun');
    Z.Scene.setSky(e.tier === 'X' ? 'night' : (e.tier === 'A' ? 'dawn' : 'dusk'));
    Z.Scene.setWeather(e.tier === 'X' ? 'mist' : 'clear');
    if (e.tier === 'A') Z.Scene.celebrate();
    renderHud();

    var achList = d.ach.map(function (k) { return Z.ACHIEVEMENT_LABELS[k] || k; });
    var node = h('div', { class: 'end-panel pixel-box' }, [
      h('div', { class: 'ending-hero', style: { backgroundImage: 'url(' + e.image + ')' } }, [
        h('div', { class: 'ending-hero__tier', text: e.tier === 'X' ? '崩盘' : e.tier + ' 级 · ' + Z.TIER_LABEL[e.tier] })
      ]),
      h('div', { class: 'ending-kicker', text: '终局 · ' + d.land.code + ' · ' + d.land.short + ' · 主导路线 ' + (Z.ROUTE_LABELS[d.route] || d.route) }),
      h('div', { class: 'ending-title' + (e.tier === 'X' ? ' bad' : ''), text: e.title }),
      h('div', { class: 'ending-quote', text: e.quote }),
      h('div', { class: 'ending-text', text: e.text }),
      d.near ? h('div', { class: 'near-note', text: '差一步：此结局的完整条件是「' + e.need + '」。你走到了它的门口。' }) : null,
      h('div', { class: 'callback', text: e.callback }),
      h('div', { style: { height: '10px' } }),
      h('div', { class: 'grade' }, [
        h('div', { class: 'grade__seal', text: d.grade.word }),
        h('div', {}, [
          h('div', { class: 'grade__label', text: '五幕累计 ' + d.stars + ' / ' + d.maxStars + ' 星' }),
          h('div', { class: 'grade__value', text: d.grade.line })
        ]),
        starRow(Math.min(5, Math.round(d.stars / 5)), 5)
      ]),
      h('div', { class: 'end-stats' }, GAUGES.map(function (g) {
        return h('div', { class: 'end-stat' }, [
          h('div', { class: 'end-stat__label', text: g.label }),
          h('div', { class: 'end-stat__value', style: { color: 'var(--' + g.k + ')' }, text: String(d.stats[g.k]) })
        ]);
      })),
      h('div', { class: 'route-line' }, [h('span', { text: '成就：' })].concat(
        achList.length ? achList.map(function (t) { return h('span', { class: 'badge-build', text: t }); })
          : [h('span', { class: 'badge-lock', text: '无' })]
      )),
      h('div', { class: 'route-line' }, [h('span', { text: '邦交：' })].concat(
        d.isolated ? [h('span', { class: 'badge-lock', text: '闭关自守 · 孤立线' })]
          : d.partners.length ? d.partners.map(function (c) { return h('span', { class: 'badge-good', text: Z.DIPLOMACY[c].short }); })
            : [h('span', { class: 'badge-lock', text: '未及通好' })]
      )),
      h('div', { class: 'panel-actions' }, [
        btn('结局图鉴', function () { screenGallery(true); }, 'ghost'),
        btn('重开一世', function () { closeLayer(); screenSelect(); }),
        btn('终章 · 揭晓', function () { screenReveal(); }, 'primary')
      ])
    ]);
    openLayer(node, { deep: true });
  }

  function screenReveal() {
    var L = E.land(S);
    var R = Z.REVEAL_INTRO;
    var partners = S.partners.map(function (c) {
      var pl = Z.LANDS[c];
      return h('div', { class: 'rp' }, [
        h('div', { class: 'rp__c', text: '地块 ' + c + ' · ' + pl.short }),
        h('div', { class: 'rp__n', text: pl.reveal.culture }),
        h('div', { class: 'rp__p', text: Z.DIPLOMACY[c].pact })
      ]);
    });
    var node = h('div', { class: 'reveal pixel-box' }, [
      h('div', { class: 'actend__kicker', text: R.kicker }),
      h('div', { class: 'actend__title', text: R.title }),
      h('div', { class: 'actend__lede', text: R.lines.join('\n') }),
      h('div', { class: 'route-line' }, [h('span', { class: 'tag', text: '你的地块 ' + L.code }), h('span', { class: 'chip', text: L.name })]),
      h('div', { class: 'reveal__culture', text: L.reveal.culture }),
      h('div', { class: 'reveal__line', text: L.reveal.line }),
      h('div', { class: 'relics' }, L.reveal.relics.map(function (r) { return h('span', { class: 'relic', text: r }); })),
      partners.length ? h('div', { class: 'actend__kicker', text: R.partnerHead }) : null,
      partners.length ? h('div', { class: 'reveal__partners' }, partners) : null,
      h('div', { class: 'historian', style: { marginTop: '10px' }, text: R.foot }),
      h('div', { class: 'panel-actions' }, [
        btn('回到结局', function () { screenEnding(); }, 'ghost'),
        btn('结局图鉴', function () { screenGallery(true); }),
        btn('另择一块地，再走一遍', function () { closeLayer(); screenSelect(); }, 'primary')
      ])
    ]);
    openLayer(node, { deep: true });
  }

  /* ---------- 图鉴 / 卜辞 / 玩法 ---------- */

  function screenGallery(fromEnd) {
    var gal = Z.Save.gallery();
    var all = Z.ENDINGS.concat(Object.keys(Z.COLLAPSE).map(function (k) { return Z.COLLAPSE[k]; }));
    var got = Object.keys(gal).length;
    var grid = h('div', { class: 'gallery__grid' });
    all.forEach(function (e) {
      var rec = gal[e.id];
      grid.appendChild(h('div', { class: 'gcard' + (rec ? ' got' : '') }, [
        h('div', { class: 'gcard__tier', text: e.tier === 'X' ? '崩盘' : e.tier + ' 级' }),
        h('div', { class: 'gcard__t', text: rec ? e.title : '？？？' }),
        h('div', { class: 'gcard__n', text: rec ? e.subtitle : e.need }),
        rec ? h('div', { class: 'gcard__lands', text: rec.lands.join(' ') + ' · ×' + rec.count }) : null
      ]));
    });
    var node = h('div', { class: 'gallery pixel-box' }, [
      h('div', { class: 'actend__kicker', text: '图鉴 · 十四结局' }),
      h('div', { class: 'actend__title', text: '已见 ' + got + ' / 14' }),
      h('div', { class: 'actend__lede', text: '未解锁的格子写着它的条件。同一块地走不同的路，会走到不同的终点。' }),
      grid,
      h('div', { class: 'panel-actions', style: { marginTop: '12px' } }, [
        btn('关闭', function () {
          if (fromEnd && S && S.ending) screenEnding();
          else if (mode === 'title') screenTitle();
          else closeLayer();
        }, 'primary')
      ])
    ]);
    openLayer(node, { deep: true, dismiss: false, escape: function () {
      if (fromEnd && S && S.ending) screenEnding();
      else if (mode === 'title') screenTitle();
      else closeLayer();
    } });
  }

  function word(v) {
    return v < 20 ? '微' : v < 40 ? '渐起' : v < 60 ? '可观' : v < 80 ? '盛' : '极盛';
  }

  function screenOracle() {
    var s = S.stats;
    var rows = [
      { k: 'K', v: s.K, hint: '交融：与他族通好、通婚、互市的深浅。低了，纵有精玉坚城也会被时代落下。' },
      { k: 'W', v: s.W, hint: '武功：兵戈与兼并之力。高了而民心低，其兴也勃，其亡也忽。' },
      { k: 'R', v: s.R, hint: '礼制：历法、文字、宗法、礼乐。它决定别人用不用你的规矩。' }
    ];
    var node = h('div', { class: 'oracle pixel-box' }, [
      h('div', { class: 'actend__kicker', text: '太史卜辞 · 三项隐值' }),
      h('div', { class: 'actend__title', text: '看不见的三样东西' })
    ].concat(rows.map(function (r) {
      return h('div', { class: 'oracle__row' }, [
        h('span', { class: 'oracle__k', text: Z.STAT_LABELS[r.k] }),
        h('span', { class: 'oracle__bar' }, [h('span', { class: 'oracle__fill', style: { width: r.v + '%' } })]),
        h('span', { class: 'oracle__word', text: word(r.v) })
      ]);
    })).concat([
      h('div', { class: 'oracle__hint', text: rows.map(function (r) { return r.hint; }).join('\n') }),
      h('div', { class: 'panel-actions', style: { marginTop: '12px' } }, [
        btn('回到局中', function () { closeLayer(); }, 'primary')
      ])
    ]));
    openLayer(node, { deep: true, dismiss: true });
  }

  function screenHelp(fromTitle) {
    var node = h('div', { class: 'end-panel pixel-box' }, [
      h('div', { class: 'actend__kicker', text: '玩法' }),
      h('div', { class: 'actend__title', text: '一局一万年，十九回合' }),
      h('div', { class: 'ending-text', text: '一 · 择地。六块地等权，各有长板与两道硬瓶颈。没有最好的地，只有不同的路。\n二 · 立村。勘察四处，再定聚落形态。居所随环境而定，选错会一直拖后腿。\n三 · 五幕。定居三回合、古国四、王国四、封邦四、变局四。每回合先遇一张危机卡，再从三张行动卡里择一应对。危机与对策相合时，收益额外加成。\n四 · 邦交。第四幕末，从另外五块地里挑三块通好。它们的长板正好补你的瓶颈；拒绝则入孤立线，五幕产出 −20%。\n五 · 结局。十四种。看主导路线、交融、民心与礼制武功的高低。终章才揭晓你走的到底是哪一支真实考古文化。' }),
      h('div', { class: 'callback', text: '四项显值（人口 / 粮储 / 民心 / 技艺）任一归零即崩盘。三项隐值（交融 / 武功 / 礼制）不显示数字，点 HUD 的「卜」可看卜辞。' }),
      h('div', { class: 'title-foot', style: { textAlign: 'left' }, text: '空格 / 回车 推进 · 1–3 选策 · V 看聚落 · M 静音 · Esc 关闭面板' }),
      h('div', { class: 'panel-actions' }, [
        btn('明白了', function () { if (fromTitle) screenTitle(); else closeLayer(); }, 'primary')
      ])
    ]);
    openLayer(node, { deep: true, escape: function () { if (fromTitle) screenTitle(); else closeLayer(); } });
  }

  /* ---------- 继续 ---------- */

  function continueGame() {
    var s = Z.Save.read();
    if (!s) { screenSelect(); return; }
    S = s;
    mode = 'play';
    Z.Scene.setLand(S.landId);
    setTimeout(function () {
      syncScene(false);
      renderHud();
      if (S.phase === 'ending') { screenEnding(); return; }
      if (S.phase === 'actEnd') { screenActEnd(); return; }
      if (S.phase === 'diplomacy') { screenDiplomacy(); return; }
      if (S.phase === 'resolve' && S.lastResolution) {
        var res = S.lastResolution;
        play([{
          speaker: res.cardName + ' · ' + res.tag,
          text: res.narrative, small: true, meta: deltaChips(res.deltas),
          onNext: proceed
        }]);
        return;
      }
      if (S.phase === 'play' && S.currentCrisis) { showHand(); return; }
      screenSelect();
    }, 60);
  }

  /* ---------- 启动 ---------- */

  function boot() {
    prefs = Z.Save.prefs();
    mount();
    Z.Audio.setMuted(prefs.muted);
    screenTitle();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  Z.UI = {
    state: function () { return S; },
    setFast: function (f) { prefs.fast = !!f; Z.Save.setPrefs(prefs); },
    goto: function (m) {
      if (m === 'title') screenTitle();
      else if (m === 'select') screenSelect();
      else if (m === 'gallery') screenGallery(true);
      else if (m === 'help') screenHelp(true);
    }
  };
})();