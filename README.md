# VitePress Template

基于 [VitePress](https://vitepress.dev)（2.0 next）的文档站点模板，采用**配置与内容分离**设计，全程 TypeScript，内置构建时渲染的数学公式与 Iconify 图标，天然支持 SSR/SSG。

## 特性

- **配置与内容分离**：所有 VitePress 配置集中在 `.vitepress/`，正文只保留纯 Markdown（`docs/`），互不干扰
- **TypeScript 全覆盖**：`.mts` 配置 + `.ts` 主题代码 + `.vue` 组件，`pnpm typecheck`（vue-tsc）全量类型检查
- **导航/侧边栏 JSON 化**：`nav.json` / `sidebar.json` 放在根目录，改菜单不用碰 TS
- **数学公式**：官方 `markdown.math` 方案（`markdown-it-mathjax3`），构建时渲染为静态 HTML
- **Iconify 图标**：emoji 风格语法 `::set:name::`，构建时内联 SVG，无运行时 API 请求
- **自定义容器与主题色**：10 种主题化容器（内置 5 种 + 扩展 5 种），Obsidian 风格配色与 `gravity-ui` 标题图标；行内代码与链接颜色跟随正文
- **等宽字体**：自托管 JetBrains Mono（Fontsource 打包），覆盖代码块/行内代码/kbd，离线可用
- **Typst 图表**：```` ```typst ```` 围栏构建期编译为内联 SVG，`CeTZ` / `Alchemist` / `Lilaq` / `Fletcher` / `Tiaoma` / `Physica` / `Zap` / `Atomic` 实测可用；长短围栏区分渲染与源码展示；明暗自适应配色可开关
- **中文搜索**：本地全文搜索内置 `Intl.Segmenter` CJK 分词器，中文短语可直接命中
- **SSR 保证**：公式与图标均在 Markdown 编译阶段输出为静态 HTML，页面无客户端数学/图标 JS
- **CI 就绪**：GitHub Actions 执行 vue-tsc 类型检查 + `ICONIFY_STRICT=1` 硬校验构建

> 各项能力的完整说明见站内[内置增强](/guide/enhancements)；构建错误与异常统一查阅[常见问题与排查](/guide/troubleshooting)。

## 环境要求

- Node.js ≥ 22（`engines` 字段强制，需 pnpm ≥ 10 读取 `pnpm-workspace.yaml`）
- pnpm（推荐，`packageManager` 字段锁定版本）

## 快速开始

```sh
pnpm install        # 安装依赖
pnpm docs:dev       # 开发服务器 http://localhost:5173（热更新）
pnpm docs:build     # 生产构建，输出到 .vitepress/dist
pnpm docs:preview   # 预览构建产物 http://localhost:4173
pnpm typecheck      # vue-tsc 类型检查
```

> 注意：`docs:preview` 的静态服务器在启动时缓存 `dist` 文件清单，**每次重新 build 后需重启 preview**，否则新哈希的 CSS/JS 会 404（表现为“有内容但无样式”）。生产部署到静态托管不受影响。

## 目录结构

```
.
├─ .github/workflows/ci.yml  # CI：vue-tsc 类型检查 + ICONIFY_STRICT=1 构建
├─ .vitepress/            # 配置层（VitePress 专属，不放正文）
│  ├─ config.mts          # 站点配置入口（srcDir 指向 docs/，含 CJK 搜索分词器）
│  ├─ frontmatter.ts      # keywords 归一化（构建校验与组件共用）
│  ├─ iconify.ts          # 图标构建时渲染器（::set:name:: → 内联 SVG）
│  ├─ typst.ts            # ```typst 围栏构建期渲染器（→ 内联 SVG + 内容哈希缓存）
│  ├─ markdown-guards.ts  # 花括号安全防护插件（正文 {{ }} 自动转义）
│  ├─ theme/
│  │  ├─ index.ts         # 主题入口：JetBrains Mono 字重 + DocHeader 插槽 + custom.css
│  │  ├─ components/
│  │  │  └─ DocHeader.vue # frontmatter 驱动的文章头部组件（标题/作者/日期/标签）
│  │  └─ custom.css       # 自定义容器配色与标题图标（Obsidian 风格）
│  ├─ cache/              # 开发缓存（含 typst-svg 编译缓存，已 gitignore）
│  └─ dist/               # 构建产物（已 gitignore）
├─ docs/                  # 内容层（纯 Markdown，srcDir）
│  ├─ index.md            # 首页（hero + features 布局），路由 /
│  ├─ public/             # 静态资源（favicon 等，按原路径拷贝到产物根）
│  ├─ guide/              # 模板指南 section，对应 /guide/
│  │  ├─ index.md           # 使用指南（功能自述导览）
│  │  ├─ getting-started.md # 快速开始（安装/运行/发文三步）
│  │  ├─ enhancements.md    # 内置增强（公式/图标/容器/字体/元数据/品牌色/搜索）
│  │  ├─ typst.md           # Typst 图表用法
│  │  └─ troubleshooting.md # 常见问题与排查（统一排错手册）
│  └─ examples/           # Examples section，对应 /examples/...
│     ├─ markdown-examples.md
│     ├─ api-examples.md      # 运行时 API 与主题扩展
│     └─ typst-diagrams.md    # Typst 图表渲染效果集（9 组·每库一图块）
├─ nav.json               # 顶部导航配置
├─ sidebar.json           # 侧边栏配置
├─ package.json           # ESM（type: module）+ docs:* / typecheck 脚本 + engines/packageManager
├─ pnpm-workspace.yaml    # pnpm 设置（peer 豁免等）
└─ tsconfig.json          # 严格模式类型检查（.ts/.mts/.vue 全覆盖、JSON 模块等）
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

- `nav.json`：数组；每个导航项可有 `link` 直接跳转，或用 `items` 组成**下拉菜单**
- `sidebar.json`：对象；key 为路由前缀（如 `"/guide/"`），仅匹配该前缀的页面显示对应侧边栏

两份文件的实际结构直接查看仓库根目录即可，改完 `pnpm docs:dev` 即时生效。

JSON 无法携带类型，`config.mts` 中已做类型断言（`nav as DefaultTheme.NavItem[]`、`sidebar as Record<string, DefaultTheme.SidebarItem[]>`）。新增一个独立导航区块时：在 `docs/` 下新建目录放入 Markdown，并在 `nav.json` 与 `sidebar.json` 各加一条即可。可用字段见 [Default Theme Config](https://vitepress.dev/reference/default-theme-config#nav)。

### 主题扩展（`.vitepress/theme/index.ts` + `custom.css`）

默认继承官方主题，已引入 JetBrains Mono 字重与 `custom.css`，并通过 `doc-before` 插槽挂载 `DocHeader` 文章头部组件。可继续在此注册全局组件、追加样式、覆写其他插槽——完整实现直接查看源文件；运行时 API 与扩展点的用法讲解见站内[运行时 API 与主题扩展](/examples/api-examples)。

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
- 上手路径见站内[快速开始](/guide/getting-started)；模板增强用法收录在[内置增强](/guide/enhancements)与 [Typst 图表](/guide/typst)

## 内置增强速览

| 能力 | 一句话说明 |
|---|---|
| 数学公式 | `markdown.math` 构建时渲染，无客户端 JS |
| Iconify 图标 | `::set:name::` 语法内联 SVG，修饰符白名单校验 |
| 自定义容器 | 10 种 Obsidian 风格主题色容器 + `gravity-ui` 标题图标 |
| 等宽字体 | 自托管 JetBrains Mono，离线可用 |
| 文章元数据 | frontmatter 驱动 `DocHeader`，`title` / `keywords` 构建期强校验 |
| Typst 图表 | ```typst 围栏构建期编译为内联 SVG（CeTZ / Alchemist / Lilaq / Fletcher / Tiaoma / Physica / Zap / Atomic 实测可用），明暗自适应可开关 |
| 中文搜索 | 本地搜索内置 Intl.Segmenter CJK 分词器 |
| 品牌色 | `#F74C00` 明暗双套变量 |
| 花括号防护 | 正文 `{{ }}` 自动转义，杜绝 Vue 插值误伤 |

详细用法见站内[内置增强](/guide/enhancements)；排错统一查阅[常见问题与排查](/guide/troubleshooting)。

## 类型检查

```sh
pnpm typecheck       # vue-tsc --noEmit
```

覆盖 `.vitepress/**/*.ts|.mts|.vue`、`docs/**/*.ts` 与根目录 `.ts`/`.mts`；`.vue` 单文件组件由 vue-tsc 原生解析（含 DocHeader 的模板与脚本），无需类型垫片。JSON 导入依赖 `tsconfig.json` 的 `resolveJsonModule`。

> devDependency 锁定 TypeScript 6 而非 7：TS 7 为原生（Go）实现，不再暴露 JS 版编译器入口，vue-tsc 尚无法包装；待 vue-tsc 支持 TS 7 后可同步升级。`config.mts` 中的相对导入均带 `.ts` 扩展名（配合 `allowImportingTsExtensions`），JSON 导入使用 `with { type: 'json' }` 属性——这是 Vite 8 原生配置加载器的要求，可保证构建输出零警告。

## 部署

构建产物为纯静态文件（`.vitepress/dist`），可部署至 Netlify / Vercel / GitHub Pages / Nginx 等。启用 `cleanUrls` 时服务端需将 `/path` 回退到 `/path.html`（各平台配置见 [Deploy Guide](https://vitepress.dev/guide/deploy)）。
