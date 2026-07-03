#!/usr/bin/env node
/**
 * server.js — 照片墙开发服务器
 *
 * 提供零依赖的静态文件服务，并内置照片扫描 API，
 * 使页面上的「刷新」按钮能一键扫描 photos/ 目录并更新照片墙。
 *
 * 使用方法:
 *   node server.js
 *   然后访问 http://localhost:3000
 *
 * 支持的 API:
 *   POST /api/scan-photos  扫描 photos/ 目录，更新照片清单
 *   GET  /                  提供静态文件（默认指向 photos.html）
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PORT = process.env.PORT || 3000;
const ROOT = path.resolve(__dirname);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png':  'image/png',
  '.webp': 'image/webp',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.md':   'text/markdown; charset=utf-8',
};

/* ------- 静态文件服务 ------- */
function serveFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

/* ------- HTTP 服务 ------- */
const server = http.createServer((req, res) => {
  // ---- API：扫描照片 ----
  if (req.method === 'POST' && req.url === '/api/scan-photos') {
    try {
      const scanScript = path.join(ROOT, 'tools', 'scan-photos.js');
      if (!fs.existsSync(scanScript)) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'tools/scan-photos.js 不存在' }));
        return;
      }

      const result = execSync('node tools/scan-photos.js', { cwd: ROOT, encoding: 'utf-8' });
      const manifestPath = path.join(ROOT, 'src', 'data', 'photos.json');
      const photos = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

      console.log('  → ' + result.trim());
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      });
      res.end(JSON.stringify({ ok: true, count: photos.length, photos }));
      return;
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: e.message }));
      return;
    }
  }

  // ---- 静态文件 ----
  const urlPath = req.url === '/' ? '/photos.html' : req.url;
  const filePath = path.normalize(path.join(ROOT, urlPath));

  // 防止目录穿越
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  serveFile(res, filePath);
});

server.listen(PORT, () => {
  console.log('🌐 照片墙开发服务器已启动');
  console.log(`   地址: http://localhost:${PORT}`);
  console.log(`   用法: 点击页面右上角 ↻ 按钮即可扫描并刷新照片墙`);
});
