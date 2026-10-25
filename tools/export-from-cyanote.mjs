#!/usr/bin/env node
/* One-time migration: export posts + settings from the full Cyanote build's
   SQLite database into Cyanote_Lite's Markdown sources.

   The source database is opened READ-ONLY — the original Cyanote folder is
   never modified. Uploaded images referenced by posts are copied into
   content/images/ and URLs are rewritten to relative content/images/ paths.

   Usage:
     node tools/export-from-cyanote.mjs [path-to-cyanote-root]
                                       (default: E:\Cyanote)          */

import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { stringifyFrontMatter, toIsoDate } from './frontmatter.mjs';

const ROOT = path.resolve(process.argv[2] || 'E:\\Cyanote');
const DB_FILE = path.join(ROOT, 'data', 'cyanote.db');
const UPLOAD_DIR = path.join(ROOT, 'data', 'uploads');
const LITE = path.resolve(import.meta.dirname, '..');
const POSTS_DIR = path.join(LITE, 'content', 'posts');
const IMAGES_DIR = path.join(LITE, 'content', 'images');
const SETTINGS_FILE = path.join(LITE, 'content', 'settings.json');

if (!fs.existsSync(DB_FILE)) {
  console.error(`未找到数据库：${DB_FILE}（用参数指定 Cyanote 根目录）`);
  process.exit(1);
}

const db = new DatabaseSync(DB_FILE, { readOnly: true });
fs.mkdirSync(POSTS_DIR, { recursive: true });
fs.mkdirSync(IMAGES_DIR, { recursive: true });

/* ---- posts ---- */
const rows = db.prepare('SELECT * FROM articles ORDER BY id').all();
const copied = new Set();
let rewritten = 0;

function migrateImages(text) {
  return String(text ?? '').replace(/\/uploads\/([\w.-]+)/g, (m, file) => {
    const src = path.join(UPLOAD_DIR, file);
    if (!fs.existsSync(src)) return m; // leave broken refs untouched, visible in review
    if (!copied.has(file)) {
      fs.copyFileSync(src, path.join(IMAGES_DIR, file));
      copied.add(file);
    }
    rewritten++;
    return `content/images/${file}`;
  });
}

const arr = (v) => {
  try {
    const a = JSON.parse(v ?? '[]');
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
};

for (const row of rows) {
  const body = migrateImages(row.content).trim();
  const cover = migrateImages(row.cover);
  const fm = {
    title: row.title,
    date: toIsoDate(row.published_at ?? row.created_at, { fallback: row.created_at }),
    updated: toIsoDate(row.updated_at),
    categories: arr(row.categories),
    tags: arr(row.tags),
    excerpt: row.excerpt || '',
    cover: cover || '',
    pinned: !!row.pinned,
    views: row.views || 0,
    status: row.status === 'draft' ? 'draft' : 'published',
  };
  const md = stringifyFrontMatter(fm, body);
  const file = path.join(POSTS_DIR, `${row.slug}.md`);
  fs.writeFileSync(file, md);
  console.log(`✓ ${row.slug}.md  (${row.status}${row.pinned ? '，置顶' : ''})`);
}

/* ---- settings ---- */
const settingsRows = db.prepare('SELECT key, value FROM settings').all();
const settings = Object.fromEntries(settingsRows.map((r) => [r.key, r.value]));
fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2) + '\n');
console.log(`✓ content/settings.json（${Object.keys(settings).length} 项设置）`);

console.log(
  `\n迁移完成：${rows.length} 篇文章，${copied.size} 张图片${rewritten ? `（重写 ${rewritten} 处引用）` : ''}。` +
    `\n下一步：node build.mjs`
);
