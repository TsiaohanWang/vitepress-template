---
title: Typst 图表
subtitle: "typst 围栏构建期编译为内联 SVG"
keywords:
  - Typst
  - SVG
  - 图表
---

恰好 3 个反引号的 ```` ```typst ```` 围栏在构建期经 `@myriaddreamin/typst-ts-node-compiler`（N-API 原生插件，无需 Rust 工具链）编译为**自包含内联 SVG**：字形以路径嵌入、无 `<text>` 元素与外部引用，纯静态 SSR，零客户端 JS。围栏层级等使用约定见下方；全部包的实际渲染效果集中展示于 [Typst 图表示例](/examples/typst-diagrams)。

## 使用约定

- **渲染与展示分离**：恰好 3 个反引号的围栏渲染为 SVG；4 个及以上反引号的同名围栏按普通代码块高亮显示源码原文（CommonMark 嵌套约定）——需要同时给出「示例代码 + 渲染效果」时，先写长围栏代码块、再写短围栏渲染块
- **图表类源码务必显式设置页面**（如 `#set page(width: auto, height: auto, margin: ...)`），否则输出整张 A4 页面而非贴合图形。纯图形用 `width: auto` 贴合内容；**含段落文本的示例必须给定具体宽度**（如 `16cm`）——`auto` 宽度会退化为逐字换行的极窄竖条
- **源码中的 CJK 文本**（如 Lilaq 示例的中文轴标）依赖构建环境安装有中文字体（Noto Sans CJK、Droid Sans Fallback 等）；Typst 对缺字自动回退，环境中无任何中文字体时会显示为方块，但不影响构建
- **明暗自适应（默认开启）**：构建期对编译产物做亮度感知的角色映射——墨黑重映射为 `currentColor` 随正文字色；页面画布及各类**亮色实心面**（不透明 · S<0.25 · L≥0.55，含纯白与 luma(90%) 浅灰盘）经配对确认后跟随背景色；**亮色芯片面**（L≥0.62，如 Fletcher 节点）暗色下同色相压暗、过暗彩色线条提亮至 L=0.58；中间调与灰色保持原样。图形内部的白色按绘制顺序语义区分：**紧随墨迹/文字的白色衬底**（如 CeTZ 公式背板）跟随背景色共同适配，而**孤立的白标记**（彩底白字标签）保留字面白色——未被适配而保持白色的衬板（如图例面板），其覆盖范围内的墨迹也会**锁定为原始深色**，避免暗色下亮字糊在白底上。色彩值解析覆盖 SVG/CSS 全语法——十六进制（3/4/6/8 位）、`rgb()/rgba()`、`hsl()/hsla()`（逗号与空格两种写法）、148 个 CSS 命名色；作用位置覆盖展示属性、内联 `style` 声明与 `<style>` 块内规则；`<mask>`/`<filter>`/`<clipPath>` 内部因亮度算术依赖精确色值而整体豁免。**粗描边条带**（stroke-width ≥ 6pt，如甘特图任务条）视作表面：条带自身与覆盖其上的墨迹整体保持原始明暗极性（灰条黑字在暗色下依旧灰条黑字），避免「衬板调了、文字没调」的割裂。两类特殊情形：① 画布被作者设为非近白色（如黑底）时整图完全直通，尊重原始设计；② **渐变整体豁免**——typst 将其采样为上百个 stop，逐点判定会在阈值边界产生断带，饱和色相在暗底上本身可读，故保持原始色标以保证连续性；③ 内嵌位图式矢量（如 Tiaoma 条码的 base64 内层 SVG）先展开为行内标记再参与映射。开关位于 `config.mts` 的 `typstThemeAdaptive`：关闭后输出编译器原始固定配色；切换无需清理编译缓存

## 包管理与缓存

- `@preview/*` 包（`cetz` / `alchemist` / `lilaq` / `fletcher` / `tiaoma` / `physica` / `zap` / `atomic` 等）首次使用时自动下载至 `~/.cache/typst/packages`；CI 需允许该网络访问，或预先缓存（本仓库 CI 已配置该目录缓存）
- 已编译结果按**源码内容哈希**缓存在 `.vitepress/cache/typst-svg/`（已 gitignore），重复构建零开销；删除该目录即可强制全部重编译

## 失败行为

编译失败不中断构建：终端打印诊断，页面原位展示错误占位块。排错细节见 [常见问题与排查](/guide/troubleshooting#typst-问题)。

## 明暗自适应测试样例

以下用例覆盖角色映射的全部规则路径与极端场景，供实际预览验证——切换明暗主题逐例对照。

### 渐变（连续性优先，整体直通）

预期：渐变在明暗两态下**完全一致**——typst 将其采样为上百个 stop，逐点亮度判定会在阈值边界产生断带，故渐变定义整体豁免适配；饱和色相本身在暗底上即可读。

```typst
#set page(width: auto, height: auto, margin: 5pt)
#rect(width: 6cm, height: 1.4cm, fill: gradient.linear(red, blue))
#v(4pt)
#circle(radius: 0.9cm, fill: gradient.radial(yellow.lighten(40%), teal.darken(30%)))
```

### 半透明与亮色面板

预期：亮蓝面板暗色下压暗为深蓝；带透明度的红色属于刻意彩色，保持原样。

```typst
#set page(width: auto, height: auto, margin: 5pt)
#stack(spacing: 6pt,
  rect(width: 5cm, height: 0.9cm, fill: blue.lighten(70%)),
  rect(width: 5cm, height: 0.9cm, fill: red.transparentize(60%)),
)
```

### 灰阶阶梯（中性色不动）

预期：五档灰与深灰描边全部原样——中性中间调在两种主题下均可读，算法不做干预（画布除外）。

```typst
#set page(width: auto, height: auto, margin: 5pt)
#for f in range(5) {
  box(rect(width: 0.8cm, height: 0.8cm, fill: luma(f * 55), stroke: luma(30) + 0.5pt))
  h(4pt)
}
```

### 深色画布（直通场景）

预期：整图完全直通——作者为深底设计的图形在明暗两态下呈现相同的原始黑底白线。

```typst
#set page(width: auto, height: auto, margin: 5pt, fill: black)
#line(length: 4cm, stroke: white + 1.2pt)
#place(center, rect(width: 2.4cm, height: 1.2cm, stroke: white + 0.8pt))
```

### 彩底白字标签（内部白保留）

预期：标签白字是刻意设计，保持字面白色；只有页面画布本身跟随背景色。

```typst
#set page(width: auto, height: auto, margin: 5pt)
#block(fill: rgb("#0074d9"), radius: 4pt, inset: 8pt, text(fill: white, weight: 700)[LABEL])
#h(8pt)
#block(fill: green.darken(30%), radius: 4pt, inset: 8pt, text(fill: white, weight: 700)[OK])
```

### 深色芯片白字（反向组合）

预期：深色芯片与白字在两种主题下均无需干预即保持可读——算法对中间调与内部白不做任何改动。

```typst
#set page(width: auto, height: auto, margin: 5pt)
#for (c, t) in ((blue.darken(35%), "DEV"), (green.darken(25%), "OK"), (red.darken(20%), "FIX")) {
  box(fill: c, radius: 3pt, inset: 6pt, outset: 3pt, text(fill: white, weight: 700, size: 7pt)[#t])
  h(6pt)
}
```

### 多彩散点（逐色独立判定）

预期：六色圆各自独立过亮度规则——黄色（高亮）压暗、紫蓝中间调不动，描边同步判定。

```typst
#set page(width: auto, height: auto, margin: 5pt)
#for (c, x) in ((red, 0), (orange, 1), (yellow, 2), (green, 3), (blue, 4), (purple, 5)) {
  place(dx: x * 1cm + 1cm, dy: 0.5cm, circle(radius: 0.42cm, fill: c, stroke: c.darken(35%) + 0.8pt))
}
```

### 公式衬板配对（绘制顺序语义）

预期：三行公式的白色衬板紧随墨迹/彩字，判定为背板——暗色下衬板跟随背景色、墨迹随之变亮，不再出现白板亮字。

```typst
#set page(width: auto, height: auto, margin: 5pt)
#show math.equation: block.with(fill: white, inset: 4pt)
$ integral_0^1 x^2 dif x = 1/3 $
$ e^(i pi) + 1 = 0 $
#text(fill: red)[$ sum_(k=1)^n k = (n(n+1)) / 2 $]
```

### Fletcher 状态机（多色节点官方风格）

预期：三个亮色节点暗色下分别压暗为同色相深色变体，节点文字（墨迹）保持可读；灰色回边不动。

```typst
#import "@preview/fletcher:0.5.8" as fletcher: diagram, node, edge
#set page(width: auto, height: auto, margin: 5pt)
#diagram(
  spacing: 7mm,
  node((0, 0), [Idle], fill: aqua.lighten(50%), stroke: aqua.darken(20%)),
  edge("-|>"),
  node((1, 0), [Run], fill: yellow.lighten(40%), stroke: yellow.darken(30%)),
  edge("-|>", bend: 25deg),
  node((2, 0), [Done], fill: green.lighten(45%), stroke: green.darken(25%)),
  edge((1, 0), (0, 0), "->", bend: 25deg, stroke: gray),
)
```

### Lilaq 迷你双轴图（柱线复合）

预期：亮青柱体压暗、橙色折线中间调保持、坐标墨迹随文字色——图表整体融入暗色版面。

```typst
#import "@preview/lilaq:0.6.0" as lq
#set page(width: auto, height: auto, margin: 5pt)
#lq.diagram(
  width: 7cm,
  ylabel: [$y$],
  lq.bar(range(4), (3, 5, 2, 6), fill: teal.lighten(30%)),
  lq.plot(range(4), (1, 4, 3, 5), color: orange, mark-size: 4pt),
)
```

### 多层透明叠加（混色边界）

预期：两个半透明圆各自保留原色相与透明度，叠色区域维持真实混色——透明度通道不参与主题映射。

```typst
#set page(width: auto, height: auto, margin: 5pt)
#block(width: 3.4cm, height: 2.2cm, {
  place(circle(radius: 0.85cm, fill: red.transparentize(55%)))
  place(dx: 1.1cm, circle(radius: 0.85cm, fill: blue.transparentize(55%)))
})
```

## 实现位置

实现见 `.vitepress/typst.ts`：markdown-it fence 渲染器覆写 + 带缓存的编译封装。站点示例页 [Typst 图表示例](/examples/typst-diagrams) 含 `cetz`（官方 gallery `karls-picture`）/ `alchemist` / `lilaq` / `fletcher` / `tiaoma` / `physica` / `zap` / `atomic` 十六例。
