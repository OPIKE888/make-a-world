/* 开发探针：只在本地实测时注入，不进 dist。
   把 rAF 换成可手动步进的泵，这样后台标签页也能确定性地渲染并截图。 */
(function () {
  'use strict';
  var Z = window.ZSX;
  var cb = null;
  window.requestAnimationFrame = function (f) { cb = f; return 1; };
  window.cancelAnimationFrame = function () { cb = null; };

  function pump(n) {
    var t = performance.now();
    for (var i = 0; i < n; i++) {
      var f = cb; cb = null;
      if (!f) break;
      t += 16.7;
      f(t);
    }
  }

  function view(o) {
    return new Promise(function (resolve) {
      Z.Scene.setLand(o.land, function () {
        Z.Scene.sync({
          landId: o.land, settlementId: o.st || null, stats: { pop: o.pop },
          built: o.built || [], fields: o.fields || 0, livestock: o.livestock || 0, act: o.act || 5
        }, false);
        Z.Scene.setSky(o.sky || 'noon');
        Z.Scene.setWeather(o.weather || 'clear');
        Z.Scene.pause(false);
        Z.Scene.stop(); Z.Scene.start();
        pump(o.frames || 120);
        resolve();
      });
    });
  }

  async function save(name) {
    var r = await fetch('/__shot/' + name, { method: 'POST', body: Z.Scene.snapshot() });
    return r.status;
  }

  async function shot(o, name) { await view(o); return [name, await save(name), Z.Scene.stats()]; }

  window.__probe = { pump: pump, view: view, save: save, shot: shot, Z: Z };
  Z.Scene.stop(); Z.Scene.start();
  window.__probeReady = true;
})();