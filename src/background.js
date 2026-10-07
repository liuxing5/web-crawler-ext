/* Web Crawler — 后台 service worker（MV3 event-friendly，无状态） */
if (typeof importScripts === 'function') {
  // Chrome/Edge：service worker 里手动加载共享模块
  // Firefox：background.scripts 已在 manifest 中先加载 config/licensing，无需 importScripts
  importScripts('common/config.js', 'common/licensing.js');
}

function refreshBadge() {
  WC.getSettings(function (s) {
    var pro = WC.tierOf(s) === 'pro';
    var text = s.enabled ? String(s.count || 1) : '';
    try {
      chrome.action.setBadgeBackgroundColor({ color: pro ? '#c8005f' : '#00627a' });
      if (chrome.action.setBadgeTextColor) chrome.action.setBadgeTextColor({ color: '#ffffff' });
      chrome.action.setBadgeText({ text: text });
    } catch (e) { /* ignore */ }
  });
}

chrome.runtime.onInstalled.addListener(function () {
  // 触发一次读写，完成默认值落盘
  WC.getSettings(function (s) {
    WC.normalize(s);
    chrome.storage.local.set({ wc_settings: s }, refreshBadge);
  });
  WCLic.deviceId(function () { /* 设备号预生成 */ });
});

chrome.runtime.onStartup.addListener(function () {
  refreshBadge();
  WCLic.reverify(function () { refreshBadge(); });
});

chrome.storage.onChanged.addListener(function (changes, area) {
  if (area === 'local' && changes.wc_settings) refreshBadge();
});

chrome.runtime.onMessage.addListener(function (msg, sender, respond) {
  if (!msg || typeof msg.type !== 'string') return;
  if (msg.type === 'wc:reverify') {
    WCLic.reverify(function (err, s) {
      respond({ err: err ? err.message : null, tier: s ? WC.tierOf(s) : 'free' });
      refreshBadge();
    });
    return true;
  }
  if (msg.type === 'wc:badge') { refreshBadge(); respond({ ok: true }); return true; }
});
