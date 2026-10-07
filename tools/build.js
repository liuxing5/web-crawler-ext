/* Web Crawler — 构建与上架前检查（零依赖）
 * 用法：
 *   node tools/build.js          # 检查 + 生成 dist/chrome、dist/edge、dist/firefox 及各自 zip
 *   node tools/build.js --check  # 只做检查，不产出
 * 检查项：manifest 合法性、文件齐全、无远程代码、i18n 键完整、默认语言存在、图标存在
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const CHECK_ONLY = process.argv.indexOf('--check') >= 0;

const errors = [];
const warnings = [];
const ok = [];
function err(m) { errors.push(m); }
function warn(m) { warnings.push(m); }
function good(m) { ok.push(m); }

function readJson(p) {
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8')); } catch (e) { err('JSON 解析失败 ' + p + ': ' + e.message); return null; }
}
function exists(p) { return fs.existsSync(path.join(ROOT, p)); }

/* ============ 1. manifest 检查 ============ */
const manifest = readJson('manifest.json');
if (manifest) {
  if (manifest.manifest_version !== 3) err('manifest_version 必须是 3');
  if (!manifest.name || !manifest.description) err('缺少 name / description');
  if (manifest.default_locale !== 'zh_CN') warn('default_locale 不是 zh_CN（当前: ' + manifest.default_locale + '）');
  if (exists('_locales/' + (manifest.default_locale || 'zh_CN') + '/messages.json')) good('默认语言包存在');
  else err('默认语言包缺失：_locales/' + (manifest.default_locale || 'zh_CN'));

  // 引用的文件全部存在
  const refs = []
    .concat(Object.values(manifest.icons || {}))
    .concat(Object.values((manifest.action && manifest.action.default_icon) || {}))
    .concat([manifest.action && manifest.action.default_popup])
    .concat([manifest.options_ui && manifest.options_ui.page])
    .concat([manifest.background && manifest.background.service_worker])
    .concat((manifest.content_scripts || []).reduce((a, c) => a.concat(c.js || [], c.css || []), []))
    .filter(Boolean);
  refs.forEach(f => exists(f) ? null : err('manifest 引用的文件不存在：' + f));
  good('manifest 引用文件检查完成（' + refs.length + ' 项）');

  if (manifest.permissions && manifest.permissions.length > 6) warn('权限偏多：' + manifest.permissions.join(', '));
  if ((manifest.content_scripts || []).some(c => (c.matches || []).includes('<all_urls>'))) {
    warn('内容脚本使用 <all_urls>，审核时需单独说明');
  }
  if (manifest.host_permissions) warn('声明了 host_permissions，务必在 listing / 隐私政策中说明用途');
}

/* ============ 2. MV3 远程代码检查（Chrome 严格禁止） ============ */
const scanFiles = [];
(function walk(dir) {
  for (const f of fs.readdirSync(path.join(ROOT, dir))) {
    const rel = path.join(dir, f);
    const st = fs.statSync(path.join(ROOT, rel));
    if (st.isDirectory()) walk(rel);
    else if (/\.(js|html|css|json)$/.test(f) && !rel.startsWith('dist') && !rel.startsWith('node_modules')) scanFiles.push(rel);
  }
})('src');
scanFiles.push('manifest.json');

const remotePatterns = [
  [/eval\s*\(/, '使用 eval（禁止）'],
  [/new\s+Function\s*\(/, '使用 new Function（禁止）'],
  [/importScripts\s*\(\s*['"]https?:\/\//, 'importScripts 远程脚本（禁止）'],
  [/<script[^>]+src=["']https?:\/\//, 'HTML 引用远程脚本（禁止）'],
  [/import\s*\(\s*['"]https?:\/\//, '动态 import 远程模块（禁止）']
];
let remoteClean = true;
for (const rel of scanFiles) {
  const text = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  for (const [re, msg] of remotePatterns) {
    if (re.test(text)) { err(rel + '：' + msg); remoteClean = false; }
  }
}
if (remoteClean) good('无远程代码（MV3 合规）');

/* ============ 3. i18n 键完整性 ============ */
const zh = readJson('_locales/zh_CN/messages.json') || {};
const en = readJson('_locales/en/messages.json') || {};
const usedKeys = new Set();
for (const rel of scanFiles) {
  if (!/\.(js|html)$/.test(rel)) continue;
  const text = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  let m;
  const pats = [
    /chrome\.i18n\.getMessage\(\s*['"]([A-Za-z0-9_]+)['"]/g,
    /data-i18n(?:-ph)?="([A-Za-z0-9_]+)"/g,
    /\bt\(\s*['"]([A-Za-z0-9_]+)['"]\s*\)/g,
    /nameKey:\s*['"]([A-Za-z0-9_]+)['"]/g,
    /['"]__MSG_([A-Za-z0-9_]+)__['"]/g
  ];
  for (const p of pats) while ((m = p.exec(text))) usedKeys.add(m[1]);
}
const missingZh = [...usedKeys].filter(k => !zh[k]);
const missingEn = [...usedKeys].filter(k => !en[k]);
if (missingZh.length) err('zh_CN 缺少键：' + missingZh.join(', '));
else good('zh_CN 键齐全（引用 ' + usedKeys.size + ' 个）');
if (missingEn.length) warn('en 缺少键：' + missingEn.join(', '));

/* ============ 4. 语法检查 ============ */
for (const rel of scanFiles.filter(f => f.endsWith('.js'))) {
  try { execFileSync(process.execPath, ['--check', path.join(ROOT, rel)], { stdio: 'pipe' }); }
  catch (e) { err('语法错误 ' + rel + '：' + (e.stderr || e.message).toString().slice(0, 300)); }
}
good('JS 语法检查完成');

/* ============ 输出检查结果 ============ */
console.log('\n===== 上架前检查 =====');
ok.forEach(m => console.log('  ✓ ' + m));
warnings.forEach(m => console.log('  ! ' + m));
errors.forEach(m => console.log('  ✗ ' + m));
console.log('======================\n');

if (CHECK_ONLY || errors.length) {
  if (errors.length) console.log('存在 ' + errors.length + ' 个错误，已中止构建。');
  process.exit(errors.length ? 1 : 0);
}

/* ============ 5. 组装 dist ============ */
const version = manifest.version;
function rmrf(p) { fs.rmSync(p, { recursive: true, force: true }); }
function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const f of fs.readdirSync(from)) {
    const s = path.join(from, f), d = path.join(to, f);
    if (fs.statSync(s).isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}
function assemble(name, mutate) {
  const dir = path.join(DIST, name);
  rmrf(dir);
  fs.mkdirSync(dir, { recursive: true });
  copyDir(path.join(ROOT, 'src'), path.join(dir, 'src'));
  copyDir(path.join(ROOT, '_locales'), path.join(dir, '_locales'));
  copyDir(path.join(ROOT, 'icons'), path.join(dir, 'icons'));
  const mf = JSON.parse(JSON.stringify(manifest));
  if (mutate) mutate(mf);
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(mf, null, 2));
  // 正式包关闭开发授权码
  const cfgPath = path.join(dir, 'src', 'common', 'config.js');
  const cfg = fs.readFileSync(cfgPath, 'utf8').replace(/devKeys:\s*true/, 'devKeys: false');
  if (!/devKeys:\s*false/.test(cfg)) warn(name + '：devKeys 标记未找到');
  fs.writeFileSync(cfgPath, cfg);
  return dir;
}

function zipDir(dir, zipPath) {
  fs.rmSync(zipPath, { force: true });
  const ps = `$ErrorActionPreference='Stop'; Compress-Archive -Path '${dir}\\*' -DestinationPath '${zipPath}' -Force`;
  execFileSync('powershell', ['-NoProfile', '-Command', ps], { stdio: 'pipe' });
}

const chromeDir = assemble('chrome');
// Edge 与 Chrome 包完全一致（Edge Add-ons 直接接受 Chrome MV3 包）
const edgeDir = assemble('edge');
const firefoxDir = assemble('firefox', mf => {
  delete mf.minimum_chrome_version;
  mf.background = {
    scripts: [
      'src/common/config.js',
      'src/common/licensing.js',
      'src/background.js'
    ]
  };
  mf.browser_specific_settings = {
    gecko: {
      id: 'webcrawler@webcrawler-ext.example',
      strict_min_version: '115.0'
    }
  };
});

const zips = [
  [chromeDir, path.join(DIST, 'web-crawler-chrome-v' + version + '.zip')],
  [edgeDir, path.join(DIST, 'web-crawler-edge-v' + version + '.zip')],
  [firefoxDir, path.join(DIST, 'web-crawler-firefox-v' + version + '.zip')]
];
for (const [dir, zip] of zips) {
  zipDir(dir, zip);
  const kb = Math.round(fs.statSync(zip).size / 1024);
  console.log('打包完成  ' + path.basename(zip) + '  ' + kb + ' KB');
}

console.log('\n下一步：');
console.log('  Chrome  : https://chrome.google.com/webstore/devconsole  （上传 chrome zip，$5 注册费）');
console.log('  Edge    : https://partner.microsoft.com/dashboard/microsoftedge  （上传 edge zip，免费）');
console.log('  Firefox : https://addons.mozilla.org/developers/  （上传 firefox zip）');
console.log('  提交前请阅读 store/review-notes.md 与 store/privacy-policy.md');
