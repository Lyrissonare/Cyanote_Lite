#!/usr/bin/env node
/* Zero-dependency static server for local preview of the Cyanote Lite site.
   Mimics GitHub Pages closely enough for development: relative paths, JSON
   served with the right MIME type, SPA-friendly (everything falls back to
   index.html for extensionless paths).

   Usage: node serve.mjs [--port 3820] [--watch]   (--watch also rebuilds
   content/index.json when sources change)                                    */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const portIdx = args.indexOf('--port');
const PORT = Number(portIdx >= 0 ? args[portIdx + 1] : process.env.PORT) || 3820;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
};

const server = http.createServer((req, res) => {
  try {
    const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let file = path.normalize(path.join(ROOT, urlPath));
    if (!file.startsWith(ROOT)) {
      res.writeHead(403).end('Forbidden');
      return;
    }
    if (!path.extname(file)) file = path.join(file, 'index.html');
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(ROOT, 'index.html');
    const body = fs.readFileSync(file);
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(body);
  } catch {
    res.writeHead(500).end('server error');
  }
});

server.listen(PORT, () => {
  console.log(`\n  🌊yanote Lite 预览：http://localhost:${PORT}\n`);
});

if (args.includes('--watch')) {
  const { build } = await import('./build.mjs');
  let running = false;
  const run = () => {
    if (running) return;
    running = true;
    try {
      build();
    } catch (err) {
      console.error('构建失败:', err.message);
    }
    running = false;
  };
  run();
  fs.watch(path.join(ROOT, 'content'), { recursive: true }, (evt, file) => {
    if (file && /\.(md|json)$/i.test(file)) run();
  });
  console.log('  已开启构建监视（修改 content/ 自动重建索引）\n');
}
