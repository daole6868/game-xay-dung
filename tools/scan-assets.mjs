#!/usr/bin/env node
/*
 * Tạo assets/manifest.json để bản game đặt trên web (GitHub Pages, máy chủ tĩnh...) tự dùng ảnh Tiny Swords.
 *
 *   node tools/scan-assets.mjs                      quét thư mục assets/ (bạn đã giải nén Tiny Swords vào đó)
 *   node tools/scan-assets.mjs "Tiny Swords.zip"    lấy ảnh cần dùng từ file zip, chép vào assets/ts/
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assetsDir = path.join(root, 'assets');
const ctx = { globalThis: {} };
ctx.globalThis = ctx;
vm.createContext(Object.assign(ctx, { Blob, Response, DecompressionStream, TextDecoder, DataView, Uint8Array, ArrayBuffer }));
for (const f of ['js/assets/catalog.js', 'js/assets/zip.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
}
const CAT = ctx.TS_CATALOG;

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else out.push(path.relative(assetsDir, p).split(path.sep).join('/'));
  }
  return out;
}

const arg = process.argv[2];
fs.mkdirSync(assetsDir, { recursive: true });
let files = {};

if (arg && /\.zip$/i.test(arg)) {
  const zip = await ctx.ZipReader.openZip(fs.readFileSync(arg).buffer.slice(0));
  const byName = Object.fromEntries(zip.entries.map((e) => [e.name, e]));
  const match = CAT.matchFiles(Object.keys(byName));
  fs.mkdirSync(path.join(assetsDir, 'ts'), { recursive: true });
  for (const key in match) {
    const rel = `ts/${key}.png`;
    fs.writeFileSync(path.join(assetsDir, rel), await zip.read(byName[match[key]]));
    files[key] = rel;
  }
} else {
  const scanDir = arg ? path.resolve(arg) : assetsDir;
  if (!scanDir.startsWith(assetsDir)) {
    console.error('Thư mục ảnh phải nằm trong assets/ để trình duyệt tải được.');
    process.exit(1);
  }
  files = CAT.matchFiles(walk(scanDir).map((p) => p));
}

const total = Object.keys(CAT.entries).filter((k) => !CAT.entries[k].proc).length;
fs.writeFileSync(path.join(assetsDir, 'manifest.json'), JSON.stringify({ generated: new Date().toISOString(), files }, null, 1));
console.log(`Đã khớp ${Object.keys(files).length}/${total} sprite Tiny Swords → assets/manifest.json`);
const missing = Object.keys(CAT.entries).filter((k) => !CAT.entries[k].proc && !files[k] && /^u\.blue|^b\.blue|^n\.|^t\./.test(k));
if (missing.length) console.log('Chưa khớp (sẽ dùng đồ hoạ dự phòng):', missing.join(', '));
