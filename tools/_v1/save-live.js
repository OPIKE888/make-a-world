(function () {
  'use strict';
  var Z = window.ZSX = window.ZSX || {};
  var KEY = 'zshx_save_v1';

  Z.Save = {
    key: KEY,
    write: function (state) {
      try {
        localStorage.setItem(KEY, JSON.stringify(state));
      } catch (err) {
        /* 存档失败不影响本局 */
      }
    },
    read: function () {
      try {
        var raw = localStorage.getItem(KEY);
        if (!raw) return null;
        var state = JSON.parse(raw);
        if (!state || state.version !== 1 || !state.phase) return null;
        return state;
      } catch (err) {
        return null;
      }
    },
    clear: function () {
      try {
        localStorage.removeItem(KEY);
      } catch (err) {
        /* ignore */
      }
    }
  };
})();
