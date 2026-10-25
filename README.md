# 🌊 Cyanote Lite

**Cyanote 的纯静态版本** —— 同一套 Hexo / Butterfly 风格的前端、同样的暗夜蓝光视觉，但**不需要任何服务端**。
文章是带 front-matter 的 Markdown 文件，由 `build.mjs` 生成静态索引，可直接托管在 **GitHub Pages**、Cloudflare Pages、Vercel 等任意静态托管服务上。

> 原版 Cyanote（Node.js + Express + SQLite）：https://github.com/Lyrissonare/Cyanote

## 与原版 Cyanote 的关系

| | Cyanote（原版） | Cyanote Lite |
| --- | --- | --- |
| 架构 | 前后端分离，Express + SQLite | **纯静态**，零服务端 |
| 文章存储 | SQLite 数据库，REST API 读写 | `content/posts/*.md`（Hexo 式源文件） |
| 阅读体验 | 完全一致（同一套页面代码、同一套 CSS） | 完全一致 |
| 写作方式 | `/admin` 语雀式在线编辑器 | 本地写 Markdown → Windows 发布器一键推送 |
| 部署 | 需要常驻 Node 进程 | GitHub Pages 等静态托管，免费 |
| 浏览计数 | 服务端真实计数 | 迁移时保留的历史数值（静态站无法累计） |

前端仅改了两处，其余文件与原版逐字节相同：

- `index.html`：资源路径由根绝对路径（`/css/…`）改为相对路径（`css/…`），以兼容 GitHub Pages 的子路径部署
- `js/api.js`：由 REST 客户端改为静态数据客户端 —— 在浏览器内用 `js/store.js` 复刻原服务端的查询语义（过滤 / 排序 / 分页 / 归档统计），页面代码零改动

## 仓库结构

```
├─ index.html            # 站点外壳（与原版相同，路径改为相对）
├─ css/ js/ vendor/      # 前端资源（与原版相同 + store.js）
├─ content/
|  ├─ posts/*.md         # ✍️ 文章源文件（Hexo 式 front-matter）
|  ├─ images/            # 文章图片（引用写作 content/images/xxx.png）
|  ├─ settings.json      # 站点设置（关于页、公告、友链、首页数量）
|  └─ index.json         # ⚙️ 构建产物（公开索引，勿手改）
├─ build.mjs             # 索引生成器（node build.mjs [--watch]）
├─ serve.mjs             # 零依赖本地预览服务器
├─ tools/
|  ├─ frontmatter.mjs    # front-matter 解析/序列化
|  ├─ export-from-cyanote.mjs  # 一次性：从原版 Cyanote 数据库迁移
|  └─ selftest.mjs       # 逻辑自检
└─ publisher/            # 🪟 Windows 发布器（CyanotePublisher.exe 源码）
```

## 文章格式

```markdown
---
title: 你好，Cyanote
date: 2025-01-06 09:00
updated: 2025-01-06 10:00
categories: [技术]
tags: [Cyanote, 博客]
excerpt: 一句话摘要（留空则自动截取正文）
cover: content/images/cover.png
pinned: true
views: 55
status: published      # published（默认）/ draft（草稿不进公开索引）
---

正文（Markdown）……
```

- **slug = 文件名**（`hello-cyanote.md` → `#/post/hello-cyanote`）
- 日期支持 `2025-01-06`、`2025-01-06 09:00`、完整 ISO；**无时区的日期按 UTC 解析**，保证各机器构建结果一致
- `draft` 文章不会进入公开索引，但文件仍在仓库里 —— 敏感草稿请勿推送到公开仓库

## 本地使用

```bash
npm install   # 无需任何依赖，只为获得 npm scripts
npm run dev   # http://localhost:3820 ，修改 content/ 自动重建索引
npm test      # front-matter / 查询逻辑自检
```

> 首次进入首页会播放一次「水滴滴落 → 涟漪内收 → 鱼眼扩张 → 首页内容同步折射 → 收镜」开屏
> （每个浏览器会话一次）；想再看一次就访问 `http://localhost:3820/index.html?splash=1`。
> 如果设备上的 WebGL 表现异常，可加 `&splash2d=1` 强制使用轻量 2D 备用渲染。

## 仓库与部署

| 仓库 | 作用 |
| --- | --- |
| [`Lyrissonare/Cyanote_Lite`](https://github.com/Lyrissonare/Cyanote_Lite) | 博客系统源码（本仓库）：前端、构建器、发布器、示例内容 |
| [`Lyrissonare/blog`](https://github.com/Lyrissonare/blog) | 实际博客：文章正文 + Pages 部署工作流 |

线上站点：**https://lyrissonare.github.io/blog/**

博客仓库的 `.github/workflows/deploy.yml` 在每次推送后：

1. 检出 `blog` 仓库中的 `content/`
2. 检出 `Cyanote_Lite` 的引擎代码
3. 用 `build.mjs` 重新生成 `content/index.json`，组装出纯静态站点
4. 上传并部署到 GitHub Pages

因此日常写作只需要更新博客仓库的 `content/`；升级系统代码后，在博客仓库的 Actions 里手动运行一次 `deploy-blog` 即可。Pages 的 Source 使用 **GitHub Actions**，无需手动切分支。

`content/index.json` 仍由构建过程生成：Windows 发布器推送文章时会一并更新它，网页端直接改 Markdown 时部署工作流也会重新生成。

> `.nojekyll` 已就位，Pages 不会用 Jekyll 处理本站。全部资源使用相对路径，因此项目页（`https://<用户名>.github.io/blog/`）和用户主页（`https://<用户名>.github.io/`）都能直接工作。

## Windows 发布器（publisher/）

`publisher/` 是一个 .NET 8 WPF 应用的源码，功能：

1. 选择本地 `.md` 文件（支持拖拽；自动解析 / 补全 front-matter，可改标题、slug、日期、分类、标签、置顶、草稿状态）
2. 点击「🚀 推送到 GitHub」：
   - 通过 GitHub Contents API 提交 `content/posts/<slug>.md`
   - 拉取远端 `content/index.json`，合并该文章条目后一并提交（与 `build.mjs` 输出字节一致，CI 重建不会产生 diff）
3. GitHub Pages 自动重新部署，几分钟后文章上线

配置项（保存在 `%APPDATA%\CyanotePublisher\config.json`）：

| 字段 | 说明 |
| --- | --- |
| 仓库 | `owner/repo`，例如 `Lyrissonare/blog` |
| 分支 | Pages 部署的分支，默认 `main` |
| 站点子目录 | 站点文件在仓库中的位置，留空 = 根目录（例如 `docs`） |
| 令牌 | GitHub Personal Access Token：classic 需 `repo` 权限；fine-grained 需对该仓库 *Contents: Read and write*。仅保存在本机 |
| API 地址 | 默认 `https://api.github.com`；GitHub Enterprise 填 `https://<主机>/api/v3` |

构建单文件 exe（约 63MB，自带 .NET 运行时，免安装）：

```powershell
cd publisher
dotnet publish -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -o dist
# 产物：publisher/dist/CyanotePublisher.exe
```

> 本地调试发布链路（不碰真实仓库）：`node tools/mock-github.mjs --root <任意目录> --port 3899`，
> 把发布器的「API 地址」指向 `http://localhost:3899` 即可。

## 从原版 Cyanote 迁移

```bash
# 只读打开原版数据库（不会改动原版目录），导出文章 + 设置 + 图片
node tools/export-from-cyanote.mjs E:\Cyanote
node build.mjs
```

## License

MIT（同原版 Cyanote）
