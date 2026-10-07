/* Web Crawler — 共享配置与存储
 * 运行环境：后台 service worker / 内容脚本 / popup / options
 * 要求：无依赖、可同步加载（不用 ES module） */
(function (root) {
  'use strict';

  /* ---------------- 默认设置 ---------------- */
  var DEFAULTS = {
    version: 1,
    enabled: true,        // 全局开关
    count: 1,             // 蜘蛛数量
    speed: 1,             // 0.6 慢 | 1 中 | 1.5 快
    mode: 'walk',         // walk | virus
    skin: 'cyan',         // 皮肤 id
    follow: true,         // 蜘蛛靠近边缘时自动滚动页面
    trail: true,          // 蜘蛛丝拖尾
    sound: true,          // 音效（落脚 / 感染 / 出生，Web Audio 本地合成）
    volume: 0.5,          // 音量 0 ~ 1
    scale: 1,             // 体型倍率 0.6 ~ 1.8
    virusDuration: 9000,  // 页面元素被“感染”后的恢复时间(ms)
    virusRadius: 160,     // 病毒扩散半径(px)
    exclusions: [],       // 关闭本扩展的域名列表
    licenseKey: '',       // 用户输入的授权码
    entitlement: null     // { tier, expiresAt|null, lifetime, verifiedAt }
  };

  /* ---------------- 皮肤（leg 腿色 / joint 关节色 / body 体色 / core 核心亮点） ---------------- */
  var SKINS = {
    cyan:    { nameKey: 'skinCyan', leg: '#43e8ff', joint: '#ff2d55', body: '#0a1230', core: '#9ffbff', pro: 0 },
    lime:    { nameKey: 'skinLime', leg: '#8dff3c', joint: '#ff9b21', body: '#0c1a08', core: '#dcffa8', pro: 0 },
    magenta: { nameKey: 'skinMagenta', leg: '#ff3ec8', joint: '#26f5ff', body: '#1c0622', core: '#ffa9ec', pro: 1 },
    amber:   { nameKey: 'skinAmber', leg: '#ffc23c', joint: '#ff3b30', body: '#1c1204', core: '#ffe9a8', pro: 1 },
    ghost:   { nameKey: 'skinGhost', leg: '#e8f2ff', joint: '#7d8ba3', body: '#121722', core: '#ffffff', pro: 1 },
    blood:   { nameKey: 'skinBlood', leg: '#ff2d55', joint: '#ffffff', body: '#1a0509', core: '#ff9ab0', pro: 1 }
  };

  /* ---------------- 版本分层（免费 / 付费） ---------------- */
  var TIERS = {
    free: {
      maxSpiders: 1,
      skins: ['cyan'],     // 免费仅 1 款皮肤，其余留给 Pro
      virusMaxActive: 20,   // 同时被感染的元素上限
      virusRadius: 140,
      virusBurst: 1         // 单次感染的元素数
    },
    pro: {
      maxSpiders: 6,
      skins: null,          // null = 全部皮肤
      virusMaxActive: 160,
      virusRadius: 480,
      virusBurst: 3
    }
  };

  /* ---------------- 授权服务配置 ---------------- */
  var LICENSING = {
    endpoint: '',        // 你的授权服务器，例如 'https://license.example.com'（留空 = 未启用在线校验）
    buyUrl: '',          // 付费购买页（Stripe Payment Link / ExtensionPay / Paddle 等），空则按钮隐藏
    graceDays: 7,        // 非终身授权的离线宽限期
    devKeys: true        // 开发授权码 WC-DEV-* 开关；tools/build.js 打正式包时会置为 false
  };

  /* ---------------- 工具 ---------------- */
  function copy(src, dst) {
    if (!src) return dst;
    for (var k in src) {
      if (!Object.prototype.hasOwnProperty.call(src, k)) continue;
      if (src[k] === undefined) continue;
      dst[k] = src[k];
    }
    return dst;
  }

  function clone(o) { return copy(JSON.parse(JSON.stringify(o || {})), {}); }

  /* ---------------- 读写设置 ---------------- */
  function getSettings(cb) {
    try {
      root.chrome.storage.local.get({ wc_settings: DEFAULTS }, function (data) {
        var s = copy(DEFAULTS, {});
        copy(data && data.wc_settings, s);
        // exclusions 数组兜底
        if (!Array.isArray(s.exclusions)) s.exclusions = [];
        cb(s);
      });
    } catch (e) {
      cb(copy(DEFAULTS, {}));
    }
  }

  function saveSettings(patch, cb) {
    getSettings(function (s) {
      copy(patch, s);
      normalize(s);
      root.chrome.storage.local.set({ wc_settings: s }, function () { if (cb) cb(s); });
    });
  }

  /* ---------------- 权益 / 分层 ---------------- */
  function tierOf(s) {
    var e = s && s.entitlement;
    if (!e || e.tier !== 'pro') return 'free';
    var now = Date.now();
    if (e.expiresAt && now > e.expiresAt) return 'free';
    // 非终身授权需要在宽限期内重验过一次
    if (!e.lifetime && e.verifiedAt && now - e.verifiedAt > LICENSING.graceDays * 86400000) return 'free';
    return 'pro';
  }

  function limits(s) { return TIERS[tierOf(s)] || TIERS.free; }

  function skinAllowed(s, id) {
    var skin = SKINS[id];
    if (!skin) return false;
    var l = limits(s);
    if (l.skins == null) return true;
    return l.skins.indexOf(id) >= 0;
  }

  /* 越权值自动收敛到当前版本允许的范围 */
  function normalize(s) {
    var l = limits(s);
    s.count = Math.max(1, Math.min(l.maxSpiders, parseInt(s.count, 10) || 1));
    if (!SKINS[s.skin]) s.skin = 'cyan';
    if (!skinAllowed(s, s.skin)) s.skin = l.skins ? l.skins[0] : 'cyan';
    if (s.mode !== 'virus') s.mode = 'walk';
    s.speed = [0.6, 1, 1.5].indexOf(Number(s.speed)) >= 0 ? Number(s.speed) : 1;
    s.scale = Math.max(0.6, Math.min(1.8, Number(s.scale) || 1));
    s.virusDuration = Math.max(1500, Math.min(60000, Number(s.virusDuration) || 9000));
    s.virusRadius = Math.max(60, Math.min(800, Number(s.virusRadius) || 160));
    if (!Array.isArray(s.exclusions)) s.exclusions = [];
    s.sound = s.sound !== false;
    var v = Number(s.volume);
    s.volume = isFinite(v) ? Math.max(0, Math.min(1, v)) : 0.5;
    return s;
  }

  function isExcluded(s, host) {
    return !!(s && s.exclusions && s.exclusions.indexOf(host) >= 0);
  }

  root.WC = {
    DEFAULTS: DEFAULTS,
    SKINS: SKINS,
    TIERS: TIERS,
    LICENSING: LICENSING,
    copy: copy,
    clone: clone,
    getSettings: getSettings,
    saveSettings: saveSettings,
    tierOf: tierOf,
    limits: limits,
    skinAllowed: skinAllowed,
    normalize: normalize,
    isExcluded: isExcluded
  };
})(typeof self !== 'undefined' ? self : this);
