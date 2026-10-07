# 付费方案（买断制授权码）

> 商店内置支付已废弃（Chrome 废弃 inlineTunnel，Edge/Firefox 也不允许把流量
> 引到站外收银台）。行业通用做法就是：**站外收款 → 发授权码 → 扩展内联网校验**。
> 本项目已经内建这条链路，只差把两个配置填上。

## 0. 你需要改的两个配置

`src/common/config.js` → `LICENSING`：

```js
var LICENSING = {
  endpoint: '',   // ← 你的授权服务器根地址，如 'https://lic.example.com'
  buyUrl:   '',   // ← 你的收款页，如 Stripe Payment Link，填了才显示购买按钮
  graceDays: 7,
  devKeys: false  // ← 正式包由 tools/build.js 自动置 false
};
```

填完后重新 `node tools/build.js` 打包上传即可，其余代码不用动。

## 1. 分层定义（已写死在 config.js `TIERS`）

| 能力 | Free | Pro |
|---|---|---|
| 蜘蛛数量 | 1 | 6 |
| 皮肤 | 赛博青（1 款） | 全部 6 款 |
| 病毒同时感染上限 | 20 | 160 |
| 病毒半径 | 140px | 480px |
| 单次感染个数 | 1 | 3 |

免费版永远可用、无倒计时、无账号——这是通过商店审核的关键。

## 2. 收款方式（推荐顺序）

| 方案 | 上手难度 | 手续费 | 说明 |
|---|---|---|---|
| **Stripe Payment Link** | 最低 | ~2.9% | 建一个 Payment Link，付款成功页放授权码（或发邮件），见 §3 |
| **Lemon Squeezy / Paddle** | 低 | ~5% | MoR 代缴税，适合跨境；可配 webhook 自动发码 |
| **Gumroad** | 低 | ~10% | 支付后自动给 key，零代码 |
| **Paddle Overlay** | 中 | ~5% | 可以在扩展页内弹 Paddle 自己的收银 iframe（合规，因为收银台是 Paddle 的） |

**不建议**：把用户跳到站外自己写的收银页再回来——Edge/Firefox 对"商店外购买引导"
审核严格，保持"设置页一个授权码输入框 + 一个可选的了解更多链接"最稳。

## 3. 最小可行流程（零开发，Stripe Payment Link）

1. Stripe 后台 → Payment Links → 新建：
   - 产品 `Web Crawler Pro（终身授权）`，价格自定（参考 ¥39 / $9.99）
   - 开启 "After payment → show confirmation page"
2. 部署本仓库 `server/license-server.js`（一个 Node 进程即可）：
   ```bash
   LICENSE_ADMIN_SECRET='<强随机串>' node server/license-server.js 8787
   ```
3. 本地/脚本发码：
   ```bash
   curl -X POST http://127.0.0.1:8787/v1/license/create \
     -H 'Content-Type: application/json' -H 'X-Admin-Secret: <强随机串>' \
     -d '{"lifetime":true,"note":"order-123"}'
   # → {"key":"WC-XXXX-XXXX-XXXX"}
   ```
4. 把这个 key 放进 Stripe 的**付款后确认页文案 / 邮件**里发给买家。
5. 扩展 `LICENSING.endpoint` 指向该服务的公网地址（HTTPS），买家在
   设置页输入 key → 立即解锁 Pro。

> 有单量后：用 Stripe/Lemon 的 webhook 自动调 `/v1/license/create` 并把码
> 展示在成功页，全程不用人工。`server/license-server.js` 已预留同样的
> create 接口，换成你的数据库只需改 `readStore/writeStore` 两个函数。

## 4. 授权语义（licensing.js 已实现）

- **终身**（`lifetime: true`）：激活后离线可用，每 7 天最多静默重验一次；
  服务器不可达不惩罚用户。
- **限时**（`expiresAt`）：过期即回落 Free；`graceDays` 宽限期内最后一次
  成功校验仍然有效。
- **设备限额**：每张码默认 5 台（`limit` 可改）。换设备用同一码即自动占位，
  超限返回 `activation_limit`。
- **错码保护**：输入错误授权码**不会清掉**已激活的权益（已测试）。
- **开发码**：`WC-DEV-PRO` / `WC-DEV-TEST`（`devKeys: true` 时可用，正式包
  build 时自动关闭）。

## 5. 端到端验证记录

```
health:      {"ok":true}
create:      {"key":"WC-99CE-B1F1-2D87", ...}
扩展激活:     {"proTier":"pro","maxSpiders":6, ...}
错误码:       {"badKeyErr":"invalid","stillProAfterBadKey":true}
第6台设备:     {"valid":false,"reason":"activation_limit","activations":{"used":5,"limit":5}}
未带管理员密钥: {"error":"forbidden"}
```

## 6. 定价与文案建议

- 终身买断 ¥39 / $9.99（工具类扩展常见价位）
- popup 与 options 的"升级 Pro"按钮在 `buyUrl` 为空时自动隐藏，
  因此**审核期间商店里看到的永远是纯免费版**
- 上架通过后再填 `buyUrl`，或发一个"Pro 功能更新"的商店更新说明
