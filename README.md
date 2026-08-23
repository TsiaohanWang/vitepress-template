# VitePress Template

基于 [VitePress](https://vitepress.dev)（2.0 next）的文档站点模板，采用**配置与内容分离**设计，全程 TypeScript，内置构建时渲染的数学公式与 Iconify 图标，天然支持 SSR/SSG。

## 特性

- **配置与内容分离**：所有 VitePress 配置集中在 `.vitepress/`，正文只保留纯 Markdown（`docs/`），互不干扰
- **TypeScript 全覆盖**：`.mts` 配置 + `.ts` 主题代码 + `tsc --noEmit` 类型检查
- **导航/侧边栏 JSON 化**：`nav.json` / `sidebar.json` 放在根目录，改菜单不用碰 TS
- **数学公式**：官方 `markdown.math` 方案（`markdown-it-mathjax3`），构建时渲染为静态 HTML
- **Iconify 图标**：emoji 风格语法 `::set:name::`，构建时内联 SVG，无运行时 API 请求
- **自定义容器与主题色**：10 种主题化容器（内置 5 种 + 扩展 5 种），Obsidian 风格配色与 `gravity-ui` 标题图标；行内代码与链接颜色跟随正文
- **等宽字体**：自托管 JetBrains Mono（Fontsource 打包），覆盖代码块/行内代码/kbd，离线可用
- **Typst 图表**：```` ```typst ```` 围栏构建期编译为内联 SVG，`CeTZ` / `Alchemist` / `Lilaq` / `Fletcher` / `Tiaoma` 实测可用；长短围栏区分渲染与源码展示
- **SSR 保证**：公式与图标均在 Markdown 编译阶段输出为静态 HTML，页面无客户端数学/图标 JS

> 各项能力的完整说明、示例与排错表见站点内的 [内置增强与排错](/guide/enhancements) 页面。

## 环境要求

- Node.js ≥ 22（`engines` 字段强制，需 pnpm ≥ 10 读取 `pnpm-workspace.yaml`）
- pnpm（推荐，`packageManager` 字段锁定版本）

## 快速开始

```sh
pnpm install        # 安装依赖
pnpm docs:dev       # 开发服务器 http://localhost:5173（热更新）
pnpm docs:build     # 生产构建，输出到 .vitepress/dist
pnpm docs:preview   # 预览构建产物 http://localhost:4173
```

> 注意：`docs:preview` 的静态服务器在启动时缓存 `dist` 文件清单，**每次重新 build 后需重启 preview**，否则新哈希的 CSS/JS 会 404（表现为“有内容但无样式”）。生产部署到静态托管不受影响。

## 目录结构

```
.
├─ .vitepress/            # 配置层（VitePress 专属，不放正文）
│  ├─ config.mts          # 站点配置入口（srcDir 指向 docs/）
│  ├─ frontmatter.ts      # keywords 归一化（构建校验与组件共用）
│  ├─ iconify.ts          # 图标构建时渲染器（::set:name:: → 内联 SVG）
│  ├─ typst.ts            # ```typst 围栏构建期渲染器（typst.ts → 内联 SVG）
│  ├─ markdown-guards.ts  # 花括号安全防护插件（正文 {{ }} 自动转义）
│  ├─ env.d.ts            # .vue 单文件组件类型垫片
│  ├─ theme/
│  │  ├─ index.ts         # 主题入口：JetBrains Mono 字重 + DocHeader 插槽 + custom.css
│  │  ├─ components/
│  │  │  └─ DocHeader.vue # frontmatter 驱动的文章头部组件（标题/作者/日期/标签）
│  │  └─ custom.css       # 自定义容器配色与标题图标（Obsidian 风格）
│  ├─ cache/              # 开发缓存（已 gitignore）
│  └─ dist/               # 构建产物（已 gitignore）
├─ docs/                  # 内容层（纯 Markdown，srcDir）
│  ├─ index.md            # 首页（hero + features 布局），路由 /
│  ├─ public/             # 静态资源（favicon 等，按原路径拷贝到产物根）
│  ├─ guide/              # 模板指南 section，对应 /guide/
│  │  ├─ index.md
│  │  └─ enhancements.md  # 内置增强与排错（站内指南页）
│  └─ examples/           # Examples section，对应 /examples/...
│     ├─ markdown-examples.md
│     ├─ api-examples.md
│     └─ typst-diagrams.md
├─ nav.json               # 顶部导航配置
├─ sidebar.json           # 侧边栏配置
├─ package.json           # ESM（type: module）+ docs:* 脚本 + engines/packageManager
├─ pnpm-workspace.yaml    # pnpm 设置（peer 豁免等）
└─ tsconfig.json          # 严格模式类型检查（.ts 与 .mts 全覆盖、JSON 模块等）
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
    { "text": "模板使用指南", "link": "/guide/" },
    { "text": "内置增强与排错", "link": "/guide/enhancements" }
  ],
  "/examples/": [
    { "text": "Markdown Examples", "link": "/examples/markdown-examples" },
    { "text": "Runtime API Examples", "link": "/examples/api-examples" }
  ]
}
```

JSON 无法携带类型，`config.mts` 中已做类型断言（`nav as DefaultTheme.NavItem[]`、`sidebar as Record<string, DefaultTheme.SidebarItem[]>`）。新增一个独立导航区块时：在 `docs/` 下新建目录放入 Markdown，并在 `nav.json` 与 `sidebar.json` 各加一条即可。可用字段见 [Default Theme Config](https://vitepress.dev/reference/default-theme-config#nav)。

### 主题扩展（`.vitepress/theme/index.ts` + `custom.css`）

默认继承官方主题，已引入 JetBrains Mono 字重与 `custom.css`，并通过 `doc-before` 插槽挂载 `DocHeader` 文章头部组件。可继续在此注册全局组件、追加样式、覆写其他插槽：

```ts
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/700.css'
import { h } from 'vue'
import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import DocHeader from './components/DocHeader.vue'
// Keep this import LAST so custom.css can win equal-specificity ties
// against the default theme's styles.
import './custom.css'

export default {
  extends: DefaultTheme,

  Layout() {
    return h(DefaultTheme.Layout, null, {
      // Frontmatter-driven header above the document content (SSR-rendered).
      'doc-before': () => h(DocHeader),
    })
  },

  enhanceApp() {
    // Extend the default theme here, e.g. register global components.
  },
} satisfies Theme
```

注意保持 `./custom.css` 位于导入序列最后：它与部分官方规则同优先级，靠打包顺序取胜。`custom.css` 与 `index.ts` 同目录，用于覆写默认主题变量或微调排版；删除其中的容器样式段即可恢复 VitePress 默认容器外观。

### 静态资源与社交链接

- **静态资源**：默认公共目录为 `docs/public/`（VitePress 以 `srcDir` 为基准，即 `docs/public`），其中的文件会原样拷贝到产物根目录。模板自带 `docs/public/favicon.svg`（VitePress 渐变底标），并在 `config.mts` 的 `head: [['link', { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }]]` 中引用；替换该文件即可更换站点图标，如需兼容旧浏览器可另行添加 `.ico` / `.png` 并在 `head` 中补充对应 `link`。如需把公共目录改到 `.vitepress/public` 等其他位置，设置 `vite.publicDir` 即可。
- **站点 Logo（左上角）**：`themeConfig.logo` 已复用 `/favicon.svg`，与标签页图标保持一致；更换图标时两处同步修改。支持 `{ light, dark }` 为明暗主题指定不同图片。
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
- 数学公式、Iconify 图标、自定义容器、文章元数据等模板增强的用法与排错全部收录在站内 [内置增强与排错](/guide/enhancements)

## 内置增强速览

| 能力 | 一句话说明 |
|---|---|
| 数学公式 | `markdown.math` 构建时渲染，无客户端 JS |
| Iconify 图标 | `::set:name::` 语法内联 SVG，修饰符白名单校验 |
| 自定义容器 | 10 种 Obsidian 风格主题色容器 + `gravity-ui` 标题图标 |
| 等宽字体 | 自托管 JetBrains Mono，离线可用 |
| 文章元数据 | frontmatter 驱动 `DocHeader`，`title` / `keywords` 构建期强校验 |
| Typst 图表 | ```typst 围栏构建期编译为内联 SVG（CeTZ / Alchemist / Lilaq / Fletcher / Tiaoma 实测可用） |
| 品牌色 | `#F74C00` 明暗双套变量 |
| 花括号防护 | 正文 `{{ }}` 自动转义，杜绝 Vue 插值误伤 |

详细用法、示例与排错表：[内置增强与排错](/guide/enhancements)。

## 类型检查

```sh
pnpm exec tsc --noEmit
```

覆盖 `.vitepress/**/*.ts`、`.vitepress/config.mts` 与根目录 `.ts`/`.mts`；JSON 导入依赖 `tsconfig.json` 的 `resolveJsonModule`。

> `config.mts` 中的相对导入均带 `.ts` 扩展名（配合 `tsconfig.json` 的 `allowImportingTsExtensions`），JSON 导入使用 `with { type: 'json' }` 属性——这是 Vite 8 原生配置加载器的要求，可保证构建输出零警告。

## 部署

构建产物为纯静态文件（`.vitepress/dist`），可部署至 Netlify / Vercel / GitHub Pages / Nginx 等。启用 `cleanUrls` 时服务端需将 `/path` 回退到 `/path.html`（各平台配置见 [Deploy Guide](https://vitepress.dev/guide/deploy)）。
