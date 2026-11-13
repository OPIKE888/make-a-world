(function () {
  'use strict';
  var Z = window.ZSX = window.ZSX || {};

  var ac = null, master = null, ambGain = null, sfxGain = null;
  var ambNodes = [], started = false, muted = false;
  var noiseBuf = null, ambKind = 'plain', timer = 0;

  function ctxReady() {
    if (ac) return true;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try {
      ac = new AC();
      master = ac.createGain();
      master.gain.value = muted ? 0 : 0.9;
      var comp = ac.createDynamicsCompressor();
      comp.threshold.value = -18; comp.ratio.value = 6;
      master.connect(comp); comp.connect(ac.destination);
      ambGain = ac.createGain(); ambGain.gain.value = 0.0; ambGain.connect(master);
      sfxGain = ac.createGain(); sfxGain.gain.value = 0.55; sfxGain.connect(master);
      var len = ac.sampleRate * 2;
      noiseBuf = ac.createBuffer(1, len, ac.sampleRate);
      var d = noiseBuf.getChannelData(0);
      var last = 0;
      for (var i = 0; i < len; i++) {
        var w = Math.random() * 2 - 1;
        last = (last + 0.02 * w) / 1.02;
        d[i] = last * 3.2;
      }
      return true;
    } catch (e) { ac = null; return false; }
  }

  function noiseSource(loop) {
    var s = ac.createBufferSource();
    s.buffer = noiseBuf; s.loop = loop !== false;
    return s;
  }

  function stopAmbience() {
    ambNodes.forEach(function (n) {
      try { if (n.stop) n.stop(); } catch (e) {}
      try { n.disconnect(); } catch (e) {}
    });
    ambNodes = [];
    if (timer) { clearInterval(timer); timer = 0; }
  }

  function buildAmbience(kind) {
    if (!ac) return;
    stopAmbience();
    ambKind = kind;

    var wind = noiseSource(true);
    var wf = ac.createBiquadFilter();
    wf.type = 'bandpass'; wf.frequency.value = 420; wf.Q.value = 0.7;
    var wg = ac.createGain(); wg.gain.value = 0.30;
    wind.connect(wf); wf.connect(wg); wg.connect(ambGain);
    wind.start();
    ambNodes.push(wind, wf, wg);

    var lfo = ac.createOscillator();
    lfo.frequency.value = 0.07;
    var lfoG = ac.createGain(); lfoG.gain.value = 240;
    lfo.connect(lfoG); lfoG.connect(wf.frequency);
    lfo.start();
    ambNodes.push(lfo, lfoG);

    var drone = ac.createOscillator();
    drone.type = 'sine';
    drone.frequency.value = kind === 'night' ? 62 : 74;
    var dg = ac.createGain(); dg.gain.value = 0.055;
    drone.connect(dg); dg.connect(ambGain);
    drone.start();
    ambNodes.push(drone, dg);

    if (kind === 'water' || kind === 'coast') {
      var wat = noiseSource(true);
      var wtf = ac.createBiquadFilter();
      wtf.type = 'highpass'; wtf.frequency.value = 900;
      var watg = ac.createGain(); watg.gain.value = kind === 'coast' ? 0.13 : 0.07;
      wat.connect(wtf); wtf.connect(watg); watg.connect(ambGain);
      wat.start();
      ambNodes.push(wat, wtf, watg);
      var swell = ac.createOscillator();
      swell.frequency.value = kind === 'coast' ? 0.13 : 0.24;
      var sg = ac.createGain(); sg.gain.value = kind === 'coast' ? 0.07 : 0.035;
      swell.connect(sg); sg.connect(watg.gain);
      swell.start();
      ambNodes.push(swell, sg);
    }

    if (kind === 'storm') {
      wf.frequency.value = 700; wg.gain.value = 0.5;
    }
    if (kind === 'night') { wg.gain.value = 0.16; }

    /* 稀疏的环境点缀：鸟、虫、远处的敲击，都跟着画面上的时辰走 */
    timer = setInterval(function () {
      if (!ac || muted || ac.state !== 'running') return;
      if (Math.random() > 0.42) return;
      if (kind === 'night') chirp(rnd(2400, 3400), 0.035, 0.05, 'sine');
      else if (kind === 'storm') lowRumble();
      else if (Math.random() < 0.6) birdCall();
      else distantKnock();
    }, 2600);
  }

  function rnd(a, b) { return a + Math.random() * (b - a); }

  function env(node, t0, a, d, peak) {
    node.gain.cancelScheduledValues(t0);
    node.gain.setValueAtTime(0.0001, t0);
    node.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + a);
    node.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
  }

  function tone(freq, dur, type, peak, dest, glide) {
    if (!ac) return;
    var t0 = ac.currentTime;
    var o = ac.createOscillator();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (glide) o.frequency.exponentialRampToValueAtTime(Math.max(20, glide), t0 + dur);
    var g = ac.createGain();
    env(g, t0, Math.min(0.02, dur * 0.2), dur, peak);
    o.connect(g); g.connect(dest || sfxGain);
    o.start(t0); o.stop(t0 + dur + 0.08);
  }

  function chirp(freq, peak, dur, type) {
    if (!ac) return;
    tone(freq, dur || 0.08, type || 'triangle', peak, ambGain, freq * 1.4);
  }

  function birdCall() {
    if (!ac) return;
    var base = rnd(1500, 2500);
    var n = 2 + ((Math.random() * 2) | 0);
    for (var i = 0; i < n; i++) {
      setTimeout(function () { chirp(base * rnd(0.9, 1.2), 0.03, 0.06, 'triangle'); }, i * 110);
    }
  }

  function distantKnock() {
    if (!ac) return;
    var t0 = ac.currentTime;
    var s = noiseSource(false);
    var f = ac.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = 320; f.Q.value = 3;
    var g = ac.createGain();
    env(g, t0, 0.004, 0.16, 0.05);
    s.connect(f); f.connect(g); g.connect(ambGain);
    s.start(t0); s.stop(t0 + 0.3);
  }

  function lowRumble() {
    if (!ac) return;
    var t0 = ac.currentTime;
    var s = noiseSource(false);
    var f = ac.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 180;
    var g = ac.createGain();
    env(g, t0, 0.35, 1.6, 0.10);
    s.connect(f); f.connect(g); g.connect(ambGain);
    s.start(t0); s.stop(t0 + 2.4);
  }

  function noiseHit(freq, q, dur, peak, type) {
    if (!ac) return;
    var t0 = ac.currentTime;
    var s = noiseSource(false);
    var f = ac.createBiquadFilter();
    f.type = type || 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    var g = ac.createGain();
    env(g, t0, 0.004, dur, peak);
    s.connect(f); f.connect(g); g.connect(sfxGain);
    s.start(t0); s.stop(t0 + dur + 0.15);
  }

  var SFX = {
    click: function () { tone(880, 0.05, 'square', 0.05); },
    hover: function () { tone(1320, 0.03, 'sine', 0.022); },
    page: function () { noiseHit(2200, 1.2, 0.13, 0.06, 'highpass'); },
    card: function () {
      noiseHit(1600, 1.0, 0.10, 0.09, 'bandpass');
      tone(523.25, 0.16, 'triangle', 0.07);
      setTimeout(function () { tone(783.99, 0.20, 'triangle', 0.05); }, 70);
    },
    good: function () {
      [523.25, 659.25, 783.99].forEach(function (f, i) {
        setTimeout(function () { tone(f, 0.34, 'sine', 0.075); }, i * 85);
      });
    },
    bad: function () {
      tone(146.83, 0.5, 'sawtooth', 0.06, sfxGain, 92);
      noiseHit(220, 0.8, 0.4, 0.09, 'lowpass');
    },
    drum: function () {
      tone(88, 0.62, 'sine', 0.20, sfxGain, 44);
      noiseHit(140, 0.6, 0.34, 0.13, 'lowpass');
      setTimeout(function () { tone(66, 0.7, 'sine', 0.13, sfxGain, 38); }, 210);
    },
    build: function () {
      noiseHit(300, 1.4, 0.16, 0.14, 'bandpass');
      setTimeout(function () { noiseHit(240, 1.4, 0.20, 0.12, 'bandpass'); }, 150);
      setTimeout(function () { tone(196, 0.3, 'triangle', 0.06); }, 300);
    },
    chime: function () {
      [523.25, 784, 1046.5, 1318.5].forEach(function (f, i) {
        setTimeout(function () { tone(f, 1.5 - i * 0.18, 'sine', 0.075); }, i * 120);
      });
    },
    xun: function () {
      if (!ac) return;
      var t0 = ac.currentTime;
      var o = ac.createOscillator();
      o.type = 'sine'; o.frequency.setValueAtTime(174.61, t0);
      o.frequency.linearRampToValueAtTime(196, t0 + 1.2);
      o.frequency.linearRampToValueAtTime(174.61, t0 + 3.0);
      var o2 = ac.createOscillator();
      o2.type = 'triangle'; o2.frequency.value = 261.63;
      var g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.10, t0 + 0.7);
      g.gain.setValueAtTime(0.10, t0 + 2.2);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 3.6);
      var g2 = ac.createGain(); g2.gain.value = 0.22;
      var f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900;
      o.connect(g); o2.connect(g2); g2.connect(g); g.connect(f); f.connect(sfxGain);
      o.start(t0); o2.start(t0); o.stop(t0 + 3.8); o2.stop(t0 + 3.8);
    },
    coin: function () {
      tone(1568, 0.10, 'square', 0.045);
      setTimeout(function () { tone(2093, 0.14, 'square', 0.035); }, 55);
    },
    star: function () { tone(1046.5, 0.22, 'sine', 0.07); }
  };

  Z.Audio = {
    unlock: function () {
      if (!ctxReady()) return false;
      if (ac.state === 'suspended') ac.resume();
      if (!started) {
        started = true;
        buildAmbience(ambKind);
        ambGain.gain.setTargetAtTime(0.5, ac.currentTime, 1.2);
      }
      return true;
    },
    play: function (name) {
      if (muted || !ac || ac.state !== 'running') return;
      if (SFX[name]) SFX[name]();
    },
    ambience: function (kind) {
      if (!ac) { ambKind = kind; return; }
      if (kind === ambKind) return;
      buildAmbience(kind);
    },
    setMuted: function (m) {
      muted = !!m;
      if (master && ac) master.gain.setTargetAtTime(muted ? 0 : 0.9, ac.currentTime, 0.08);
      return muted;
    },
    isMuted: function () { return muted; },
    available: function () { return !!(window.AudioContext || window.webkitAudioContext); }
  };
})();