#!/usr/bin/env node
/* Minimal mock of the GitHub Contents API for local end-to-end testing of the
   Windows publisher (and useful when hacking on the publish pipeline without a
   real repo). Files are served from --root as if it were the repository.

   Endpoints the publisher uses:
     GET  /repos/{owner}/{repo}
     GET  /repos/{owner}/{repo}/contents/{path}?ref={branch}
     PUT  /repos/{owner}/{repo}/contents/{path}

   Usage: node tools/mock-github.mjs --root <dir> [--port 3899] [--token t]   */

import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const val = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
const ROOT = path.resolve(val('root', '.'));
const PORT = Number(val('port', 3899));
const TOKEN = val('token', 'test-token');

const server = http.createServer(async (req, res) => {
  const json = (code, obj) => {
    res.writeHead(code, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(obj));
  };
  const send404 = (m) => json(404, { message: m || 'Not Found' });

  try {
    const url = new URL(req.url, 'http://x');
    const m = url.pathname.match(/^\/repos\/([^/]+)\/([^/]+)(?:\/contents\/(.*))?$/);
    if (!m) return send404();

    if (req.method === 'GET' && !m[3]) {
      return json(200, {
        name: decodeURIComponent(m[2]),
        private: false,
        html_url: `http://localhost:${PORT}/${m[1]}/${m[2]}`,
        default_branch: 'main',
      });
    }

    const file = path.join(ROOT, decodeURIComponent(m[3] ?? ''));
    if (!file.startsWith(ROOT)) return send404('Path escapes repo root');

    if (req.method === 'GET') {
      if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return send404('Not Found');
      const buf = fs.readFileSync(file);
      const b64 = buf.toString('base64').replace(/(.{60})/g, '$1\n'); // GitHub wraps lines
      return json(200, {
        name: path.basename(file),
        path: m[3],
        sha: crypto.createHash('sha1').update(buf).digest('hex'),
        type: 'file',
        size: buf.length,
        encoding: 'base64',
        content: b64,
      });
    }

    if (req.method === 'PUT') {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const body = JSON.parse(Buffer.concat(chunks).toString());
      if (!body.content) return json(400, { message: 'missing content' });
      const buf = Buffer.from(body.content, 'base64');
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, buf);
      console.log(`[mock-github] PUT ${m[3]} (${buf.length} bytes) — ${body.message}`);
      return json(201, {
        content: { path: m[3], sha: crypto.createHash('sha1').update(buf).digest('hex') },
        commit: { sha: crypto.randomBytes(20).toString('hex'), html_url: `http://localhost:${PORT}/commit/local` },
      });
    }

    return send404();
  } catch (err) {
    console.error('[mock-github] error:', err.message);
    return json(500, { message: err.message });
  }
});

server.listen(PORT, () => {
  console.log(`[mock-github] serving repo at ${ROOT}`);
  console.log(`[mock-github] http://localhost:${PORT}/repos/local/blog/... (token: ${TOKEN})`);
});
