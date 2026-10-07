# Chrome Web Store 上架内容

> 打包上传的文件：`dist/web-crawler-chrome-v1.0.0.zip`
> 后台：https://chrome.google.com/webstore/devconsole （需一次性 $5 注册费）

## 基本信息

| 字段 | 值 |
|---|---|
| 类目 Category | Entertainment |
| 语言 | 中文（默认）+ English |
| 隐私政策 URL | https://liuxing5.github.io/web-crawler-ext/ （已上线） |
| Homepage URL | https://liuxing5.github.io/web-crawler-ext/ |
| Support URL | https://github.com/liuxing5/web-crawler-ext/issues |
| 标题 / 简短说明 | 由包内 manifest 读取（Title/Summary from package），无需在后台填写 |
| Single purpose 说明 | （见下方“审核说明”原文） |

**Single purpose description（必填，逐字用）：**

> Draws an animated spider that crawls over the current web page for
> entertainment, and optionally applies time-limited visual effects to page
> elements on that same page.

## 简短说明（≤132 字符）

```
会爬网页的机械蜘蛛：8腿真实步态动画、病毒式页面特效、多蜘蛛与霓虹皮肤，一键开关。
```

English short description:

```
Animated mechanical spiders that crawl over any page: realistic 8-leg gait, playful page effects, multiple spiders & neon skins.
```

## 详细描述

> ⚠️ **商店描述框不渲染 Markdown！** `**星号**` 会原样显示在商店页面。
> 下面给的是**纯文本版**，直接整段复制粘贴。

**中文版（默认语言粘贴这个）：**

```
Web Crawler 会在你浏览的网页上放出一只真·会爬行的机械蜘蛛：8 条腿按蜘蛛运动学算法交替迈步，霓虹细腿爬过之处可开启"病毒模式"——页面元素像电影里的电脑病毒一样被感染：彩色色块、旋转大字、字距错乱，限时自动还原，不破坏网页结构。

主要功能：
- 真实步态：8 腿对角交替，迈步/支撑/屈膝全部按蜘蛛运动学计算，不是贴图轮播
- 病毒模式：蜘蛛爬过的地方，元素被随机"感染"，限时自动还原
- 多蜘蛛同屏：最多 6 只同时开爬（免费版 1 只）
- 6 款霓虹皮肤：赛博青免费，其余 5 款为 Pro
- 完全可控：速度、体型、拖尾、自动滚页、感染半径与恢复时间均可调
- 合成音效：落脚哒哒声、感染电音、进场提示音，Web Audio 本地实时合成（无音频文件、不联网），popup 或设置页一键开关、调节音量
- 按站点排除：一键在当前网站关闭，或维护排除列表
- 一键开关：popup 里随时启停，徽标高亮显示当前状态
- 中英双语：界面随浏览器语言自动切换

隐私承诺：完全本地运行，不收集、不上传任何数据，不加载远程代码，离线可用。隐私政策：https://liuxing5.github.io/web-crawler-ext/
```

**English version (if you add an en-US listing):**

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

## 图标 / 截图

- 图标：`icons/icon128.png`（打包内已含）
- 截图（1280×800，已生成）：
  - `store/screenshots/store_promo1.png`
  - `store/screenshots/store_promo2.png`

## 分发范围

- 默认 Public（所有地区、所有用户）
- 若要先小范围测试，选 Unlisted 拿到私链，验证后再转 Public
