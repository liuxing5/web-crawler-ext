# Microsoft Edge Add-ons 上架内容

> 打包上传的文件：`dist/web-crawler-edge-v1.0.1.zip`（43,477 字节，含滚动修复）
> 后台：https://partner.microsoft.com/dashboard/microsoftedge （免费，需 Microsoft 账号）

## 提交流程

1. 进入 Partner Center → 顶部 **Extensions** → **New extension**
2. 上传 zip（选上面这份 v1.0.1）
3. 按下面"表单对照表"逐项填写
4. Pricing → **Free**（付费走站外授权码，见 `store/monetization.md`；
   扩展内无内嵌收银台、`buyUrl` 默认为空、按钮隐藏，合规）
5. Availability → 全地区 Public → **Publish**

## 表单对照表（逐字段）

| 表单字段 | 填入内容 |
|---|---|
| Extension name | `Web Crawler — 网络爬虫蜘蛛` |
| Description（长描述，≤10000 字符） | 粘贴下方"详细描述"英文版整段 |
| Privacy policy URL | `https://liuxing5.github.io/web-crawler-ext/` |
| Support contact（邮箱或网址） | `https://github.com/liuxing5/web-crawler-ext/issues` |
| Category | Entertainment |
| Website / Learn more URL（可选） | `https://github.com/liuxing5/web-crawler-ext` |
| Screenshots（至少 1 张，建议 1280×800） | `store/screenshots/store_promo1.png`、`store_promo2.png` |
| Permission justification（若弹出） | 见下方"权限声明" |
| Notes for reviewer（备注框） | 粘贴 `store/review-notes.md` 的"Edge / Firefox（中文）"整段 |

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

> 想要中文版描述见 `store/chrome-listing.md`"详细描述"段（Edge 也可粘中文）。

## 权限声明（Edge 权限逐项解释框，直接粘贴）

```
storage: saves the user's settings locally (on/off, skin, spider count,
site exclusion list, license state). Nothing is ever uploaded.

Content scripts on all http/https pages: draws a fixed-position <canvas>
spider animation on the page the user is currently viewing. When the user
explicitly enables "virus mode", it modifies inline styles of page elements
(color, letter-spacing, transform) and restores the original inline styles
when each effect expires. It never reads or transmits page content, form
data, cookies or credentials. No host_permissions, no remote code.
```

## 常见驳回点与应对

- **"内容脚本注入所有站点"**：Notes for reviewer 粘 `store/review-notes.md` 中文段
- **"扩展内出现购买链接"**：说明支付完全站外完成；本版本 `buyUrl` 默认为空、
  购买入口隐藏，审核期间免费版（1 蜘蛛 + 1 皮肤）完整可用
- **manifest 不接受**（理论上不应发生）：改传 `web-crawler-firefox-v1.0.1.zip`
  之外的方式 = 从包里删除 `minimum_chrome_version` 字段后重新压缩
