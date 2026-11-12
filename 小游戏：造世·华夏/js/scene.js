(function () {
  'use strict';
  var Z = window.ZSX = window.ZSX || {};

  var CW = 480, CH = 270;
  var TOP = 28, BOTTOM = 192; /* HUD 与对话面板之间的可见窗口 */

  var SPRITE_SIZE = {
    pit: [46, 42], yaodong: [52, 52], stilt: [48, 35], stone: [50, 25], hide: [46, 27],
    hall: [60, 45], gate: [52, 35], granary: [40, 35], kiln: [42, 32], dam: [58, 28],
    foundry: [50, 30], altar: [46, 31], wall: [56, 31], market: [48, 29]
  };

  var SKIES = {
    dawn: { mul: [104, 92, 122, 0.34], add: [255, 176, 120, 0.17], orb: [0.17, 0.30, '#ffd9a0', 7], stars: 0.18, warm: 0.35, dark: 0.22 },
    morning: { mul: [255, 240, 210, 0.08], add: [255, 232, 178, 0.11], orb: [0.29, 0.19, '#fff2c8', 6], stars: 0, warm: 0.18, dark: 0.04 },
    noon: { mul: [255, 255, 255, 0.0], add: [255, 252, 235, 0.07], orb: [0.52, 0.10, '#fffbe8', 6], stars: 0, warm: 0.05, dark: 0 },
    dusk: { mul: [138, 90, 74, 0.38], add: [255, 148, 78, 0.22], orb: [0.84, 0.31, '#ff9a4a', 8], stars: 0.12, warm: 0.55, dark: 0.28 },
    night: { mul: [38, 48, 82, 0.70], add: [58, 74, 122, 0.07], orb: [0.74, 0.15, '#dfe8ff', 5], stars: 1, warm: 0.1, dark: 0.72 },
    storm: { mul: [72, 78, 88, 0.48], add: [104, 112, 122, 0.05], orb: null, stars: 0, warm: 0, dark: 0.46 }
  };

  var WEATHER = {
    clear: { rain: 0, snow: 0, dust: 0, fog: 0, bug: 0, ember: 0, wind: 0.25, tint: null, flood: 0, bolt: 0 },
    flood: { rain: 150, snow: 0, dust: 0, fog: 0.15, bug: 0, ember: 0, wind: 0.9, tint: [70, 96, 120, 0.22], flood: 1, bolt: 0 },
    drought: { rain: 0, snow: 0, dust: 34, fog: 0.1, bug: 0, ember: 0, wind: 0.35, tint: [200, 150, 70, 0.20], flood: -0.5, bolt: 0 },
    dry: { rain: 0, snow: 0, dust: 22, fog: 0, bug: 0, ember: 0, wind: 0.5, tint: [190, 160, 100, 0.12], flood: -0.25, bolt: 0 },
    heat: { rain: 0, snow: 0, dust: 12, fog: 0.18, bug: 0, ember: 0, wind: 0.15, tint: [220, 180, 110, 0.14], flood: 0, bolt: 0 },
    mist: { rain: 0, snow: 0, dust: 0, fog: 0.72, bug: 0, ember: 0, wind: 0.12, tint: [150, 170, 160, 0.18], flood: 0, bolt: 0 },
    snow: { rain: 0, snow: 34, dust: 0, fog: 0.24, bug: 0, ember: 0, wind: 0.55, tint: [200, 214, 230, 0.26], flood: 0, bolt: 0 },
    locust: { rain: 0, snow: 0, dust: 10, fog: 0.1, bug: 70, ember: 0, wind: 0.8, tint: [120, 100, 50, 0.24], flood: 0, bolt: 0 },
    ember: { rain: 0, snow: 0, dust: 16, fog: 0.2, bug: 0, ember: 60, wind: 0.7, tint: [150, 60, 40, 0.22], flood: 0, bolt: 0 },
    dust: { rain: 0, snow: 0, dust: 110, fog: 0.42, bug: 0, ember: 0, wind: 1.5, tint: [160, 130, 80, 0.30], flood: 0, bolt: 0 },
    storm: { rain: 190, snow: 0, dust: 0, fog: 0.24, bug: 0, ember: 0, wind: 1.8, tint: [60, 74, 96, 0.30], flood: 0.55, bolt: 1 },
    wind: { rain: 0, snow: 0, dust: 40, fog: 0.06, bug: 0, ember: 0, wind: 1.6, tint: [140, 140, 150, 0.12], flood: 0, bolt: 0 }
  };

  /* 建筑优先落位；这些点从开局就为公共建筑留白，民居只能绕着长 */
  var RESERVED = {
    hall: [0.00, 0.22], altar: [-0.66, 0.19], granary: [0.66, 0.20],
    kiln: [-1.20, 0.34], foundry: [1.20, 0.36], market: [-0.90, 0.97],
    gate: [0.40, 0.99], well: [0.62, 0.35], fire: [0.00, 0.56],
    pen0: [-0.96, 0.72], pen1: [0.96, 0.74], pen2: [-0.96, 0.50],
    field0: [-1.24, 0.16], field1: [1.24, 0.18], field2: [-1.26, 0.66], field3: [1.26, 0.68]
  };

  var canvas = null, ctx = null;
  var plates = {}, sprites = {}, spriteReady = 0;
  var raf = 0, lastT = 0;

  var V = {
    land: null, landId: null, plate: null,
    sky: 'noon', skyFrom: null, skyTo: null, skyT: 1,
    weather: 'clear', wFrom: null, wTo: null, wT: 1,
    pop: 0, built: [], fields: 0, livestock: 0, act: 1,
    entities: [], villagers: [], animals: [], parts: [], smoke: [], birds: [],
    stars: [], clouds: [], fireflies: [], boat: null,
    t: 0, shake: 0, flash: 0, flashCol: [255, 255, 255], skyDark: 0,
    flood: 0, bolt: 0, boltTimer: 3,
    running: false, paused: false, hidden: false,
    debug: false, onReady: null, ready: false
  };

  /* ---------- 小工具 ---------- */

  function clamp(n, a, b) { return n < a ? a : n > b ? b : n; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }
  function rgba(c, a) { return 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + a + ')'; }

  function mixArr(a, b, t) {
    var out = [];
    for (var i = 0; i < a.length; i++) out.push(lerp(a[i], b[i], t));
    return out;
  }

  function skyNow() {
    var a = SKIES[V.skyFrom] || SKIES.noon, b = SKIES[V.skyTo] || SKIES.noon;
    var t = V.skyT;
    return {
      mul: mixArr(a.mul, b.mul, t), add: mixArr(a.add, b.add, t),
      stars: lerp(a.stars, b.stars, t), warm: lerp(a.warm, b.warm, t), dark: lerp(a.dark, b.dark, t),
      orb: t < 0.5 ? a.orb : b.orb, orbA: t < 0.5 ? 1 - t * 2 : (t - 0.5) * 2
    };
  }

  function weatherNow() {
    var a = WEATHER[V.wFrom] || WEATHER.clear, b = WEATHER[V.wTo] || WEATHER.clear;
    var t = V.wT, o = {};
    ['rain', 'snow', 'dust', 'fog', 'bug', 'ember', 'wind', 'flood', 'bolt'].forEach(function (k) {
      o[k] = lerp(a[k], b[k], t);
    });
    o.tint = t < 0.5 ? a.tint : b.tint;
    o.tintA = t < 0.5 ? 1 - t * 2 : (t - 0.5) * 2;
    return o;
  }

  /* ---------- 落位 ---------- */

  function plot(u, v) {
    var g = V.land.ground, wa = V.land.water;
    var y = g.y0 + (g.y1 - g.y0) * v;
    var hw = g.w0 + (g.w1 - g.w0) * v;
    var x = g.cx + u * hw;
    /* 侧向水湾（如黄土塬的湖）：把落点推到岸上，房子不泡在水里 */
    if (wa && wa.x1 - wa.x0 < CW - 40 && y > wa.y0 - 4 && y < wa.y1 + 6 && x > wa.x0 - 16 && x < wa.x1 + 16) {
      x = (x - wa.x0 < wa.x1 - x) ? wa.x0 - 18 : wa.x1 + 18;
    }
    return { x: clamp(x, 26, 454), y: y, s: 0.56 + 0.44 * v };
  }

  /* 错行菱形网格：民居围着火塘一圈圈长出去，不排成一条横线 */
  function gridSlots() {
    var out = [];
    var rows = [
      { v: 0.14, us: [-0.84, -0.42, 0.00, 0.42, 0.84] },
      { v: 0.35, us: [-0.63, -0.21, 0.21, 0.63] },
      { v: 0.56, us: [-0.84, -0.42, 0.00, 0.42, 0.84] },
      { v: 0.77, us: [-0.63, -0.21, 0.21, 0.63] },
      { v: 0.98, us: [-0.84, -0.42, 0.00, 0.42, 0.84] }
    ];
    rows.forEach(function (r) {
      r.us.forEach(function (u) {
        out.push({ u: u, v: r.v, rank: Math.abs(u) * 0.8 + Math.abs(r.v - 0.56) * 1.35 });
      });
    });
    out.sort(function (a, b) { return a.rank - b.rank; });
    return out;
  }

  /* 占地只算房基，不算屋顶——否则窑洞这类高房子会把下一排整排挤掉 */
  function footprint(p, w, h) {
    var ww = w * p.s, hh = h * p.s;
    return { x0: p.x - ww * 0.46, x1: p.x + ww * 0.46, y0: p.y - Math.min(hh * 0.26, 9 * p.s), y1: p.y + 1 };
  }

  function hits(r, list) {
    for (var i = 0; i < list.length; i++) {
      var o = list[i];
      if (r.x0 < o.x1 && r.x1 > o.x0 && r.y0 < o.y1 && r.y1 > o.y0) return true;
    }
    return false;
  }

  function makeEntity(kind, key, p, w, h, extra) {
    var e = {
      kind: kind, key: key, x: p.x, y: p.y, s: p.s, w: w, h: h,
      seed: Math.random() * 1000, born: -1
    };
    if (extra) Object.keys(extra).forEach(function (k) { e[k] = extra[k]; });
    return e;
  }

  function rebuild(animateNew) {
    if (!V.land) return;
    var prev = {};
    V.entities.forEach(function (e) { prev[e.kind + ':' + e.key + ':' + (e.idx || 0)] = e; });

    var taken = [];
    var list = [];
    var slots = gridSlots();

    /* 公共建筑按规划图定位，永不因为挤占而消失；只有民居需要找空位 */
    function fixed(kind, key, uv, w, h, extra, idx) {
      var p = plot(uv[0], uv[1]);
      taken.push(footprint(p, w, h));
      var e = makeEntity(kind, key, p, w, h, extra);
      e.idx = idx || 0;
      var old = prev[kind + ':' + key + ':' + e.idx];
      e.born = old ? old.born : (animateNew ? V.t : -1);
      if (old) { e.x = old.x; e.y = old.y; e.s = old.s; }
      list.push(e);
      return e;
    }
    function placeHome(key, w, h, idx) {
      var old = prev['home:' + key + ':' + idx];
      var p = null, reused = false;
      /* 老屋基只要没被新起的公共建筑压住，就留在原处 */
      if (old && !hits(footprint(old, w, h), taken)) {
        p = { x: old.x, y: old.y, s: old.s };
        reused = true;
      } else {
        for (var i = 0; i < slots.length; i++) {
          var q = plot(slots[i].u, slots[i].v);
          if (!hits(footprint(q, w, h), taken)) { p = q; slots.splice(i, 1); break; }
        }
      }
      if (!p) return null;
      taken.push(footprint(p, w, h));
      var e = makeEntity('home', key, p, w, h);
      e.idx = idx;
      e.born = reused ? old.born : (animateNew ? V.t + idx * 0.09 : -1);
      list.push(e);
      return e;
    }

    /* 城墙：村后一道横垣，两端各折回一段，把聚落拢在里面 */
    if (V.built.indexOf('wall') >= 0) {
      var segs = 7, span = 1.84, wv = 0.06;
      var backHw = V.land.ground.w0 + (V.land.ground.w1 - V.land.ground.w0) * wv;
      var segW = (span * backHw / segs) * 1.10 / (0.56 + 0.44 * wv);
      for (var wi = 0; wi < segs; wi++) {
        var wu = -span / 2 + span * (wi + 0.5) / segs;
        var we = fixed('wall', 'wall', [wu, wv], segW, 31, null, wi);
        if (we.born === V.t) we.born = V.t + wi * 0.08;
      }
      [-1.06, 1.06].forEach(function (u, k) {
        var se = fixed('wall', 'wall', [u, 0.18], 56, 31, { side: true }, segs + k);
        if (se.born === V.t) se.born = V.t + 0.6;
      });
    }

    /* 堤：压在水线下方，不进村 */
    if (V.built.indexOf('dam') >= 0) {
      var wa = V.land.water;
      var dp = { x: clamp((wa.x0 + wa.x1) / 2, 40, 440), y: wa.y1 - 5, s: 0.68 };
      var de = makeEntity('dam', 'dam', dp, 58, 28);
      var od = prev['dam:dam:0'];
      de.born = od ? od.born : (animateNew ? V.t : -1);
      list.push(de);
    }

    ['hall', 'altar', 'granary', 'kiln', 'foundry', 'market', 'gate'].forEach(function (k) {
      if (V.built.indexOf(k) < 0) return;
      fixed('build', k, RESERVED[k], SPRITE_SIZE[k][0], SPRITE_SIZE[k][1]);
    });

    if (V.built.indexOf('well') >= 0) fixed('well', 'well', RESERVED.well, 14, 14);
    fixed('fire', 'fire', RESERVED.fire, 14, 8);

    for (var f = 0; f < V.fields; f++) {
      fixed('field', 'field', RESERVED['field' + f], 54, 16, null, f);
    }
    for (var l = 0; l < V.livestock; l++) {
      fixed('pen', 'pen', RESERVED['pen' + l], 30, 14, null, l);
    }

    var dwell = V.dwelling || 'pit';
    var n = clamp(1 + Math.floor(V.pop / 10), 1, 11);
    var ds = SPRITE_SIZE[dwell] || SPRITE_SIZE.pit;
    for (var d = 0; d < n; d++) {
      var e2 = placeHome(dwell, ds[0], ds[1], d);
      if (e2) e2.smoke = (d % 3 === 0);
    }

    list.sort(function (a, b) { return (a.y + (a.kind === 'field' ? -6 : 0)) - (b.y + (b.kind === 'field' ? -6 : 0)); });
    V.entities = list;
    syncPeople();
  }

  function currentDwelling() { return V.dwelling || 'pit'; }

  /* ---------- 人畜 ---------- */

  var TUNICS = ['#a8624a', '#8a7a4a', '#6a7a5a', '#7a5a6a', '#9a8a6a', '#5a6a7a', '#b08a5a'];

  function randomTarget() {
    var v = rnd(0.08, 0.99), u = rnd(-1.28, 1.28);
    return plot(u, v);
  }

  function syncPeople() {
    var want = clamp(2 + Math.floor(V.pop / 13), 2, 10);
    while (V.villagers.length < want) {
      var p = randomTarget(), t = randomTarget();
      V.villagers.push({
        x: p.x, y: p.y, tx: t.x, ty: t.y, sp: rnd(5, 11),
        frame: 0, phase: Math.random() * 6, dir: 1, wait: rnd(0, 2),
        tunic: pick(TUNICS), carry: Math.random() < 0.35, child: Math.random() < 0.22
      });
    }
    while (V.villagers.length > want) V.villagers.pop();

    var pens = V.entities.filter(function (e) { return e.kind === 'pen'; });
    var wantA = pens.length * 3;
    while (V.animals.length < wantA) {
      var pen = pens[V.animals.length % Math.max(1, pens.length)];
      if (!pen) break;
      V.animals.push({
        pen: pen.idx, x: pen.x + rnd(-10, 10), y: pen.y + rnd(-3, 3),
        hx: pen.x, hy: pen.y, tx: pen.x, ty: pen.y,
        sp: rnd(2, 4), wait: rnd(0, 3), phase: Math.random() * 6, dir: 1,
        kind: V.landId === 'D' ? (Math.random() < 0.5 ? 'sheep' : 'horse') : (Math.random() < 0.6 ? 'pig' : 'sheep')
      });
    }
    while (V.animals.length > wantA) V.animals.pop();
  }

  /* ---------- 资源 ---------- */

  function loadSprite(key, cb) {
    if (sprites[key]) { cb(); return; }
    var img = new Image();
    img.onload = function () { sprites[key] = img; spriteReady++; cb(); };
    img.onerror = function () { sprites[key] = null; spriteReady++; cb(); };
    img.src = 'assets/sprites/px/' + key + '.png';
  }

  function loadPlate(code, cb) {
    if (plates[code]) { cb(plates[code]); return; }
    var img = new Image();
    img.onload = function () { plates[code] = img; cb(img); };
    img.onerror = function () { plates[code] = null; cb(null); };
    img.src = 'assets/web/baked-' + code + '.png';
  }

  /* ---------- 绘制：底图与天光 ---------- */

  function drawPlate() {
    if (V.plate) {
      ctx.drawImage(V.plate, 0, 0);
    } else {
      var p = V.land ? V.land.palette : { sky: '#dfd8c0', far: '#b8a878', ground: '#a8763f' };
      var g = ctx.createLinearGradient(0, 0, 0, CH);
      g.addColorStop(0, p.sky); g.addColorStop(0.42, p.far); g.addColorStop(1, p.ground);
      ctx.fillStyle = g; ctx.fillRect(0, 0, CW, CH);
    }
  }

  function drawSkyLight(sk) {
    if (sk.stars > 0.02) {
      ctx.save();
      for (var i = 0; i < V.stars.length; i++) {
        var s = V.stars[i];
        var tw = 0.55 + 0.45 * Math.sin(V.t * s.tw + s.ph);
        ctx.fillStyle = 'rgba(255,252,235,' + (sk.stars * tw * s.a).toFixed(3) + ')';
        ctx.fillRect(s.x, s.y, 1, 1);
      }
      ctx.restore();
    }
    if (sk.orb && sk.orbA > 0.02) {
      var ox = sk.orb[0] * CW, oy = sk.orb[1] * (V.land ? V.land.view.skyY + 26 : 60);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      var rg = ctx.createRadialGradient(ox, oy, 0, ox, oy, sk.orb[3] * 5);
      rg.addColorStop(0, sk.orb[2]);
      rg.addColorStop(0.22, rgba([255, 230, 180], 0.34 * sk.orbA));
      rg.addColorStop(1, 'rgba(255,220,170,0)');
      ctx.globalAlpha = sk.orbA;
      ctx.fillStyle = rg;
      ctx.fillRect(ox - 50, oy - 50, 100, 100);
      ctx.globalAlpha = sk.orbA * 0.9;
      ctx.fillStyle = sk.orb[2];
      ctx.beginPath(); ctx.arc(ox, oy, sk.orb[3] * 0.5, 0, 6.2832); ctx.fill();
      ctx.restore();
    }
  }

  function drawCloudShadows(w) {
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    for (var i = 0; i < V.clouds.length; i++) {
      var c = V.clouds[i];
      var x = ((c.x + V.t * c.sp * (0.4 + w.wind)) % (CW + 260)) - 130;
      var a = c.a * (0.5 + w.fog * 0.6 + (V.skyTo === 'storm' ? 0.5 : 0));
      var g = ctx.createRadialGradient(x, c.y, 0, x, c.y, c.r);
      g.addColorStop(0, 'rgba(120,124,132,' + a.toFixed(3) + ')');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.save();
      ctx.translate(x, c.y); ctx.scale(1, 0.34); ctx.translate(-x, -c.y);
      ctx.fillRect(x - c.r, c.y - c.r, c.r * 2, c.r * 2);
      ctx.restore();
    }
    ctx.restore();
  }

  function drawWater(w) {
    var wa = V.land.water;
    if (!wa) return;
    var rise = V.flood * 22;
    var y0 = wa.y0, y1 = wa.y1 + rise;
    var cx = (wa.x0 + wa.x1) / 2;
    /* 内陆小水面（山地盆地的潭、黄土塬的湖）岸线是弧的，
       涨落必须顺着岸走，否则会在草地上贴出一块灰矩形 */
    var openL = wa.x0 <= 0, openR = wa.x1 >= CW;
    var ly = function (dy) { return openL ? wa.y1 + dy : wa.y1; };
    var ry = function (dy) { return openR ? wa.y1 + dy : wa.y1; };

    /* 从右岸画到左岸；两端是否跟着涨落，取决于水面是否通到画面外 */
    function shore(dy) {
      if (openL && openR) { ctx.lineTo(wa.x1, wa.y1 + dy); ctx.lineTo(wa.x0, wa.y1 + dy); return; }
      var mid = openL || openR ? dy * 1.6 : dy * 2;
      ctx.quadraticCurveTo(cx, wa.y1 + mid, wa.x0, ly(dy));
    }
    function basin(dy) {
      ctx.beginPath();
      ctx.moveTo(wa.x0, y0);
      ctx.lineTo(wa.x1, y0);
      ctx.lineTo(wa.x1, ry(dy));
      shore(dy);
      ctx.closePath();
    }

    ctx.save();
    basin(rise); ctx.clip();

    if (rise > 0.5) {
      ctx.fillStyle = rgba(hexRgb(V.land.palette.water), 0.58);
      ctx.fillRect(wa.x0, wa.y1 - 2, wa.x1 - wa.x0, rise + 3);
    }
    ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < 22; i++) {
      var yy = y0 + ((i * 7.3) % Math.max(1, y1 - y0));
      var depth = (yy - y0) / Math.max(1, y1 - y0);
      var len = 6 + depth * 26;
      var xx = ((i * 61 + Math.sin(V.t * 0.5 + i) * 22 + V.t * (3 + depth * 7)) % (CW + 60)) - 30;
      var a = (0.05 + 0.07 * Math.abs(Math.sin(V.t * 1.1 + i * 1.7))) * (1 - V.skyDark * 0.7);
      ctx.fillStyle = 'rgba(255,255,255,' + a.toFixed(3) + ')';
      ctx.fillRect(xx, yy, len, 1);
    }
    ctx.restore();

    /* 涨水漫过旧岸，枯水露出河床——灾年要看得见 */
    if (rise > 0.5) {
      var edge = mixArr(hexRgb(V.land.palette.water), [255, 255, 255], 0.4);
      ctx.save();
      ctx.strokeStyle = rgba(edge, 0.45 + 0.15 * Math.sin(V.t * 2));
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(wa.x1, ry(rise));
      shore(rise);
      ctx.stroke();
      ctx.restore();
    } else if (rise < -0.5) {
      var bed = mixArr(hexRgb(V.land.palette.groundAlt), hexRgb(V.land.palette.ground), 0.45);
      ctx.save();
      ctx.globalAlpha = Math.min(0.92, -rise / 9);
      ctx.beginPath();
      ctx.moveTo(wa.x1, ry(rise));
      shore(rise);
      ctx.lineTo(wa.x0, wa.y1);
      ctx.lineTo(wa.x1, wa.y1);
      ctx.closePath();
      ctx.clip();
      ctx.fillStyle = rgba(bed, 1);
      ctx.fillRect(wa.x0, wa.y1 + rise - 1, wa.x1 - wa.x0, -rise + 2);
      ctx.fillStyle = rgba(mixArr(bed, [40, 30, 20], 0.35), 1);
      for (var k = 0; k < 14; k++) {
        var cx2 = wa.x0 + ((k * 37) % Math.max(1, wa.x1 - wa.x0));
        ctx.fillRect(cx2, wa.y1 + rise + 1 + (k % 3), 4 + (k % 4), 1);
      }
      ctx.restore();
    }

    if (V.boat) {
      var b = V.boat;
      var bx = wa.x0 + ((b.p + V.t * b.sp) % 1) * (wa.x1 - wa.x0);
      var by = lerp(wa.y0 + 6, wa.y1 - 4, b.d) + rise * 0.6 + Math.sin(V.t * 1.4) * 0.6;
      var bs = 0.6 + b.d * 0.5;
      ctx.save();
      ctx.translate(bx, by); ctx.scale(bs, bs);
      ctx.fillStyle = 'rgba(20,24,30,0.22)'; ctx.fillRect(-7, 1, 14, 2);
      ctx.fillStyle = '#6a4a30'; ctx.fillRect(-7, -2, 14, 3);
      ctx.fillStyle = '#8a6a44'; ctx.fillRect(-6, -3, 12, 1);
      ctx.fillStyle = '#4a3a28'; ctx.fillRect(-1, -10, 1, 8);
      ctx.fillStyle = '#d8cdb4'; ctx.fillRect(0, -9, 4, 6);
      ctx.restore();
    }
  }

  function hexRgb(h) {
    if (!h) return [128, 128, 128];
    if (h.charAt(0) === '#') {
      var n = parseInt(h.slice(1), 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }
    return [128, 128, 128];
  }

  /* ---------- 绘制：聚落 ---------- */

  function drawShadow(x, y, w, s) {
    ctx.save();
    ctx.globalAlpha = 0.20 + V.skyDark * 0.10;
    ctx.fillStyle = '#2a2018';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.10 * s, y - 1, w * 0.46 * s, Math.max(1.6, w * 0.13 * s), 0, 0, 6.2832);
    ctx.fill();
    ctx.restore();
  }

  function drawSprite(e) {
    var img = sprites[e.key];
    var w = Math.max(4, Math.round(e.w * e.s));
    var h = Math.max(3, Math.round(e.h * e.s));
    var grow = e.born < 0 ? 1 : clamp((V.t - e.born) / 0.85, 0, 1);
    if (grow <= 0) return;
    var ease = 1 - Math.pow(1 - grow, 3);
    var dh = Math.max(1, Math.round(h * ease));
    var x = Math.round(e.x - w / 2), y = Math.round(e.y - dh);

    drawShadow(e.x, e.y, e.w, e.s * (0.5 + ease * 0.5));
    if (img) {
      ctx.drawImage(img, 0, img.height - Math.max(1, Math.round(img.height * ease)), img.width, Math.max(1, Math.round(img.height * ease)), x, y, w, dh);
    } else {
      ctx.fillStyle = '#8a6a44'; ctx.fillRect(x, y, w, dh);
    }

    if (grow < 1) {
      ctx.save();
      ctx.globalAlpha = 0.5 * (1 - grow);
      ctx.strokeStyle = '#d8c8a0'; ctx.lineWidth = 1;
      ctx.strokeRect(x - 1.5, Math.round(e.y - h) - 1.5, w + 3, h + 3);
      ctx.restore();
      if (Math.random() < 0.5) puff(e.x + rnd(-w / 2, w / 2), e.y, '#c8b894');
    }

    if (V.skyDark > 0.35 && (e.kind === 'home' || e.key === 'hall' || e.key === 'market')) {
      var a = (V.skyDark - 0.35) / 0.65;
      var flick = 0.75 + 0.25 * Math.sin(V.t * 3 + e.seed);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(255,186,96,' + (a * 0.85 * flick).toFixed(3) + ')';
      ctx.fillRect(Math.round(e.x - w * 0.16), Math.round(e.y - dh * 0.42), Math.max(1, Math.round(w * 0.14)), Math.max(1, Math.round(dh * 0.18)));
      var g = ctx.createRadialGradient(e.x, e.y - dh * 0.35, 0, e.x, e.y - dh * 0.35, w * 0.9);
      g.addColorStop(0, 'rgba(255,170,80,' + (a * 0.20 * flick).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(255,150,60,0)');
      ctx.fillStyle = g;
      ctx.fillRect(e.x - w, e.y - dh - w * 0.4, w * 2, dh + w);
      ctx.restore();
    }
  }

  function drawField(e) {
    var w = e.w * e.s, h = e.h * e.s;
    var x = e.x, y = e.y;
    var grow = e.born < 0 ? 1 : clamp((V.t - e.born) / 0.7, 0, 1);
    var pal = V.land.palette;
    var soil = hexRgb(pal.groundAlt), crop = hexRgb(pal.crop);
    var wq = weatherNow();
    if (wq.flood > 0.4) crop = mixArr(crop, hexRgb(pal.water), 0.6);
    else if (V.wTo === 'drought' || V.wTo === 'locust') crop = mixArr(crop, [150, 126, 70], 0.7);

    ctx.save();
    ctx.globalAlpha = grow;
    ctx.fillStyle = rgba(soil, 0.85);
    ctx.beginPath();
    ctx.moveTo(x - w * 0.38, y - h); ctx.lineTo(x + w * 0.38, y - h);
    ctx.lineTo(x + w * 0.5, y); ctx.lineTo(x - w * 0.5, y);
    ctx.closePath(); ctx.fill();

    var rows = 5;
    for (var r = 0; r < rows; r++) {
      var t = r / (rows - 1);
      var yy = y - h + t * h;
      var hw = w * (0.38 + t * 0.12);
      ctx.fillStyle = rgba(mixArr(soil, [0, 0, 0], 0.18), 0.5);
      ctx.fillRect(x - hw, yy, hw * 2, 1);
      var stalks = Math.round(hw * 0.9);
      for (var i = 0; i < stalks; i++) {
        var sx = x - hw + (i + 0.5) * (hw * 2 / stalks);
        var sway = Math.sin(V.t * 1.6 + i * 0.7 + r) * wq.wind * 0.9;
        var hh = (2 + t * 2.4) * grow;
        ctx.fillStyle = rgba(crop, 0.95);
        ctx.fillRect(Math.round(sx + sway), Math.round(yy - hh), 1, Math.max(1, Math.round(hh)));
      }
    }
    ctx.restore();
  }

  function drawWell(e) {
    var s = e.s, x = Math.round(e.x), y = Math.round(e.y);
    drawShadow(x, y, 14, s);
    ctx.save();
    ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = '#6a5a44'; ctx.fillRect(-6, -5, 12, 5);
    ctx.fillStyle = '#8a7a5c'; ctx.fillRect(-6, -6, 12, 2);
    ctx.fillStyle = '#2a3038'; ctx.fillRect(-4, -5, 8, 2);
    ctx.fillStyle = '#5a4630'; ctx.fillRect(-6, -14, 1, 9); ctx.fillRect(5, -14, 1, 9);
    ctx.fillStyle = '#7a5c3a'; ctx.fillRect(-7, -15, 14, 2);
    ctx.fillStyle = '#4a3a28'; ctx.fillRect(-1, -13, 1, 5);
    ctx.fillStyle = '#9a8a6a'; ctx.fillRect(-2, -9, 3, 3);
    ctx.restore();
  }

  function drawFire(e) {
    var x = e.x, y = e.y, s = e.s;
    var night = V.skyDark;
    var fl = 0.7 + 0.3 * Math.sin(V.t * 9 + e.seed) + 0.12 * Math.sin(V.t * 21);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    var r = (10 + night * 26) * s * fl;
    var g = ctx.createRadialGradient(x, y - 3 * s, 0, x, y - 3 * s, r);
    g.addColorStop(0, 'rgba(255,190,110,' + (0.30 + night * 0.42).toFixed(3) + ')');
    g.addColorStop(0.4, 'rgba(255,130,50,' + (0.12 + night * 0.18).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(255,110,40,0)');
    ctx.fillStyle = g; ctx.fillRect(x - r, y - 3 * s - r, r * 2, r * 2);
    ctx.restore();

    ctx.save();
    ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = '#3a2a1e'; ctx.fillRect(-5, -1, 10, 2);
    ctx.fillStyle = '#5a4028'; ctx.fillRect(-4, -2, 8, 1);
    var fh = 4 + fl * 3;
    ctx.fillStyle = '#e8622a'; ctx.fillRect(-2, -1 - fh, 4, fh);
    ctx.fillStyle = '#f8a63c'; ctx.fillRect(-1, -1 - fh * 0.8, 2, fh * 0.8);
    ctx.fillStyle = '#ffe08a'; ctx.fillRect(-1, -1 - fh * 0.4, 1, fh * 0.4);
    ctx.restore();

    if (Math.random() < 0.35) {
      V.parts.push({ k: 'spark', x: x + rnd(-2, 2), y: y - 6 * s, vx: rnd(-3, 3), vy: rnd(-14, -7), life: rnd(0.5, 1.1), age: 0, c: [255, 170, 70] });
    }
  }

  function drawPen(e) {
    var s = e.s, x = e.x, y = e.y;
    ctx.save();
    ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = 'rgba(60,48,32,0.22)'; ctx.fillRect(-15, -3, 30, 5);
    ctx.fillStyle = '#7a5c3a';
    for (var i = -14; i <= 14; i += 5) ctx.fillRect(i, -8, 1, 8);
    ctx.fillRect(-14, -7, 29, 1);
    ctx.fillRect(-14, -4, 29, 1);
    ctx.restore();
  }

  function drawAnimal(a) {
    var s = 0.56 + 0.44 * clamp((a.y - V.land.ground.y0) / (V.land.ground.y1 - V.land.ground.y0), 0, 1);
    var x = Math.round(a.x), y = Math.round(a.y);
    var bob = Math.sin(V.t * 4 + a.phase) * 0.5;
    ctx.save();
    ctx.globalAlpha = 0.2; ctx.fillStyle = '#2a2018';
    ctx.beginPath(); ctx.ellipse(x, y, 4 * s, 1.4 * s, 0, 0, 6.2832); ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.translate(x, y + bob); ctx.scale(s * a.dir, s);
    if (a.kind === 'pig') {
      ctx.fillStyle = '#c08a86'; ctx.fillRect(-4, -5, 8, 4);
      ctx.fillStyle = '#a87a76'; ctx.fillRect(3, -6, 3, 3);
      ctx.fillStyle = '#6a4a48'; ctx.fillRect(-3, -1, 1, 1); ctx.fillRect(2, -1, 1, 1);
    } else if (a.kind === 'horse') {
      ctx.fillStyle = '#7a5638'; ctx.fillRect(-5, -7, 10, 4);
      ctx.fillStyle = '#6a4a30'; ctx.fillRect(4, -10, 3, 4);
      ctx.fillStyle = '#4a3428'; ctx.fillRect(-4, -3, 1, 3); ctx.fillRect(3, -3, 1, 3);
      ctx.fillStyle = '#3a2a20'; ctx.fillRect(-6, -7, 1, 4);
    } else {
      ctx.fillStyle = '#ddd6c4'; ctx.fillRect(-4, -6, 8, 4);
      ctx.fillStyle = '#b8b0a0'; ctx.fillRect(3, -7, 3, 3);
      ctx.fillStyle = '#6a6458'; ctx.fillRect(-3, -2, 1, 2); ctx.fillRect(2, -2, 1, 2);
    }
    ctx.restore();
  }

  function drawVillager(p) {
    var g = V.land.ground;
    var v = clamp((p.y - g.y0) / (g.y1 - g.y0), 0, 1);
    var s = (0.56 + 0.44 * v) * (p.child ? 0.72 : 1);
    var x = Math.round(p.x), y = Math.round(p.y);
    var moving = p.wait <= 0;
    var step = moving ? (Math.floor(V.t * 7 + p.phase) % 2) : 0;

    ctx.save();
    ctx.globalAlpha = 0.22; ctx.fillStyle = '#2a2018';
    ctx.beginPath(); ctx.ellipse(x, y, 2.6 * s, 1.1 * s, 0, 0, 6.2832); ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(x, y); ctx.scale(s * p.dir, s);
    ctx.fillStyle = '#3a2c22';
    if (step) { ctx.fillRect(-2, -3, 1, 3); ctx.fillRect(1, -2, 1, 2); }
    else { ctx.fillRect(-1, -3, 1, 3); ctx.fillRect(0, -3, 1, 3); }
    ctx.fillStyle = p.tunic; ctx.fillRect(-2, -8, 4, 5);
    ctx.fillStyle = '#c99a6e'; ctx.fillRect(-2, -10, 4, 2);
    ctx.fillStyle = '#2e2119'; ctx.fillRect(-2, -11, 4, 1);
    ctx.fillStyle = '#c99a6e';
    ctx.fillRect(-3, -7 + (step ? 1 : 0), 1, 3);
    ctx.fillRect(2, -7 + (step ? 0 : 1), 1, 3);
    if (p.carry) { ctx.fillStyle = '#9a7a4a'; ctx.fillRect(2, -6, 2, 3); }
    ctx.restore();
  }

  function drawSmoke(dt, w) {
    for (var i = 0; i < V.entities.length; i++) {
      var e = V.entities[i];
      var emit = (e.kind === 'home' && e.smoke) || e.key === 'kiln' || e.key === 'foundry';
      if (!emit) continue;
      if (e.born >= 0 && V.t - e.born < 0.85) continue;
      var rate = e.key === 'kiln' || e.key === 'foundry' ? 5 : 1.6;
      if (Math.random() < rate * dt) {
        V.smoke.push({
          x: e.x + rnd(-2, 2) * e.s, y: e.y - e.h * e.s * 0.92,
          vx: rnd(-1, 1), vy: rnd(-7, -4), r: 1.2 * e.s,
          life: rnd(1.6, 3.0), age: 0, dark: e.key === 'foundry' ? 0.55 : 0.28
        });
      }
    }
    for (var j = V.smoke.length - 1; j >= 0; j--) {
      var s = V.smoke[j];
      s.age += dt;
      if (s.age >= s.life) { V.smoke.splice(j, 1); continue; }
      s.x += (s.vx + w.wind * 7) * dt;
      s.y += s.vy * dt;
      s.r += dt * 2.4;
      var a = (1 - s.age / s.life) * 0.34;
      var c = s.dark > 0.4 ? [70, 66, 62] : [206, 200, 188];
      ctx.fillStyle = rgba(c, a * (1 - V.skyDark * 0.45));
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.2832); ctx.fill();
    }
    if (V.smoke.length > 160) V.smoke.splice(0, V.smoke.length - 160);
  }

  function puff(x, y, col) {
    var c = hexRgb(col);
    for (var i = 0; i < 3; i++) {
      V.parts.push({ k: 'dust', x: x, y: y, vx: rnd(-10, 10), vy: rnd(-12, -2), life: rnd(0.4, 0.9), age: 0, c: c, r: rnd(1, 2.4) });
    }
  }

  /* ---------- 绘制：天气 ---------- */

  function spawnWeather(dt, w) {
    function n(count) { return Math.random() < count * dt ? 1 : (Math.floor(count * dt)); }
    var i;
    for (i = 0; i < n(w.rain); i++) {
      V.parts.push({ k: 'rain', x: rnd(-40, CW + 20), y: rnd(-30, -2), vx: -34 * w.wind, vy: rnd(210, 280), life: 2, age: 0 });
    }
    for (i = 0; i < n(w.snow); i++) {
      V.parts.push({ k: 'snow', x: rnd(-20, CW + 20), y: rnd(-20, -2), vx: rnd(-6, 6), vy: rnd(16, 30), life: 12, age: 0, ph: Math.random() * 6 });
    }
    for (i = 0; i < n(w.dust); i++) {
      V.parts.push({ k: 'dust', x: rnd(-30, CW), y: rnd(TOP + 20, CH), vx: rnd(14, 40) * w.wind, vy: rnd(-5, 3), life: rnd(1.4, 3), age: 0, c: [200, 176, 128], r: rnd(0.7, 1.8) });
    }
    for (i = 0; i < n(w.bug); i++) {
      V.parts.push({ k: 'bug', x: rnd(-30, CW + 30), y: rnd(TOP, CH - 40), vx: rnd(24, 60) * w.wind, vy: rnd(-8, 8), life: rnd(2, 4), age: 0, ph: Math.random() * 6 });
    }
    for (i = 0; i < n(w.ember); i++) {
      V.parts.push({ k: 'spark', x: rnd(0, CW), y: rnd(CH - 70, CH), vx: rnd(-6, 16) * w.wind, vy: rnd(-26, -10), life: rnd(1.2, 2.4), age: 0, c: [255, 140, 60] });
    }
    if (V.parts.length > 600) V.parts.splice(0, V.parts.length - 600);
  }

  function drawParts(dt, w) {
    var i, p, a;
    for (i = V.parts.length - 1; i >= 0; i--) {
      p = V.parts[i];
      p.age += dt;
      if (p.age >= p.life || p.y > CH + 12 || p.x > CW + 60 || p.x < -60) { V.parts.splice(i, 1); continue; }
      if (p.k === 'rain') {
        p.x += p.vx * dt; p.y += p.vy * dt;
        ctx.strokeStyle = 'rgba(190,214,235,0.42)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.022, p.y - p.vy * 0.022); ctx.stroke();
        if (p.y > BOTTOM - 6 && Math.random() < 0.06) {
          V.parts.push({ k: 'splash', x: p.x, y: p.y, vx: 0, vy: 0, life: 0.22, age: 0 });
        }
      } else if (p.k === 'splash') {
        a = 1 - p.age / p.life;
        ctx.strokeStyle = 'rgba(210,228,240,' + (a * 0.4).toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(p.x, p.y, 1 + (1 - a) * 3, Math.PI, 0); ctx.stroke();
      } else if (p.k === 'snow') {
        p.x += (p.vx + Math.sin(V.t * 1.4 + p.ph) * 7 + w.wind * 8) * dt; p.y += p.vy * dt;
        ctx.fillStyle = 'rgba(248,250,255,0.85)';
        ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
      } else if (p.k === 'dust') {
        p.x += p.vx * dt; p.y += p.vy * dt;
        a = (1 - p.age / p.life) * 0.5;
        ctx.fillStyle = rgba(p.c, a);
        ctx.fillRect(Math.round(p.x), Math.round(p.y), Math.max(1, p.r | 0), Math.max(1, p.r | 0));
      } else if (p.k === 'bug') {
        p.x += p.vx * dt; p.y += (p.vy + Math.sin(V.t * 12 + p.ph) * 22) * dt;
        ctx.fillStyle = 'rgba(60,50,26,0.85)';
        ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 1);
        ctx.fillStyle = 'rgba(190,180,140,0.45)';
        ctx.fillRect(Math.round(p.x), Math.round(p.y) - 1, 2, 1);
      } else if (p.k === 'spark') {
        p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 6 * dt;
        a = 1 - p.age / p.life;
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = rgba(p.c, a * 0.9);
        ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
        ctx.restore();
      }
    }
  }

  function drawFog(w) {
    if (w.fog < 0.02) return;
    ctx.save();
    for (var i = 0; i < 4; i++) {
      var y = 70 + i * 34 + Math.sin(V.t * 0.22 + i) * 5;
      var x = ((V.t * (4 + i * 2) * (0.3 + w.wind)) % (CW + 300)) - 150;
      var g = ctx.createLinearGradient(x - 150, 0, x + 150, 0);
      var a = w.fog * (0.10 + i * 0.035);
      g.addColorStop(0, 'rgba(226,230,224,0)');
      g.addColorStop(0.5, 'rgba(226,230,224,' + a.toFixed(3) + ')');
      g.addColorStop(1, 'rgba(226,230,224,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, y - 14, CW, 28);
    }
    ctx.restore();
  }

  function drawBirds(dt) {
    if (V.skyDark > 0.5 || V.wTo === 'storm' || V.wTo === 'snow') return;
    if (V.birds.length < 3 && Math.random() < dt * 0.25) {
      var dir = Math.random() < 0.5 ? 1 : -1;
      V.birds.push({ x: dir > 0 ? -20 : CW + 20, y: rnd(34, 78), vx: dir * rnd(14, 26), ph: Math.random() * 6, n: 2 + ((Math.random() * 3) | 0) });
    }
    for (var i = V.birds.length - 1; i >= 0; i--) {
      var b = V.birds[i];
      b.x += b.vx * dt;
      if (b.x < -40 || b.x > CW + 40) { V.birds.splice(i, 1); continue; }
      for (var k = 0; k < b.n; k++) {
        var bx = b.x - k * 7 * Math.sign(b.vx), by = b.y + k * 3 + Math.sin(V.t * 0.8 + b.ph) * 2;
        var flap = Math.sin(V.t * 7 + b.ph + k) > 0 ? 1 : 0;
        ctx.fillStyle = 'rgba(46,42,38,0.55)';
        ctx.fillRect(bx, by, 1, 1);
        ctx.fillRect(bx - 1, by - flap, 1, 1);
        ctx.fillRect(bx + 1, by - flap, 1, 1);
      }
    }
  }

  function drawFireflies(dt) {
    var night = V.skyDark;
    if (night < 0.4) { V.fireflies.length = 0; return; }
    while (V.fireflies.length < 14) {
      V.fireflies.push({ x: rnd(20, CW - 20), y: rnd(BOTTOM - 60, BOTTOM + 20), ph: Math.random() * 6, sp: rnd(0.4, 1.2), r: rnd(10, 26), cx: rnd(20, CW - 20), cy: rnd(BOTTOM - 50, BOTTOM + 10) });
    }
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < V.fireflies.length; i++) {
      var f = V.fireflies[i];
      var x = f.cx + Math.cos(V.t * f.sp + f.ph) * f.r;
      var y = f.cy + Math.sin(V.t * f.sp * 1.3 + f.ph) * f.r * 0.4;
      var a = Math.max(0, Math.sin(V.t * 2.2 + f.ph)) * (night - 0.4) / 0.6;
      if (a < 0.03) continue;
      ctx.fillStyle = 'rgba(200,255,150,' + (a * 0.85).toFixed(3) + ')';
      ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
      ctx.fillStyle = 'rgba(180,240,120,' + (a * 0.18).toFixed(3) + ')';
      ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3);
    }
    ctx.restore();
  }

  /* ---------- 主循环 ---------- */

  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (!ctx || !V.land) return;
    var dt = lastT ? Math.min(0.05, (now - lastT) / 1000) : 0.016;
    lastT = now;
    if (V.paused) return;
    V.t += dt;
    updateActors(dt);

    if (V.skyT < 1) V.skyT = Math.min(1, V.skyT + dt / 1.4);
    if (V.wT < 1) V.wT = Math.min(1, V.wT + dt / 1.1);

    var sk = skyNow(), w = weatherNow();
    V.skyDark = sk.dark;
    V.flood += (w.flood - V.flood) * Math.min(1, dt * 0.7);

    if (w.bolt > 0.3) {
      V.boltTimer -= dt;
      if (V.boltTimer <= 0) { V.bolt = 1; V.boltTimer = rnd(3.5, 9); }
    }
    if (V.bolt > 0) V.bolt = Math.max(0, V.bolt - dt * 4.5);

    var sx = 0, sy = 0;
    if (V.shake > 0.01) {
      sx = rnd(-1, 1) * V.shake; sy = rnd(-1, 1) * V.shake;
      V.shake *= Math.pow(0.0016, dt);
    } else V.shake = 0;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, CW, CH);
    ctx.save();
    ctx.translate(Math.round(sx), Math.round(sy));

    drawPlate();
    drawSkyLight(sk);
    drawCloudShadows(w);
    drawWater(w);
    drawBirds(dt);

    /* 天光压色 */
    if (sk.mul[3] > 0.005) {
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = rgba(sk.mul, sk.mul[3]);
      ctx.fillRect(-4, -4, CW + 8, CH + 8);
      ctx.restore();
    }
    if (sk.add[3] > 0.005) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      var ag = ctx.createLinearGradient(0, 0, 0, CH);
      ag.addColorStop(0, rgba(sk.add, sk.add[3]));
      ag.addColorStop(0.55, rgba(sk.add, sk.add[3] * 0.5));
      ag.addColorStop(1, rgba(sk.add, sk.add[3] * 0.18));
      ctx.fillStyle = ag; ctx.fillRect(-4, -4, CW + 8, CH + 8);
      ctx.restore();
    }
    if (w.tint && w.tintA > 0.02) {
      ctx.save();
      ctx.globalAlpha = w.tintA;
      ctx.fillStyle = rgba(w.tint, w.tint[3]);
      ctx.fillRect(-4, -4, CW + 8, CH + 8);
      ctx.restore();
    }
    if (V.wTo === 'snow' && V.wT > 0.3) {
      ctx.save();
      ctx.globalAlpha = 0.30 * V.wT;
      ctx.fillStyle = '#e8eef6';
      ctx.fillRect(0, V.land.ground.y0 - 8, CW, CH - V.land.ground.y0 + 8);
      ctx.restore();
    }

    /* 聚落 */
    var i, e;
    for (i = 0; i < V.entities.length; i++) {
      e = V.entities[i];
      if (e.kind === 'field') drawField(e);
      else if (e.kind === 'pen') drawPen(e);
    }
    var actors = [];
    for (i = 0; i < V.entities.length; i++) {
      e = V.entities[i];
      if (e.kind === 'field' || e.kind === 'pen') continue;
      actors.push({ y: e.y, draw: drawEntity, o: e });
    }
    for (i = 0; i < V.animals.length; i++) actors.push({ y: V.animals[i].y, draw: drawAnimal, o: V.animals[i] });
    for (i = 0; i < V.villagers.length; i++) actors.push({ y: V.villagers[i].y, draw: drawVillager, o: V.villagers[i] });
    actors.sort(function (a, b) { return a.y - b.y; });
    for (i = 0; i < actors.length; i++) actors[i].draw(actors[i].o);

    drawSmoke(dt, w);
    drawFog(w);
    spawnWeather(dt, w);
    drawParts(dt, w);
    drawFireflies(dt);

    /* 近景压暗，做出景深 */
    var vg = ctx.createLinearGradient(0, BOTTOM - 26, 0, CH);
    vg.addColorStop(0, 'rgba(12,10,8,0)');
    vg.addColorStop(1, 'rgba(12,10,8,' + (0.30 + sk.dark * 0.2).toFixed(3) + ')');
    ctx.fillStyle = vg; ctx.fillRect(0, BOTTOM - 26, CW, CH - BOTTOM + 26);

    if (V.bolt > 0.02) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(200,220,255,' + (V.bolt * 0.42).toFixed(3) + ')';
      ctx.fillRect(0, 0, CW, CH);
      ctx.restore();
    }
    if (V.flash > 0.01) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = rgba(V.flashCol, V.flash * 0.34);
      ctx.fillRect(0, 0, CW, CH);
      ctx.restore();
      V.flash *= Math.pow(0.0009, dt);
    }

    if (V.debug) drawDebug();
    ctx.restore();
  }

  function drawEntity(e) {
    if (e.kind === 'well') drawWell(e);
    else if (e.kind === 'fire') drawFire(e);
    else drawSprite(e);
  }

  function drawDebug() {
    var g = V.land.ground;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,80,80,0.9)'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(g.cx - g.w0, g.y0); ctx.lineTo(g.cx + g.w0, g.y0);
    ctx.lineTo(g.cx + g.w1, g.y1); ctx.lineTo(g.cx - g.w1, g.y1);
    ctx.closePath(); ctx.stroke();
    ctx.strokeStyle = 'rgba(80,220,255,0.7)';
    ctx.strokeRect(0.5, TOP + 0.5, CW - 1, BOTTOM - TOP - 1);
    ctx.fillStyle = 'rgba(255,220,80,0.9)';
    for (var i = 0; i < V.entities.length; i++) {
      ctx.fillRect(V.entities[i].x - 1, V.entities[i].y - 1, 2, 2);
    }
    ctx.restore();
  }

  function updateActors(dt) {
    var i, p;
    for (i = 0; i < V.villagers.length; i++) {
      p = V.villagers[i];
      if (p.wait > 0) { p.wait -= dt; continue; }
      var dx = p.tx - p.x, dy = p.ty - p.y;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d < 1.5) {
        var t = randomTarget();
        p.tx = t.x; p.ty = t.y; p.wait = rnd(0.4, 2.6);
        continue;
      }
      var sp = p.sp * dt;
      p.x += dx / d * sp; p.y += dy / d * sp;
      if (Math.abs(dx) > 0.4) p.dir = dx > 0 ? 1 : -1;
    }
    for (i = 0; i < V.animals.length; i++) {
      p = V.animals[i];
      if (p.wait > 0) { p.wait -= dt; continue; }
      var ax = p.tx - p.x, ay = p.ty - p.y;
      var ad = Math.sqrt(ax * ax + ay * ay);
      if (ad < 1) {
        p.tx = p.hx + rnd(-11, 11); p.ty = p.hy + rnd(-3, 3); p.wait = rnd(1, 4);
        continue;
      }
      p.x += ax / ad * p.sp * dt; p.y += ay / ad * p.sp * dt;
      if (Math.abs(ax) > 0.3) p.dir = ax > 0 ? 1 : -1;
    }
  }

  /* ---------- 对外 ---------- */

  var Scene = {
    init: function (cv) {
      canvas = cv;
      canvas.width = CW; canvas.height = CH;
      ctx = canvas.getContext('2d', { alpha: false });
      ctx.imageSmoothingEnabled = false;
      for (var i = 0; i < 70; i++) {
        V.stars.push({ x: rnd(0, CW) | 0, y: rnd(2, 60) | 0, a: rnd(0.35, 1), tw: rnd(1.2, 3.4), ph: Math.random() * 6 });
      }
      for (var c = 0; c < 4; c++) {
        V.clouds.push({ x: rnd(0, CW + 260), y: rnd(50, 170), r: rnd(60, 130), sp: rnd(3, 9), a: rnd(0.10, 0.22) });
      }
      Object.keys(SPRITE_SIZE).forEach(function (k) { loadSprite(k, function () {}); });
      document.addEventListener('visibilitychange', function () {
        V.hidden = document.hidden;
        lastT = 0;
      });
      return Scene;
    },

    setLand: function (code, cb) {
      V.landId = code;
      V.land = Z.LANDS[code];
      V.entities = []; V.villagers = []; V.animals = []; V.parts = []; V.smoke = [];
      V.fireflies = []; V.birds = [];
      V.boat = (code === 'C' || code === 'E' || code === 'A')
        ? { p: Math.random(), sp: 0.012, d: rnd(0.35, 0.8) } : null;
      loadPlate(code, function (img) {
        V.plate = img;
        V.ready = true;
        rebuild(false);
        if (cb) cb();
      });
    },

    sync: function (state, animateNew) {
      if (!state || !state.landId) return;
      if (state.landId !== V.landId) { Scene.setLand(state.landId); }
      V.dwelling = Z.dwellingKey(state.settlementId, state.landId);
      V.pop = state.stats.pop;
      V.built = state.built.slice();
      V.fields = state.fields;
      V.livestock = state.livestock;
      V.act = state.act;
      rebuild(animateNew !== false);
    },

    preview: function (landCode, settlementId, pop) {
      if (landCode !== V.landId) Scene.setLand(landCode);
      V.dwelling = Z.dwellingKey(settlementId, landCode);
      V.pop = pop || 30;
      V.built = [V.dwelling];
      V.fields = 0; V.livestock = 0;
      rebuild(false);
    },

    setSky: function (key) {
      if (!SKIES[key] || key === V.skyTo) return;
      V.skyFrom = V.skyT >= 1 ? V.skyTo : V.skyFrom;
      V.skyTo = key;
      V.skyT = V.skyFrom === key ? 1 : 0;
    },

    setWeather: function (key) {
      if (!WEATHER[key]) key = 'clear';
      if (key === V.wTo) return;
      V.wFrom = V.wT >= 1 ? V.wTo : V.wFrom;
      V.wTo = key;
      V.wT = V.wFrom === key ? 1 : 0;
      V.boltTimer = rnd(1.5, 4);
    },

    flash: function (kind) {
      V.flash = 1;
      V.flashCol = kind === 'bad' ? [220, 70, 50] : kind === 'build' ? [255, 210, 130] : [150, 230, 170];
    },

    shake: function (amount) { V.shake = Math.max(V.shake, amount || 3); },

    celebrate: function () {
      for (var i = 0; i < 40; i++) {
        V.parts.push({
          k: 'spark', x: rnd(60, CW - 60), y: rnd(BOTTOM - 40, BOTTOM),
          vx: rnd(-14, 14), vy: rnd(-46, -22), life: rnd(1.2, 2.4), age: 0,
          c: pick([[255, 214, 130], [255, 170, 90], [200, 240, 180]])
        });
      }
    },

    start: function () {
      if (V.running) return;
      V.running = true; lastT = 0;
      raf = requestAnimationFrame(frame);
    },
    stop: function () { V.running = false; if (raf) cancelAnimationFrame(raf); raf = 0; },
    pause: function (p) { V.paused = !!p; lastT = 0; },
    setDebug: function (d) { V.debug = !!d; },
    tick: function (dt) { updateActors(dt); },
    stats: function () { return { entities: V.entities.length, parts: V.parts.length, people: V.villagers.length }; },
    snapshot: function () { try { return canvas.toDataURL('image/png'); } catch (e) { return null; } }
  };

  Z.Scene = Scene;
})();