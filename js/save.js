(function () {
  'use strict';
  var Z = window.ZSX = window.ZSX || {};

  var KEY = 'zshx_save_v2';
  var GALLERY = 'zshx_gallery_v2';
  var PREFS = 'zshx_prefs_v2';

  function safe(fn, fallback) {
    try { return fn(); } catch (e) { return fallback; }
  }

  Z.Save = {
    write: function (state) {
      if (!state || !state.landId) return false;
      return safe(function () {
        localStorage.setItem(KEY, JSON.stringify(state));
        return true;
      }, false);
    },
    read: function () {
      return safe(function () {
        var raw = localStorage.getItem(KEY);
        if (!raw) return null;
        var state = JSON.parse(raw);
        if (!state || state.version !== 2 || !state.landId) return null;
        if (!Z.LANDS[state.landId] || !state.stats) return null;
        return state;
      }, null);
    },
    clear: function () { safe(function () { localStorage.removeItem(KEY); }, null); },
    has: function () { return !!Z.Save.read(); },

    unlockEnding: function (id, landId) {
      return safe(function () {
        var g = JSON.parse(localStorage.getItem(GALLERY) || '{}');
        var rec = g[id] || { id: id, lands: [], count: 0, first: Date.now() };
        rec.count += 1;
        rec.last = Date.now();
        if (landId && rec.lands.indexOf(landId) < 0) rec.lands.push(landId);
        g[id] = rec;
        localStorage.setItem(GALLERY, JSON.stringify(g));
        return g;
      }, {});
    },
    gallery: function () {
      return safe(function () {
        return JSON.parse(localStorage.getItem(GALLERY) || '{}');
      }, {});
    },
    clearGallery: function () { safe(function () { localStorage.removeItem(GALLERY); }, null); },

    prefs: function () {
      return safe(function () {
        var p = JSON.parse(localStorage.getItem(PREFS) || '{}');
        return { muted: !!p.muted, fast: !!p.fast };
      }, { muted: false, fast: false });
    },
    setPrefs: function (p) {
      safe(function () { localStorage.setItem(PREFS, JSON.stringify(p)); }, null);
    }
  };
})();