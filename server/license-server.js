/* Web Crawler — 授权服务器（参考实现，零依赖，纯 Node）
 *
 * 启动：  LICENSE_ADMIN_SECRET=你的密钥 node server/license-server.js [端口，默认 8787]
 * 存储：  server/data/licenses.json（换数据库时只需改 readStore/writeStore）
 *
 * 接口：
 *   POST /v1/license/verify   {key, deviceId, product, version}   ← 扩展调用（CORS 全开）
 *   POST /v1/license/create   {key?, tier, lifetime, expiresAt?, limit?}   ← 管理员发码
 *   GET  /v1/license/list                                     ← 管理员查码
 *   GET  /health
 *
 * 授权响应：{valid, tier, expiresAt, lifetime, activations:{used,limit}} 或 {valid:false, reason}
 *
 * 商业接入建议：
 *   - 收款用 Stripe Payment Link / Paddle / Lemon Squeezy，付款成功后回调你的
 *     "发码页面"（内部调用 /v1/license/create），把码发到用户邮箱；
 *   - 扩展里只配 LICENSING.endpoint 指向本服务即可，无需改其它代码。
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = parseInt(process.argv[2], 10) || parseInt(process.env.LICENSE_PORT, 10) || 8787;
const ADMIN_SECRET = process.env.LICENSE_ADMIN_SECRET || 'change-me-in-production';
const DATA_FILE = path.join(__dirname, 'data', 'licenses.json');
const GRACE_DEVICE_LIMIT = 5;   // 默认可激活设备数

/* ---------- 存储 ---------- */
function readStore() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch (e) { return {}; }
}
function writeStore(store) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2));
}
function genKey() {
  const part = () => crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 4);
  return ['WC', part(), part(), part()].join('-');
}

/* ---------- 业务 ---------- */
function verify(key, deviceId) {
  const store = readStore();
  const rec = store[String(key || '').trim().toUpperCase()];
  if (!rec) return { valid: false, reason: 'not_found' };
  if (rec.expiresAt && Date.now() > rec.expiresAt) return { valid: false, reason: 'expired' };

  const limit = rec.limit || GRACE_DEVICE_LIMIT;
  deviceId = String(deviceId || '').slice(0, 64);
  if (deviceId) {
    if (!rec.devices) rec.devices = [];
    if (rec.devices.indexOf(deviceId) < 0) {
      if (rec.devices.length >= limit) {
        return { valid: false, reason: 'activation_limit', activations: { used: rec.devices.length, limit } };
      }
      rec.devices.push(deviceId);
      rec.lastSeenAt = Date.now();
      writeStore(store);
    } else {
      rec.lastSeenAt = Date.now();
      writeStore(store);
    }
  }
  return {
    valid: true,
    tier: rec.tier || 'pro',
    expiresAt: rec.expiresAt || null,
    lifetime: !!rec.lifetime,
    activations: { used: (rec.devices || []).length, limit }
  };
}

function create(body) {
  const store = readStore();
  const key = String(body.key || '').trim().toUpperCase() || genKey();
  if (store[key]) return { error: 'key_exists', key };
  store[key] = {
    tier: body.tier === 'free' ? 'free' : 'pro',
    lifetime: body.lifetime !== false,
    expiresAt: body.expiresAt || null,
    limit: body.limit || GRACE_DEVICE_LIMIT,
    devices: [],
    createdAt: Date.now(),
    note: body.note || ''
  };
  writeStore(store);
  return { key, record: store[key] };
}

/* ---------- HTTP ---------- */
function send(res, status, obj) {
  const data = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Secret',
    'Cache-Control': 'no-store'
  });
  res.end(data);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let buf = '';
    req.on('data', c => { buf += c; if (buf.length > 64 * 1024) { reject(new Error('too large')); req.destroy(); } });
    req.on('end', () => { try { resolve(buf ? JSON.parse(buf) : {}); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}
function checkAdmin(req) {
  return (req.headers['x-admin-secret'] || '') === ADMIN_SECRET;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (req.method === 'OPTIONS') { send(res, 204, {}); return; }

  try {
    if (req.method === 'GET' && url.pathname === '/health') return send(res, 200, { ok: true });

    if (req.method === 'POST' && url.pathname === '/v1/license/verify') {
      const body = await readBody(req);
      if (!body.key) return send(res, 400, { valid: false, reason: 'bad_request' });
      return send(res, 200, verify(body.key, body.deviceId));
    }

    if (req.method === 'POST' && url.pathname === '/v1/license/create') {
      if (!checkAdmin(req)) return send(res, 403, { error: 'forbidden' });
      const body = await readBody(req);
      const r = create(body);
      return send(res, r.error ? 409 : 200, r);
    }

    if (req.method === 'GET' && url.pathname === '/v1/license/list') {
      if (!checkAdmin(req)) return send(res, 403, { error: 'forbidden' });
      const store = readStore();
      const list = Object.keys(store).map(k => ({
        key: k, tier: store[k].tier, lifetime: store[k].lifetime,
        expiresAt: store[k].expiresAt, devices: (store[k].devices || []).length,
        limit: store[k].limit, createdAt: store[k].createdAt
      }));
      return send(res, 200, { list });
    }

    send(res, 404, { error: 'not_found' });
  } catch (e) {
    send(res, 500, { error: String(e && e.message || e) });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('license server: http://127.0.0.1:' + PORT);
  console.log('admin secret  : ' + (ADMIN_SECRET === 'change-me-in-production' ? '⚠ 未设置 LICENSE_ADMIN_SECRET' : '已设置'));
  if (ADMIN_SECRET === 'change-me-in-production') console.log('  生产环境务必用环境变量设置强随机密钥！');
});

/* ---------- 本地发码 CLI：node license-server.js create [lifetime|days=30] ---------- */
if (process.argv[2] === 'create') {
  const arg = process.argv[3] || 'lifetime';
  const body = arg === 'lifetime'
    ? { lifetime: true }
    : { lifetime: false, expiresAt: Date.now() + parseInt(arg.replace('days=', ''), 10) * 86400000 };
  const r = create(body);
  console.log(JSON.stringify(r, null, 2));
  process.exit(0);
}
