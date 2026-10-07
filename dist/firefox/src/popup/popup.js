/* Web Crawler — popup 逻辑 */
(function () {
  'use strict';

  function t(key) {
    try { return chrome.i18n.getMessage(key) || key; } catch (e) { return key; }
  }

  var S = null;          // 当前设置
  var tier = 'free';
  var tab = null;
  var siteHost = '';
  var siteExcluded = false;

  var $ = function (id) { return document.getElementById(id); };

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
    var lim = WC.limits(S);
    tier = WC.tierOf(S);

    $('enabled').checked = !!S.enabled;
    $('sound').checked = !!S.sound;
    // 未配置收款链接时隐藏升级入口（免费上架期不展示购买引导）
    $('upgrade').style.display = WC.LICENSING.buyUrl ? '' : 'none';
    $('tierBadge').textContent = tier === 'pro' ? 'PRO' : 'FREE';
    $('tierBadge').className = 'badge ' + tier;

    $('count').textContent = String(S.count);
    $('minus').disabled = S.count <= 1;
    $('plus').disabled = S.count >= lim.maxSpiders;

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
      d.title = t(skin.nameKey || 'extName');
      d.addEventListener('click', function () {
        if (skin.pro && tier !== 'pro') { flash(t('uiLocked'), 'err'); return; }
        save({ skin: id });
      });
      box.appendChild(d);
    });

    // 排除按钮
    var ex = $('exclude');
    if (!siteHost) {
      ex.style.display = 'none';
    } else {
      ex.style.display = '';
      ex.classList.toggle('on', siteExcluded);
      ex.textContent = siteExcluded ? t('uiExcluded') : t('uiExclude') + ' · ' + siteHost;
    }

    $('key').value = S.licenseKey || '';
    if (tier === 'pro') flash(t('uiOk'), 'ok');
  }

  function flash(msg, cls) {
    var m = $('licMsg');
    m.textContent = msg || '';
    m.className = 'msg' + (cls ? ' ' + cls : '');
  }

  function save(patch) {
    WC.saveSettings(patch, function (s) {
      S = s;
      render();
    });
  }

  /* ---------- 事件 ---------- */
  function bind() {
    $('enabled').addEventListener('change', function () { save({ enabled: this.checked }); });
    $('sound').addEventListener('change', function () { save({ sound: this.checked }); });

    $('minus').addEventListener('click', function () { save({ count: Math.max(1, S.count - 1) }); });
    $('plus').addEventListener('click', function () {
      var lim = WC.limits(S);
      if (S.count + 1 > lim.maxSpiders) { flash(t('uiLocked'), 'err'); return; }
      save({ count: S.count + 1 });
    });

    document.querySelectorAll('#speed button').forEach(function (b) {
      b.addEventListener('click', function () { save({ speed: Number(b.dataset.v) }); });
    });
    document.querySelectorAll('#mode button').forEach(function (b) {
      b.addEventListener('click', function () { save({ mode: b.dataset.v }); });
    });

    $('exclude').addEventListener('click', function () {
      if (!siteHost) return;
      var list = (S.exclusions || []).slice();
      var i = list.indexOf(siteHost);
      if (i >= 0) list.splice(i, 1); else list.push(siteHost);
      save({ exclusions: list });
    });

    $('verify').addEventListener('click', function () {
      var key = $('key').value.trim();
      if (!key) { flash(t('uiFail'), 'err'); return; }
      var btn = $('verify');
      btn.disabled = true;
      flash(t('uiVerifying'), '');
      WCLic.activate(key, function (err) {
        btn.disabled = false;
        if (err) {
          var msg = err.message === 'no_endpoint' ? t('uiNoServer')
            : err.message === 'bad_key' ? t('uiBadKey') : t('uiFail');
          flash(msg, 'err');
          return;
        }
        WC.getSettings(function (s) { S = s; render(); flash(t('uiOk'), 'ok'); });
        try { chrome.runtime.sendMessage({ type: 'wc:badge' }); } catch (e) {}
      });
    });

    $('upgrade').addEventListener('click', function (e) {
      e.preventDefault();
      chrome.runtime.openOptionsPage();
      setTimeout(function () { window.close(); }, 150);
    });

    $('openOptions').addEventListener('click', function (e) {
      e.preventDefault();
      chrome.runtime.openOptionsPage();
      setTimeout(function () { window.close(); }, 150);
    });
  }

  /* ---------- 站点状态 ---------- */
  function loadSite(cb) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      tab = tabs && tabs[0];
      if (!tab || !tab.id) return cb();
      var done = false;
      var timer = setTimeout(function () { if (!done) { done = true; cb(); } }, 400);
      try {
        chrome.tabs.sendMessage(tab.id, { type: 'wc:state' }, function (st) {
          if (done) return;
          done = true; clearTimeout(timer);
          if (chrome.runtime.lastError || !st) return cb();
          siteHost = st.host || '';
          siteExcluded = (S.exclusions || []).indexOf(siteHost) >= 0;
          cb();
        });
      } catch (e) {
        if (!done) { done = true; clearTimeout(timer); cb(); }
      }
    });
  }

  /* ---------- 启动 ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    fillText();
    bind();
    WC.getSettings(function (s) {
      S = WC.normalize(s);
      render();
      loadSite(function () { render(); });
      // 输入授权码后回车直接验证
      $('key').addEventListener('keydown', function (e) {
        if (e.key === 'Enter') $('verify').click();
      });
    });
  });
})();
