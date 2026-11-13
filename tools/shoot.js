/* 用本地 Chromium 的无头 CDP 驱动游戏并截图到 screenshots/ */
'use strict';
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'screenshots');
const URL = 'http://127.0.0.1:8712/dist/index.html';
const PORT = 9333;
const CHROME = '/Users/beegee/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/' +
  'Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function httpJson(p) {
  const res = await fetch('http://127.0.0.1:' + PORT + p);
  return res.json();
}

async function launch() {
  const proc = spawn(CHROME, [
    '--headless=new',
    '--remote-debugging-port=' + PORT,
    '--user-data-dir=/tmp/zshx-shoot-profile',
    '--no-first-run', '--no-default-browser-check', '--hide-scrollbars',
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows',
    '--window-size=960,540',
    'about:blank'
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  proc.stderr.on('data', () => {});
  for (let i = 0; i < 60; i++) {
    try { await httpJson('/json/version'); return proc; } catch (e) { await sleep(250); }
  }
  throw new Error('Chromium 未能在端口 ' + PORT + ' 启动');
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  /* 文件名带序号，重跑前清掉旧图，免得留下编号错位的残影 */
  for (const f of fs.readdirSync(OUT)) if (f.endsWith('.png')) fs.unlinkSync(path.join(OUT, f));
  const proc = await launch();
  let ws;
  try {
    const list = await httpJson('/json/list');
    const page = list.find(t => t.type === 'page');
    if (!page) throw new Error('没有页面目标');
    ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

    let id = 0;
    const pending = new Map();
    ws.onmessage = ev => {
      const msg = JSON.parse(ev.data);
      if (msg.id && pending.has(msg.id)) {
        const p = pending.get(msg.id); pending.delete(msg.id);
        if (msg.error) p.reject(new Error(JSON.stringify(msg.error)));
        else p.resolve(msg.result);
      }
    };
    const send = (method, params) => new Promise((resolve, reject) => {
      const i = ++id; pending.set(i, { resolve, reject });
      ws.send(JSON.stringify({ id: i, method, params: params || {} }));
    });
    const ev = async expr => {
      const r = await send('Runtime.evaluate', {
        expression: expr, awaitPromise: true, returnByValue: true, userGesture: true
      });
      if (r.exceptionDetails) {
        throw new Error(r.exceptionDetails.exception && r.exceptionDetails.exception.description ||
          r.exceptionDetails.text || 'evaluate 失败');
      }
      return r.result && r.result.value;
    };
    const shot = async name => {
      const r = await send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false });
      const buf = Buffer.from(r.data, 'base64');
      fs.writeFileSync(path.join(OUT, name + '.png'), buf);
      console.log('  ✓ ' + name + '.png  ' + (buf.length / 1024).toFixed(0) + 'KB');
    };

    await send('Page.enable');
    await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 960, height: 540, deviceScaleFactor: 2, mobile: false
    });
    await send('Page.navigate', { url: URL });

    for (let i = 0; i < 120; i++) {
      const ok = await ev('document.readyState === "complete" && !!(window.ZSX && window.ZSX.UI && window.ZSX.Scene)');
      if (ok) break;
      await sleep(200);
    }
    await ev('document.fonts.ready.then(() => true)');
    await sleep(700);
    await ev(fs.readFileSync(path.join(__dirname, 'shoot-driver.js'), 'utf8'));

    console.log('界面：');
    await ev('__S.toTitle()'); await sleep(500); await shot('01-标题页');

    await ev('__S.openHelp()'); await sleep(400); await shot('02-玩法说明');
    await ev('__S.esc()');

    await ev('__S.openLands()'); await sleep(700); await shot('03-择地');
    await ev('__S.openDetail(0)'); await sleep(700); await shot('04-地块详情');

    await ev('__S.enter()');
    const spots = await ev('__S.toScout()');
    if (!spots) throw new Error('没有进入立村勘察');
    await sleep(400); await shot('05-立村勘察');

    const found = await ev('__S.finishScout()');
    console.log('  勘察到 ' + found + ' 处');
    await ev('__S.openDwelling()'); await sleep(500); await shot('06-择居');

    await ev('__S.chooseDwelling(0)');

    let shotTurn = false, shotDiplo = false, shotAct = false;
    let ended = false;
    for (let i = 0; i < 600; i++) {
      const k = await ev('__S.step()');
      if (k === 'ending') { ended = true; break; }
      if (k === 'stuck') break;
      if (k === 'choices') {
        if (!shotTurn) { await sleep(300); await shot('07-行动决策'); shotTurn = true; }
        await ev('__S.pick()');
      } else if (k === 'partner') {
        if (!shotDiplo) { await sleep(300); await shot('09-邦交择伴'); shotDiplo = true; }
        await ev('__S.resolvePartner()');
      } else if (k === 'diplo') {
        if (!shotDiplo) {
          await sleep(300); await shot('08-邦交问询');
          await ev('__S.resolveDiplo()');
          await sleep(600); await shot('09-邦交择伴');
          await ev('__S.resolvePartner()');
          shotDiplo = true;
        } else {
          await ev('__S.resolveDiplo()');
        }
      } else if (k === 'actend') {
        if (!shotAct) {
          shotAct = true;
          await sleep(400); await shot('10-幕末结算');
          await ev('__S.peek()'); await sleep(1100); await shot('11-看聚落');
          await ev('__S.exitPeek()'); await sleep(500);
        }
        await ev('__S.leaveActEnd()');
      }
    }
    if (!ended) throw new Error('没有走到结局（检查流程驱动）');

    await ev('__S.waitEndPanel(120)');
    await sleep(500); await shot('12-结局');
    await ev('__S.reveal()'); await sleep(600); await shot('13-终章揭晓');
    await ev('__S.gallery()'); await sleep(600); await shot('14-结局图鉴');

    console.log('场景：');
    const big = ['wall', 'well', 'granary', 'hall', 'altar', 'kiln', 'market', 'gate', 'dam'];
    const mk = (code, dwelling) => ({
      landId: code, settlementId: dwelling,
      stats: { pop: 96 }, built: [dwelling].concat(big), fields: 4, livestock: 3, act: 3
    });
    const scenes = [
      ['15-场景-河原-A', { code: 'A', sky: 'morning', weather: 'clear', state: mk('A', 'earth') }],
      ['16-场景-黄土塬-B', { code: 'B', sky: 'noon', weather: 'clear', state: mk('B', 'earth') }],
      ['17-场景-水乡-C', { code: 'C', sky: 'morning', weather: 'clear', state: mk('C', 'stilt') }],
      ['18-场景-草原-D', { code: 'D', sky: 'dusk', weather: 'clear', state: mk('D', 'stilt') }],
      ['19-场景-海岸-E', { code: 'E', sky: 'noon', weather: 'clear', state: mk('E', 'stone') }],
      ['20-场景-山间盆地-F', { code: 'F', sky: 'dawn', weather: 'clear', state: mk('F', 'earth') }],
      ['21-场景-夜火', { code: 'A', sky: 'night', weather: 'clear', state: mk('A', 'earth') }],
      ['22-场景-暴雨', { code: 'C', sky: 'storm', weather: 'storm', state: mk('C', 'stilt'), hold: 3600 }],
      ['23-场景-洪水', { code: 'A', sky: 'storm', weather: 'flood', state: mk('A', 'earth'), hold: 3800 }],
      ['24-场景-旱年', { code: 'B', sky: 'noon', weather: 'drought', state: mk('B', 'earth'), hold: 3800 }],
      ['25-场景-雪原', { code: 'D', sky: 'morning', weather: 'snow', state: mk('D', 'stilt'), hold: 3000 }]
    ];
    await ev('__S.prepareSceneMode()');
    await sleep(900);
    for (const [name, cfg] of scenes) {
      const st = await ev('__S.scene(' + JSON.stringify(cfg) + ')');
      await shot(name);
      console.log('    entities=' + st.entities + ' people=' + st.people);
    }

    console.log('\n全部截图已写入 ' + OUT);
  } finally {
    if (ws) try { ws.close(); } catch (e) {}
    proc.kill('SIGTERM');
  }
}

main().catch(e => { console.error('失败：' + (e && e.stack || e)); process.exit(1); });
