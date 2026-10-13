/* 演示 GIF 录制器：CDP 驱动无头 Chrome 打开 preview.html，
 * 手动步进引擎（确定性），逐帧 Page.captureScreenshot → tools/_frames/gif/f_*.png
 * 用法: node tools/record-gif.mjs   （需要本机 Chrome） */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dir, '..');
const CHROME = 'C:\\Users\\liuxi\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const CDP_PORT = 9333;
const SERVE_PORT = 8951;
const FRAMES_DIR = path.join(__dir, '_frames', 'gif');
const N_FRAMES = 144;                 // 每帧推进 100ms 仿真 → 14.4 秒
const STEP_FRAMES = 6;                // 6 × 16.7ms ≈ 100ms
const STEP_DT = 16.7;
const TARGET_URL = `http://127.0.0.1:${SERVE_PORT}/tools/preview.html`;

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function pollJson(url, timeoutMs) {
  const t0 = Date.now();
  for (;;) {
    try {
      const r = await fetch(url);
      if (r.ok) return await r.json();
    } catch (e) { /* not up yet */ }
    if (Date.now() - t0 > timeoutMs) throw new Error('poll timeout: ' + url);
    await sleep(250);
  }
}

function wsOpen(url, timeoutMs) {
  return new Promise((res, rej) => {
    const ws = new WebSocket(url);
    const t = setTimeout(() => rej(new Error('ws open timeout')), timeoutMs);
    ws.onopen = () => { clearTimeout(t); res(ws); };
    ws.onerror = () => { clearTimeout(t); rej(new Error('ws open error')); };
  });
}

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    ws.onmessage = ev => {
      const m = JSON.parse(ev.data);
      if (m.id && this.pending.has(m.id)) {
        const p = this.pending.get(m.id);
        this.pending.delete(m.id);
        m.error ? p.rej(new Error(m.error.message)) : p.res(m.result);
      }
    };
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((res, rej) => {
      this.pending.set(id, { res, rej });
      this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => {
        if (this.pending.has(id)) { this.pending.delete(id); rej(new Error('cdp timeout: ' + method)); }
      }, 30000);
    });
  }
}

async function evalJs(cdp, expr) {
  const r = await cdp.send('Runtime.evaluate', { expression: expr, returnByValue: true });
  if (r.exceptionDetails) {
    throw new Error('eval failed: ' + JSON.stringify(r.exceptionDetails.exception || r.exceptionDetails.text));
  }
  return r.result.value;
}

async function evalPoll(cdp, expr, timeoutMs, label) {
  const t0 = Date.now();
  for (;;) {
    let v = null;
    try { v = await evalJs(cdp, expr); } catch (e) { /* page not ready */ }
    if (v) return v;
    if (Date.now() - t0 > timeoutMs) throw new Error('poll timeout: ' + label);
    await sleep(200);
  }
}

let serve = null, chrome = null;
function cleanup() {
  for (const p of [chrome, serve]) {
    if (p && !p.killed) {
      try { spawn('taskkill', ['/pid', String(p.pid), '/T', '/F']); } catch (e) { p.kill(); }
    }
  }
}
process.on('SIGINT', () => { cleanup(); process.exit(130); });

try {
  fs.rmSync(FRAMES_DIR, { recursive: true, force: true });
  fs.mkdirSync(FRAMES_DIR, { recursive: true });

  // 1. 预览服务器
  serve = spawn(process.execPath, [path.join(__dir, 'serve.js'), String(SERVE_PORT)], { stdio: 'ignore' });
  await pollJson(`http://127.0.0.1:${SERVE_PORT}/manifest.json`, 8000);
  console.log('[1/5] serve.js ready :' + SERVE_PORT);

  // 2. 无头 Chrome + CDP
  const profile = path.join(ROOT, 'tools', '_frames', 'chrome-profile');
  fs.rmSync(profile, { recursive: true, force: true });
  chrome = spawn(CHROME, [
    '--headless=new',
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check',
    '--disable-extensions', '--disable-background-networking',
    '--mute-audio', '--hide-scrollbars', '--force-device-scale-factor=1',
    '--window-size=1280,800', '--disable-gpu',
    'about:blank'
  ], { stdio: 'ignore' });
  const targets = await pollJson(`http://127.0.0.1:${CDP_PORT}/json/list`, 20000);
  const page = targets.find(t => t.type === 'page');
  if (!page) throw new Error('no page target');
  console.log('[2/5] chrome headless up, target=' + page.id);

  // 3. 打开预览台并等引擎
  const ws = await wsOpen(page.webSocketDebuggerUrl, 15000);
  const cdp = new Cdp(ws);
  await cdp.send('Page.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1280, height: 800, deviceScaleFactor: 1, mobile: false
  });
  await cdp.send('Page.navigate', { url: TARGET_URL });
  await evalPoll(cdp, '!!(window.__wc && window.__wc.engine)', 15000, 'engine mount');
  console.log('[3/5] engine mounted');

  // 4. 推送演示设置（2 只蜘蛛 / 病毒模式 / 4.5s 恢复 / 关音效）
  await evalJs(cdp, `chrome.storage.local.set({ wc_settings: Object.assign({}, window.__defaults, {
    enabled: true, count: 2, speed: 1.05, mode: 'virus', skin: 'cyan',
    follow: true, trail: true, scale: 1.25,
    virusDuration: 4500, virusRadius: 280, sound: false, exclusions: []
  }) })`);
  await evalPoll(cdp, 'window.__wc.engine.spiders.length === 2', 5000, 'spiders=2');
  await evalJs(cdp, `document.querySelectorAll('.banner').forEach(function(n){n.remove();});`);
  // 暂停自动 rAF，接管为手动步进
  const st = await evalJs(cdp, `(function(){
    var e = window.__wc.engine;
    e.running = false; cancelAnimationFrame(e.raf); e.raf = 0;
    e.last = 0; e.__t = performance.now();
    return JSON.stringify({ spiders: e.spiders.length, corruptor: !!window.__wc.corruptor });
  })()`);
  console.log('[4/5] controlled: ' + st);

  // 5. 逐帧：步进 100ms → 截图
  const t0 = Date.now();
  for (let i = 0; i < N_FRAMES; i++) {
    await evalJs(cdp, `window.__step(${STEP_FRAMES}, ${STEP_DT})`);
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(FRAMES_DIR, `f_${String(i).padStart(4, '0')}.png`),
      Buffer.from(shot.data, 'base64'));
    if (i % 24 === 0) console.log(`  frame ${i}/${N_FRAMES} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  }
  console.log(`[5/5] captured ${N_FRAMES} frames in ${((Date.now() - t0) / 1000).toFixed(1)}s → tools/_frames/gif/`);

  ws.close();
} catch (e) {
  console.error('FAILED:', e.message);
  process.exitCode = 1;
} finally {
  cleanup();
}
