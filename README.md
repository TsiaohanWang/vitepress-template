# VitePress Template

基于 [VitePress](https://vitepress.dev)（2.0 next）的文档站点模板，采用**配置与内容分离**设计，全程 TypeScript，内置构建时渲染的数学公式与 Iconify 图标，天然支持 SSR/SSG。

## 特性

- **配置与内容分离**：所有 VitePress 配置集中在 `.vitepress/`，正文只保留纯 Markdown（`docs/`），互不干扰
- **TypeScript 全覆盖**：`.mts` 配置 + `.ts` 主题代码 + `tsc --noEmit` 类型检查
- **导航/侧边栏 JSON 化**：`nav.json` / `sidebar.json` 放在根目录，改菜单不用碰 TS
- **数学公式**：官方 `markdown.math` 方案（markdown-it-mathjax3），构建时渲染为静态 HTML
- **Iconify 图标**：emoji 风格语法 `::set:name::`，构建时内联 SVG，无运行时 API 请求
- **自定义容器与主题色**：10 种主题化容器（内置 5 种 + 扩展 5 种），Obsidian 风格配色与 gravity-ui 标题图标；行内代码与链接颜色跟随正文
- **等宽字体**：自托管 JetBrains Mono（Fontsource 打包），覆盖代码块/行内代码/kbd，离线可用
- **SSR 保证**：公式与图标均在 Markdown 编译阶段输出为静态 HTML，页面无客户端数学/图标 JS

## 环境要求

- Node.js ≥ 22
- pnpm（推荐）

## 快速开始

```sh
pnpm install        # 安装依赖
pnpm docs:dev       # 开发服务器 http://localhost:5173（热更新）
pnpm docs:build     # 生产构建，输出到 .vitepress/dist
pnpm docs:preview   # 预览构建产物 http://localhost:4173
```

> 注意：`docs:preview` 的静态服务器在启动时缓存 dist 文件清单，**每次重新 build 后需重启 preview**，否则新哈希的 CSS/JS 会 404（表现为“有内容但无样式”）。生产部署到静态托管不受影响。

## 目录结构

```
.
├─ .vitepress/            # 配置层（VitePress 专属，不放正文）
│  ├─ config.mts          # 站点配置入口（srcDir 指向 docs/）
│  ├─ iconify.ts          # 图标构建时渲染器（::set:name:: → 内联 SVG）
│  ├─ theme/
│  │  ├─ index.ts         # 主题入口：引入 JetBrains Mono 字重与 custom.css
│  │  └─ custom.css       # 自定义容器配色与标题图标（Obsidian 风格）
│  ├─ cache/              # 开发缓存（已 gitignore）
│  └─ dist/               # 构建产物（已 gitignore）
├─ docs/                  # 内容层（纯 Markdown，srcDir）
│  ├─ index.md            # 首页（hero + features 布局），路由 /
│  ├─ public/             # 静态资源（favicon 等，按原路径拷贝到产物根）
│  ├─ guide/              # 模板指南 section，对应 /guide/
│  │  └─ index.md
│  └─ examples/           # Examples section，对应 /examples/...
│     ├─ markdown-examples.md
│     └─ api-examples.md
├─ nav.json               # 顶部导航配置
├─ sidebar.json           # 侧边栏配置
├─ package.json           # ESM（type: module）+ docs:* 脚本
└─ tsconfig.json          # 严格模式类型检查（vitepress/client 类型、JSON 模块等）
```

分离原理：CLI 以项目根为 root（因此能找到 `.vitepress/`），配置中 `srcDir: 'docs'` 把内容源指向 `docs/`。

## 配置指南

### 站点配置（`.vitepress/config.mts`）

修改标题、描述等站点级选项：

```ts
export default defineConfig({
  srcDir: 'docs',                 // 内容目录，勿轻易改动
  title: 'My Awesome Project',
  description: 'A VitePress Site',
  cleanUrls: true,                // 生成 /page 而非 /page.html
})
```

完整选项见 [Site Config Reference](https://vitepress.dev/reference/site-config)。

### 导航与侧边栏（根目录 JSON）

每个导航项拥有**相互独立**的侧边栏：把内容按 section 放到 `docs/` 下的子目录，再用 `sidebar.json` 的对象形式按路由前缀映射各自的侧边栏，各前缀互不干扰。

`nav.json`（每个导航项可有 `link` 直接跳转，或用 `items` 组成**下拉菜单**）：

```json
[
  { "text": "Home", "link": "/" },
  { "text": "模板指南", "link": "/guide/" },
  {
    "text": "Examples",
    "items": [
      { "text": "Markdown Examples", "link": "/examples/markdown-examples" },
      { "text": "Runtime API Examples", "link": "/examples/api-examples" }
    ]
  }
]
```

`sidebar.json`（key 为路由前缀，仅匹配该前缀的页面显示对应侧边栏）：

```json
{
  "/guide/": [
    { "text": "模板使用指南", "link": "/guide/" }
  ],
  "/examples/": [
    { "text": "Markdown Examples", "link": "/examples/markdown-examples" },
    { "text": "Runtime API Examples", "link": "/examples/api-examples" }
  ]
}
```

JSON 无法携带类型，`config.mts` 中已做类型断言（`nav as DefaultTheme.NavItem[]`、`sidebar as Record<string, DefaultTheme.SidebarItem[]>`）。新增一个独立导航区块时：在 `docs/` 下新建目录放入 Markdown，并在 `nav.json` 与 `sidebar.json` 各加一条即可。可用字段见 [Default Theme Config](https://vitepress.dev/reference/default-theme-config#nav)。

### 主题扩展（`.vitepress/theme/index.ts` + `custom.css`）

默认继承官方主题，并已引入 JetBrains Mono 字重与 `custom.css`（自定义容器的配色与标题图标）。可继续在此注册全局组件、追加样式、覆写布局插槽：

```ts
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/700.css'
import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
// Keep this import LAST so custom.css can win equal-specificity ties
// against the default theme's styles.
import './custom.css'

export default {
  extends: DefaultTheme,

  enhanceApp() {
    // Extend the default theme here, e.g. register global components.
  },
} satisfies Theme
```

注意保持 `./custom.css` 位于导入序列最后：它与部分官方规则同优先级，靠打包顺序取胜。`custom.css` 与 `index.ts` 同目录，用于覆写默认主题变量或微调排版；删除其中的容器样式段即可恢复 VitePress 默认容器外观。

### 静态资源与社交链接

- **静态资源**：默认公共目录为 `docs/public/`（VitePress 以 `srcDir` 为基准，即 `docs/public`），其中的文件会原样拷贝到产物根目录；站点图标 `favicon.ico` / `favicon.svg` 放到此处即被自动引用。如需改到 `.vitepress/public` 等其他位置，在 `config.mts` 中设置 `vite.publicDir`。
- **社交链接**：在 `config.mts` 的 `themeConfig.socialLinks` 中配置，如已默认的 GitHub 链接；支持 `github`、`x`、`discord` 等图标，或 `icon: '...'` 自定义。

### 新增一个导航区块（端到端）

1. 在 `docs/` 下新建目录并放入 `index.md` 与若干 `.md`（如 `docs/blog/index.md`）
2. `nav.json` 增加一项指向该 section 首页（如需下拉，用 `items` 包裹）
3. `sidebar.json` 增加一条以该目录路由前缀为 key 的侧边栏
4. `pnpm docs:dev` 即时预览


## 内容写作

- 文件即路由：`docs/foo.md` → `/foo`；`docs/foo/index.md` → `/foo/`
- 首页使用 `layout: home` frontmatter（见 `docs/index.md`）
- Markdown 扩展（容器、代码组、行高亮等）见 [官方文档](https://vitepress.dev/guide/markdown)

## 内置增强

### 数学公式

已启用 `markdown.math: true`（依赖 `markdown-it-mathjax3@^4`，勿移除——该选项缺失依赖时构建会直接报错）。

```md
行内：$a \ne 0$
块级：$$ x = {-b \pm \sqrt{b^2-4ac} \over 2a} $$
```

公式在构建时由 MathJax 渲染为静态 `<mjx-container>`，无需客户端运行时。

### Iconify 图标

语法：`::图标集前缀:图标名::`，必须写全称；支持两个修饰符：

```md
默认尺寸（1em，随字号缩放）：::simple-icons:vuedotjs::
仅指定尺寸（仍单色）：::simple-icons:github =24::
```

> 采用双冒号 `::name::` 而非单冒号，是为了与 VitePress 内置的 emoji 语法 `:tada:` 区分，二者互不冲突、可共存。

实现位于 `.vitepress/iconify.ts`：构建时查本地图标数据生成内联 SVG（含 `display:inline-block` 与基线对齐修正，规避 VitePress 全局 `svg{display:block}` 重置导致的独占一行问题）。

> **优先使用单色图标**：图标默认继承当前文字颜色（`currentColor`），会随明暗主题自动切换。彩色/双色图标一旦用 `/color` 硬编码颜色，在 light/dark 切换下观感往往不佳。故推荐 `simple-icons`、`tabler`、`gravity-ui`、`mdi` 等单色图标集，并避免在演示中滥用颜色修饰符。`/color` 仅用于刻意定制品牌色。

```md
::simple-icons:github =24 /#181717::   # 不推荐：固定色，不随主题变化
```

**当前内置 `simple-icons`、`tabler`、`gravity-ui` 三个图标集**（`iconify.ts` 的 `collections` 已注册），前缀分别为 `simple-icons:`、`tabler:`、`gravity-ui:`，例如 `::simple-icons:vuedotjs::`、`::tabler:home::`、`::gravity-ui:house::`。如需更多集，按如下方式扩展：

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
  mdi,
}
```

之后即可用 `::mdi:home::`。图标名可在 [icon-sets.iconify.design](https://icon-sets.iconify.design/) 检索。

#### 排错：图标不显示？

图标语法有误时，构建会在终端打印 `[iconify]` 警告并**丢弃该图标**（不会中断构建）：
- `unknown icon set or malformed name`：前缀写错，或未使用 `set:name` 全称
- `icon not found in "..."`：图标名在该集里不存在
- 若提示 `modifiers like "=24" or "/#fff" must be separate tokens`：修饰符 `=24` / `/#fff` 必须用空格与 `set:name` 隔开，不能写成 `::set:name=24::` 这种粘连写法

### 自定义容器与主题色

在 VitePress 内置 `info / tip / warning / danger / details` 基础上，模板新增 `note / question / example / abstract / bug` 五种容器，全部按 Obsidian 风格配置主题色与 gravity-ui 标题图标：

| 容器 | 主题色 | 标题图标 |
|---|---|---|
| info | 青色 | gravity-ui:circle-info |
| note | 蓝色 | gravity-ui:pencil-to-square |
| tip | 绿色 | gravity-ui:bulb |
| abstract | 靛色 | gravity-ui:binoculars |
| question | 金橙 | gravity-ui:circle-question |
| warning | 橙色 | gravity-ui:triangle-exclamation |
| danger | 红色 | gravity-ui:shield-exclamation |
| bug | 洋红 | gravity-ui:bug |
| example | 紫色 | gravity-ui:shapes-3 |
| details | 灰色 | gravity-ui:magnifier |

```md
::: bug
Bug 容器。
:::

::: question 自定义标题
标题文字支持自定义。
:::
```

说明：
- 主题色同时作用于容器背景（7% 不透明度）、边框（35%）与标题文字；正文保持常规文字色
- 行内代码与链接的字体颜色跟随所处正文颜色（全站生效，容器内亦然）；行内代码保留底色、链接保留下划线与 hover 反馈以作区分
- 标题图标以 CSS mask 方式内嵌（gravity-ui SVG data URI），纯静态资源、SSR 友好，颜色自动跟随标题色
- 暗色模式下强调色自动调亮以保证对比度
- GFM Alert 与同名容器共享样式：`> [!NOTE]` 即蓝色 note 效果；VitePress 原生支持 `> [!NOTE] / [!TIP] / [!IMPORTANT] / [!WARNING] / [!CAUTION]`
- 新增类型两步：在 `config.mts` 的 `markdown.container.customContainers` 注册，并在 `theme/custom.css` 补充该类型的 `--cb-rgb` 与 `--cb-icon`

### 等宽字体（JetBrains Mono）

代码块、行内代码、`kbd`、行号的等宽字体已默认切换为自托管的 JetBrains Mono：

- 字体文件来自 `@fontsource/jetbrains-mono`（400/700 字重），在 `theme/index.ts` 中引入；构建时 woff2 被打包为带哈希的本地静态资源，运行时零第三方请求，SSR/离线友好
- `font-display: swap` 保证文字先用系统回退栈即时渲染，不阻塞首屏
- 回退栈与全局切换点在 `theme/custom.css` 的 `--vp-font-family-mono` 变量；更换其他字体只需安装对应 Fontsource 包、替换引入并修改变量

## 类型检查

```sh
pnpm exec tsc --noEmit
```

覆盖 `.vitepress/**/*.ts` 与根目录 `*.ts`；JSON 导入依赖 tsconfig 的 `resolveJsonModule`。

> 构建时可能出现 `import "./iconify" without a file extension` 与 `JSON import "../nav.json" without import attributes` 提示，这是 Vite 8 原生配置加载器的兼容提示，不影响功能，可忽略。

## 部署

构建产物为纯静态文件（`.vitepress/dist`），可部署至 Netlify / Vercel / GitHub Pages / Nginx 等。启用 `cleanUrls` 时服务端需将 `/path` 回退到 `/path.html`（各平台配置见 [Deploy Guide](https://vitepress.dev/guide/deploy)）。
