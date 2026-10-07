/* Web Crawler — 内容脚本
 * 1. 读取设置，拉起 / 销毁 蜘蛛引擎
 * 2. virus 模式：蜘蛛爬过的 DOM 元素被随机“感染”（高亮/变大/旋转/字距错乱），到期自动还原
 * 3. 监听 storage 变化 → 设置实时生效，无需刷新页面 */
(function () {
  'use strict';
  if (window.__WC_LOADED) return;
  window.__WC_LOADED = true;

  var WC = self.WC;
  var Engine = self.WCEngine && self.WCEngine.Engine;
  var audio = self.WCAudio;
  if (!WC || !Engine) return;

  var current = null;
  var engine = null;
  var corruptor = null;

  /* ---------------- 运行条件 ---------------- */
  function host() { try { return location.hostname; } catch (e) { return ''; } }

  function shouldRun(s) {
    if (!s || !s.enabled) return false;
    if (location.protocol !== 'http:' && location.protocol !== 'https:') return false;
    var h = host();
    if (!h) return false;
    if (s.exclusions && s.exclusions.indexOf(h) >= 0) return false;
    return true;
  }

  function teardown() {
    if (engine) { engine.stop(); engine = null; }
    if (corruptor) { corruptor.stop(true); corruptor = null; }
    if (audio) audio.suspend();      // 停用 / 排除 → 挂起音频上下文，绝对安静且省电
  }

  function apply(raw) {
    current = WC.normalize(WC.copy(raw || {}, WC.clone(WC.DEFAULTS)));
    if (!shouldRun(current)) { teardown(); return; }
    if (audio) audio.configure(current.sound, current.volume);   // 音效开关与音量实时生效
    if (!engine) { engine = new Engine(current); engine.mount(); }
    engine.sync(current);
    if (current.mode === 'virus') {
      if (!corruptor) corruptor = new Corruptor();
      corruptor.attach(engine, current);
    } else if (corruptor) {
      corruptor.stop(true);
      corruptor = null;
    }
  }

  /* ---------------- 病毒感染效果 ---------------- */
  var PALETTE = ['#00e5ff', '#ff2ec4', '#ffea00', '#7cff00', '#2f6bff', '#ff6a00', '#ff2d55', '#f3f6ff'];
  var SKIP_TAGS = {
    INPUT: 1, TEXTAREA: 1, SELECT: 1, OPTION: 1, VIDEO: 1, AUDIO: 1, IFRAME: 1,
    CANVAS: 1, IMG: 1, SVG: 1, SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, OBJECT: 1,
    EMBED: 1, PROGRESS: 1, METER: 1, SOURCE: 1, TRACK: 1, BR: 1, HR: 1, PATH: 1,
    HTML: 1, HEAD: 1, BODY: 1   // 整页容器不碰，避免整个页面被染色
  };
  // 加权突变池：越靠后出现概率越低的排在后面
  var POOL = [
    'highlight', 'highlight', 'highlight',
    'color', 'color',
    'outline', 'outline',
    'glow',
    'big',
    'spread',
    'rotate',
    'deco',
    'italic', 'bold'
  ];

  function contrastOf(hex) {
    var h = hex.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return (r * 0.299 + g * 0.587 + b * 0.114) > 145 ? '#000000' : '#ffffff';
  }

  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }

  function setProp(el, props, prop, value) {
    if (Object.prototype.hasOwnProperty.call(props, prop)) return;
    props[prop] = el.style.getPropertyValue(prop) || '';
    el.style.setProperty(prop, value, '');
  }

  function applyMutation(name, el, props) {
    var c = pick(PALETTE);
    switch (name) {
      case 'highlight':
        setProp(el, props, 'background-color', c);
        setProp(el, props, 'color', contrastOf(c));
        break;
      case 'color':
        setProp(el, props, 'color', c);
        break;
      case 'outline':
        setProp(el, props, 'outline', '2px solid ' + c);
        setProp(el, props, 'outline-offset', '2px');
        break;
      case 'glow':
        setProp(el, props, 'text-shadow', '0 0 7px ' + c);
        break;
      case 'big': {
        var fs = parseFloat((window.getComputedStyle(el).fontSize) || '0') || 16;
        if (fs < 34) setProp(el, props, 'font-size', (fs * rand(1.5, 3)).toFixed(1) + 'px');
        break;
      }
      case 'spread':
        setProp(el, props, 'letter-spacing', rand(0.06, 0.42).toFixed(2) + 'em');
        break;
      case 'rotate': {
        if (window.getComputedStyle(el).display === 'inline') setProp(el, props, 'display', 'inline-block');
        setProp(el, props, 'transform', 'rotate(' + rand(-14, 14).toFixed(1) + 'deg)');
        break;
      }
      case 'deco':
        setProp(el, props, 'text-decoration', pick(['line-through', 'underline', 'overline']) + ' ' + c);
        break;
      case 'italic':
        setProp(el, props, 'font-style', 'italic');
        break;
      case 'bold':
        setProp(el, props, 'font-weight', '900');
        break;
    }
  }

  /* 打字防护：只在“最近确实敲过字”时暂停感染。
   * 仅自动聚焦（如淘宝/京东首页自动聚焦搜索框）不应永久禁用特效——
   * 修复前只要焦点在输入框就一直 return，导致整个页面永远无特效。 */
  var lastTypingAt = 0;
  try {
    ['keydown', 'input', 'paste', 'cut'].forEach(function (ev) {
      document.addEventListener(ev, function (e) {
        var el = e.target;
        if (!el || el.nodeType !== 1) return;
        var t = el.tagName;
        if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT' || el.isContentEditable) lastTypingAt = Date.now();
      }, { capture: true, passive: true });
    });
  } catch (e) { /* ignore */ }

  function isTyping() {
    var a = document.activeElement;
    if (!a) return false;
    var t = a.tagName;
    var editable = t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT' || !!a.isContentEditable;
    if (!editable) return false;
    return Date.now() - lastTypingAt < 1500;   // 1.5 秒内敲过字才算“正在输入”
  }

  function Corruptor() {
    this.engine = null;
    this.settings = null;
    this.active = [];        // { el, props, until }
    this.candidates = [];
    this.candAt = 0;
    this.timer = 0;
    this.running = false;
    this.stopped = false;
  }

  Corruptor.prototype.attach = function (engine, settings) {
    this.engine = engine;
    this.settings = settings;
    if (this.running) return;
    this.running = true;
    this.stopped = false;
    var self = this;
    var tick = function () {
      if (!self.running || self.stopped) return;
      try { self.step(); } catch (e) { /* 单帧出错不影响页面 */ }
      self.timer = setTimeout(tick, 130);
    };
    this.timer = setTimeout(tick, 130);
  };

  Corruptor.prototype.stop = function (restoreAll) {
    this.running = false;
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = 0;
    if (restoreAll) this.restoreAll();
  };

  Corruptor.prototype.step = function () {
    var s = this.settings;
    if (!s || !this.engine) return;
    var lim = WC.limits(s);
    var now = Date.now();

    this.restoreExpired(now);
    if (isTyping()) return;                       // 用户正在输入时不打扰
    if (this.active.length >= lim.virusMaxActive) return;

    /* 蜘蛛落点直接感染 */
    var pts = this.engine.anchors();
    var tries = Math.min(pts.length, 5);
    for (var i = 0; i < tries; i++) {
      if (this.active.length >= lim.virusMaxActive) break;
      if (Math.random() > 0.34) continue;
      var p = pts[(Math.random() * pts.length) | 0];
      var el = document.elementFromPoint(p.x, p.y);
      this.corrupt(el, lim, s);
    }

    /* 半径内扩散（制造“整页被感染”的观感） */
    if (Math.random() < 0.55) this.spread(lim, s);
  };

  Corruptor.prototype.spread = function (lim, s) {
    var now = Date.now();
    if (now - this.candAt > 1200 || !this.candidates.length) this.rebuild();
    if (!this.candidates.length) return;
    var radius = Math.min(s.virusRadius || 160, lim.virusRadius);
    var bodies = this.engine.bodies();
    for (var n = 0; n < lim.virusBurst; n++) {
      if (this.active.length >= lim.virusMaxActive) return;
      var el = this.candidates[(Math.random() * this.candidates.length) | 0];
      if (!el || !el.isConnected) continue;
      var r = el.getBoundingClientRect();
      var hit = false;
      for (var b = 0; b < bodies.length; b++) {
        var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        if (Math.hypot(cx - bodies[b].x, cy - bodies[b].y) <= radius) { hit = true; break; }
      }
      if (hit) this.corrupt(el, lim, s);
    }
  };

  Corruptor.prototype.rebuild = function () {
    var vw = window.innerWidth, vh = window.innerHeight;
    var list = [];
    var nodes = document.querySelectorAll(
      'p,li,td,th,h1,h2,h3,h4,h5,blockquote,figcaption,cite,dt,dd,summary,label,a,button');
    for (var i = 0; i < nodes.length && list.length < 500; i++) {
      var el = nodes[i];
      if (SKIP_TAGS[el.tagName.toUpperCase()] || el.hasAttribute('data-wc')) continue;
      if (!el.textContent || !el.textContent.trim()) continue;
      var r = el.getBoundingClientRect();
      if (r.width < 8 || r.height < 6) continue;
      if (r.bottom < 0 || r.top > vh || r.right < 0 || r.left > vw) continue;
      if (r.width > vw * 1.6 || r.height > vh * 1.6) continue;
      list.push(el);
    }
    this.candidates = list;
    this.candAt = Date.now();
  };

  Corruptor.prototype.corrupt = function (el, lim, s) {
    if (!el || el.nodeType !== 1 || !el.isConnected) return false;
    if (this.active.length >= lim.virusMaxActive) return false;
    if (el.hasAttribute('data-wc')) return false;
    if (SKIP_TAGS[el.tagName.toUpperCase()]) return false;
    if (el.isContentEditable) return false;
    if (!el.textContent || !el.textContent.trim()) return false;   // 没有文字的空容器不碰
    if (el.closest && (el.closest('[data-wc-skip]') ||
        el.closest('input,textarea,select,[contenteditable="true"]'))) return false;
    var r = el.getBoundingClientRect();
    if (r.width < 6 || r.height < 6) return false;
    // 巨型容器（整屏级别的块）不碰，只感染真正的文本/小组件
    if (r.width * r.height > window.innerWidth * window.innerHeight * 0.5) return false;

    var pro = WC.tierOf(s) === 'pro';
    var maxMut = pro ? 3 : 2;
    var count = 1 + ((Math.random() < 0.55) ? 1 : 0) + ((pro && Math.random() < 0.35) ? 1 : 0);
    count = Math.min(count, maxMut);

    var props = {};
    var used = {};
    for (var i = 0; i < count; i++) {
      var name = pick(POOL);
      if (used[name]) continue;
      used[name] = 1;
      applyMutation(name, el, props);
    }
    if (!Object.keys(props).length) return false;

    el.setAttribute('data-wc', '1');
    var dur = (s.virusDuration || 9000) * rand(0.55, 1.5);
    this.active.push({ el: el, props: props, until: Date.now() + dur });
    if (audio) audio.zap();          // 感染“电”一下（内部 100ms 限流）
    return true;
  };

  Corruptor.prototype.restoreOne = function (item) {
    var el = item.el;
    try {
      if (el && el.isConnected) {
        for (var prop in item.props) {
          if (!Object.prototype.hasOwnProperty.call(item.props, prop)) continue;
          var v = item.props[prop];
          if (v === '' || v == null) el.style.removeProperty(prop);
          else el.style.setProperty(prop, v, '');
        }
        el.removeAttribute('data-wc');
      }
    } catch (e) { /* 元素可能已被页面移除 */ }
  };

  Corruptor.prototype.restoreExpired = function (now) {
    for (var i = this.active.length - 1; i >= 0; i--) {
      if (this.active[i].until <= now) {
        this.restoreOne(this.active[i]);
        this.active.splice(i, 1);
      }
    }
  };

  Corruptor.prototype.restoreAll = function () {
    for (var i = 0; i < this.active.length; i++) this.restoreOne(this.active[i]);
    this.active = [];
    this.candidates = [];
  };

  /* ---------------- 启停与消息 ---------------- */
  WC.getSettings(apply);

  try {
    chrome.storage.onChanged.addListener(function (changes, area) {
      if (area !== 'local' || !changes.wc_settings) return;
      apply(changes.wc_settings.newValue);
    });
  } catch (e) { /* ignore */ }

  try {
    chrome.runtime.onMessage.addListener(function (msg, sender, respond) {
      if (!msg || typeof msg.type !== 'string') return;
      if (msg.type === 'wc:state') {
        respond({
          host: host(),
          running: !!engine,
          spiders: engine ? engine.spiders.length : 0,
          mode: current ? current.mode : null,
          corrupted: corruptor ? corruptor.active.length : 0
        });
        return true;
      }
      if (msg.type === 'wc:reload') {
        WC.getSettings(apply);
        respond({ ok: true });
        return true;
      }
    });
  } catch (e) { /* ignore */ }

  /* 调试钩子：控制台里可用 window.__wc 查看引擎状态 */
  try {
    window.__wc = {
      get engine() { return engine; },
      get corruptor() { return corruptor; },
      get settings() { return current; },
      apply: apply
    };
  } catch (e) { /* ignore */ }
})();
