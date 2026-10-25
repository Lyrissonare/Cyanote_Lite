---
title: Node.js 内置 SQLite 使用指南
date: 2025-02-14 09:00
updated: 2026-10-06 15:05
categories: [技术]
tags: [Node.js, SQLite, 后端]
excerpt: "从 Node 22.5 开始，node:sqlite 成为内置模块。这篇文章记录它的 API 与最佳实践。"
---

# Node.js 内置 SQLite 使用指南

从 `node:sqlite` 进入稳定性航道后，我们不再需要 `better-sqlite3` 的原生编译。

## 快速上手

```js
import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync('blog.db');
db.exec('CREATE TABLE IF NOT EXISTS posts (id INTEGER PRIMARY KEY, title TEXT)');
db.prepare('INSERT INTO posts (title) VALUES (?)').run('第一篇');
console.log(db.prepare('SELECT * FROM posts').all());
```

## 三个要点

1. **同步 API**：与 better-sqlite3 一样同步、直接、快
2. **预处理语句**：始终用 `?` 占位符，杜绝注入
3. **WAL 模式**：读多写少的博客场景，并发收益明显

> 小技巧：`PRAGMA journal_mode = WAL` 应该在建表之前执行。