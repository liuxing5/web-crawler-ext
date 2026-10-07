/* Web Crawler — 设置页逻辑 */
(function () {
  'use strict';

  function t(key) {
    try { return chrome.i18n.getMessage(key) || key; } catch (e) { return key; }
  }
  var $ = function (id) { return document.getElementById(id); };
  var S = null;

  /* ---------- i18n ---------- */
  function fillText() {
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    document.querySelectorAll('[data-i18n-ph]').forEach(function (el) {
      el.setAttribute('placeholder', t(el.getAttribute('data-i18n-ph')));
    });
  }

  /* ---------- 渲染 ---------- */
  function render() {
    var tier = WC.tierOf(S);
    var lim = WC.limits(S);

    $('enabled').checked = !!S.enabled;
    $('follow').checked = !!S.follow;
    $('trail').checked = !!S.trail;
    $('sound').checked = !!S.sound;
    $('volume').value = S.volume;
    $('volumeHint').textContent = Math.round((Number(S.volume) || 0) * 100) + '%';
    $('scale').value = S.scale;
    $('duration').value = S.virusDuration;
    $('radius').value = S.virusRadius;

    $('tierBadge').textContent = tier === 'pro' ? 'PRO' : 'FREE';
    $('tierBadge').className = 'badge ' + tier;
    $('licBadge').textContent = tier === 'pro' ? 'PRO' : 'FREE';
    $('licBadge').className = 'badge ' + tier;

    $('count').textContent = String(S.count);
    $('minus').disabled = S.count <= 1;
    $('plus').disabled = S.count >= lim.maxSpiders;
    $('countHint').textContent = tier === 'pro'
      ? t('optCountPro')
      : t('optCountFree') + ' · ' + t('uiUpgrade');

    $('durationHint').textContent = (S.virusDuration / 1000).toFixed(1) + 's';
    $('radiusHint').textContent = Math.round(S.virusRadius) + 'px / ' + lim.virusRadius + 'px';

    document.querySelectorAll('#speed button').forEach(function (b) {
      b.classList.toggle('on', Number(b.dataset.v) === Number(S.speed));
    });
    document.querySelectorAll('#mode button').forEach(function (b) {
      b.classList.toggle('on', b.dataset.v === S.mode);
    });

    // 皮肤
    var box = $('skins');
    box.innerHTML = '';
    Object.keys(WC.SKINS).forEach(function (id) {
      var skin = WC.SKINS[id];
      var d = document.createElement('div');
      d.className = 'skin' + (S.skin === id ? ' on' : '') + (skin.pro ? ' lock' : '');
      d.style.background = skin.leg;
      d.style.color = skin.leg;
      d.title = t(skin.nameKey);
      d.addEventListener('click', function () {
        if (skin.pro && tier !== 'pro') { msg(t('uiLocked'), 'err'); return; }
        save({ skin: id });
      });
      box.appendChild(d);
    });

    // 排除列表
    var ul = $('exList');
    ul.innerHTML = '';
    (S.exclusions || []).forEach(function (h) {
      var li = document.createElement('li');
      var span = document.createElement('span');
      span.textContent = h;
      var btn = document.createElement('button');
      btn.textContent = '✕';
      btn.title = t('optRemove');
      btn.addEventListener('click', function () {
        var list = S.exclusions.slice();
        var i = list.indexOf(h);
        if (i >= 0) list.splice(i, 1);
        save({ exclusions: list });
      });
      li.appendChild(span);
      li.appendChild(btn);
      ul.appendChild(li);
    });
    $('exEmpty').style.display = (S.exclusions || []).length ? 'none' : '';

    // 授权
    $('key').value = S.licenseKey || '';
    $('licDesc').textContent = tier === 'pro'
      ? (S.entitlement && S.entitlement.expiresAt
          ? t('optLicSub') + ' · ' + new Date(S.entitlement.expiresAt).toLocaleDateString()
          : t('optLicLife'))
      : t('optLicFree');

    // 购买链接
    var buy = $('buyBtn');
    if (WC.LICENSING.buyUrl) { buy.href = WC.LICENSING.buyUrl; buy.style.display = ''; $('buyNote').style.display = 'none'; }
    else { buy.style.display = 'none'; $('buyNote').style.display = ''; }

    try { $('version').textContent = chrome.runtime.getManifest().version; } catch (e) {}
    WCLic.deviceId(function (id) { $('deviceId').textContent = id; });
  }

  function msg(text, cls) {
    var m = $('licMsg');
    m.textContent = text || '';
    m.className = 'msg' + (cls ? ' ' + cls : '');
  }

  function save(patch) {
    WC.saveSettings(patch, function (s) { S = s; render(); });
  }

  /* ---------- 事件 ---------- */
  function bind() {
    $('enabled').addEventListener('change', function () { save({ enabled: this.checked }); });
    $('follow').addEventListener('change', function () { save({ follow: this.checked }); });
    $('trail').addEventListener('change', function () { save({ trail: this.checked }); });
    $('sound').addEventListener('change', function () { save({ sound: this.checked }); });
    $('volume').addEventListener('input', function () { save({ volume: Number(this.value) }); });
    $('scale').addEventListener('input', function () { save({ scale: Number(this.value) }); });
    $('duration').addEventListener('input', function () { save({ virusDuration: Number(this.value) }); });
    $('radius').addEventListener('input', function () { save({ virusRadius: Number(this.value) }); });

    $('minus').addEventListener('click', function () { save({ count: Math.max(1, S.count - 1) }); });
    $('plus').addEventListener('click', function () {
      var lim = WC.limits(S);
      if (S.count + 1 > lim.maxSpiders) { msg(t('uiLocked'), 'err'); return; }
      save({ count: S.count + 1 });
    });

    document.querySelectorAll('#speed button').forEach(function (b) {
      b.addEventListener('click', function () { save({ speed: Number(b.dataset.v) }); });
    });
    document.querySelectorAll('#mode button').forEach(function (b) {
      b.addEventListener('click', function () { save({ mode: b.dataset.v }); });
    });

    $('restoreNow').addEventListener('click', function () {
      chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] }, function (tabs) {
        tabs.forEach(function (tb) {
          try { chrome.tabs.sendMessage(tb.id, { type: 'wc:reload' }); } catch (e) {}
        });
        msg(t('optRestoreDone'), 'ok');
      });
    });

    $('exAdd').addEventListener('click', function () {
      var v = $('exInput').value.trim().toLowerCase()
        .replace(/^https?:\/\//, '').replace(/\/.*$/, '');
      if (!v) return;
      var list = (S.exclusions || []).slice();
      if (list.indexOf(v) < 0) list.push(v);
      $('exInput').value = '';
      save({ exclusions: list });
    });
    $('exInput').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') $('exAdd').click();
    });

    $('verify').addEventListener('click', function () {
      var key = $('key').value.trim();
      if (!key) { msg(t('uiBadKey'), 'err'); return; }
      var btn = $('verify');
      btn.disabled = true;
      msg(t('uiVerifying'), '');
      WCLic.activate(key, function (err) {
        btn.disabled = false;
        if (err) {
          msg(err.message === 'no_endpoint' ? t('uiNoServer')
            : err.message === 'bad_key' ? t('uiBadKey') : t('uiFail'), 'err');
          return;
        }
        WC.getSettings(function (s) { S = s; render(); msg(t('uiOk'), 'ok'); });
        try { chrome.runtime.sendMessage({ type: 'wc:badge' }); } catch (e) {}
      });
    });
    $('key').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') $('verify').click();
    });

    $('clearKey').addEventListener('click', function () {
      WCLic.deactivate(function () {
        WC.getSettings(function (s) { S = s; render(); msg(t('optDeactivated'), 'ok'); });
        try { chrome.runtime.sendMessage({ type: 'wc:badge' }); } catch (e) {}
      });
    });

    $('copyDevice').addEventListener('click', function () {
      var id = $('deviceId').textContent;
      if (navigator.clipboard) navigator.clipboard.writeText(id);
      msg(t('optCopied'), 'ok');
    });

    document.querySelectorAll('.tabs button').forEach(function (b) {
      b.addEventListener('click', function () {
        document.querySelectorAll('.tabs button').forEach(function (x) { x.classList.remove('on'); });
        document.querySelectorAll('.panel').forEach(function (p) { p.classList.remove('on'); });
        b.classList.add('on');
        document.querySelector('.panel[data-panel="' + b.dataset.tab + '"]').classList.add('on');
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    fillText();
    bind();
    WC.getSettings(function (s) {
      S = WC.normalize(s);
      render();
    });
  });
})();
