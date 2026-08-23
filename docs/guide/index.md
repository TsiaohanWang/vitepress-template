---
title: 模板使用指南
subtitle: 配置与内容分离的 VitePress 文档模板
author: TsiaohanWang
date: 2026-08-22
keywords:
  - VitePress
  - 模板
  - 指南
---

本页是模板的“自述”演示：下面用模板内置的能力直接展示效果，帮助你快速理解用途。

## 配置与内容分离

- 所有 VitePress 配置位于 `.vitepress/`（配置层）
- 所有正文 Markdown 位于 `docs/`（内容层），由 `config.mts` 中的 `srcDir: 'docs'` 指定

导航栏与侧边栏分别来自根目录的 `nav.json` 与 `sidebar.json`，改菜单无需改动 TS。

## 数学公式

行内公式 $E = mc^2$ 与块级公式：

$$ x = {-b \pm \sqrt{b^2 - 4ac} \over 2a} $$

构建时由 MathJax 渲染为静态 HTML，无运行时 JS。

## Iconify 图标

用 `::图标集:图标名::` 即可，默认 1em 随字号缩放、与文字同行：

使用 ::simple-icons:vuedotjs:: Vue、::simple-icons:typescript:: TypeScript 与 ::simple-icons:pnpm:: pnpm 构建。默认跟随当前文字颜色，明暗主题切换下自动适配。

仅指定尺寸（仍单色）： ::simple-icons:github =24:: 、::simple-icons:vitepress =28:: 。

同时内置 `tabler` 图标集（线性单色风格），前缀 `tabler:`： ::tabler:home:: ::tabler:star:: ::tabler:heart:: 。

以及 `gravity-ui` 图标集（Gravity UI 设计系统），前缀 `gravity-ui:`： ::gravity-ui:house:: ::gravity-ui:star:: ::gravity-ui:heart:: 。

还有 `circle-flags` 圆形国旗集，以国家代码命名，前缀 `circle-flags:`： ::circle-flags:cn:: 中国、::circle-flags:us:: 美国、::circle-flags:jp:: 日本。国旗本身即为彩色，是单色约定的合理例外。

::: warning 优先使用单色图标
尽量选用单色图标集（如 `simple-icons`、`tabler`、`mdi`）。彩色/双色图标若硬编码颜色，在明暗主题切换时观感可能不佳；除非刻意定制品牌色，否则不要使用 `/color` 修饰符。
:::

新增图标集只需安装对应 `@iconify-json/*` 数据包并在 `.vitepress/iconify.ts` 注册（详见 README）。

## 自定义容器

在内置 `info / tip / warning / danger / details` 基础上，模板扩展了五种容器，均按 Obsidian 风格配置主题色与 `gravity-ui` 标题图标：

::: note
Note 容器（蓝色）。与 GFM Alert `> [!NOTE]` 共享同款样式。
:::

::: question 这个标题是自定义的
Question 容器（金橙色）。`:::` 后跟类型名之外的文字会作为标题。
:::

::: example
Example 容器（紫色）。
:::

::: abstract
Abstract 容器（靛色）。
:::

::: bug
Bug 容器（洋红色）。
:::

::: details
Details 折叠容器（灰色），标题同样带图标。
:::

容器内的行内代码（如 `code`）与链接，和全站一致：字体颜色跟随所处正文颜色。行内代码保留底色、链接保留下划线与 hover 反馈以作区分。

## 特殊字符

正文中的双花括号会被模板自动转义——写作 {{ user.name }} 不会触发 Vue 编译错误或内容丢失，而是原样显示。

需要注意的仍会**导致构建失败**的写法：
- frontmatter 值包含冒号等特殊字符时请加引号
- 内部链接指向不存在的页面
- 正文中出现形似未闭合标签的尖括号（如 `List<string>`）—— 请用反引号包裹为代码

## 下一步

- 修改 `docs/index.md` 替换首页 hero 文案
- 编辑 `nav.json` / `sidebar.json` 调整菜单
- 在 `docs/` 下新增 `.md` 文件即自动生成路由
- 在 `theme/custom.css` 调整容器配色，或在 `iconify.ts` 接入更多图标集
