# 模板使用指南

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

::: warning 优先使用单色图标
尽量选用单色图标集（如 `simple-icons`、`tabler`、`mdi`）。彩色/双色图标若硬编码颜色，在明暗主题切换时观感可能不佳；除非刻意定制品牌色，否则不要使用 `/color` 修饰符。
:::

新增图标集只需安装对应 `@iconify-json/*` 数据包并在 `.vitepress/iconify.ts` 注册（详见 README）。

## 下一步

- 修改 `docs/index.md` 替换首页 hero 文案
- 编辑 `nav.json` / `sidebar.json` 调整菜单
- 在 `docs/` 下新增 `.md` 文件即自动生成路由
