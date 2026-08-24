---
title: Typst 图表
subtitle: "typst 围栏构建期编译为内联 SVG"
keywords:
  - Typst
  - SVG
  - 图表
---

````md
```typst
#import "@preview/cetz:0.3.4"
#set page(width: auto, height: auto, margin: 6pt)
#cetz.canvas(length: 2cm, {
  import cetz.draw: *
  line((0, 0), (2, 1))
})
```
````

```` ```typst ```` 围栏在构建期经 `@myriaddreamin/typst-ts-node-compiler`（N-API 原生插件，无需 Rust 工具链）编译为**自包含内联 SVG**：字形以路径嵌入、无 `<text>` 元素与外部引用，纯静态 SSR，零客户端 JS。

## 使用约定

- **渲染与展示分离**：恰好 3 个反引号的围栏渲染为 SVG；4 个及以上反引号的同名围栏按普通代码块高亮显示源码原文（CommonMark 嵌套约定）——需要同时给出「示例代码 + 渲染效果」时，先写长围栏代码块、再写短围栏渲染块
- **图表类源码务必设置** `#set page(width: auto, height: auto, margin: ...)`，否则输出整张 A4 页面而非贴合图形
- **源码中的 CJK 文本**（如 Lilaq 示例的中文轴标）依赖构建环境安装有中文字体（Noto Sans CJK、Droid Sans Fallback 等）；Typst 对缺字自动回退，环境中无任何中文字体时会显示为方块，但不影响构建

## 包管理与缓存

- `@preview/*` 包（`cetz` / `alchemist` / `lilaq` / `fletcher` / `tiaoma` / `physica` / `zap` 等）首次使用时自动下载至 `~/.cache/typst/packages`；CI 需允许该网络访问，或预先缓存（本仓库 CI 已配置该目录缓存）
- 已编译结果按**源码内容哈希**缓存在 `.vitepress/cache/typst-svg/`（已 gitignore），重复构建零开销；删除该目录即可强制全部重编译

## 失败行为

编译失败不中断构建：终端打印诊断，页面原位展示错误占位块。排错细节见 [常见问题与排查](/guide/troubleshooting#typst-问题)。

## 实现位置

实现见 `.vitepress/typst.ts`：markdown-it fence 渲染器覆写 + 带缓存的编译封装。站点示例页 [Typst 图表示例](/examples/typst-diagrams) 含 `cetz`（官方 gallery `karls-picture`）/ `alchemist` / `lilaq` / `fletcher` / `tiaoma` / `physica` / `zap` 七例。
