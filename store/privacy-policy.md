# Web Crawler 隐私政策 / Privacy Policy

**最后更新 / Last updated:** 2026-10-07

> 上架时把本文发布为一个公开可访问的 HTTPS 页面（例如
> `https://你的域名/webcrawler/privacy`），并在 Chrome / Edge / Firefox
> 后台的 Privacy practices 一栏填入该 URL。方括号处替换成你自己的信息。

---

## 中文

### 概述

Web Crawler（以下简称"本扩展"）是一款娱乐性质的浏览器扩展：在网页上绘制会爬行的
机械蜘蛛动画，可选地对页面元素做限时的视觉"感染"效果并自动还原。我们重视您的隐私，
本扩展**不收集、不上传、不出售**任何个人数据。

### 我们访问的数据

**1. 本地存储（chrome.storage.local）**

本扩展仅在浏览器本地存储以下内容：

- 您的设置（开关、蜘蛛数量、速度、皮肤、病毒效果参数等）
- 您选择排除的域名列表
- 您主动输入的授权码及其校验结果

这些数据只保存在您的浏览器中，卸载扩展即删除；不与任何第三方共享。

**2. 网络访问**

- 内容脚本会在您访问的 http/https 页面上运行，用于绘制画布动画和（在开启
  "病毒模式"时）修改页面元素的内联样式。**页面内容不会被读取或发送到任何服务器。**
- 仅当您在设置中**主动输入并验证授权码**时，扩展会向我们在
  `src/common/config.js` 中配置的授权服务器发送：授权码、匿名设备标识符
  （随机生成的字符串，用于限制授权码激活设备数）、产品名与版本号。
  除此之外，扩展不发起任何网络请求。

**3. 我们不做的事**

- 不收集姓名、邮箱、浏览历史、IP 或任何可识别信息
- 不使用广告 SDK、分析 SDK、像素追踪或指纹识别
- 不访问标签页内容、剪贴板、Cookie 或表单数据
- 不出售或共享数据（因为我们根本没有收集数据）

### 支付

购买 Pro 授权码通过站外支付平台（例如 Stripe / Paddle / Lemon Squeezy）完成。
支付页面、支付信息与收据均由该平台处理，本扩展开发者不会看到您的完整卡号。

### 政策变更

如有重大变更，将在本页面更新"最后更新"日期并随扩展版本说明。

### 联系方式

问题请发送至：[你的邮箱] / [你的网站]

---

## English

### Overview

Web Crawler is an entertainment browser extension: it draws animated mechanical
spiders crawling over web pages and, optionally, applies time-limited visual
"corruption" to page elements that automatically restores itself. We value your
privacy. This extension **does not collect, upload, or sell any personal data**.

### Data we access

**1. Local storage (`chrome.storage.local`)**

The extension only stores, locally in your browser:

- Your settings (toggle, spider count, speed, skin, virus-effect parameters)
- The list of sites where you disabled the extension
- The license key you voluntarily enter and its verification result

This data stays in your browser and is deleted when you uninstall. It is never
shared with third parties.

**2. Network access**

- Content scripts run on the http/https pages you visit to draw the canvas
  animation and (when "virus mode" is enabled) modify inline styles of page
  elements. **Page content is never read or sent to any server.**
- Only when you voluntarily enter and verify a license key does the extension
  send a request to our licensing server (configured in
  `src/common/config.js`) containing: the license key, an anonymous random
  device identifier (used to limit how many devices one key can activate),
  the product name and version. No other network requests are made.

**3. What we do NOT do**

- No collection of names, emails, browsing history, IP addresses, or any
  identifying information
- No advertising, analytics, tracking pixels, or fingerprinting
- No access to tab contents, clipboard, cookies, or form data
- No sale or sharing of data (we don't collect any)

### Payments

Pro license keys are purchased through an external payment provider
(e.g. Stripe / Paddle / Lemon Squeezy). Checkout, payment details, and receipts
are handled entirely by that provider; the developer never sees your full card
number.

### Changes

Material changes will be reflected by updating the "Last updated" date on this
page.

### Contact

[your email] / [your site]
