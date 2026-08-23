---
title: 快速开始
subtitle: 五分钟内跑起你的文档站
keywords:
  - 快速开始
  - 安装
  - VitePress
---

## 环境要求

- Node.js ≥ 22（`engines` 字段强制，`.npmrc` 开启了 `engine-strict`）
- pnpm ≥ 10（`packageManager` 字段锁定具体版本，corepack 可自动启用）

## 安装与运行

```sh
pnpm install        # 安装依赖
pnpm docs:dev       # 开发服务器 http://localhost:5173（热更新）
pnpm docs:build     # 生产构建，输出到 .vitepress/dist
pnpm docs:preview   # 预览构建产物 http://localhost:4173
```

> 注意：`docs:preview` 在启动时缓存产物清单，**每次重新 build 后需重启 preview**；生产部署不受影响。

其他常用命令：

```sh
pnpm typecheck      # vue-tsc 类型检查（.ts/.mts/.vue 全覆盖）
```

## 发布第一篇文章

1. **新建页面**：在 `docs/` 下创建 Markdown 文件即自动生成路由（`docs/foo.md` → `/foo`）。非首页内容页必须携带 frontmatter 的 `title` 与 `keywords`，否则构建失败：

   ```md
   ---
   title: 我的第一篇文章
   keywords:
     - 开始
   ---

   正文从二级标题开始写。
   ```

2. **加入导航**：在根目录 `nav.json` 增加一项
3. **加入侧边栏**：在 `sidebar.json` 以路由前缀为 key 增加条目
4. 运行 `pnpm docs:dev` 即时预览

写作能力（公式、图标、容器、Typst 图表等）见[内置增强](/guide/enhancements)与 [Typst 图表](/guide/typst)。

## 项目结构一图流

```
.vitepress/     配置层：config.mts + 构建期渲染器 + 主题
docs/           内容层：纯 Markdown（srcDir），public/ 放静态资源
nav.json        顶部导航
sidebar.json    侧边栏（按路由前缀映射）
```

完整的目录说明见 README「目录结构」一节。

## 部署

构建产物为纯静态文件（`.vitepress/dist`），可部署至 Netlify / Vercel / GitHub Pages / Nginx 等。启用 `cleanUrls` 时服务端需将 `/path` 回退到 `/path.html`（各平台配置见官方 [Deploy Guide](https://vitepress.dev/guide/deploy)）。

CI 已内置（`.github/workflows/ci.yml`）：类型检查 + `ICONIFY_STRICT=1` 硬校验构建，可直接作为 GitHub Pages / Vercel 的构建流程基础。
