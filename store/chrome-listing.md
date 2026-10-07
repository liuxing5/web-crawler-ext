# Chrome Web Store 上架内容

> 打包上传的文件：`dist/web-crawler-chrome-v1.0.0.zip`
> 后台：https://chrome.google.com/webstore/devconsole （需一次性 $5 注册费）

## 基本信息

| 字段 | 值 |
|---|---|
| 类目 Category | Entertainment |
| 语言 | 中文（默认）+ English |
| 隐私政策 URL | https://liuxing5.github.io/web-crawler-ext/ （已上线） |
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

## 详细描述（Markdown，商店会渲染）

```markdown
**Web Crawler** — 会爬网页的机械蜘蛛。

打开任意网页，一只（或一群）霓虹机械蜘蛛就会从屏幕边缘爬进来：
8 条腿用真实的两骨 IK 逆运动学驱动，交替步态、膝盖朝外、足尖踩在文档坐标上，
爬过的地方拖着细细的蛛丝，页面滚动时还会自动跟上。

**特色功能**

- **真实步态**：8 腿对角交替，迈步/支撑/屈膝全部按蜘蛛运动学计算，不是贴图轮播
- **病毒模式**：蜘蛛爬过的地方，元素被随机"感染"——彩色色块、旋转大字、
  字距错乱、下划线删除线……限时自动还原，不破坏网页结构
- **多蜘蛛同屏**：最多 6 只同时开爬（免费版 1 只）
- **6 款霓虹皮肤**：赛博青免费，其余 5 款为 Pro
- **完全可控**：速度、体型、拖尾、自动滚页、感染半径与恢复时间均可调
- **合成音效**：落脚哒哒声、感染电音、进场提示音，Web Audio 本地实时合成
  （无音频文件、不联网），可在 popup 或设置页一键开关、调节音量
- **按站点排除**：一键在当前网站关闭，或维护排除列表
- **一键开关**：popup 里随时启停，徽标高亮显示当前状态
- **中英双语**：界面随浏览器语言自动切换

**免费版包含**：1 只蜘蛛、1 款皮肤、完整爬行动画与基础病毒效果，永久免费、无需注册。
**Pro 授权码**（购买即将开放）解锁 6 只蜘蛛、全部皮肤与更强的病毒效果
（上限 160 个元素、半径 480px），可在最多 5 台设备上使用。

**注意**：本扩展只修改页面的**视觉样式**（并会自动还原），不读取、
不上传任何页面内容或个人数据。隐私政策见扩展详情页。
```

English version:

```markdown
**Web Crawler** — mechanical spiders that crawl over your pages.

Open any page and one (or a pack of) neon mechanical spiders walks in:
8 legs driven by real two-bone inverse kinematics, alternating tripod gait,
knees pointing outward, feet planted in document coordinates, with a thin silk
trail — and the page auto-scrolls to follow them.

**Highlights**

- **Real gait**: alternating step/stance phases computed from arachnid
  kinematics, not a sprite loop
- **Synthesized sound**: footstep ticks, infection zaps and spawn cues —
  generated live with Web Audio (no audio files, no network), with a
  toggle and volume control
- **Virus mode**: elements the spider crosses get time-limited visual
  corruption — color blocks, rotated headlines, scrambled letter-spacing —
  all automatically restored
- **Up to 6 spiders at once** (1 in the free tier)
- **6 neon skins**, per-site exclusion, one-click toggle
- **Scales with Pro**: larger corruption radius & more infected elements
- zh_CN + English UI

**Free**: 1 spider, 1 skin, full animation & basic effects — free forever,
no account required.
**Pro license key** (purchase coming soon): 6 spiders, all skins, stronger
effects; activates on up to 5 devices. Enter the key in Settings.

The extension only changes page **visual styles** (and restores them); it
never reads or transmits page content or personal data.
```

## 图标 / 截图

- 图标：`icons/icon128.png`（打包内已含）
- 截图（1280×800，已生成）：
  - `store/screenshots/store_promo1.png`
  - `store/screenshots/store_promo2.png`

## 分发范围

- 默认 Public（所有地区、所有用户）
- 若要先小范围测试，选 Unlisted 拿到私链，验证后再转 Public
