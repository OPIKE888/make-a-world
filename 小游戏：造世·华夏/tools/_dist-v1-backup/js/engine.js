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

  function visibleCaps(state) {
    var land = Z.LANDS[state.landId] || Z.LANDS.A;
    var settlement = state.settlementId ? findSettlement(state.settlementId) : null;
    return {
      pop: land.caps.pop + (settlement && settlement.popCap ? settlement.popCap : 0),
      food: land.caps.food,
      morale: 100,
      craft: 100
    };
  }

  function statMax(state, key) {
    if (key === 'K' || key === 'W' || key === 'R') return 100;
    return visibleCaps(state)[key];
  }

  function applyEffects(state, effects, out) {
    if (!effects) return;
    Object.keys(effects).forEach(function (key) {
      if (key === 'version') return;
      var value = effects[key];
      if (!value) return;
      var before = state.stats[key];
      if (typeof before !== 'number') return;
      var after = clamp(before + value, 0, statMax(state, key));
      state.stats[key] = after;
      var actual = after - before;
      if (actual !== 0) out[key] = (out[key] || 0) + actual;
    });
  }

  function findSettlement(id) {
    for (var i = 0; i < Z.SETTLEMENTS.length; i++) {
      if (Z.SETTLEMENTS[i].id === id) return Z.SETTLEMENTS[i];
    }
    return null;
  }

  function checkCollapse(state) {
    var stats = state.stats;
    var cause = null;
    if (stats.food <= 0) cause = Z.COLLAPSE.food;
    else if (stats.morale <= 0) cause = Z.COLLAPSE.morale;
    else if (stats.pop <= 0) cause = Z.COLLAPSE.pop;
    else if (stats.craft <= 0) cause = Z.COLLAPSE.craft;
    if (cause) {
      state.collapse = clone(cause);
      state.phase = 'collapse';
    }
    return cause;
  }

  function createState() {
    return {
      version: 1,
      phase: 'select',
      landId: null,
      scouted: [],
      settlementId: null,
      settlementDeltas: null,
      mismatch: false,
      turn: 0,
      stats: { pop: 50, food: 50, morale: 50, craft: 50, K: 5, W: 0, R: 0 },
      flags: [],
      currentCrisis: null,
      turnStartDeltas: null,
      hand: [],
      rerollsLeft: 1,
      lastRerollDeltas: null,
      lastResolution: null,
      history: [],
      routeCount: {},
      actEnd: null,
      collapse: null
    };
  }

  function chooseLand(state, landId) {
    var land = Z.LANDS[landId];
    if (!land || !land.playable) return false;
    state.landId = landId;
    state.stats.K = land.start && typeof land.start.K === 'number' ? land.start.K : 5;
    state.phase = 'founding';
    return true;
  }

  function scout(state, hotspotId) {
    if (state.scouted.indexOf(hotspotId) >= 0) return null;
    var spot = null;
    for (var i = 0; i < Z.SCOUT.length; i++) {
      if (Z.SCOUT[i].id === hotspotId) { spot = Z.SCOUT[i]; break; }
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
    var settlement = findSettlement(state.settlementId);
    if (!settlement) return false;
    var deltas = {};
    applyEffects(state, settlement.effects, deltas);
    state.settlementDeltas = deltas;
    state.mismatch = settlement.fit.indexOf(state.landId) < 0;
    if (state.mismatch) {
      state.flags.push({
        id: 'mismatch',
        name: '居所失宜',
        turns: 99,
        effects: { morale: -4 }
      });
    }
    state.turn = 1;
    startTurn(state);
    return true;
  }

  function landPassive(state) {
    var land = Z.LANDS[state.landId];
    return land && land.passive ? land.passive : {};
  }

  function drawHand(state, exclude) {
    var played = state.history.map(function (item) { return item.cardId; });
    var all = Z.ACT1_ACTIONS.map(function (card) { return card.id; });
    var pool = all.filter(function (id) {
      return played.indexOf(id) < 0 && (!exclude || exclude.indexOf(id) < 0);
    });
    if (pool.length < 3) {
      pool = all.filter(function (id) { return played.indexOf(id) < 0; });
    }
    if (pool.length < 3) pool = all.slice();
    shuffle(pool);
    return pool.slice(0, 3);
  }

  function startTurn(state) {
    var crisis = Z.CRISES[Z.ACT1_EVENTS[state.turn - 1]];
    if (!crisis) { finishAct(state); return; }
    var deltas = {};

    var remaining = [];
    state.flags.forEach(function (flag) {
      applyEffects(state, flag.effects, deltas);
      flag.turns -= 1;
      if (flag.turns > 0) remaining.push(flag);
    });
    state.flags = remaining;

    var passive = landPassive(state);
    if (crisis.special === 'foodFreeze') {
      passive = clone(passive);
      delete passive.food;
    }
    applyEffects(state, passive, deltas);

    applyEffects(state, crisis.effects, deltas);

    if (crisis.flag) {
      state.flags.push({
        id: crisis.flag.id,
        name: crisis.flag.name,
        turns: crisis.flag.turns,
        effects: clone(crisis.flag.effects)
      });
    }

    state.currentCrisis = crisis.id;
    state.turnStartDeltas = deltas;
    state.hand = drawHand(state);
    state.rerollsLeft = 1;
    state.lastRerollDeltas = null;
    state.lastResolution = null;
    state.phase = 'play';
    checkCollapse(state);
  }

  function reroll(state) {
    if (state.phase !== 'play' || state.rerollsLeft <= 0) return null;
    var deltas = {};
    applyEffects(state, { morale: -1 }, deltas);
    state.rerollsLeft -= 1;
    state.lastRerollDeltas = deltas;
    state.hand = drawHand(state, state.hand);
    var collapse = checkCollapse(state);
    return { deltas: deltas, hand: state.hand.slice(), collapse: collapse };
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
    applyEffects(state, effects, deltas);

    if (card.clearsFlag) {
      state.flags = state.flags.filter(function (flag) { return flag.id !== card.clearsFlag; });
    }

    var growth = state.stats.food >= 40 ? 2 : -3;
    applyEffects(state, { pop: growth }, deltas);

    state.routeCount[card.tag] = (state.routeCount[card.tag] || 0) + 1;
    state.history.push({
      turn: state.turn,
      crisis: state.currentCrisis,
      cardId: card.id,
      tag: card.tag,
      deltas: clone(deltas)
    });

    var resolution = {
      cardId: card.id,
      cardName: card.name,
      tag: card.tag,
      narrative: card.narrative,
      deltas: deltas,
      synergyApplied: synergyApplied,
      synergyNote: synergyApplied ? card.synergy.note : null,
      growth: growth
    };
    state.lastResolution = resolution;

    if (!checkCollapse(state)) state.phase = 'resolve';
    return resolution;
  }

  function finishAct(state) {
    var act = Z.ACTS[0];
    var stats = state.stats;
    var stars = 0;
    ['pop', 'food', 'morale', 'craft'].forEach(function (key) {
      if (stats[key] >= 60) stars += 1;
    });
    var goalMet = stats.pop >= 50 && stats.food >= 40;
    if (goalMet) stars += 1;

    var grade = Z.GRADES[Z.GRADES.length - 1];
    for (var i = 0; i < Z.GRADES.length; i++) {
      if (stars >= Z.GRADES[i].min) { grade = Z.GRADES[i]; break; }
    }

    var routes = Object.keys(state.routeCount).map(function (tag) {
      return { tag: tag, count: state.routeCount[tag] };
    }).sort(function (a, b) { return b.count - a.count; });

    state.actEnd = {
      stars: stars,
      maxStars: 5,
      grade: grade.word,
      gradeLine: grade.line,
      goalMet: goalMet,
      routes: routes,
      lede: goalMet
        ? '族人在这片河滩上扎下了根。第一座聚落，成了。'
        : '族人勉强熬过了最初的三千年，但聚落尚未站稳。',
      historian: act.historian
    };
    state.phase = 'actEnd';
  }

  function nextTurn(state) {
    if (state.phase !== 'resolve') return { ok: false };
    if (state.turn >= Z.ACTS[0].turns) {
      finishAct(state);
      return { ok: true, actEnd: true };
    }
    state.turn += 1;
    startTurn(state);
    return { ok: true, actEnd: false };
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
    findSettlement: findSettlement,
    visibleCaps: visibleCaps,
    statMax: statMax
  };
})();
