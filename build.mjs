#!/usr/bin/env node
/* Cyanote Lite builder — the "Hexo" half of the static site.
   Reads content/posts/*.md (+ content/settings.json) and generates the public
   manifest content/index.json that js/api.js serves in the browser.

   Usage:
     node build.mjs          rebuild the manifest
     node build.mjs --watch  rebuild whenever a source file changes

   Deterministic: naive datetimes are read as UTC, output JSON has a fixed key
   order and stable sorting, so rebuilds on different machines produce
   identical bytes for identical sources. Drafts are excluded from the public
   manifest. */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseFrontMatter, toIsoDate } from './tools/frontmatter.mjs';
import { snippet } from './js/util.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const POSTS_DIR = path.join(__dirname, 'content', 'posts');
const SETTINGS_FILE = path.join(__dirname, 'content', 'settings.json');
const OUT_FILE = path.join(__dirname, 'content', 'index.json');

const DEFAULT_SETTINGS = {
  homeRecentCount: '3',
  announcementsEnabled: '0',
  announcements: '',
  friendLinksEnabled: '0',
  friendLinks: '',
  aboutContent: `# 关于 Cyanote

> 在蓝色的深处，记录思想与代码。

**Cyanote Lite** 是纯静态版本的 Cyanote：同样的 Hexo / Butterfly 风格阅读体验，
但不需要任何服务端 —— 文章是带 front-matter 的 Markdown 文件，
由 \`build.mjs\` 生成静态索引，可托管在 GitHub Pages 等任意静态托管服务上。

这段内容可在 \`content/settings.json\` 的 \`aboutContent\` 中修改。
`,
};

const slugify = (s) =>
  String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

const asArray = (v) => {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  if (typeof v === 'string' && v.trim()) return [v.trim()];
  return [];
};

function titleFromBody(body, slug) {
  const h1 = body.match(/^#\s+(.+)$/m);
  return (h1 ? h1[1].trim() : '').replace(/[#*_`]+/g, '') || slug;
}

function loadPost(file) {
  const raw = fs.readFileSync(path.join(POSTS_DIR, file), 'utf8');
  const slug = slugify(path.basename(file, path.extname(file)));
  const { data, body } = parseFrontMatter(raw);
  const status = data.status === 'draft' || data.draft === true ? 'draft' : 'published';
  const publishedAt = status === 'published' ? toIsoDate(data.date) : null;
  const updatedAt = toIsoDate(data.updated) ?? publishedAt ?? new Date().toISOString();
  const content = body.replace(/^\s+/, '');
  return {
    slug,
    title: String(data.title ?? '').trim() || titleFromBody(body, slug),
    content,
    excerpt: String(data.excerpt ?? '').trim() || snippet(content, 150),
    cover: String(data.cover ?? '').trim(),
    categories: asArray(data.categories),
    tags: asArray(data.tags),
    status,
    pinned: data.pinned === true || data.pinned === 'true' || data.pinned === 1,
    views: Math.max(0, Number(data.views) || 0),
    createdAt: publishedAt ?? updatedAt,
    updatedAt,
    publishedAt,
  };
}

export function build() {
  ensureSettings();
  const files = fs
    .readdirSync(POSTS_DIR)
    .filter((f) => /\.md$/i.test(f))
    .sort();

  const posts = [];
  const seen = new Map();
  const drafts = [];
  for (const file of files) {
    const post = loadPost(file);
    if (seen.has(post.slug)) throw new Error(`slug 重复：「${post.slug}」(${file} 与 ${seen.get(post.slug)})`);
    seen.set(post.slug, file);
    if (post.status === 'draft') {
      drafts.push(post.slug);
      continue; // drafts never enter the public manifest
    }
    posts.push(post);
  }

  // canonical order: creation order (like the original DB row order). The
  // presentation layers re-sort anyway; this order decides count ties in
  // computeMeta (tag cloud / category list), matching the full Cyanote build.
  posts.sort(
    (a, b) =>
      String(a.createdAt ?? '').localeCompare(String(b.createdAt ?? '')) ||
      a.slug.localeCompare(b.slug)
  );

  const json = JSON.stringify({ posts }, null, 2) + '\n';
  const changed = !fs.existsSync(OUT_FILE) || fs.readFileSync(OUT_FILE, 'utf8') !== json;
  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, json);

  return { published: posts.length, drafts, changed, slugs: posts.map((p) => p.slug) };
}

function ensureSettings() {
  if (fs.existsSync(SETTINGS_FILE)) return;
  fs.mkdirSync(path.dirname(SETTINGS_FILE), { recursive: true });
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(DEFAULT_SETTINGS, null, 2) + '\n');
  console.log('已生成默认 content/settings.json');
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
const isWatch = process.argv.includes('--watch');

if (isWatch) {
  let running = false;
  const run = () => {
    if (running) return;
    running = true;
    try {
      const r = build();
      console.log(`[${new Date().toLocaleTimeString()}] 已生成 index.json — ${r.published} 篇已发布${r.drafts.length ? `，${r.drafts.length} 篇草稿未收录 (${r.drafts.join(', ')})` : ''}`);
    } catch (err) {
      console.error('构建失败:', err.message);
    }
    running = false;
  };
  run();
  fs.watch(path.join(__dirname, 'content'), { recursive: true }, (evt, file) => {
    if (file && /\.(md|json)$/i.test(file)) run();
  });
  console.log('正在监视 content/ 目录变更（Ctrl+C 退出）');
} else if (isMain) {
  const r = build();
  console.log(`✓ content/index.json 已生成 — ${r.published} 篇已发布${r.drafts.length ? `，草稿未收录：${r.drafts.join(', ')}` : ''}${r.changed ? '' : '（无变化）'}`);
}
