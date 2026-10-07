/* Web Crawler — 授权码校验
 * 说明：
 *  1. 优先走自建/第三方授权服务器（WC.LICENSING.endpoint）
 *  2. 未配置服务器时，仅开发授权码 WC-DEV-* 可解锁（正式包由 build.js 关闭）
 *  3. 也可直接替换为 ExtensionPay / Paddle / Lemon Squeezy 的校验逻辑，保持回调签名即可 */
(function (root) {
  'use strict';

  var WC = root.WC;
  var API = 'WCLic';

  function deviceId(cb) {
    try {
      root.chrome.storage.local.get({ wc_deviceId: '' }, function (d) {
        if (d.wc_deviceId) return cb(d.wc_deviceId);
        var id = 'wc-' + Date.now().toString(36) + '-' +
          Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
        root.chrome.storage.local.set({ wc_deviceId: id }, function () { cb(id); });
      });
    } catch (e) {
      cb('wc-anon');
    }
  }

  function manifestVersion() {
    try { return root.chrome.runtime.getManifest().version || '0.0.0'; } catch (e) { return '0.0.0'; }
  }

  /* 校验授权码：cb(err, {tier, expiresAt, lifetime, activations}) */
  function verify(key, cb) {
    key = String(key || '').trim();
    if (key.length < 6) return cb(new Error('bad_key'));

    var cfg = WC.LICENSING;

    if (!cfg.endpoint) {
      // 未配置授权服务器：仅接受开发码
      if (cfg.devKeys && /^WC-DEV-/i.test(key)) {
        return cb(null, { tier: 'pro', expiresAt: null, lifetime: true, dev: true });
      }
      return cb(new Error('no_endpoint'));
    }

    deviceId(function (id) {
      var payload = {
        key: key,
        deviceId: id,
        product: 'web-crawler',
        version: manifestVersion(),
        userAgent: (root.navigator && root.navigator.userAgent) || ''
      };
      var done = false;
      var timer = setTimeout(function () { if (!done) { done = true; cb(new Error('timeout')); } }, 8000);

      fetch(cfg.endpoint.replace(/\/+$/, '') + '/v1/license/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'omit',
        mode: 'cors'
      }).then(function (r) {
        return r.json().then(function (j) { return { ok: r.ok, body: j }; }, function () { return { ok: false, body: null }; });
      }).then(function (o) {
        if (done) return;
        done = true; clearTimeout(timer);
        if (!o.ok || !o.body || !o.body.valid) return cb(new Error('invalid'));
        cb(null, {
          tier: 'pro',
          expiresAt: o.body.expiresAt || null,
          lifetime: !!o.body.lifetime,
          activations: o.body.activations || null
        });
      }).catch(function (e) {
        if (done) return;
        done = true; clearTimeout(timer);
        cb(e || new Error('network'));
      });
    });
  }

  /* 输入授权码 → 校验 → 写入设置；cb(err, settings) */
  function activate(key, cb) {
    key = String(key || '').trim();
    verify(key, function (err, ent) {
      if (err) return cb(err);
      var now = Date.now();
      var entitlement = {
        tier: ent.tier || 'pro',
        expiresAt: ent.expiresAt || null,
        lifetime: !!ent.lifetime,
        verifiedAt: now
      };
      WC.saveSettings({ licenseKey: key, entitlement: entitlement }, function (s) { cb(null, s); });
    });
  }

  /* 后台启动时静默重验（吊销检测），网络失败不影响已有权益 */
  function reverify(cb) {
    WC.getSettings(function (s) {
      if (!s.licenseKey) return cb && cb(null, s);
      verify(s.licenseKey, function (err, ent) {
        if (err) {
          // 网络类错误保持现状；明确 invalid 才清除
          if (err.message === 'invalid') {
            return WC.saveSettings({ entitlement: null }, function (s2) { cb && cb(err, s2); });
          }
          return cb && cb(null, s);
        }
        var next = {
          tier: ent.tier || 'pro',
          expiresAt: ent.expiresAt || null,
          lifetime: !!ent.lifetime,
          verifiedAt: Date.now()
        };
        WC.saveSettings({ entitlement: next }, function (s2) { cb && cb(null, s2); });
      });
    });
  }

  function deactivate(cb) {
    WC.saveSettings({ licenseKey: '', entitlement: null }, function (s) { if (cb) cb(null, s); });
  }

  root[API] = { verify: verify, activate: activate, reverify: reverify, deactivate: deactivate, deviceId: deviceId };
})(typeof self !== 'undefined' ? self : this);
