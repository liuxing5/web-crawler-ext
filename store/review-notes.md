# 审核备注（Notes for reviewer）

> 提交 Chrome / Edge / Firefox 时，把对应段落粘贴到审核备注框。

## Chrome Web Store（英文，直接粘贴）

```
Single purpose: draws an animated spider on the current page for entertainment
and optionally applies time-limited visual effects to elements of that page.

Why content scripts run on all http/https pages:
The extension's sole purpose is to draw an animated spider on whatever page
the user is currently viewing. There is no way to know the URL in advance,
so content_scripts must match all http/https pages. The script only:
  (1) draws a fixed-position <canvas> overlay, and
  (2) when the user enables "virus mode", modifies inline styles of page
      elements (colors, letter-spacing, transforms) and restores the original
      inline styles when each effect expires.
No page content, form data, cookies, or credentials are ever read or
transmitted. The extension has no network code at all except the optional
license verification endpoint, which is only contacted when the user
voluntarily submits a license key in Settings.

Permissions used: only "storage" (local settings). No host_permissions,
no tabs, no cookies, no webRequest, no remote code. All scripts are bundled;
MV3 compliant (no eval / remote script loading).

Paywall / monetization:
The free tier works forever with no account. Optional Pro license keys are
billed off-store via an external payment page; the extension itself only
contains an input field for a license key. There is no in-extension
checkout, no trial countdown, and no feature is blocked during review —
the free tier (1 spider, 1 skin, full animation) is fully functional.

How to test virus mode:
Install the zip, open any page, click the toolbar icon, switch 模式 to
"爬行+病毒" (walk + virus). Effects restore automatically after the
configured duration (default 9 seconds). All behavior is user-triggered
and reversible.

Manifest note: default_locale is zh_CN (Chinese is the primary audience);
English UI is included via _locales/en.
```

## Edge / Firefox（中文，直接粘贴）

```
单一用途：在当前浏览的网页上绘制一只会爬行的动画蜘蛛（娱乐用途），
可选地对页面元素施加限时视觉特效并在到期后完整还原。

关于"在所有网站运行"：扩展的核心就是"在你正在看的页面上爬蜘蛛"，
无法预知目标 URL，因此内容脚本需要匹配所有 http/https 页面。脚本只做两件事：
  1) 绘制一个 fixed 定位的 <canvas> 覆盖层（透明背景，pointer-events:none，
     不拦截任何点击）；
  2) 当用户主动开启"病毒模式"时，修改页面元素的内联样式（颜色、字距、
     变换等），到时把原始内联样式写回去完整还原，不删除/插入节点。
扩展从不读取或上传页面内容、表单、Cookie；除用户主动输入授权码时调用一次
授权校验接口外，没有任何网络请求。

权限：仅使用 storage（本地设置）。无 host_permissions、无远程代码、
无 eval，全部脚本随包分发，符合 MV3 规定。

付费：免费版永久可用（1 只蜘蛛、1 款皮肤、完整动画）。Pro 授权码通过
站外收款页购买，扩展内只有授权码输入框，没有内嵌收银台、没有试用倒计时，
审核期间免费功能完全可用、不会被拦截。
```

## 审核常见问题预案

| 可能的质疑 | 回应要点 |
|---|---|
| 为什么需要修改页面？ | 单一用途即是页面动画；"病毒模式"默认关闭于首次？——不，默认 walk 模式，virus 需用户在 popup 显式切换 |
| 会不会破坏网页？ | 只改 inline style 且保存原值，到期还原；不改 HTML 结构、不注入节点（覆盖层仅一个 canvas） |
| canvas 会不会挡住点击？ | overlay 设置 `pointer-events: none`（已在 engine.js 中），完全不拦截交互 |
| 远程代码？ | 无。`tools/build.js` 会自动扫描 eval / new Function / 远程 importScripts / 远程 script 标签并阻止打包 |
| 数据去哪了？ | 全部在 chrome.storage.local；见隐私政策 |
| 授权码校验联网是否合规？ | 仅用户主动触发；请求只含随机设备 ID + 授权码；隐私政策已披露 |

## 审核账号（补充材料时）

- 预览/演示视频：可用 `tools/_frames/page3.png`、`page4.png` 静态演示；
  如需录屏，本地打开 preview.html 展示蜘蛛动画即可
- 联系邮箱：填一个真实可用的邮箱（审核可能发验证信）
