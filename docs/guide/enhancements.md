---
title: 内置增强
subtitle: 模板内置的写作能力与站点配置
keywords:
  - VitePress
  - 增强
  - Markdown
---

本页收录模板的日常写作增强：数学公式、图标、容器、字体、元数据、品牌色、搜索、活动日历与花括号防护。Typst 图表与排错手册已拆分为独立页面：

- [Typst 图表](/guide/typst) —— 围栏编译、包缓存与失败行为
- [常见问题与排查](/guide/troubleshooting) —— 全部构建错误与异常速查

以下示例均由本站实时渲染，所见即所得。

## 数学公式

已启用 `markdown.math: true`（依赖 `markdown-it-mathjax3@^4`，勿移除——该选项缺失依赖时构建会直接报错）。

```md
行内：$a \ne 0$
块级：$$ x = {-b \pm \sqrt{b^2-4ac} \over 2a} $$
```

**显示效果**

行内：$a \ne 0$；块级：

$$ \int_{-\infty}^{\infty} e^{-x^2}\,dx = \sqrt{\pi} $$

构建时由 MathJax 渲染为静态 `<mjx-container>`，无需客户端运行时。

## Iconify 图标

语法：`::图标集前缀:图标名::`，必须写全称；支持两个修饰符：

```md
默认尺寸（1em，随字号缩放）：::simple-icons:vuedotjs::
仅指定尺寸（仍单色）：::simple-icons:github =24::
```

**显示效果**

默认尺寸：::simple-icons:vuedotjs::；仅指定尺寸：::simple-icons:github =24::

采用双冒号 `::name::` 而非单冒号，是为了与 VitePress 内置的 emoji 语法 `:tada:` 区分——二者互不冲突、可共存。实现位于 `.vitepress/iconify.ts`：构建时查本地图标数据生成内联 SVG（含 `display:inline-block` 与基线对齐修正，规避 VitePress 全局 `svg{display:block}` 重置导致的独占一行问题）。

> **优先使用单色图标**：图标默认继承当前文字颜色（`currentColor`），会随明暗主题自动切换。彩色/双色图标一旦用 `/color` 硬编码颜色，在 light/dark 切换下观感往往不佳。故推荐 `simple-icons`、`tabler`、`gravity-ui`、`mdi` 等单色图标集，并避免在演示中滥用颜色修饰符。`/color` 仅用于刻意定制品牌色；`circle-flags` 国旗集是合理例外——国旗本身即为彩色且不随主题变化。

```md
::simple-icons:github =24 /#181717::   # 不推荐：固定色，不随主题变化
```

**当前内置 `simple-icons`、`tabler`、`gravity-ui`、`circle-flags` 四个图标集**（`iconify.ts` 的 `collections` 已注册），前缀分别为 `simple-icons:`、`tabler:`、`gravity-ui:`、`circle-flags:`，例如 `::simple-icons:vuedotjs::`、`::tabler:home::`、`::gravity-ui:house::`、`::circle-flags:cn::`。如需更多集，按如下方式扩展：

```sh
pnpm add -D @iconify-json/mdi      # 1. 安装数据包
```

```ts
// 2. .vitepress/iconify.ts 注册
import { icons as mdi } from '@iconify-json/mdi'

const collections = {
  'simple-icons': simpleIcons,
  tabler,
  'gravity-ui': gravityUi,
  'circle-flags': circleFlags,
  mdi,
}
```

之后即可用 `::mdi:home::`。图标名可在 [icon-sets.iconify.design](https://icon-sets.iconify.design/) 检索。

### 修饰符合法性

尺寸与颜色修饰符经白名单校验（`.vitepress/iconify.ts`）：

- 尺寸须为 CSS 长度字面量：`=24`、`=1.5em`、`=2rem`、`=20px`、`=50%`
- 颜色须为十六进制或命名色：`/#181717`、`/red`
- 非法值会在构建日志打印 `[iconify]` 警告并**忽略该修饰符**（图标本体仍渲染），杜绝注入风险

图标不显示时的完整排查见 [常见问题与排查](/guide/troubleshooting#图标问题-警告-不中断构建)。

## 自定义容器与主题色

在 VitePress 内置 `info / tip / warning / danger / details` 基础上，模板新增 `note / question / example / abstract / bug` 五种容器，全部按 Obsidian 风格配置主题色与 `gravity-ui` 标题图标：

| 容器 | 主题色 | 标题图标 |
|---|---|---|
| `info` | 青色 | `gravity-ui:circle-info` |
| `note` | 蓝色 | `gravity-ui:pencil-to-square` |
| `tip` | 绿色 | `gravity-ui:bulb` |
| `abstract` | 靛色 | `gravity-ui:binoculars` |
| `question` | 金橙 | `gravity-ui:circle-question` |
| `warning` | 橙色 | `gravity-ui:triangle-exclamation` |
| `danger` | 红色 | `gravity-ui:shield-exclamation` |
| `bug` | 洋红 | `gravity-ui:bug` |
| `example` | 紫色 | `gravity-ui:shapes-3` |
| `details` | 灰色 | `gravity-ui:magnifier` |

```md
::: bug
Bug 容器（洋红色）。
:::

::: question 自定义标题
Question 容器（金橙色），支持自定义标题。
:::
```

**显示效果**

::: bug
Bug 容器（洋红色）。
:::

::: question 自定义标题
Question 容器（金橙色），支持自定义标题。
:::

说明：

- 主题色同时作用于容器背景（7% 不透明度）、边框（35%）与标题文字；正文保持常规文字色
- 行内代码与链接的字体颜色跟随所处正文颜色（全站生效，容器内亦然）；行内代码保留底色、链接保留下划线与 hover 反馈以作区分
- 容器内的行内代码底色随容器主题色（明亮 10% / 暗色 16% 不透明度），与容器背景、边框同源；围栏代码块不受影响
- 标题图标以 CSS mask 方式内嵌（`gravity-ui` SVG data URI），纯静态资源、SSR 友好，颜色自动跟随标题色
- 暗色模式下强调色自动调亮以保证对比度
- GFM Alert 与同名容器共享样式：`> [!NOTE]` 即蓝色 note 效果；VitePress 原生支持 `> [!NOTE] / [!TIP] / [!IMPORTANT] / [!WARNING] / [!CAUTION]`
- 新增类型两步：在 `config.mts` 的 `markdown.container.customContainers` 注册，并在 `theme/custom.css` 补充该类型的 `--cb-rgb` 与 `--cb-icon`——其余样式规则对全部容器类型通用，无需改动

## 等宽字体（JetBrains Mono）

代码块、行内代码、`kbd`、行号的等宽字体已默认切换为自托管的 JetBrains Mono：

- 字体文件来自 `@fontsource/jetbrains-mono`（400/700 字重），在 `theme/index.ts` 中引入；构建时 woff2 被打包为带哈希的本地静态资源，运行时零第三方请求，SSR/离线友好
- `font-display: swap` 保证文字先用系统回退栈即时渲染，不阻塞首屏
- 回退栈与全局切换点在 `theme/custom.css` 的 `--vp-font-family-mono` 变量；更换其他字体只需安装对应 Fontsource 包、替换引入并修改变量

## 文章元数据

内容页通过 frontmatter 声明文章信息，`DocHeader` 组件自动渲染在正文头部（`doc-before` 插槽，构建时 SSR 输出）：

| 字段 | 必填 | 说明 |
|---|---|---|
| `title` | ✅ | 主标题；同时作为浏览器标签页标题 |
| `subtitle` | – | 副标题 |
| `author` | – | 作者 |
| `date` | – | 日期，展示为 `YYYY-MM-DD` |
| `keywords` | ✅ | 关键词标签；数组或逗号分隔字符串均可（构建时归一化为数组） |

```md
---
title: 模板使用指南
subtitle: 配置与内容分离的 VitePress 文档模板
author: TsiaohanWang
date: 2026-08-22
keywords:
  - VitePress
  - 模板
---
```

- 校验在 `config.mts` 的 `transformPageData` 中执行：非首页内容页缺失 `title` 或 `keywords` 时**构建直接失败**，错误信息指明文件与缺失字段；归一化逻辑位于 `.vitepress/frontmatter.ts`，组件与构建校验共用同一实现
- `layout: home` 的首页不受校验约束
- 作者/日期/标签自带内嵌 SVG 图标（CSS mask 实现，SSR 友好）；样式位于组件的 scoped style
- **写作约定**：正文不要再手写一级标题（`# h1`），页面主标题由 DocHeader 从 frontmatter 渲染，重复会出现两个 h1

组件的数据消费方式详见 [运行时 API 与主题扩展](/examples/api-examples)。

## 本地搜索

本地全文搜索已内置 **CJK 感知分词器**（`.vitepress/config.mts` 的 `search.options.miniSearch.options.tokenize`）：基于 `Intl.Segmenter` 的 word 粒度切词，中文按词典词索引、英文与数字串保持完整——官方默认的空白分词无法命中中文短语内部。

- 同一分词器同时作用于索引构建（Node）与查询（浏览器），函数经 VitePress 序列化下发，必须保持自包含（不可引用外部变量）
- 中文界面文案已配置；搜索无结果的排查见[常见问题与排查](/guide/troubleshooting#本地搜索无结果)

## 提交活动日历

GitHub 风格提交热力图组件 `<ActivityCalendar />`：构建期聚合仓库 git 历史（近一年），数据随页面负载注入，零运行时请求。

- **内容页自动挂载**：非 home 内容页底部自动渲染**本页**提交记录（`scope="page"`），取代常见的「最后更新于」时间戳位置；全站开关为 `config.mts` 的 `themeConfig.autoPageActivityCalendar`，改为 `false` 后仅保留显式调用
- **单页豁免**：在该页 frontmatter 写 `activityCalendar: false`
- **首页显式调用**：home 布局不自动挂载，需要时在 Markdown 直接写 `<ActivityCalendar />`（site 全站粒度），见首页源码 `docs/index.md`
- 组件细节与实时效果见 [Markdown 扩展示例](/examples/markdown-examples#提交活动日历)

如需恢复 git 时间戳：在 `config.mts` 重新打开 `lastUpdated: true` 并在 `theme/index.ts` 移除 `doc-footer-before` 插槽即可。

## 站点品牌色

站点品牌色为 `#F74C00`（橙红），作用于链接 hover、按钮、侧边栏/导航高亮、hero 按钮等全部品牌色场景。明暗两套定义在 `theme/custom.css`：

```css
html:not(.dark) {
  --vp-c-brand-1: #f74c00;   /* 主强调色 */
  --vp-c-brand-2: #ff7a3d;   /* hover 提亮 */
  --vp-c-brand-3: #d63e00;   /* 实心按钮底色 */
  --vp-c-brand-soft: rgba(247, 76, 0, 0.14);
}

.dark {
  --vp-c-brand-1: #ff8a52;   /* 暗底提亮，保证对比度 */
  --vp-c-brand-2: #ffa475;
  --vp-c-brand-3: #f74c00;
  --vp-c-brand-soft: rgba(247, 76, 0, 0.16);
}
```

更换品牌色时同步修改两个块即可；`--vp-c-brand-1/2/3` 分别对应常规/hover/实心三态。

## 花括号安全防护

页面会被编译为 Vue 模板：正文里的双花括号要么被当作插值表达式求值（内容**静默丢失**），要么因非法表达式直接**构建失败**。`markdown-guards.ts` 中的 `mustacheGuard` 插件在渲染层把正文文本与行内代码中的 `{{` / `}}` 自动转义为 HTML 实体——浏览器原样显示花括号，Vue 编译器不再匹配插值。

- **覆盖范围**：正文段落、标题、表格单元格、行内代码
- **不受影响**：围栏代码块（token 类型不同）、原生 HTML/SFC 块（html token 绕过该规则，真实 Vue 插值完整保留）
- 实现细节见 `.vitepress/markdown-guards.ts` 源码注释

更多特殊字符的影响与解法汇总于[常见问题与排查](/guide/troubleshooting#特殊字符速查表)。
