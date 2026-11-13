(function () {
  'use strict';
  var Z = window.ZSX = window.ZSX || {};

  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
  function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

  function shuffle(list) {
    for (var i = list.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = list[i];
      list[i] = list[j];
      list[j] = t;
    }
    return list;
  }

  function land(state) { return Z.LANDS[state.landId] || Z.LANDS.A; }
  function actDef(state) { return Z.ACTS[state.act - 1] || Z.ACTS[0]; }
  function findSettlement(id) { return Z.SETTLEMENT_BY_ID[id] || null; }
  function has(state, key) { return !!state.ach[key]; }

  /* ---------- 上限：地块硬瓶颈 + 建筑增益 ---------- */

  function visibleCaps(state) {
    var L = land(state);
    var st = findSettlement(state.settlementId);
    var locked = L.code === 'E';
    var popCap = L.caps.pop + (!locked && st && st.popCap ? st.popCap : 0);
    if (!locked && has(state, 'wall')) popCap += 8;

    var foodCap = L.caps.food;
    if (L.code === 'C' && state.act >= 2) foodCap = Math.min(foodCap, state.ceilingBroken ? 90 : 78);
    if (L.code === 'F') foodCap = Math.min(foodCap, state.ceilingBroken ? 75 : 60);
    if (!locked && has(state, 'granary')) foodCap += 10;
    foodCap -= state.siltPenalty;

    return {
      pop: clamp(popCap, 20, 120),
      food: clamp(foodCap, 30, 120),
      morale: 100,
      craft: 100
    };
  }

  function statMax(state, key) {
    if (key === 'K' || key === 'W' || key === 'R') return 100;
    return visibleCaps(state)[key];
  }

  /* ---------- 收益折损：孤立线 / 狭地 / 地力衰减 / 封闭 ---------- */

  function fatigueActive(state) {
    return !(has(state, 'rice') || has(state, 'herd') || state.fallow);
  }

  function gainScale(state, key, tag) {
    var L = land(state);
    var s = 1;
    if (state.isolated && state.act === 5) s *= Z.ISOLATION.outputScale;
    /* 关起门来，交融只能靠门口那点互市，涨不上去 */
    if (key === 'K' && state.isolated && state.act >= 4) s *= 0.4;
    if (key === 'food' && L.code === 'E' && (tag === '农' || tag === '治水')) s *= 0.5;
    if (key === 'food' && L.code === 'B' && state.act >= 3 && fatigueActive(state)) s *= 0.6;
    if (key === 'K' && L.code === 'F') s *= 0.5;
    return s;
  }

  function applyEffects(state, effects, out, tag) {
    if (!effects) return;
    Object.keys(effects).forEach(function (key) {
      var value = effects[key];
      if (!value) return;
      var before = state.stats[key];
      if (typeof before !== 'number') return;
      if (value > 0) value = Math.round(value * gainScale(state, key, tag));
      if (!value) return;
      var after = clamp(before + value, 0, statMax(state, key));
      state.stats[key] = after;
      var actual = after - before;
      if (actual !== 0) out[key] = (out[key] || 0) + actual;
    });
  }

  function checkCollapse(state) {
    var s = state.stats;
    var cause = null;
    if (s.food <= 0) cause = 'food';
    else if (s.morale <= 0) cause = 'morale';
    else if (s.pop <= 0) cause = 'pop';
    else if (s.craft <= 0) cause = 'craft';
    if (cause) {
      state.collapse = cause;
      state.phase = 'ending';
      state.ending = Z.judgeEnding(summary(state)).ending.id;
    }
    return cause;
  }

  /* ---------- 已建之物抗灾：聚落越完整，越扛得住 ---------- */

  var GUARDS = {
    flood: [{ built: 'dam', mul: 0.50, name: '堤防' }, { ach: 'irrigation', mul: 0.60, name: '沟洫' }, { ach: 'calendar', mul: 0.80, name: '农时' }],
    drought: [{ built: 'dam', mul: 0.60, name: '蓄水' }, { built: 'well', mul: 0.80, name: '水井' }, { ach: 'calendar', mul: 0.75, name: '历法' }],
    land: [{ fields: 2, mul: 0.60, name: '熟田' }, { fallow: true, mul: 0.65, name: '休耕' }, { built: 'granary', mul: 0.75, name: '仓廪' }],
    plague: [{ ach: 'searoute', mul: 0.50, name: '海路药草' }, { moved: true, mul: 0.60, name: '迁高' }, { built: 'well', mul: 0.75, name: '洁水' }],
    white: [{ built: 'granary', mul: 0.50, name: '存粮' }, { ach: 'herd', mul: 0.65, name: '畜群' }, { livestock: 2, mul: 0.75, name: '牧栏' }],
    locust: [{ ach: 'calendar', mul: 0.60, name: '知蝗时' }, { built: 'granary', mul: 0.70, name: '仓廪' }],
    raid: [{ built: 'wall', mul: 0.45, name: '城垣' }, { ach: 'cavalry', mul: 0.60, name: '骑射' }, { ach: 'chariot', mul: 0.70, name: '车战' }],
    quake: [{ built: 'wall', mul: 0.70, name: '夯土' }, { built: 'altar', mul: 0.85, name: '祭地' }],
    storm: [{ built: 'dam', mul: 0.65, name: '海塘' }, { built: 'wall', mul: 0.75, name: '城垣' }],
    revolt: [{ ach: 'rites', mul: 0.55, name: '礼乐' }, { built: 'hall', mul: 0.75, name: '议事之堂' }, { ach: 'writing', mul: 0.85, name: '文书' }],
    rites: [{ ach: 'rites', mul: 0.50, name: '礼乐有素' }, { ach: 'writing', mul: 0.70, name: '典籍' }, { built: 'altar', mul: 0.85, name: '宗庙' }]
  };

  function guardFor(state, crisisId) {
    var rules = GUARDS[crisisId];
    if (!rules) return { mul: 1, names: [] };
    var mul = 1, names = [];
    rules.forEach(function (r) {
      var ok = r.built ? state.built.indexOf(r.built) >= 0
        : r.ach ? has(state, r.ach)
        : r.fields ? state.fields >= r.fields
        : r.livestock ? state.livestock >= r.livestock
        : r.fallow ? state.fallow
        : r.moved ? state.moved > 0 : false;
      if (ok) { mul *= r.mul; names.push(r.name); }
    });
    return { mul: Math.max(0.25, mul), names: names };
  }

  function soften(effects, mul) {
    var out = {};
    Object.keys(effects).forEach(function (k) {
      var v = effects[k];
      out[k] = v < 0 ? -Math.round(-v * mul) : v;
    });
    return out;
  }

  /* ---------- 建成之物，每回合自然生息 ---------- */

  var BUILD_INCOME = {
    well: { morale: 1 },
    dam: { food: 1 },
    kiln: { craft: 1 },
    granary: { food: 2 },
    market: { food: 1, craft: 1 },
    foundry: { craft: 1 },
    altar: { R: 1 },
    hall: { morale: 1 },
    wall: { R: 1 }
  };

  /* 聚落随世代长出公共建筑：不是玩家点的，是族人自己盖的 */
  function growCivic(state, notes) {
    if (state.act >= 2 && state.built.indexOf('hall') < 0) {
      state.built.push('hall');
      notes.push({ kind: 'build', name: '议事之堂', text: '火塘边已经站不下这么多人。聚落正中立起了大屋，有事在此议。' });
    }
    if (state.act >= 3 && state.built.indexOf('gate') < 0) {
      state.built.push('gate');
      notes.push({ kind: 'build', name: '聚落之门', text: '出入的人杂了，路口立起了门。从此这里有了内外之分。' });
    }
  }

  /* ---------- 状态 ---------- */

  function createState() {
    return {
      version: 2,
      phase: 'select',
      landId: null,
      scouted: [],
      settlementId: null,
      settlementDeltas: null,
      mismatch: false,
      act: 1,
      turn: 1,
      gturn: 1,
      stats: { pop: 46, food: 48, morale: 55, craft: 40, K: 5, W: 0, R: 0 },
      flags: [],
      currentCrisis: null,
      guard: null,
      turnStartDeltas: null,
      bottleneckNotes: [],
      hand: [],
      rerollsLeft: 1,
      lastRerollDeltas: null,
      lastResolution: null,
      history: [],
      routeCount: {},
      ach: {},
      built: [],
      fields: 0,
      livestock: 0,
      siltPenalty: 0,
      lastWaterTurn: 0,
      ceilingBroken: false,
      fallow: false,
      moved: 0,
      crisisLog: [],
      actStars: [],
      actEnd: null,
      partners: [],
      diploResolved: false,
      diploDeltas: null,
      diploDelayed: null,
      coverage: null,
      isolated: false,
      collapse: null,
      ending: null,
      endingNear: false,
      route: null,
      stars: 0
    };
  }

  function chooseLand(state, landId) {
    var L = Z.LANDS[landId];
    if (!L || !L.playable) return false;
    state.landId = landId;
    state.stats.K = L.start && typeof L.start.K === 'number' ? L.start.K : 5;
    state.phase = 'founding';
    return true;
  }

  function scout(state, hotspotId) {
    if (state.scouted.indexOf(hotspotId) >= 0) return null;
    var spots = Z.SCOUT_BY_LAND[state.landId] || [];
    var spot = null;
    for (var i = 0; i < spots.length; i++) {
      if (spots[i].id === hotspotId) { spot = spots[i]; break; }
    }
    if (!spot) return null;
    state.scouted.push(hotspotId);
    var deltas = {};
    applyEffects(state, spot.effect, deltas);
    return { spot: spot, deltas: deltas };
  }

  function selectSettlement(state, id) {
    if (!findSettlement(id)) return false;
    state.settlementId = id;
    return true;
  }

  function confirmSettlement(state) {
    var st = findSettlement(state.settlementId);
    if (!st) return false;
    var deltas = {};
    applyEffects(state, st.effects, deltas);
    state.settlementDeltas = deltas;
    state.mismatch = st.fit.indexOf(state.landId) < 0;
    if (state.mismatch && st.mismatch) {
      state.flags.push({
        id: st.mismatch.id,
        name: st.mismatch.name || '居所失宜',
        turns: st.mismatch.turns,
        effects: clone(st.mismatch.effects)
      });
    }
    state.built.push(Z.dwellingKey(st.id, state.landId));
    state.act = 1;
    state.turn = 1;
    state.gturn = 1;
    startTurn(state);
    return true;
  }

  /* ---------- 抽卡 ---------- */

  function drawHand(state, exclude) {
    var played = state.history.map(function (h) { return h.cardId; });
    var all = (Z.ACT_ACTIONS[state.act] || []).map(function (c) { return c.id; });
    var pool = all.filter(function (id) {
      return played.indexOf(id) < 0 && (!exclude || exclude.indexOf(id) < 0);
    });
    if (pool.length < 3) pool = all.filter(function (id) { return played.indexOf(id) < 0; });
    if (pool.length < 3) pool = all.slice();

    function foodOf(id) { return Z.CARD_BY_ID[id].effects.food || 0; }
    function moraleOf(id) { return Z.CARD_BY_ID[id].effects.morale || 0; }
    function pick(list) { return list[Math.floor(Math.random() * list.length)]; }

    var hand;
    for (var attempt = 0; attempt < 8; attempt++) {
      shuffle(pool);
      hand = pool.slice(0, 3);
      var fresh = function (id) { return hand.indexOf(id) < 0; };
      var unplayed = function (id) { return played.indexOf(id) < 0; };

      /* 每幕尽量给一张能起新建筑的卡，聚落才看得见地长 */
      if (!hand.some(function (id) { return Z.CARD_BY_ID[id].build; })) {
        var buildable = all.filter(function (id) {
          var c = Z.CARD_BY_ID[id];
          return c.build && state.built.indexOf(c.build) < 0 && unplayed(id) && fresh(id);
        });
        if (buildable.length) hand[0] = pick(buildable);
      }

      /* 手里永远留一条活路：至少一策能补粮，至少一策不伤民心 */
      if (!hand.some(function (id) { return foodOf(id) >= 8; })) {
        var food = all.filter(function (id) { return fresh(id) && unplayed(id) && foodOf(id) >= 8; });
        if (!food.length) food = all.filter(function (id) { return fresh(id) && foodOf(id) >= 8; });
        if (!food.length) {
          food = Z.ACTIONS.filter(function (c) {
            return fresh(c.id) && unplayed(c.id) && (c.effects.food || 0) >= 8;
          }).map(function (c) { return c.id; });
        }
        if (food.length) hand[2] = pick(food);
      }
      if (!hand.some(function (id) { return moraleOf(id) >= 0; })) {
        var calm = all.filter(function (id) {
          return fresh(id) && unplayed(id) && moraleOf(id) >= 2 && foodOf(id) >= 0;
        });
        if (calm.length) hand[1] = pick(calm);
      }
      if (!exclude || handKey(hand) !== handKey(exclude)) break;
    }
    return hand;
  }

  function handKey(hand) { return hand.slice().sort().join('|'); }

  function pickCrisis(state) {
    if (state.act === 1) return Z.ACT1_EVENTS[state.turn - 1];
    if (state.act === 5 && state.turn === actDef(state).turns) return 'rites';

    var L = land(state);
    var counts = {};
    state.crisisLog.forEach(function (id) { counts[id] = (counts[id] || 0) + 1; });
    var prev = state.crisisLog[state.crisisLog.length - 1];

    var bag = [];
    Object.keys(Z.CRISES).forEach(function (id) {
      var c = Z.CRISES[id];
      if (c.acts.indexOf(state.act) < 0) return;
      if (id === prev) return;
      if ((counts[id] || 0) >= 2) return;
      if (id === 'bronze' && !has(state, 'bronze')) return;
      if (id === 'ceiling' && state.ceilingBroken) return;
      var w = L.crisisWeight[id] || 1;
      if (id === 'flood' && has(state, 'irrigation')) w = Math.max(1, w - 1);
      for (var i = 0; i < w; i++) bag.push(id);
    });
    if (!bag.length) bag = ['land'];
    return bag[Math.floor(Math.random() * bag.length)];
  }

  /* ---------- 地块硬瓶颈，逐回合结算 ---------- */

  function bottleneckTick(state, deltas, notes) {
    var L = land(state);
    var g = state.gturn;

    if (L.code === 'A' && g % 3 === 0 && g - state.lastWaterTurn >= 3) {
      state.siltPenalty = Math.min(24, state.siltPenalty + 8);
      notes.push({ name: '泥淤', text: '河床又高了一寸，能存粮的地方少了。粮储上限 −8。' });
    }
    if (L.code === 'D' && g % 3 === 0) {
      var soft = has(state, 'granary') ? 0.5 : 1;
      applyEffects(state, { food: -Math.round(12 * soft), pop: -Math.round(4 * soft) }, deltas);
      notes.push({
        name: '白灾',
        text: soft < 1 ? '入冬大雪，仓中有存粮，畜群折损减半。' : '入冬大雪，草场尽白，畜群倒了一片。'
      });
    }
    if (L.code === 'C' && state.turn === 1 && state.act >= 2) {
      if (!(has(state, 'searoute') || state.moved > 0)) {
        applyEffects(state, { pop: -12 }, deltas);
        notes.push({ name: '疾疫', text: '幕初湿热蒸腾，族人接连病倒。人口 −12。' });
      } else {
        notes.push({ name: '疾疫已解', text: '海路带来的药草与高处新居，压住了这一季的疫气。' });
      }
    }
    if (L.code === 'B' && state.act >= 3 && fatigueActive(state)) {
      notes.push({ name: '地力衰减', text: '连年不歇的粟田薄了。粮产 −40%，除非轮休、引稻或畜粪壅田。' });
    }
    if (L.code === 'F') {
      notes.push({ name: '耕地零散', text: '坝子只有这么大。粮储上限 ' + visibleCaps(state).food + '，垦荒再多也涨不上去。' });
    }
  }

  function landPassive(state, crisis) {
    var L = land(state);
    var p = clone(L.passive || {});
    if (L.code === 'D') p.food = Math.floor(Math.random() * 6);
    if (crisis.special === 'foodFreeze' && !state.ceilingBroken) delete p.food;
    if (L.code === 'B' && crisis.id === 'drought') delete p.food;
    if (state.fields > 0) p.food = (p.food || 0) + Math.min(4, state.fields);
    if (state.livestock > 0) p.food = (p.food || 0) + Math.min(3, state.livestock);
    state.partners.forEach(function (code) {
      var d = Z.DIPLOMACY[code];
      if (!d || !d.perTurn) return;
      if (d.delay && state.act === 5 && state.turn <= d.delay) return;
      Object.keys(d.perTurn).forEach(function (k) { p[k] = (p[k] || 0) + d.perTurn[k]; });
    });
    /* 田土会歇，仓与市不会：建成之物在减产之年仍然出粮 */
    state.built.forEach(function (key) {
      var inc = BUILD_INCOME[key];
      if (!inc) return;
      Object.keys(inc).forEach(function (k) { p[k] = (p[k] || 0) + inc[k]; });
    });
    return p;
  }

  /* ---------- 回合 ---------- */

  function startTurn(state) {
    state.gturn = Z.globalTurnIndex(state.act - 1, state.turn);
    var crisisId = pickCrisis(state);
    var crisis = Z.CRISES[crisisId];
    var deltas = {};
    var notes = [];

    growCivic(state, notes);

    var guard = guardFor(state, crisisId);
    state.guard = guard.names.length ? { names: guard.names, mul: guard.mul } : null;
    if (guard.names.length) {
      notes.push({
        kind: 'good', name: '已有防备',
        text: guard.names.join('、') + '俱在，此灾之害减去' + Math.round((1 - guard.mul) * 100) + '%。'
      });
    }

    var remaining = [];
    state.flags.forEach(function (flag) {
      applyEffects(state, flag.effects, deltas);
      flag.turns -= 1;
      if (flag.turns > 0) remaining.push(flag);
    });
    state.flags = remaining;

    bottleneckTick(state, deltas, notes);
    applyEffects(state, landPassive(state, crisis), deltas);
    applyEffects(state, soften(crisis.effects, guard.mul), deltas);

    if (crisis.flag) {
      var flagDef = crisis.flag;
      state.flags = state.flags.filter(function (f) { return f.id !== flagDef.id; });
      state.flags.push({
        id: flagDef.id, name: flagDef.name,
        turns: flagDef.turns, effects: soften(flagDef.effects, guard.mul)
      });
    }

    if (state.diploDelayed && state.act === 5 && state.turn === state.diploDelayed.at) {
      var d = state.diploDelayed;
      applyEffects(state, d.gain, deltas);
      notes.push({ name: '蜀道已通', text: '凿了两年的栈道终于走通了。第一批铜锭出山。' });
      state.diploDelayed = null;
    }

    state.crisisLog.push(crisisId);
    state.currentCrisis = crisisId;
    state.turnStartDeltas = deltas;
    state.bottleneckNotes = notes;
    state.hand = drawHand(state);
    state.rerollsLeft = 1;
    state.lastRerollDeltas = null;
    state.lastResolution = null;
    state.phase = 'play';
    checkCollapse(state);
  }

  function reroll(state) {
    if (state.phase !== 'play' || state.rerollsLeft <= 0) return null;
    var before = state.hand.slice();
    var next = drawHand(state, before);
    /* 此幕之策已尽，换不出新牌就不该收这份民心 */
    if (handKey(next) === handKey(before)) {
      return { deltas: {}, hand: before, collapse: null, unchanged: true };
    }
    var deltas = {};
    applyEffects(state, { morale: -2 }, deltas);
    state.rerollsLeft -= 1;
    state.lastRerollDeltas = deltas;
    state.hand = next;
    var collapse = checkCollapse(state);
    return { deltas: deltas, hand: state.hand.slice(), collapse: collapse, unchanged: false };
  }

  function grantAchievements(state, cardId) {
    var keys = Z.CARD_ACHIEVEMENTS[cardId] || [];
    var gained = [];
    keys.forEach(function (k) {
      if (!state.ach[k]) { state.ach[k] = true; gained.push(k); }
    });
    return gained;
  }

  function playCard(state, cardId) {
    if (state.phase !== 'play' || state.hand.indexOf(cardId) < 0) return null;
    var card = Z.CARD_BY_ID[cardId];
    if (!card) return null;

    var effects = clone(card.effects);
    var synergyApplied = false;
    if (card.synergy && card.synergy.crisis === state.currentCrisis) {
      synergyApplied = true;
      Object.keys(card.synergy.bonus).forEach(function (key) {
        effects[key] = (effects[key] || 0) + card.synergy.bonus[key];
      });
    }

    var deltas = {};
    applyEffects(state, effects, deltas, card.tag);

    if (card.clearsFlag) {
      state.flags = state.flags.filter(function (f) { return f.id !== card.clearsFlag; });
    }
    if (card.build && state.built.indexOf(card.build) < 0) state.built.push(card.build);
    if (card.field) state.fields = Math.min(4, state.fields + 1);
    if (card.livestock) state.livestock = Math.min(3, state.livestock + 1);
    if (card.tag === '治水') {
      state.lastWaterTurn = state.gturn;
      if (state.siltPenalty > 0) state.siltPenalty = Math.max(0, state.siltPenalty - 8);
    }
    if (card.id === 'well-field') state.fallow = true;
    if (card.special === 'breakceiling') state.ceilingBroken = true;
    if (card.special === 'migrate') state.moved += 1;
    if (card.special === 'openroad') state.ach.searoute = true;

    var gained = grantAchievements(state, card.id);

    var f = state.stats.food;
    var growth = f >= 55 ? 3 : f >= 40 ? 2 : f >= 25 ? 0 : -3;
    applyEffects(state, { pop: growth }, deltas);

    state.routeCount[card.tag] = (state.routeCount[card.tag] || 0) + 1;
    state.history.push({
      act: state.act, turn: state.turn, gturn: state.gturn,
      crisis: state.currentCrisis, cardId: card.id, tag: card.tag,
      deltas: clone(deltas)
    });

    var resolution = {
      cardId: card.id,
      cardName: card.name,
      tag: card.tag,
      narrative: card.narrative,
      anchor: card.anchor,
      deltas: deltas,
      synergyApplied: synergyApplied,
      synergyNote: synergyApplied ? card.synergy.note : null,
      growth: growth,
      built: card.build || null,
      gained: gained
    };
    state.lastResolution = resolution;

    if (!checkCollapse(state)) state.phase = 'resolve';
    return resolution;
  }

  /* ---------- 幕末 ---------- */

  function finishAct(state) {
    var A = actDef(state);
    var s = state.stats;
    var stars = 0;
    ['pop', 'food', 'morale', 'craft'].forEach(function (k) { if (s[k] >= 66) stars += 1; });
    var goalMet = Object.keys(A.goal).every(function (k) { return s[k] >= A.goal[k]; });
    if (goalMet) stars += 1;

    state.actStars[state.act - 1] = stars;
    state.stars = state.actStars.reduce(function (a, b) { return a + (b || 0); }, 0);

    var routes = Object.keys(state.routeCount).map(function (tag) {
      return { tag: tag, count: state.routeCount[tag] };
    }).sort(function (a, b) { return b.count - a.count; });

    state.actEnd = {
      act: state.act, name: A.name, range: A.range,
      stars: stars, maxStars: 5,
      goalMet: goalMet, goalText: A.goalText,
      routes: routes, unlock: A.unlock, historian: A.historian,
      next: state.act < 5 ? Z.ACTS[state.act] : null,
      lede: goalMet
        ? '这一幕的目标达成了。' + A.theme + '——族人在此立住了脚。'
        : '这一幕未能尽如人意。' + A.theme + '——根基仍浅，下一幕更难。'
    };
    state.phase = 'actEnd';
  }

  function advanceAct(state) {
    if (state.act >= 5) { finishRun(state); return { ok: true, done: true }; }
    if (state.act === 4 && !state.diploResolved) {
      state.phase = 'diplomacy';
      return { ok: true, diplomacy: true };
    }
    state.act += 1;
    state.turn = 1;
    startTurn(state);
    return { ok: true, act: state.act };
  }

  function nextTurn(state) {
    if (state.phase !== 'resolve') return { ok: false };
    if (state.turn >= actDef(state).turns) {
      finishAct(state);
      return { ok: true, actEnd: true };
    }
    state.turn += 1;
    startTurn(state);
    return { ok: true, actEnd: false };
  }

  /* ---------- 邦交 ---------- */

  function diploOptions(state) {
    return Z.LAND_ORDER.filter(function (c) { return c !== state.landId; });
  }

  function togglePartner(state, code) {
    if (state.partners.indexOf(code) >= 0) {
      state.partners = state.partners.filter(function (c) { return c !== code; });
      return false;
    }
    if (state.partners.length >= Z.DIPLO_PICK) return null;
    if (code === state.landId) return null;
    state.partners.push(code);
    return true;
  }

  function confirmDiplomacy(state) {
    if (state.partners.length !== Z.DIPLO_PICK) return null;
    var costScale = Z.diploCostScale(state.landId);
    var kScale = Z.diploGainScale(state.landId);
    var deltas = {};
    var delayed = null;

    state.partners.forEach(function (code) {
      var d = Z.DIPLOMACY[code];
      var pay = {};
      Object.keys(d.pay).forEach(function (k) { pay[k] = Math.round(d.pay[k] * costScale); });
      applyEffects(state, pay, deltas);

      if (d.delay > 0) {
        delayed = { code: code, at: d.delay + 1, gain: clone(d.gain) };
      } else {
        var gain = {};
        Object.keys(d.gain).forEach(function (k) {
          gain[k] = k === 'K' ? Math.round(d.gain[k] * kScale) : d.gain[k];
        });
        applyEffects(state, gain, deltas);
      }
      (d.grants || []).forEach(function (k) { state.ach[k] = true; });
    });

    applyEffects(state, { K: Math.round(Z.ALLIANCE.baseK * state.partners.length * kScale) }, deltas);
    state.diploDelayed = delayed;
    state.diploResolved = true;
    state.diploDeltas = deltas;
    state.isolated = false;
    state.coverage = Z.diploCoverage(state.landId, state.partners);
    checkCollapse(state);
    return { deltas: deltas, delayed: delayed, coverage: state.coverage };
  }

  function refuseDiplomacy(state) {
    state.partners = [];
    state.isolated = true;
    state.diploResolved = true;
    state.diploDeltas = {};
    state.coverage = Z.diploCoverage(state.landId, []);
    return { isolated: true };
  }

  function startActFive(state) {
    state.act = 5;
    state.turn = 1;
    startTurn(state);
  }

  /* ---------- 终局 ---------- */

  function summary(state) {
    return {
      land: state.landId,
      K: state.stats.K, W: state.stats.W, R: state.stats.R,
      morale: state.stats.morale, pop: state.stats.pop,
      food: state.stats.food, craft: state.stats.craft,
      route: Z.dominantRoute(state.history),
      ach: state.ach, isolated: state.isolated, collapse: state.collapse,
      moved: state.moved,
      covered: state.coverage || Z.diploCoverage(state.landId, state.partners)
    };
  }

  function finishRun(state) {
    state.stars = state.actStars.reduce(function (a, b) { return a + (b || 0); }, 0);
    var j = Z.judgeEnding(summary(state));
    state.ending = j.ending.id;
    state.endingNear = j.near;
    state.route = Z.dominantRoute(state.history);
    state.phase = 'ending';
    return j;
  }

  function endingDetail(state) {
    var e = Z.ENDING_BY_ID[state.ending] || Z.ENDINGS[0];
    return {
      ending: e,
      near: state.endingNear,
      grade: Z.gradeFor(state.stars),
      stars: state.stars,
      maxStars: 25,
      route: state.route || Z.dominantRoute(state.history),
      land: land(state),
      stats: clone(state.stats),
      ach: Object.keys(state.ach),
      partners: state.partners.slice(),
      isolated: state.isolated,
      actStars: state.actStars.slice(),
      collapse: state.collapse
    };
  }

  Z.Engine = {
    createState: createState,
    chooseLand: chooseLand,
    scout: scout,
    selectSettlement: selectSettlement,
    confirmSettlement: confirmSettlement,
    reroll: reroll,
    playCard: playCard,
    nextTurn: nextTurn,
    advanceAct: advanceAct,
    diploOptions: diploOptions,
    togglePartner: togglePartner,
    confirmDiplomacy: confirmDiplomacy,
    refuseDiplomacy: refuseDiplomacy,
    startActFive: startActFive,
    finishRun: finishRun,
    endingDetail: endingDetail,
    summary: summary,
    findSettlement: findSettlement,
    visibleCaps: visibleCaps,
    statMax: statMax,
    actDef: actDef,
    land: land,
    applyEffects: applyEffects,
    clone: clone,
    clamp: clamp
  };
})();