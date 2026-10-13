# 曝光 & 下载增长行动包

> 目标：三家商店（Chrome / Edge / Firefox）上架后，持续获取自然下载。
> 原则：**视觉产品靠演示素材说话**；不买量、不刷评论（三店红线）；发帖披露作者身份。

---

## 一、总览（三步走）

| 阶段 | 内容 | 谁做 | 时机 |
|---|---|---|---|
| ① 素材 | 演示视频/GIF、落地页升级、GitHub README 徽章 | AI 做 | 审核期间就绪 |
| ② 商店内 ASO | 关键词、多语言 listing、标签 | AI 做 | **三店过审后**再改（审核期别动） |
| ③ 发帖引流 | 各平台文案（下方现成），手动发布 | 你来粘贴 | 三店全绿当天起分批发 |

---

## 二、阶段① 素材清单

- [ ] **演示视频 15–30 秒**（无头浏览器录屏）：装扩展 → 开病毒模式 → 蜘蛛爬过页面元素变色块 → 到期还原。发 B站/抖音/Reddit/X 用
- [ ] **演示 GIF**：落地页首图 + 商店评论区补充
- [ ] **落地页升级**（liuxing5.github.io/web-crawler-ext）：三商店安装按钮 + 关键词文案 + GIF + FAQ（现只有隐私政策）
- [ ] **GitHub 仓库**：描述、topics（chrome-extension / webextension / firefox-addon / spider / animation / mv3）、README 加安装徽章
- [ ] 商店截图补拍（如果现有 promo 图不够吸引）

## 三、阶段② ASO 商店内搜索优化（过审后执行）

**英文关键词定位**（避开 "web crawler" SEO 工具红海，主打长尾）：

```
spider extension, walking spider, animated spider, fun browser extension,
prank extension, page effects, neon spider, cyberpunk extension
```

| 商店 | 优化点 |
|---|---|
| Chrome | 中文词（网络爬虫/蜘蛛爬网页）已第 1 名 ✓；英文描述首段自然嵌入 "animated spider"、"fun extension"；**添加多语言 listing**（日/韩/西/德）→ 吃各语种搜索流量 |
| Edge | 描述首 250 字符嵌入核心关键词；中英文两语言 listing 已填 ✓ |
| Firefox | tags 补满 10 个：`spider animation fun gait neon effects prank toy crawler entertainment`；Summary 英文已填 ✓ |

**各商店后台改文案都不需要重新传包**（Chrome/Edge 直接编辑 listing；Firefox 编辑上架信息）。

## 四、阶段③ 发帖文案包（现成，直接粘贴）

### 发帖节奏

| 天 | 平台 | 说明 |
|---|---|---|
| D0（三店全绿当天） | Reddit r/chrome_extensions + r/firefoxaddons | 手动发，两帖隔几小时 |
| D1 | V2EX 分享创造 / 知乎 / 少数派 | 中文三连 |
| D2–D3 | Hacker News Show HN | 美东工作日上午（北京时间晚 21–23 点） |
| D4 | Product Hunt | 周二至周四上线 |
| 长期 | X/Twitter、B站视频、小红书 | 视频素材剪出来就能发 |

---

### 4.1 Reddit r/chrome_extensions（英文）

```
Title: I made an extension that drops a walking mechanical spider onto whatever page you're reading

Hey all — full disclosure: I'm the developer.

Web Crawler puts an animated mechanical spider on the page you're browsing:

- 8 legs driven by real arachnid kinematics (alternating tripod gait) — not a sprite loop
- Optional "virus mode": elements it crawls over get temporarily "infected" (color blocks,
  scrambled letter-spacing, rotated headlines) and are automatically restored afterwards —
  page structure is never damaged
- Synthesized sound effects via Web Audio (no audio files, nothing loaded from the network)
- Neon skins, up to 6 spiders at once, speed/size controls, per-site disable

Free tier forever: 1 spider + 1 skin, no account needed. Runs 100% locally —
zero data collection, no remote code.

Chrome Web Store: <CHROME_LINK>
(Also coming to Edge and Firefox — in review there.)

Feedback welcome, especially on the gait animation.
```

> r/firefoxaddons 版本把 Chrome 链接换成 Firefox 链接，首句改为 "I made a Firefox add-on..."。

### 4.2 Hacker News（Show HN）

```
标题: Show HN: A mechanical spider that walks across web pages
链接: 落地页（或 Chrome 商店页）
```

**发完立刻用自己的号补一条"作者说明"评论**（HN 惯例）：

```
Dev here. How it works:

- A content script draws a fixed-position <canvas> overlay (pointer-events:none,
  so it never blocks clicks) on whatever page you're on.
- The gait is computed from arachnid kinematics: each of the 8 legs runs an
  alternating step/stance phase, so it actually walks instead of looping a sprite.
- "Virus mode" only touches inline styles of elements it crosses, keeps a restore
  map, and reverts every effect when its timer expires — the DOM is never modified.
- Manifest V3, permission is just "storage". No analytics, no network calls at all
  (except an optional license check if a user pastes a key in Settings).

Open source-ish repo: <GITHUB_LINK> — feedback on the animation appreciated.
```

### 4.3 Product Hunt

```
Tagline (≤60字符): A mechanical spider that crawls over the web you browse

Description:
Web Crawler drops a truly walking mechanical spider onto the pages you visit.

- Real 8-leg gait computed from arachnid kinematics (not a sprite loop)
- "Virus mode": page elements get theatrically infected, then auto-restore
- Synthesized Web Audio effects — zero files, zero network
- Neon skins, multiple spiders, per-site disable

Free tier forever. 100% local, zero data collection, works offline.

> First comment (maker comment): 我为什么做这个 + 技术亮点 + 三商店链接
```

### 4.4 V2EX（分享创造）

```
标题：做了个字面意义的"网络爬虫"扩展——蜘蛛真的爬你正在看的网页

正文：
各位好，我是开发者。做了个无厘头的浏览器扩展：在你浏览的任意网页上
放出一只机械蜘蛛，8 条腿按蜘蛛运动学算法交替迈步，真·爬行。

- 病毒模式：蜘蛛爬过的地方，页面元素像电影里的电脑病毒一样被感染
  （色块、字距错乱、大字旋转），限时自动还原，不动 DOM 结构
- 音效用 Web Audio 现场合成，无音频文件、不联网
- MV3、只要 storage 权限、零数据收集、离线可用
- 免费版永久可用（1 只蜘蛛 + 赛博青皮肤），无账号无弹窗

Chrome 已上架：<链接>；Edge / Firefox 审核中（过审后补链接）。

欢迎拍砖，尤其欢迎对步态动画提意见。
```

### 4.5 知乎（找"有哪些好玩的浏览器扩展？"类问题回答）

```
推荐一个我自己做的（利益相关：作者）：Web Crawler 网络爬虫蜘蛛。

字面意义上的"爬虫"——一只机械蜘蛛在你正在看的网页上爬行，8 腿步态是按
蜘蛛运动学算出来的（交替三角步态），不是贴图轮播。开"病毒模式"后它爬过的
页面元素会被"感染"成色块/乱字距，几秒后自动还原，网页结构不受影响。

扩展本体零网络请求、零数据收集，音效都是 Web Audio 现场合成的。
免费版永久可用。Chrome 商店已上架：<链接>。
```

### 4.6 少数派（读者推荐格式）

```
【扩展名】Web Crawler 网络爬虫蜘蛛
【一句话】字面意义的网络爬虫：一只机械蜘蛛爬过你正在看的网页
【平台】Chrome / Edge / Firefox
【价格】免费（1 只蜘蛛 + 1 款皮肤永久免费，Pro 可选）
【链接】<三店链接>

推荐理由：动画质量罕见——8 条腿按真实蜘蛛运动学交替迈步；"病毒模式"让
页面元素像电影里的电脑病毒一样被感染后自动还原；音效是 Web Audio 实时
合成的。最重要的是零数据收集、只要 storage 权限，离线可用。
```

### 4.7 B站/抖音 15–30 秒视频脚本

| 镜头 | 画面 | 字幕 |
|---|---|---|
| 1 (0-3s) | Chrome 商店页点"添加至 Chrome" | "给浏览器装个'宠物'" |
| 2 (3-8s) | 打开任意网页，点扩展图标开启 | "字面意义的网络爬虫 🕷️" |
| 3 (8-18s) | 蜘蛛爬行 + 病毒模式染色块（加速播放） | "爬过的地方全部'感染'…" |
| 4 (18-22s) | 元素到时自动还原 | "到点自动还原，网页无损" |
| 5 (22-30s) | 三商店 logo + 搜索词 | "Chrome / Edge / Firefox 搜'网络爬虫蜘蛛'" |

标签：`#浏览器扩展 #整蛊 #蜘蛛 #前端 #黑科技`

---

## 五、数据监测（每周看一次）

| 商店 | 看什么 |
|---|---|
| Chrome 后台 | Installs、保留率、卸载原因、评分评论 |
| Edge 后台 | 分析 tab：安装/使用量、评论 |
| Firefox 后台 | Usage statistics、审核意见/用户来信 |
| 网站 | GitHub Pages 访问量（可加免费统计） |

**评论维护**：三店的每条差评都认真回复（开发者回复可见），好评回复感谢。

## 六、红线

1. ❌ 不买下载量、不刷评论/评分（发现即下架）
2. ❌ 不伪装成用户发"安利"帖——一律自曝开发者身份
3. ❌ 同一平台不连发多帖（Reddit 隔天、不同版块）
4. ✅ 所有帖子留真实链接、可被追溯到作者
