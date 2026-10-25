#!/usr/bin/env node
/* Self-test for Cyanote Lite's pure logic: front-matter parser/serializer and
   the static store's query semantics. Run with `npm test` or directly. */

import assert from 'node:assert/strict';
import { parseFrontMatter, stringifyFrontMatter, toIsoDate } from './frontmatter.mjs';
import { computeMeta, listArticles, getArticle, archivePosts } from '../js/store.js';

let passed = 0;
const test = (name, fn) => {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}\n    ${err.message}`);
    process.exitCode = 1;
  }
};

console.log('front-matter:');

test('inline arrays, quotes, booleans, numbers', () => {
  const { data, body, hasFm } = parseFrontMatter(
    `---\ntitle: 测试：标题\ncategories: [技术, 前端]\ntags: ["a b", 'c']\npinned: true\nviews: 42\n---\n\n正文`
  );
  assert.equal(hasFm, true);
  assert.equal(data.title, '测试：标题');
  assert.deepEqual(data.categories, ['技术', '前端']);
  assert.deepEqual(data.tags, ['a b', 'c']);
  assert.equal(data.pinned, true);
  assert.equal(data.views, 42);
  assert.equal(body.trim(), '正文');
});

test('dash lists and lowercase keys', () => {
  const { data } = parseFrontMatter(`---\nTitle: X\ncategories:\n  - 技术\n  - 随笔\n---\n`);
  assert.equal(data.title, 'X');
  assert.deepEqual(data.categories, ['技术', '随笔']);
});

test('no front-matter falls back to whole body', () => {
  const { data, body, hasFm } = parseFrontMatter('# 只是一个标题\n\n正文');
  assert.equal(hasFm, false);
  assert.deepEqual(data, {});
  assert.ok(body.startsWith('#'));
});

test('naive datetimes are UTC', () => {
  assert.equal(toIsoDate('2025-01-06 09:00'), '2025-01-06T09:00:00.000Z');
  assert.equal(toIsoDate('2025-01-06'), '2025-01-06T00:00:00.000Z');
  assert.equal(toIsoDate('2025-01-06T09:00:00.000Z'), '2025-01-06T09:00:00.000Z');
  assert.equal(toIsoDate(''), null);
  assert.equal(toIsoDate('x', { fallback: 'F' }), 'F');
});

test('stringify → parse round-trip', () => {
  const md = stringifyFrontMatter(
    { title: '带:冒号 #井号 "引号"', date: '2025-01-06T09:00:00.000Z', categories: ['技术'], tags: ['a', 'b c'], pinned: true, views: 7, custom: 'keep me' },
    '正文内容'
  );
  const { data, body } = parseFrontMatter(md);
  assert.equal(data.title, '带:冒号 #井号 "引号"');
  assert.equal(data.date, '2025-01-06 09:00');
  assert.deepEqual(data.categories, ['技术']);
  assert.deepEqual(data.tags, ['a', 'b c']);
  assert.equal(data.pinned, true);
  assert.equal(data.views, 7);
  assert.equal(data.custom, 'keep me');
  assert.equal(body.trim(), '正文内容');
});

test('draft via status or draft flag', () => {
  assert.equal(parseFrontMatter('---\nstatus: draft\n---\nx').data.status, 'draft');
  assert.equal(parseFrontMatter('---\ndraft: true\n---\nx').data.draft, true);
});

console.log('store:');

const posts = [
  { slug: 'a', title: 'Alpha 山', content: 'xyz', excerpt: '', categories: ['技术'], tags: ['t1'], status: 'published', pinned: false, views: 1, publishedAt: '2025-03-01T00:00:00.000Z', updatedAt: '2025-03-01T00:00:00.000Z' },
  { slug: 'b', title: 'Beta 水', content: 'abc', excerpt: '', categories: ['技术'], tags: ['t1', 't2'], status: 'published', pinned: true, views: 2, publishedAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { slug: 'c', title: 'Gamma 木', content: 'qrs', excerpt: '', categories: ['随笔'], tags: [], status: 'published', pinned: false, views: 3, publishedAt: '2025-02-01T00:00:00.000Z', updatedAt: '2025-02-01T00:00:00.000Z' },
  { slug: 'd', title: 'Draft 火', content: '', excerpt: '', categories: [], tags: [], status: 'draft', pinned: false, views: 0, publishedAt: null, updatedAt: '2025-04-01T00:00:00.000Z' },
];

test('meta counts only published', () => {
  const meta = computeMeta(posts);
  assert.equal(meta.posts, 3);
  assert.deepEqual(meta.categories, [{ name: '技术', count: 2 }, { name: '随笔', count: 1 }]);
  assert.deepEqual(meta.tags, [{ name: 't1', count: 2 }, { name: 't2', count: 1 }]);
  assert.deepEqual(meta.archive, [{ year: '2025', months: [{ month: '03', count: 1 }, { month: '02', count: 1 }, { month: '01', count: 1 }] }]);
});

test('listArticles sorts pinned first then newest, paginates', () => {
  const page1 = listArticles(posts, { page: 1, pageSize: 2 });
  assert.deepEqual(page1.items.map((p) => p.slug), ['b', 'a']);
  assert.equal(page1.total, 3);
  const page2 = listArticles(posts, { page: 2, pageSize: 2 });
  assert.deepEqual(page2.items.map((p) => p.slug), ['c']);
  const asc = listArticles(posts, { order: 'asc' });
  assert.deepEqual(asc.items.map((p) => p.slug), ['b', 'c', 'a']);
});

test('listArticles filters by category / tag / case-insensitive q', () => {
  assert.deepEqual(listArticles(posts, { category: '随笔' }).items.map((p) => p.slug), ['c']);
  assert.deepEqual(listArticles(posts, { tag: 't2' }).items.map((p) => p.slug), ['b']);
  assert.deepEqual(listArticles(posts, { q: 'BETA' }).items.map((p) => p.slug), ['b']);
  assert.deepEqual(listArticles(posts, { q: 'xyz' }).items.map((p) => p.slug), ['a']);
});

test('getArticle hides drafts', () => {
  assert.equal(getArticle(posts, 'd'), null);
  assert.equal(getArticle(posts, 'c').slug, 'c');
  assert.equal(getArticle(posts, 'nope'), null);
});

test('archivePosts newest-first, snake_case', () => {
  const arc = archivePosts(posts);
  assert.deepEqual(arc, [
    { slug: 'a', title: 'Alpha 山', published_at: '2025-03-01T00:00:00.000Z' },
    { slug: 'c', title: 'Gamma 木', published_at: '2025-02-01T00:00:00.000Z' },
    { slug: 'b', title: 'Beta 水', published_at: '2025-01-01T00:00:00.000Z' },
  ]);
});

console.log(`\n${passed} 项通过${process.exitCode ? '（存在失败）' : ''}`);
