/* Web Crawler — 音效（Web Audio 现场合成，零音频文件、零依赖、不联网）
 *
 *  三种声音：
 *    step — 落脚：带通白噪声短脉冲（蛛足“哒”的一声，前腿音高略高）
 *    zap  — 感染：方波+锯齿快速下滑过低通（赛博“电”一下）
 *    blip — 出生：正弦上滑（新蜘蛛进场）
 *
 *  关键行为：
 *    - configure(sound, volume)：sound=false 时挂起上下文（省电、绝对安静）
 *    - 自动播放策略：上下文创建后处于 suspended，等页面首个用户手势再 resume；
 *      手势到来前的事件静默丢弃（计入 stats.dropped），不排队、不报错
 *    - 全局限流：step 26ms、zap 100ms、blip 60ms；同时发声上限 14
 *    - testRender(kind)：用 OfflineAudioContext 实渲染并返回峰值，供自动化验证
 */
(function (root) {
  'use strict';

  var AC = root.AudioContext || root.webkitAudioContext;
  var ctx = null, master = null;
  var on = true, vol = 0.5;
  var last = { step: 0, zap: 0, blip: 0 };
  var voices = 0;
  var dbg = { step: 0, zap: 0, blip: 0, dropped: 0 };
  var GESTURES = ['pointerdown', 'mousedown', 'touchstart', 'keydown'];

  function now() {
    return (root.performance && root.performance.now) ? root.performance.now() : Date.now();
  }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  /* ---------------- 上下文生命周期 ---------------- */
  function resume() {
    if (!ctx || ctx.state !== 'suspended') return;
    try {
      var p = ctx.resume();
      if (p && p.then) p.catch(function () {});
    } catch (e) { /* 无手势时会拒绝，忽略 */ }
  }

  function onGesture() {
    resume();
    if (ctx && ctx.state === 'running') unlisten();
  }
  function listen() {
    for (var i = 0; i < GESTURES.length; i++) {
      try { root.addEventListener(GESTURES[i], onGesture, { capture: true, passive: true }); } catch (e) {}
    }
  }
  function unlisten() {
    for (var i = 0; i < GESTURES.length; i++) {
      try { root.removeEventListener(GESTURES[i], onGesture, { capture: true }); } catch (e) {}
    }
  }

  function ensure() {
    if (ctx || !AC) return ctx;
    try {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = clamp01(vol);
      master.connect(ctx.destination);
      listen();
      resume();
    } catch (e) { ctx = null; master = null; }
    return ctx;
  }

  /* 就绪检查：开关关 / 无上下文 / 尚未获手势 → 返回 null（静默丢弃） */
  function ready() {
    if (!on) return null;
    ensure();
    if (!ctx) return null;
    if (ctx.state === 'running') return ctx;
    resume();
    dbg.dropped++;
    return null;
  }

  /* ---------------- 声音构建（参数化到任意 BaseAudioContext，便于离线渲染测试） */
  function getNoise(c) {
    if (!c.__wcNoise) {
      var n = Math.floor(c.sampleRate * 0.05);
      var b = c.createBuffer(1, n, c.sampleRate);
      var d = b.getChannelData(0);
      for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      c.__wcNoise = b;
    }
    return c.__wcNoise;
  }

  /* 落脚 tick：噪声 → 带通 → 高通 → 短包络 */
  function buildTick(c, dest, t, pitch, amp) {
    var src = c.createBufferSource();
    src.buffer = getNoise(c);
    src.playbackRate.value = rand(0.85, 1.25);
    var bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = (2100 + Math.random() * 900) * pitch;
    bp.Q.value = 2.2;
    var hp = c.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 900;
    var g = c.createGain();
    var dur = rand(0.03, 0.055);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(amp, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bp); bp.connect(hp); hp.connect(g); g.connect(dest);
    src.start(t);
    src.stop(t + dur + 0.02);
    return src;
  }

  /* 感染 zap：方波+锯齿 → 下滑低通 → 快包络 */
  function buildZap(c, dest, t, amp) {
    var f0 = rand(640, 1160), f1 = rand(140, 270);
    var o1 = c.createOscillator();
    o1.type = 'square';
    o1.frequency.setValueAtTime(f0, t);
    o1.frequency.exponentialRampToValueAtTime(f1, t + 0.12);
    var o2 = c.createOscillator();
    o2.type = 'sawtooth';
    o2.frequency.setValueAtTime(f0 * 1.011, t);
    o2.frequency.exponentialRampToValueAtTime(f1 * 1.5, t + 0.10);
    var lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(3400, t);
    lp.frequency.exponentialRampToValueAtTime(700, t + 0.13);
    lp.Q.value = 1.2;
    var g = c.createGain();
    var dur = 0.15;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(amp, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o1.connect(lp); o2.connect(lp); lp.connect(g); g.connect(dest);
    o1.start(t); o1.stop(t + dur);
    o2.start(t); o2.stop(t + dur);
    return o1;
  }

  /* 出生 blip：正弦上滑 */
  function buildBlip(c, dest, t, pitch, amp) {
    var o = c.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(260 * pitch, t);
    o.frequency.exponentialRampToValueAtTime(760 * pitch, t + 0.15);
    var g = c.createGain();
    var dur = 0.24;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(amp, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest);
    o.start(t);
    o.stop(t + dur + 0.02);
    return o;
  }

  /* 发声数跟踪（onended + 兜底定时器，只减一次） */
  function track(c, node, t, dur) {
    if (voices >= 14) { dbg.dropped++; return false; }
    voices++;
    var fired = false;
    var done = function () {
      if (fired) return;
      fired = true;
      voices = voices > 0 ? voices - 1 : 0;
    };
    node.onended = done;
    setTimeout(done, Math.max(0, (t - c.currentTime) * 1000) + dur * 1000 + 800);
    return true;
  }

  /* ---------------- 对外接口 ---------------- */
  function step(pitch) {
    var c = ready();
    if (!c) return;
    var t0 = now();
    if (t0 - last.step < 26) return;
    last.step = t0;
    var t = c.currentTime + 0.005;
    if (!track(c, buildTick(c, master, t, pitch || 1, 0.16), t, 0.1)) return;
    dbg.step++;
  }

  function zap() {
    var c = ready();
    if (!c) return;
    var t0 = now();
    if (t0 - last.zap < 100) return;
    last.zap = t0;
    var t = c.currentTime + 0.005;
    if (!track(c, buildZap(c, master, t, 0.10), t, 0.25)) return;
    dbg.zap++;
  }

  function blip(pitch) {
    var c = ready();
    if (!c) return;
    var t0 = now();
    if (t0 - last.blip < 60) return;
    last.blip = t0;
    var t = c.currentTime + 0.005;
    if (!track(c, buildBlip(c, master, t, pitch || 1, 0.10), t, 0.35)) return;
    dbg.blip++;
  }

  /* 设置生效：关 → 挂起；开 → 建上下文 + 调音量 + 尝试恢复 */
  function configure(sound, volume) {
    on = sound !== false;
    if (typeof volume === 'number' && isFinite(volume)) vol = clamp01(volume);
    if (!on) {
      if (ctx) { try { ctx.suspend(); } catch (e) {} unlisten(); }
      return;
    }
    ensure();
    if (master) master.gain.value = vol;
    resume();
    if (ctx && ctx.state === 'running') unlisten(); else listen();
  }

  /* 页面停用 / 站点排除时挂起 */
  function suspend() {
    on = false;
    if (ctx) { try { ctx.suspend(); } catch (e) {} }
    unlisten();
  }

  function stats() {
    return {
      state: ctx ? ctx.state : 'none',
      on: on,
      volume: vol,
      voices: voices,
      step: dbg.step,
      zap: dbg.zap,
      blip: dbg.blip,
      dropped: dbg.dropped
    };
  }

  /* 自动化验证：离线渲染一种声音，返回峰值（0 = 静音，>0.001 = 正常出声） */
  function testRender(kind) {
    var OAC = root.OfflineAudioContext || root.webkitOfflineAudioContext;
    if (!OAC || !Promise) return Promise.reject(new Error('no OfflineAudioContext'));
    var c = new OAC(1, Math.floor(44100 * 0.4), 44100);
    var t = 0.02;
    if (kind === 'zap') buildZap(c, c.destination, t, 0.10);
    else if (kind === 'blip') buildBlip(c, c.destination, t, 1, 0.10);
    else buildTick(c, c.destination, t, 1, 0.16);
    var done = function (buf) {
      var d = buf.getChannelData(0), peak = 0;
      for (var i = 0; i < d.length; i++) {
        var a = d[i] < 0 ? -d[i] : d[i];
        if (a > peak) peak = a;
      }
      return peak;
    };
    var p = c.startRendering();
    if (p && p.then) return p.then(done);
    return new Promise(function (res, rej) {
      c.oncomplete = function (e) { try { res(done(e.renderedBuffer)); } catch (err) { rej(err); } };
      c.onerror = function () { rej(new Error('render fail')); };
    });
  }

  root.WCAudio = {
    configure: configure,
    suspend: suspend,
    step: step,
    zap: zap,
    blip: blip,
    stats: stats,
    testRender: testRender
  };
})(typeof self !== 'undefined' ? self : this);
