# VitePress Template

基于 [VitePress](https://vitepress.dev)（2.0 next）的文档站点模板，采用**配置与内容分离**设计，全程 TypeScript，内置构建时渲染的数学公式与 Iconify 图标，天然支持 SSR/SSG。

## 特性

- **配置与内容分离**：所有 VitePress 配置集中在 `.vitepress/`，正文只保留纯 Markdown（`docs/`），互不干扰
- **TypeScript 全覆盖**：`.mts` 配置 + `.ts` 主题代码 + `tsc --noEmit` 类型检查
- **导航/侧边栏 JSON 化**：`nav.json` / `sidebar.json` 放在根目录，改菜单不用碰 TS
- **数学公式**：官方 `markdown.math` 方案（markdown-it-mathjax3），构建时渲染为静态 HTML
- **Iconify 图标**：emoji 风格语法 `::set:name::`，构建时内联 SVG，无运行时 API 请求
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
│  │  └─ index.ts         # 主题入口，继承默认主题，可注册组件/样式
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
└─ tsconfig.json          # 含 vitepress/client 与 JSON 模块支持
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

### 主题扩展（`.vitepress/theme/index.ts`）

默认继承官方默认主题。可在此注册全局组件、引入自定义 CSS、覆写布局插槽：

```ts
import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import './custom.css'            // 引入自定义全局样式

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    // app.component('MyComp', MyComp)
  },
} satisfies Theme
```

`custom.css` 与 `index.ts` 同目录（`.vitepress/theme/custom.css`），用于覆写默认主题变量或微调排版（如图标与文字间距、链接配色等）。

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

## 类型检查

```sh
pnpm exec tsc --noEmit
```

覆盖 `.vitepress/**/*.ts` 与根目录 `*.ts`；JSON 导入依赖 tsconfig 的 `resolveJsonModule`。

> 构建时可能出现 `import "./iconify" without a file extension` 与 `JSON import "../nav.json" without import attributes` 提示，这是 Vite 8 原生配置加载器的兼容提示，不影响功能，可忽略。
>
> 若按上文在 `theme/index.ts` 添加 `import './custom.css'`，需确保 `.vitepress/theme/custom.css` 文件确实存在，否则构建会报模块缺失。

## 部署

构建产物为纯静态文件（`.vitepress/dist`），可部署至 Netlify / Vercel / GitHub Pages / Nginx 等。启用 `cleanUrls` 时服务端需将 `/path` 回退到 `/path.html`（各平台配置见 [Deploy Guide](https://vitepress.dev/guide/deploy)）。
