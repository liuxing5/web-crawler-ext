# Chrome Web Store 提交指南（照着点即可）

> 提交必须由你本人在自己的浏览器完成（需要 Google 账号 + $5 + 身份验证，
> 工具环境的网络隧道无法访问 Google）。以下所有材料均已就绪。

## 已就绪清单

| 材料 | 位置 / 值 | 状态 |
|---|---|---|
| 扩展包 | `dist/web-crawler-chrome-v1.0.0.zip`（41KB，自检全绿） | ✅ |
| 隐私政策 URL | **https://liuxing5.github.io/web-crawler-ext/** | ✅ 已上线 |
| 截图 1280×800 | `store/screenshots/store_promo1.png` / `store_promo2.png` | ✅ |
| 商店文案 | `store/chrome-listing.md`（中英） | ✅ |
| 审核备注 | `store/review-notes.md`（中英，直接粘贴） | ✅ |
| 代码仓库 | https://github.com/liuxing5/web-crawler-ext | ✅ |

## 第 0 步：开发者账户（没有才需要，一次性）

1. 打开 https://chrome.google.com/webstore/devconsole ，用 Google 账号登录
2. 支付一次性注册费 **$5**
3. 填写开发者资料（个人即可），完成 **publisher verification**
   （身份 + 地址验证，通常 1–3 个工作日；**验证完成前只能发布给
   "受信任的测试者"**，可先用测试者模式灰度）

## 第 1 步：上传包

1. 后台 → **New item** → 选择 `dist/web-crawler-chrome-v1.0.0.zip`
2. 上传成功后进入编辑页

## 第 2 步：Store listing

- **语言**：添加 `中文（简体）` 和 `English` 两条
- **标题**：`Web Crawler 网络爬虫蜘蛛`（≤45 字符）
- **简短说明**：粘贴 `chrome-listing.md` 中的简短说明（中/英各一份）
- **详细描述**：粘贴 `chrome-listing.md` 的两段 Markdown
- **类目**：`Entertainment`
- **截图**：上传 `store/screenshots/store_promo1.png`、`store_promo2.png`
  （1280×800，满足最小尺寸）
- 小/大宣传图：可留空

## 第 3 步：Privacy practices（最容易被驳回，逐项填）

1. **是否收集或使用用户数据**：全部选项选 **No / 不收集**
   （本扩展确实一个字节都不上传）
2. **Single purpose**：粘贴 `review-notes.md` 的 Single purpose 那句英文
3. **Permission justifications**：
   - `storage` → `Stores the user's local settings (toggle, spider count,
     skin, per-site exclusions, license status). Never uploaded.`
   - 内容脚本注入所有网站 → 粘贴 review-notes 里 "Why content scripts run
     on all http/https pages" 整段
4. **Remote code**：选 **No**
5. **Privacy policy URL**：`https://liuxing5.github.io/web-crawler-ext/`

## 第 4 步：分发

- **Visibility**：Public（想先灰度可选 Unlisted 拿私链）
- **Regions**：全部地区
- **定价**：免费（无内置购买）

## 第 5 步：提交审核

1. 右上角 **Submit for review**
2. 预期：几小时 ~ 3 天出结果；被要求补充材料时，
   回复内容都在 `store/review-notes.md` 里备好了
3. 常见补件：内容脚本全站权限说明（已备）、演示视频
   （可录 `tools/preview.html` 的蜘蛛爬行 + 病毒模式，30 秒即可）

## 附录：「Unable to publish」弹窗 7 项对照粘贴包

> 后台点 Submit 时若弹出红色清单，逐项对照处理。
> Privacy practices 页 4 个文本框（英文，直接粘贴）：

**Single purpose description：**

```
Draws an animated spider that crawls over the current web page for entertainment, and optionally applies time-limited visual effects to elements of that same page.
```

**Justification for host permission use：**

```
The extension declares no host_permissions; its content scripts match all http/https pages because its sole purpose is to draw an animated spider on whatever page the user is currently viewing — the target URL cannot be known in advance. The scripts only: (1) draw a fixed-position, pointer-events:none <canvas> overlay, and (2) when the user explicitly enables "virus mode", modify inline styles of page elements (colors, letter-spacing, transforms) and restore the original inline styles when each effect expires. No page content, form data, cookies, or credentials are ever read or transmitted. Users can disable the extension on any site with one click (per-site exclusion).
```

**Justification for remote code use：**

```
The extension does not use remote code at all. All JavaScript is bundled inside the package and runs locally (MV3 compliant): no eval(), no new Function(), no remote <script> tags, no remote importScripts(); the build tool scans for these patterns and refuses to package the extension if any is found. The only network request in the entire extension is an optional license verification call, which happens solely when the user voluntarily enters a license key in Settings; it returns a yes/no verdict and no code is ever downloaded or executed.
```

**Justification for storage：**

```
All settings — enabled toggle, spider count, skin, speed/size, sound toggle & volume, per-site exclusions and license status — are saved with chrome.storage.local on the user's device so they persist across page loads and browser restarts. Data never leaves the device; the extension uploads nothing.
```

**Data usage 认证（第 5 项）：** 所有问题逐项选 **No**（含远程代码项）→ 勾选
**"I certify…"** 复选框；同页若有 Privacy policy URL 字段填
`https://liuxing5.github.io/web-crawler-ext/`。

**Contact email（第 6、7 项，Settings 页）：**
左侧栏底部 Settings 齿轮 → Contact email 填真实邮箱 → Save →
去邮箱点 Google 验证邮件里的 Verify 链接 → 回后台确认已验证。

**Privacy policy URL（Privacy 页底部，0/2048 带 \*）：**
`https://liuxing5.github.io/web-crawler-ext/`

**I certify 三条声明：** 全部勾选（do not sell/transfer、unrelated purposes、
creditworthiness）。上方数据收集类复选框（PII/位置/浏览历史/网站内容等）
**全部保持不勾**——扩展不收集任何数据。

**Test instructions → Additional instructions（可选，审核友好）：**

```
No account or setup required. Steps: (1) install; (2) open any http/https page (e.g. https://example.com); (3) click the toolbar icon — the spider walks onto the page immediately; (4) in the popup, switch Mode to "Walk + Virus" to see time-limited effects that restore automatically. Everything works offline, no login.
```

全部消除后 Save draft → Submit for review 变蓝可提交。

## 通过之后

1. 商店页确认中英文渲染、截图正常
2. 自己安装一遍：1 只蜘蛛、1 款皮肤、音效开关、病毒模式全链路
3. 免费拉新期无需任何支付配置；以后要收费按
   `store/monetization.md` 填 `LICENSING.endpoint` / `buyUrl` 即可
4. **撤销本次用过的 GitHub Token**：https://github.com/settings/tokens
