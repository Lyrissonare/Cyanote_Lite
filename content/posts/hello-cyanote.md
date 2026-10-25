---
title: 你好，Cyanote — 从零搭建一个蓝色博客
date: 2025-01-06 09:00
updated: 2026-10-06 15:05
categories: [技术]
tags: [Cyanote, Node.js, 博客]
excerpt: Cyanote 是我为自己打造的博客系统：Hexo 式的阅读体验、语雀式的写作体验，以及一抹贯穿始终的蓝。
cover: "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%221200%22%20height%3D%22480%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22g%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%221%22%20y2%3D%221%22%3E%3Cstop%20offset%3D%220%22%20stop-color%3D%22%230b3bbf%22%2F%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%233b82f6%22%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Crect%20width%3D%221200%22%20height%3D%22480%22%20fill%3D%22url(%23g)%22%2F%3E%3Ccircle%20cx%3D%221000%22%20cy%3D%2280%22%20r%3D%22160%22%20fill%3D%22%23ffffff22%22%2F%3E%3Ccircle%20cx%3D%22180%22%20cy%3D%22420%22%20r%3D%22120%22%20fill%3D%22%23ffffff18%22%2F%3E%3Ctext%20x%3D%2270%22%20y%3D%22260%22%20font-family%3D%22system-ui%2CSegoe%20UI%2Csans-serif%22%20font-size%3D%2264%22%20font-weight%3D%22700%22%20fill%3D%22%23ffffffec%22%3ECyanote%3C%2Ftext%3E%3Ctext%20x%3D%2272%22%20y%3D%22330%22%20font-family%3D%22system-ui%2CSegoe%20UI%2Csans-serif%22%20font-size%3D%2228%22%20fill%3D%22%23ffffffb0%22%3ERender%20ideas%20in%20blue.%3C%2Ftext%3E%3C%2Fsvg%3E"
pinned: true
views: 55
---

# 你好，Cyanote

这是一篇「关于本站」的文章，也是系统自我介绍的演示稿。

## 为什么是蓝色

> 蓝色是天空、是海洋，也是代码高亮里最安详的颜色。
> —— 本站的信条

全局特征色为蓝色：链接、徽章、按钮、代码块边框……一切皆蓝。

## 特性一览

- **阅读**：首页、文章列表、分类、标签、归档，布局参照 Hexo 等成熟博客
- **写作**：语雀式的 Markdown 编辑器，实时预览，可拖拽 / 粘贴上传图片
- **外观**：暗色 / 亮色主题一键切换；首页可开启「未来主义」先锋风格
- **管理**：草稿与发布、目录（slug）、置顶、浏览计数，全部通过 REST API

## 技术选型

| 层 | 技术 |
| --- | --- |
| 后端 | Node.js + Express + 内置 SQLite |
| 前端 | 原生 JS 单页应用（无构建步骤） |
| 渲染 | marked + DOMPurify + Prism 高亮 |

```js
// 一段表白的代码
const cyanote = async (idea) => {
  const draft = await writer.start(idea);
  return publisher.note(draft).withColor('blue');
};
cyanote('Hello, Blue');
```

祝你和你的博客都保持明亮 🌊