# Microsoft Edge Add-ons 上架内容

> 打包上传的文件：`dist/web-crawler-edge-v1.0.0.zip`（与 Chrome 包内容一致，
> Edge 兼容 Chrome MV3 包；若后台不接受，改传 `web-crawler-firefox-v1.0.0.zip`
> 之外的这一份即可）
> 后台：https://partner.microsoft.com/dashboard/microsoftedge （免费，需开发者账户审核）

## 提交流程

1. 用公司/个人 Microsoft 账户进入 Partner Center → Extensions → New extension
2. 上传 zip
3. 填写下列内容
4. Pricing → 选择 **Free**（付费通过站外授权码，见 `store/monetization.md`；
   Edge 商店内不允许把用户引导到站外购买商店外商品的页面——我们不在扩展内
   强制购买弹窗，只在设置页保留"购买链接"字段且默认为空，合规）
5. Availability → 全地区 Public

## 基本信息

| 字段 | 值 |
|---|---|
| Name | Web Crawler — 网络爬虫蜘蛛 |
| Category | Entertainment |
| Privacy policy URL | 部署 `store/privacy-policy.md` 后的公开链接 |
| Support contact | 你的邮箱/网站 |

## 描述（≤10000 字符，直接用 Chrome 的详细描述）

把 `store/chrome-listing.md` 里"详细描述"整段粘贴即可（中英都可，建议用中文版 +
末尾附 English 段落）。

## 权限声明（Edge 要求逐项解释权限用途）

| 权限 | 用途说明（提交时填写） |
|---|---|
| `storage` | 在本地保存用户的设置（开关、皮肤、数量、站点排除列表、授权码状态）。所有数据仅存于浏览器本地，不上传。 |
| 内容脚本（所有 http/https 页面） | 在当前页面上绘制蜘蛛动画画布；开启"病毒模式"时修改页面元素的内联样式做限时视觉效果并在到期时还原。不读取或传输页面内容。 |

## 截图

- `store/screenshots/store_promo1.png`（1280×800）
- `store/screenshots/store_promo2.png`（1280×800）

## 常见驳回点与应对

- **"内容脚本注入所有站点"**：在 Notes for review 里粘贴
  `store/review-notes.md` 的“权限说明”段落
- **"扩展内出现购买链接"**：说明支付完全在站外完成，扩展内购买按钮仅在
  用户主动打开时显示且指向站外收银台；本版本 `buyUrl` 默认为空，按钮隐藏
