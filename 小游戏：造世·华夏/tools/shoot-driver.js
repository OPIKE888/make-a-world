/* 注入页面内的驱动：只做点击与取景，截图由 shoot.js 通过 CDP 抓 */
(function () {
  var Z = window.ZSX;
  var wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

  function vis(el) {
    if (!el || el.nodeType !== 1) return false;
    var n = el;
    while (n && n.nodeType === 1) {
      var s = getComputedStyle(n);
      if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < 0.05) return false;
      if (n.classList && n.classList.contains('stage')) break;
      n = n.parentElement;
    }
    var r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }
  function txt(el) { return el ? (el.textContent || '') : ''; }
  function click(el) {
    if (!el) return false;
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    return true;
  }
  function btnByText(re, root) {
    var list = (root || document).querySelectorAll('button');
    for (var i = 0; i < list.length; i++) if (re.test(txt(list[i])) && vis(list[i])) return list[i];
    return null;
  }
  function layer() { var l = document.querySelector('.fullayer'); return l && vis(l) ? l : null; }
  function dlg() { var d = document.querySelector('.dialogue'); return d && vis(d) ? d : null; }
  function choices() {
    return [].slice.call(document.querySelectorAll('.choice')).filter(function (b) { return vis(b) && !b.disabled; });
  }
  function key(k) { document.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })); }

  var CSS = document.createElement('style');
  CSS.id = '__shoot_clean';
  CSS.textContent = '.shoot-clean .hud,.shoot-clean .hud__flags,.shoot-clean .dock,' +
    '.shoot-clean .fullayer,.shoot-clean .fx-layer,.shoot-clean .scout-count,' +
    '.shoot-clean .sky-chip,.shoot-clean .hotspot{display:none!important}';
  document.head.appendChild(CSS);

  window.__S = {
    state: function () { return Z.UI.state(); },

    async toTitle() {
      if (layer()) click(btnByText(/关闭|回到标题|重开/));
      document.documentElement.classList.remove('shoot-clean');
      Z.UI.goto('title');
      await wait(500);
      return txt(layer()).slice(0, 30);
    },

    async openHelp() {
      click(btnByText(/^玩法$/));
      await wait(450);
      return !!layer();
    },

    async esc() { key('Escape'); await wait(350); },

    async openLands() {
      click(btnByText(/开创新世|继续/));
      await wait(700);
      return document.querySelectorAll('.land-card').length;
    },

    async openDetail(i) {
      var cards = [].slice.call(document.querySelectorAll('.land-card')).filter(vis);
      click(cards[i || 0]);
      await wait(700);
      return txt(layer()).slice(0, 24);
    },

    async enter() {
      click(btnByText(/择此而居|立村于此/));
      await wait(700);
      return !!document.querySelector('.stage');
    },

    /* 推进对白，直到出现可点的勘察热点 */
    async toScout() {
      for (var i = 0; i < 80; i++) {
        var spots = [].slice.call(document.querySelectorAll('.hotspot')).filter(function (b) {
          return vis(b) && !b.classList.contains('hotspot--found');
        });
        if (spots.length) return spots.length;
        var d = dlg();
        if (d) {
          var bs = [].slice.call(d.querySelectorAll('button')).filter(vis);
          if (bs.length) click(bs[bs.length - 1]); else click(d);
        }
        await wait(90);
      }
      return 0;
    },

    async finishScout() {
      for (var round = 0; round < 10; round++) {
        var spots = [].slice.call(document.querySelectorAll('.hotspot')).filter(function (b) {
          return vis(b) && !b.classList.contains('hotspot--found');
        });
        if (!spots.length) break;
        click(spots[0]);
        for (var k = 0; k < 30; k++) {
          var d = dlg();
          if (!d) break;
          if (d.querySelector('.dialogue__meta button')) break;
          click(d);
          await wait(40);
        }
        await wait(120);
      }
      return document.querySelectorAll('.hotspot--found').length;
    },

    async openDwelling() {
      click(btnByText(/择居|定聚落/));
      await wait(650);
      return choices().length;
    },

    async chooseDwelling(i) {
      var c = choices()[i || 0];
      click(c);
      await wait(700);
      return txt(c).slice(0, 20);
    },

    /* 推进一步交互，报告当前停在哪种界面 */
    async step() {
      var S = Z.UI.state();
      if (S && S.phase === 'ending') return 'ending';
      var l = layer();
      if (l) {
        if (l.querySelector('.partner')) return 'partner';
        if (l.querySelector('.diplo')) return 'diplo';
        if (l.querySelector('.end-panel')) return 'actend';
        if (l.querySelector('.gallery')) return 'gallery';
        return 'layer';
      }
      if (choices().length) return 'choices';
      var d = dlg();
      if (d) {
        var bs = [].slice.call(d.querySelectorAll('button')).filter(vis);
        if (bs.length) click(bs[bs.length - 1]); else click(d);
        await wait(80);
        return 'advanced';
      }
      var dock = [].slice.call(document.querySelectorAll('.dock button')).filter(function (b) {
        return vis(b) && !b.disabled;
      });
      if (dock.length) { click(dock[dock.length - 1]); await wait(90); return 'advanced'; }
      await wait(80);
      return 'idle';
    },

    async pick() {
      var st = Z.UI.state();
      var LABEL = { pop: '人口', food: '粮储', morale: '民心', craft: '技艺' };
      var keys = Object.keys(LABEL).sort(function (a, b) { return st.stats[a] - st.stats[b]; });
      var want = new RegExp(LABEL[keys[0]] + '\\s*\\+');
      var hand = choices();
      var pick = null;
      for (var i = 0; i < hand.length; i++) if (want.test(txt(hand[i]))) { pick = hand[i]; break; }
      if (!pick) for (var j = 0; j < hand.length; j++) if (/粮储?\s*\+/.test(txt(hand[j]))) { pick = hand[j]; break; }
      if (!pick) pick = hand[(st.turn || 0) % hand.length];
      click(pick);
      await wait(500);
      return txt(pick).slice(0, 18);
    },

    async resolvePartner() {
      var l = layer();
      if (!l) return 'gone';
      for (var n = 0; n < 3; n++) {
        var ps = [].slice.call(l.querySelectorAll('.partner')).filter(vis);
        var un = null;
        for (var i = 0; i < ps.length; i++) if (!ps[i].classList.contains('sel')) { un = ps[i]; break; }
        if (!un) break;
        click(un);
        await wait(90);
        l = layer() || l;
      }
      var ok = btnByText(/立盟|通商/, layer() || l);
      if (ok) { click(ok); await wait(600); return 'ok'; }
      return 'blocked';
    },

    async resolveDiplo() {
      var l = layer();
      if (!l) return 'gone';
      var bs = [].slice.call(l.querySelectorAll('button')).filter(function (b) { return vis(b) && !b.disabled; });
      if (bs.length) { click(bs[bs.length - 1]); await wait(600); return 'ok'; }
      return 'blocked';
    },

    async leaveActEnd() {
      click(btnByText(/进入第|幕末结算 · 邦交|看结局/));
      await wait(600);
      return !!layer() ? 'still' : 'left';
    },

    async peek() {
      click(btnByText(/看聚落/));
      await wait(1200);
      return !!document.querySelector('.peek-exit');
    },
    async exitPeek() {
      click(btnByText(/回到局中/));
      await wait(700);
      return !!layer();
    },

    async waitEndPanel(limit) {
      for (var i = 0; i < (limit || 90); i++) {
        var l = layer();
        if (l && l.querySelector('.end-panel')) return true;
        await this.step();
      }
      return false;
    },

    async reveal() {
      click(btnByText(/终章/));
      await wait(700);
      return txt(layer()).slice(0, 20);
    },
    async gallery() {
      click(btnByText(/结局图鉴/));
      await wait(700);
      return txt(layer()).slice(0, 20);
    },

    /* ---- 场景取景：直接喂给场景层，不经过游戏流程 ---- */
    async scene(cfg) {
      await new Promise(function (res) { Z.Scene.setLand(cfg.code, res); });
      Z.Scene.sync(cfg.state, false);
      Z.Scene.setSky(cfg.sky || 'morning');
      Z.Scene.setWeather(cfg.weather || 'clear');
      await wait(cfg.hold || 2600);
      return Z.Scene.stats();
    },

    prepareSceneMode() {
      document.documentElement.classList.add('shoot-clean');
      if (layer()) key('Escape');
    },
    stats() { return Z.Scene.stats(); }
  };
})();
