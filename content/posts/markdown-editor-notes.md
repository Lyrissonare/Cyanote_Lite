---
title: 语雀式编辑器是怎样炼成的：实时预览与图片上传
date: 2025-04-02 09:00
updated: 2026-10-06 15:05
categories: [技术]
tags: [Markdown, 编辑器, 前端]
excerpt: 拆解 Cyanote 编辑器：防抖渲染、视图切换、拖拽粘贴上传的完整链路。
views: 8
---

# 语雀式编辑器是怎样炼成的

## 实时预览的关键：防抖

```js
let timer;
textarea.addEventListener('input', () => {
  clearTimeout(timer);
  timer = setTimeout(render, 250); // 输入停顿 250ms 后渲染
});
```

## 三种视图

- **编辑**：沉浸写作
- **双栏**：左写右看，语雀默认
- **预览**：只看成稿

## 图片上传链路

1. 拖拽或粘贴图片到编辑器
2. `FormData` 上传到 `POST /api/uploads`
3. 服务端落盘 `data/uploads`，返回 URL
4. 光标处插入 `![图片](url)`，预览立即呈现成图

> 多图连贴？一次排队上传，逐个插入，成功一个展示一个。