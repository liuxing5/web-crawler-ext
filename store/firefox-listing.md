# Firefox Add-ons (AMO) 上架内容

> 打包上传的文件：`dist/web-crawler-firefox-v1.0.1.zip`（43,537 字节，含滚动修复）
> 后台：https://addons.mozilla.org/developers/ （免费，Mozilla 账号即可）

## 提交流程

1. Mozilla 账号登录 Developer Hub → **Submit a new add-on**
2. 选 **On this site**（上架到 AMO 商店）→ 上传 zip
3. 上传后进入编辑页，按"表单对照表"逐项填写
4. **Version** 页 → 填 What's new（粘下方版本说明）→ **Submit for review**
5. 审核：机器审核通常几分钟到几小时，可能转人工（1–5 个工作日）
   - 若收到 "management issue / need info" 邮件 → 用下方"审核问答"回复

## 表单对照表（逐字段）

| 表单字段 | 填入内容 |
|---|---|
| Add-on name | `Web Crawler — 网络爬虫蜘蛛` |
| Summary（一句话，≤1024 字符） | 见下方"Summary" |
| Description（支持 HTML，纯文本也行） | 粘贴下方"详细描述"英文版整段 |
| Privacy policy URL | `https://liuxing5.github.io/web-crawler-ext/` |
| Support Email 或 Website（必填其一） | `https://github.com/liuxing5/web-crawler-ext/issues` |
| Category | `Tools`（若下拉里有更贴切的 Entertainment/其他就选最接近的） |
| Tags（空格分隔） | `spider animation fun crawler gait neon effects` |
| Reviewer notes（审核备注） | 粘贴下方"Notes for reviewer"整段 |
| Screenshots（≥1 张） | `store/screenshots/store_promo1.png`、`store_promo2.png`（1280×800） |
| Icon | 包内自带（16/32/48/128），无需另传 |
| License | 任选宽松协议（如 MIT / All rights reserved 均可） |

## Summary（直接复制）

```
Animated mechanical spiders that crawl over any page: realistic 8-leg gait, playful page effects, multiple spiders & neon skins.
```

## 详细描述（英文版，直接整段复制）

```
Web Crawler drops a truly walking mechanical spider onto the pages you browse: eight legs driven by real arachnid kinematics in an alternating tripod gait. With Virus Mode on, the elements it crosses get "infected" like a computer virus from the movies — color blocks, rotated headlines, scrambled letter-spacing — all automatically restored after a short time. Page structure is never damaged.

Highlights:
- Real gait: alternating step/stance phases computed from arachnid kinematics, not a sprite loop
- Virus mode: elements the spider crosses get time-limited visual corruption, fully restored afterwards
- Up to 6 spiders at once (1 in the free tier)
- 6 neon skins: Cyber Cyan is free, the other 5 unlock with Pro
- Full control: speed, size, silk trail, auto-scroll, infection radius & recovery time
- Synthesized sound: footstep ticks, infection zaps and spawn cues generated live with Web Audio (no audio files, no network); toggle and volume control in the popup or settings
- Per-site exclusion: disable on the current site with one click, or manage the list
- One-click toggle in the popup, toolbar badge highlights the state
- zh_CN + English UI, follows your browser language

Privacy: runs 100% locally — no collection, no upload, no remote code, works offline. Privacy policy: https://liuxing5.github.io/web-crawler-ext/
```

## What's new（v1.0.1 版本说明）

```
v1.0.1
- Fixed: manual page scrolling no longer fights the auto-follow scroll — the engine now yields to wheel/touch/scroll-key input for 2.6s, so scrolling down/up always works while the spider is crawling
- Hardened: engine scrolling uses instant behavior to avoid drift on pages with CSS smooth-scroll
```

## Notes for reviewer（英文，直接复制到 Reviewer notes）

```
Single purpose: draws an animated spider on the current page for entertainment
and optionally applies time-limited visual effects to elements of that page.

Why content scripts run on all http/https pages:
The extension's sole purpose is to draw an animated spider on whatever page
the user is currently viewing. There is no way to know the URL in advance,
so content_scripts must match all http/https pages. The script only:
  (1) draws a fixed-position <canvas> overlay (pointer-events:none, never
      blocks clicks), and
  (2) when the user enables "virus mode", modifies inline styles of page
      elements (colors, letter-spacing, transforms) and restores the original
      inline styles when each effect expires.
No page content, form data, cookies, or credentials are ever read or
transmitted. The extension has no network code at all except the optional
license verification endpoint, which is only contacted when the user
voluntarily submits a license key in Settings.

Permissions used: only "storage" (local settings). No host_permissions,
no tabs, no cookies, no webRequest, no remote code. All scripts are bundled;
compliant with Manifest V3 (no eval / remote script loading).

Monetization:
The free tier works forever with no account. Optional Pro license keys are
billed off-store via an external payment page; the extension itself only
contains an input field for a license key. There is no in-extension checkout,
no trial countdown, and no feature is blocked during review — the free tier
(1 spider, 1 skin, full animation) is fully functional.

How to test virus mode:
Install the add-on, open any page, click the toolbar icon, switch the mode
toggle to walk+virus. Effects restore automatically after the configured
duration (default 9 seconds). All behavior is user-triggered and reversible.
```

## 权限问答预案（若审核邮件追问 host 权限）

| 可能的质疑 | 回应要点 |
|---|---|
| 为什么所有网站都要注入脚本？ | 核心功能就是"在你正在看的页面上爬蜘蛛"，URL 无法预知；不注入任何内容脚本则扩展完全无功能 |
| 会读取/上传网页数据吗？ | 不会。只绘制 canvas 覆盖层；病毒模式仅改内联样式且到期还原；包内无网络请求代码（除用户主动输入授权码时的一次校验） |
| canvas 挡点击吗？ | `pointer-events:none`，完全不拦截交互 |
| 付费合规？ | 免费版永久完整可用；购买在站外完成，扩展只有授权码输入框 |

## 备注

- 包内 `browser_specific_settings.gecko.id = webcrawler@webcrawler-ext.example`
  （AMO 接受；正式签名后沿用此 ID）
- 包内已含 `data_collection_permissions: { required: ["none"] }`
  （2025-11-03 起 AMO 强制要求的"数据收集声明"，本扩展零收集）
- 若 AMO 校验器报 `background.scripts` 相关警告：Firefox MV3 支持 scripts
  形式的事件页，属正常，不需改包
- 描述里不要出现"最好的/第一/免费替代 XX 商标产品"等夸大或蹭商标用语
