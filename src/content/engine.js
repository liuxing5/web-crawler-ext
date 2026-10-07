/* Web Crawler — 蜘蛛引擎
 * - 8 条腿（4 对），交替步态（对角组），两骨 IK 解算膝关节
 * - 腚固定在“文档坐标”，页面滚动时脚不打滑
 * - 靠近视口边缘时可让页面跟随滚动，蜘蛛像真的在文档里爬
 * - 单个 fixed canvas 覆盖层绘制，pointer-events:none，不影响页面交互
 * 依赖：WC（config.js） */
(function (root) {
  'use strict';

  var WC = root.WC;
  var audio = root.WCAudio || null;   // audio.js 需先于本文件加载（缺了也不报错）
  var TAU = Math.PI * 2;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function ease(t) { return t * t * (3 - 2 * t); }
  function angNorm(a) { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; }

  /* hex 转 rgba 字符串 */
  function hexA(hex, a) {
    var h = hex.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  /* ============================ 蜘蛛个体 ============================ */
  function Spider(opts) {
    opts = opts || {};
    this.scale = opts.scale || 1;
    this.skin = opts.skin || WC.SKINS.cyan;
    this.x = opts.x || 200;
    this.y = opts.y || 200;
    this.heading = opts.heading != null ? opts.heading : Math.random() * TAU;
    this.speed = 0;
    this.cruise = opts.cruise || 62;
    this.target = null;
    this.pauseUntil = (opts.now || 0) + rand(200, 1200);
    this.phase = Math.random();
    this.activeGroup = -1;

    // 身体与腿尺寸（scale = 1 时，腿展约 150px）
    this.bodyLen = 24 * this.scale;
    this.bodyWid = 11 * this.scale;
    this.femur = 44 * this.scale;
    this.tibia = 52 * this.scale;
    this.maxReach = (this.femur + this.tibia) * 0.96;
    this.restLen = (this.femur + this.tibia) * 0.66;

    this.legs = [];
    for (var i = 0; i < 8; i++) this.legs.push(makeLeg(i));
    this.trail = [];
    this.bob = Math.random() * TAU;
    this.lastScrollY = null;
  }

  function makeLeg(i) {
    var side = i < 4 ? -1 : 1;     // -1 左 / 1 右
    var j = i % 4;                 // 0 前 → 3 后
    // 交替步态：左前+左后+右 2、4 为一组，其余为一组
    return {
      i: i,
      side: side,
      j: j,
      group: ((side < 0) === (j % 2 === 0)) ? 0 : 1,
      foot: { x: 0, y: 0 },        // 文档坐标
      swing: null,                 // {fx,fy,tx,ty,t,dur,px,py}
      jitter: Math.random() * 0.05
    };
  }

  Spider.prototype.hipScreen = function (leg) {
    var f = (1.5 - leg.j) * 0.30 * this.bodyLen;      // 沿身体前后
    var lat = leg.side * this.bodyWid * 0.46;          // 沿身体左右
    var fx = Math.cos(this.heading), fy = Math.sin(this.heading);
    return { x: this.x + fx * f - fy * lat, y: this.y + fy * f + fx * lat };
  };

  /* 腿的静止方向：前腿朝前、后腿朝后 */
  Spider.prototype.restAngle = function (leg) {
    var fwd = 0.62 - leg.j * 0.40;
    return this.heading + leg.side * (Math.PI / 2) - leg.side * fwd;
  };

  Spider.prototype.poseFeet = function (scrollX, scrollY) {
    for (var i = 0; i < this.legs.length; i++) {
      var leg = this.legs[i];
      var hip = this.hipScreen(leg);
      var a = this.restAngle(leg);
      leg.foot.x = hip.x + Math.cos(a) * this.restLen + scrollX;
      leg.foot.y = hip.y + Math.sin(a) * this.restLen + scrollY;
    }
    this.lastScrollY = scrollY;
  };

  Spider.prototype.pickTarget = function (ctx) {
    var m = 70;
    var biasX = Math.cos(this.heading) * ctx.vw * 0.22;
    var biasY = Math.sin(this.heading) * ctx.vh * 0.26;
    this.target = {
      x: clamp(this.x + biasX + rand(-0.3, 0.3) * ctx.vw, m, Math.max(m, ctx.vw - m)),
      y: clamp(this.y + biasY + rand(-0.35, 0.35) * ctx.vh, m, Math.max(m, ctx.vh - m))
    };
  };

  Spider.prototype.startSwing = function (leg, hx, hy) {
    var a = this.restAngle(leg);
    var lead = 0.16 + Math.random() * 0.08;
    var vx = Math.cos(this.heading) * this.speed * lead;
    var vy = Math.sin(this.heading) * this.speed * lead;
    var tx = hx + vx + Math.cos(a) * this.restLen;
    var ty = hy + vy + Math.sin(a) * this.restLen;
    var dx = tx - leg.foot.x, dy = ty - leg.foot.y;
    var len = Math.hypot(dx, dy) || 1;
    leg.swing = {
      fx: leg.foot.x, fy: leg.foot.y, tx: tx, ty: ty, t: 0,
      dur: clamp(0.07 + 5 / Math.max(this.speed, 18), 0.08, 0.18) * rand(0.9, 1.1),
      px: -dy / len, py: dx / len        // 抬腿弧线的垂直方向
    };
  };

  Spider.prototype.update = function (dt, ctx) {
    var now = ctx.now, i, leg;

    /* 1) 页面滚动补偿：身体跟随内容移动，脚固定在文档坐标 */
    if (this.lastScrollY != null && ctx.scrollY !== this.lastScrollY) {
      this.y -= (ctx.scrollY - this.lastScrollY);
    }
    this.lastScrollY = ctx.scrollY;

    /* 2) 决策：走 → 停 → 走 */
    if (now >= this.pauseUntil) {
      if (!this.target) this.pickTarget(ctx);
      var dx = this.target.x - this.x, dy = this.target.y - this.y;
      var dist = Math.hypot(dx, dy);
      var diff = angNorm(Math.atan2(dy, dx) - this.heading);
      this.heading += clamp(diff, -3.4 * dt, 3.4 * dt);
      var align = Math.max(0, Math.cos(diff));
      var goal = this.cruise * (0.3 + 0.7 * align);
      if (dist < 70) goal *= Math.max(0.12, dist / 70);
      this.speed += clamp(goal - this.speed, -260 * dt, 200 * dt);
      if (dist < 16) {
        this.target = null;
        this.pauseUntil = now + rand(400, 2400);
      }
    } else {
      this.speed = Math.max(0, this.speed - 340 * dt);
    }

    /* 3) 位移 */
    if (this.speed > 0) {
      this.x += Math.cos(this.heading) * this.speed * dt;
      this.y += Math.sin(this.heading) * this.speed * dt;
    }
    this.bob += dt * (1.6 + this.speed * 0.045);

    /* 4) 水平边界 */
    var mx = 60, my = 46;
    if (this.x < mx) { this.x = mx; this.target = null; }
    if (this.x > ctx.vw - mx) { this.x = ctx.vw - mx; this.target = null; }

    /* 5) 垂直方向：可滚动时让页面跟着蜘蛛走，走到底就贴边 */
    if (ctx.follow && this.speed > 6) {
      if (this.y > ctx.vh - my) {
        var want = this.y - (ctx.vh - my);
        var before = ctx.scrollY;
        var after = ctx.scrollBy(0, want);
        var real = after - before;
        this.y -= real;
        this.lastScrollY = after;
        if (real < want - 0.5) this.y = ctx.vh - my;   // 文档已到底，贴边即可
      } else if (this.y < my) {
        var want2 = my - this.y;
        var before2 = ctx.scrollY;
        var after2 = ctx.scrollBy(0, -want2);
        var real2 = after2 - before2;
        this.y -= real2;
        this.lastScrollY = after2;
        if (-real2 < want2 - 0.5) this.y = my;         // 文档已到顶
      }
    } else {
      this.y = clamp(this.y, my, Math.max(my, ctx.vh - my));
    }

    /* 6) 步态：相位推进 → 交替组 → 足够远就迈腿 */
    var moving = this.speed > 5;
    if (moving) {
      var stride = 30 * this.scale;
      this.phase += dt * clamp(this.speed / stride, 0.8, 7);
      if (this.phase > 1000000) this.phase -= 1000000;
    }
    var cyc = this.phase - Math.floor(this.phase);
    var grp = cyc < 0.5 ? 0 : 1;
    if (grp !== this.activeGroup) this.activeGroup = grp;

    for (i = 0; i < this.legs.length; i++) {
      leg = this.legs[i];
      var hip = this.hipScreen(leg);
      var hx = hip.x + ctx.scrollX, hy = hip.y + ctx.scrollY;
      var d = Math.hypot(leg.foot.x - hx, leg.foot.y - hy);

      if (leg.swing) {
        leg.swing.t += dt / leg.swing.dur;
        if (leg.swing.t >= 1) {
          leg.foot.x = leg.swing.tx;
          leg.foot.y = leg.swing.ty;
          leg.swing = null;
          // 落脚“哒”：前腿音高略高、后腿略低，八条腿此起彼伏
          if (audio) audio.step(1 + (1.5 - leg.j) * 0.1);
        } else {
          var t = ease(leg.swing.t);
          var nx = leg.swing.fx + (leg.swing.tx - leg.swing.fx) * t;
          var ny = leg.swing.fy + (leg.swing.ty - leg.swing.fy) * t;
          var lift = Math.sin(Math.PI * leg.swing.t);
          leg.foot.x = nx + leg.swing.px * lift * 5 * this.scale;
          leg.foot.y = ny + leg.swing.py * lift * 5 * this.scale;
        }
        continue;
      }

      if (!moving) continue;

      var overreach = d > this.maxReach;                       // 拉得太开
      var collapse = d < this.restLen * 0.55;                  // 缩到髋下
      var isActive = leg.group === this.activeGroup;
      var eager = isActive && d > this.restLen * (1.10 + leg.jitter);
      if (overreach || collapse || eager) this.startSwing(leg, hx, hy);
    }

    /* 7) 拖尾（文档坐标） */
    if (this.trailOn && moving) {
      this.trail.push({ x: this.x + ctx.scrollX, y: this.y + ctx.scrollY });
      if (this.trail.length > 46) this.trail.shift();
    } else if (this.trail.length) {
      this.trail.shift();
    }
  };

  /* 两骨 IK：髋 → 膝 → 足，膝朝身体外侧（蜘蛛抬膝观感） */
  Spider.prototype.kneePoint = function (hip, foot, lift) {
    var dx = foot.x - hip.x, dy = foot.y - hip.y;
    var d = Math.hypot(dx, dy) || 0.001;
    var a = this.femur, b = this.tibia;
    var dd = clamp(d, Math.abs(a - b) + 0.01, a + b - 0.01);
    var proj = Math.max((dd * dd + a * a - b * b) / (2 * dd), 0.001);
    var h = Math.sqrt(Math.max(0, a * a - proj * proj));
    var ux = dx / d, uy = dy / d;
    var mx = hip.x + ux * proj, my = hip.y + uy * proj;
    var px = -uy, py = ux;
    if (px * (mx - this.x) + py * (my - this.y) < 0) { px = -px; py = -py; }
    h *= (1 + 0.18 * lift);
    return { x: mx + px * h, y: my + py * h };
  };

  /* flat = 扁平坐标数组，每 6 个数一条腿：hip.x,hip.y,knee.x,knee.y,foot.x,foot.y */
  function strokeChain(g, flat, color, width, alpha) {
    g.globalAlpha = alpha;
    g.strokeStyle = color;
    g.lineWidth = width;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.beginPath();
    for (var i = 0; i + 5 < flat.length; i += 6) {
      g.moveTo(flat[i], flat[i + 1]);
      g.lineTo(flat[i + 2], flat[i + 3]);
      g.lineTo(flat[i + 4], flat[i + 5]);
    }
    g.stroke();
    g.globalAlpha = 1;
  }

  Spider.prototype.draw = function (g, view) {
    var skin = this.skin;
    var sx = view.scrollX, sy = view.scrollY;
    var i;

    /* 蜘蛛丝拖尾 */
    if (this.trail.length > 1) {
      g.lineWidth = 1;
      for (var k = 1; k < this.trail.length; k++) {
        var p0 = this.trail[k - 1], p1 = this.trail[k];
        g.strokeStyle = hexA(skin.leg, (k / this.trail.length) * 0.30);
        g.beginPath();
        g.moveTo(p0.x - sx, p0.y - sy);
        g.lineTo(p1.x - sx, p1.y - sy);
        g.stroke();
      }
    }

    /* 腿：先算所有关节点 */
    var chains = [];
    var joints = [];
    for (i = 0; i < this.legs.length; i++) {
      var leg = this.legs[i];
      var hip = this.hipScreen(leg);
      var foot = { x: leg.foot.x - sx, y: leg.foot.y - sy };
      var lift = leg.swing ? Math.sin(Math.PI * leg.swing.t) : 0;
      var knee = this.kneePoint(hip, foot, lift);
      chains.push([hip.x, hip.y, knee.x, knee.y, foot.x, foot.y]);
      joints.push([knee.x, knee.y, foot.x, foot.y]);
    }

    /* 辉光 + 实线 */
    var flat = [];
    for (i = 0; i < chains.length; i++) flat.push.apply(flat, chains[i]);
    strokeChain(g, flat, skin.leg, 5.5, 0.12);
    strokeChain(g, flat, skin.leg, 1.7, 1);

    /* 关节红点 / 足尖点（限制上限，避免大体型下变成一坨） */
    var jr = Math.min(2.5 * this.scale, 4.2);
    var fr = Math.min(1.8 * this.scale, 3.1);
    for (i = 0; i < joints.length; i++) {
      g.fillStyle = skin.joint;
      g.beginPath();
      g.arc(joints[i][0], joints[i][1], jr, 0, TAU);
      g.fill();
      g.beginPath();
      g.arc(joints[i][2], joints[i][3], fr, 0, TAU);
      g.fill();
    }

    /* 身体 */
    var bobY = Math.sin(this.bob) * 1.3 * this.scale;
    g.save();
    g.translate(this.x, this.y + bobY);
    g.rotate(this.heading);
    g.lineWidth = 1.2;
    g.strokeStyle = skin.leg;
    g.fillStyle = skin.body;
    // 腹部（大）
    g.beginPath();
    g.ellipse(-this.bodyLen * 0.20, 0, this.bodyLen * 0.46, this.bodyWid * 0.5, 0, 0, TAU);
    g.fill(); g.stroke();
    // 头胸部（与腹部重叠，连成一体）
    g.beginPath();
    g.ellipse(this.bodyLen * 0.26, 0, this.bodyLen * 0.27, this.bodyWid * 0.4, 0, 0, TAU);
    g.fill(); g.stroke();
    // 核心亮点
    g.fillStyle = skin.core;
    g.beginPath();
    g.arc(-this.bodyLen * 0.04, 0, this.bodyWid * 0.15 + 1.1, 0, TAU);
    g.fill();
    g.restore();
  };

  /* 身体 + 8 只脚的屏幕坐标（供“病毒”效果定位元素） */
  Spider.prototype.anchors = function (view) {
    var pts = [{ x: this.x, y: this.y }];
    for (var i = 0; i < this.legs.length; i++) {
      pts.push({ x: this.legs[i].foot.x - view.scrollX, y: this.legs[i].foot.y - view.scrollY });
    }
    return pts;
  };

  /* ============================ 舞台（canvas + 主循环） ============================ */
  function Engine(settings) {
    this.settings = settings;
    this.spiders = [];
    this.canvas = null;
    this.g = null;
    this.running = false;
    this.raf = 0;
    this.last = 0;
    this.view = { scrollX: 0, scrollY: 0 };
    this.userHoldUntil = 0;      // 此时刻之前：用户正在滚动，引擎不抢滚动条
    this._lastSx = null;         // 帧末的页面滚动位置，用来识别“引擎之外”的滚动
    this._lastSy = null;
    this._onResize = this.resize.bind(this);
    this._onFrame = this.frame.bind(this);
    this._onUserAct = this.userActivity.bind(this);
    this._onUserKey = this.userScrollKey.bind(this);
  }

  /* 用户主动滚动（滚轮 / 触摸 / 滚动键）→ 让出自动跟随 2.6 秒 */
  Engine.prototype.userActivity = function () {
    this.userHoldUntil = performance.now() + 2600;
  };

  Engine.prototype.userScrollKey = function (e) {
    switch (e.key) {
      case ' ': case 'Spacebar':
      case 'PageDown': case 'PageUp':
      case 'ArrowDown': case 'ArrowUp':
      case 'Home': case 'End':
        this.userActivity();
    }
  };

  Engine.prototype.mount = function () {
    if (this.canvas) return;
    var c = document.createElement('canvas');
    c.setAttribute('data-wc-overlay', '1');
    var st = c.style;
    st.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;' +
      'pointer-events:none;z-index:2147483000;display:block;';
    (document.documentElement || document.body).appendChild(c);
    this.canvas = c;
    this.g = c.getContext('2d');
    this.resize();
    window.addEventListener('resize', this._onResize, { passive: true });
    window.addEventListener('wheel', this._onUserAct, { passive: true, capture: true });
    window.addEventListener('touchmove', this._onUserAct, { passive: true, capture: true });
    window.addEventListener('keydown', this._onUserKey, { passive: true, capture: true });
    this.start();
  };

  Engine.prototype.resize = function () {
    if (!this.canvas) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.max(1, Math.round(window.innerWidth * dpr));
    this.canvas.height = Math.max(1, Math.round(window.innerHeight * dpr));
    this.dpr = dpr;
  };

  Engine.prototype.start = function () {
    if (this.running) return;
    this.running = true;
    this.last = 0;
    this.raf = requestAnimationFrame(this._onFrame);
  };

  Engine.prototype.stop = function () {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    if (this.canvas && this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas);
    this.canvas = null;
    this.g = null;
    window.removeEventListener('resize', this._onResize);
    window.removeEventListener('wheel', this._onUserAct, { capture: true });
    window.removeEventListener('touchmove', this._onUserAct, { capture: true });
    window.removeEventListener('keydown', this._onUserKey, { capture: true });
    this.spiders = [];
  };

  Engine.prototype.sync = function (settings) {
    this.settings = settings;
    var n = clamp(parseInt(settings.count, 10) || 1, 1, 8);
    var allowed = [];
    var tierSkins = WC.limits(settings).skins;
    var ids = Object.keys(WC.SKINS);
    for (var i = 0; i < ids.length; i++) {
      if (!tierSkins || tierSkins.indexOf(ids[i]) >= 0) allowed.push(ids[i]);
    }
    if (allowed.indexOf(settings.skin) < 0) allowed.unshift(settings.skin);
    if (!allowed.length) allowed = ['cyan'];

    var now = performance.now();
    while (this.spiders.length < n) {
      var idx = this.spiders.length;
      var s = new Spider({
        scale: settings.scale || 1,
        skin: WC.SKINS[allowed[idx % allowed.length]] || WC.SKINS.cyan,
        x: rand(90, Math.max(120, window.innerWidth - 90)),
        y: rand(80, Math.max(110, window.innerHeight - 80)),
        cruise: 62 * (settings.speed || 1) * rand(0.92, 1.1),
        now: now
      });
      s.poseFeet(this.view.scrollX, this.view.scrollY);
      this.spiders.push(s);
      if (audio) audio.blip(1 + idx * 0.18);   // 新蜘蛛进场 blip（音高随序号上行）
    }
    while (this.spiders.length > n) this.spiders.pop();

    for (var k = 0; k < this.spiders.length; k++) {
      var sp = this.spiders[k];
      sp.skin = WC.SKINS[allowed[k % allowed.length]] || WC.SKINS.cyan;
      sp.scale = settings.scale || 1;
      sp.bodyLen = 24 * sp.scale;
      sp.bodyWid = 11 * sp.scale;
      sp.femur = 44 * sp.scale;
      sp.tibia = 52 * sp.scale;
      sp.maxReach = (sp.femur + sp.tibia) * 0.96;
      sp.restLen = (sp.femur + sp.tibia) * 0.66;
      sp.cruise = 62 * (settings.speed || 1) * rand(0.92, 1.1);
      sp.trailOn = !!settings.trail;
    }
  };

  Engine.prototype.frame = function (ts) {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this._onFrame);
    var dt = this.last ? Math.min(0.05, (ts - this.last) / 1000) : 0.016;
    this.last = ts;

    var sx = window.scrollX || window.pageXOffset || 0;
    var sy = window.scrollY || window.pageYOffset || 0;

    /* 引擎之外发生的滚动（用户滚轮 / 滚动条拖拽 / 页面脚本）→ 让出跟随 2.6 秒，
     * 期间 follow 视为关闭：蜘蛛改为贴边夹持，滚动完全交给用户 */
    if (this._lastSy !== null && (sx !== this._lastSx || sy !== this._lastSy)) {
      this.userHoldUntil = ts + 2600;
    }
    this.view.scrollX = sx;
    this.view.scrollY = sy;

    var ctx = {
      now: ts,
      vw: window.innerWidth,
      vh: window.innerHeight,
      scrollX: sx,
      scrollY: sy,
      follow: !!this.settings.follow && ts >= this.userHoldUntil,
      scrollBy: function (dx, dy) {
        try { window.scrollBy({ left: dx, top: dy, behavior: 'instant' }); }
        catch (err) { window.scrollBy(dx, dy); }
        return window.scrollY || window.pageYOffset || 0;
      }
    };

    for (var i = 0; i < this.spiders.length; i++) this.spiders[i].update(dt, ctx);

    /* 记录帧末滚动位置（含引擎本帧 scrollBy 的结果），供下帧识别“引擎之外”的滚动 */
    this._lastSx = window.scrollX || window.pageXOffset || 0;
    this._lastSy = window.scrollY || window.pageYOffset || 0;

    var g = this.g;
    if (!g) return;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    g.clearRect(0, 0, ctx.vw, ctx.vh);
    for (var k = 0; k < this.spiders.length; k++) this.spiders[k].draw(g, this.view);
  };

  /* 当前所有落点（屏幕坐标） */
  Engine.prototype.anchors = function () {
    var out = [];
    for (var i = 0; i < this.spiders.length; i++) {
      out.push.apply(out, this.spiders[i].anchors(this.view));
    }
    return out;
  };

  Engine.prototype.bodies = function () {
    var out = [];
    for (var i = 0; i < this.spiders.length; i++) {
      out.push({ x: this.spiders[i].x, y: this.spiders[i].y });
    }
    return out;
  };

  root.WCEngine = { Engine: Engine, Spider: Spider };
})(typeof self !== 'undefined' ? self : this);
