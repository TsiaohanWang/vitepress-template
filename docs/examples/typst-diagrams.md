---
title: Typst 图表示例
subtitle: 通过 typst.ts 在构建期将 ```typst 代码块渲染为内联 SVG
keywords:
  - Typst
  - CeTZ
  - Alchemist
  - Lilaq
  - Fletcher
  - Tiaoma
  - Physica
  - Zap
---

本页演示 ```typst 围栏代码块的构建期渲染：代码经 typst.ts 编译为自包含的内联 SVG，无客户端 JS、无运行时请求。

约定：

- **3 个反引号**的 `typst` 围栏会被编译渲染为 SVG
- **4 个及以上反引号**的围栏按普通代码块展示——这是在文档中书写 typst 源码原文的标准方式

图表类内容建议在源码中设置 `#set page(width: auto, height: auto, margin: ...)`，使 SVG 尺寸贴合图形本身而非 A4 页面。

## CeTZ

单位圆三角函数图（官方 gallery 示例 `karls-picture`）。源码：

````typst
#import "@preview/cetz:0.5.2"
#set page(width: auto, height: auto, margin: .5cm)
#show math.equation: block.with(fill: white, inset: 1pt)
#cetz.canvas(length: 3cm, {
  import cetz.draw: *
  set-style(
    mark: (fill: black, scale: 2),
    stroke: (thickness: 0.4pt, cap: "round"),
    angle: (radius: 0.3, label-radius: .22, fill: green.lighten(80%), stroke: (paint: green.darken(50%))),
    content: (padding: 1pt),
  )
  grid((-1.5, -1.5), (1.4, 1.4), step: 0.5, stroke: gray + 0.2pt)
  circle((0,0), radius: 1)
  line((-1.5, 0), (1.5, 0), mark: (end: "stealth"))
  content((), $ x $, anchor: "west")
  line((0, -1.5), (0, 1.5), mark: (end: "stealth"))
  content((), $ y $, anchor: "south")
  for (x, ct) in ((-1, $ -1 $), (-0.5, $ -1/2 $), (1, $ 1 $)) {
    line((x, 3pt), (x, -3pt))
    content((), anchor: "north", ct)
  }
  for (y, ct) in ((-1, $ -1 $), (-0.5, $ -1/2 $), (0.5, $ 1/2 $), (1, $ 1 $)) {
    line((3pt, y), (-3pt, y))
    content((), anchor: "east", ct)
  }
  cetz.angle.angle((0,0), (1,0), (1, calc.tan(30deg)), label: text(green, [#sym.alpha]))
  line((0,0), (1, calc.tan(30deg)))
  set-style(stroke: (thickness: 1.2pt))
  line((30deg, 1), ((), "|-", (0,0)), stroke: (paint: red), name: "sin")
  content(("sin.start", 50%, "sin.end"), text(red)[$ sin alpha $])
  line("sin.end", (0,0), stroke: (paint: blue), name: "cos")
  content(("cos.start", 50%, "cos.end"), text(blue)[$ cos alpha $], anchor: "north")
  line((1, 0), (1, calc.tan(30deg)), name: "tan", stroke: (paint: orange))
  content("tan.end", $ tan alpha = frac(sin alpha, cos alpha) $, anchor: "west")
})
````

渲染效果：

```typst
#import "@preview/cetz:0.5.2"
#set page(width: auto, height: auto, margin: .5cm)
#show math.equation: block.with(fill: white, inset: 1pt)
#cetz.canvas(length: 3cm, {
  import cetz.draw: *
  set-style(
    mark: (fill: black, scale: 2),
    stroke: (thickness: 0.4pt, cap: "round"),
    angle: (radius: 0.3, label-radius: .22, fill: green.lighten(80%), stroke: (paint: green.darken(50%))),
    content: (padding: 1pt),
  )
  grid((-1.5, -1.5), (1.4, 1.4), step: 0.5, stroke: gray + 0.2pt)
  circle((0,0), radius: 1)
  line((-1.5, 0), (1.5, 0), mark: (end: "stealth"))
  content((), $ x $, anchor: "west")
  line((0, -1.5), (0, 1.5), mark: (end: "stealth"))
  content((), $ y $, anchor: "south")
  for (x, ct) in ((-1, $ -1 $), (-0.5, $ -1/2 $), (1, $ 1 $)) {
    line((x, 3pt), (x, -3pt))
    content((), anchor: "north", ct)
  }
  for (y, ct) in ((-1, $ -1 $), (-0.5, $ -1/2 $), (0.5, $ 1/2 $), (1, $ 1 $)) {
    line((3pt, y), (-3pt, y))
    content((), anchor: "east", ct)
  }
  cetz.angle.angle((0,0), (1,0), (1, calc.tan(30deg)), label: text(green, [#sym.alpha]))
  line((0,0), (1, calc.tan(30deg)))
  set-style(stroke: (thickness: 1.2pt))
  line((30deg, 1), ((), "|-", (0,0)), stroke: (paint: red), name: "sin")
  content(("sin.start", 50%, "sin.end"), text(red)[$ sin alpha $])
  line("sin.end", (0,0), stroke: (paint: blue), name: "cos")
  content(("cos.start", 50%, "cos.end"), text(blue)[$ cos alpha $], anchor: "north")
  line((1, 0), (1, calc.tan(30deg)), name: "tan", stroke: (paint: orange))
  content("tan.end", $ tan alpha = frac(sin alpha, cos alpha) $, anchor: "west")
})
```

## Alchemist

化学骨架式结构图（官方手册示例）。源码：

````typst
#import "@preview/alchemist:0.2.0": *
#set page(width: auto, height: auto, margin: 6pt)
#skeletize({
  cycle(6, {
    branch({ single(); fragment("HO") })
    single()
    double()
    cycle(6, {
      single(stroke: transparent)
      single(stroke: transparent, to: 1)
      fragment("HN")
      branch({ single(angle: -1); fragment("CH_3") })
      single(from: 1)
      single()
      branch({ cram-filled-left(angle: 2); fragment("OH") })
      single()
    })
    single()
    double()
    single()
    branch({ single(); fragment("HO") })
    double()
  })
})
````

渲染效果：

```typst
#import "@preview/alchemist:0.2.0": *
#set page(width: auto, height: auto, margin: 6pt)
#skeletize({
  cycle(6, {
    branch({ single(); fragment("HO") })
    single()
    double()
    cycle(6, {
      single(stroke: transparent)
      single(stroke: transparent, to: 1)
      fragment("HN")
      branch({ single(angle: -1); fragment("CH_3") })
      single(from: 1)
      single()
      branch({ cram-filled-left(angle: 2); fragment("OH") })
      single()
    })
    single()
    double()
    single()
    branch({ single(); fragment("HO") })
    double()
  })
})
```

## Lilaq

柏林气候图（双轴柱线复合图；轴标与图例用中文书写，展示 Typst 的 CJK 排版能力——渲染依赖构建环境的中文字体）。源码：

````typst
#import "@preview/lilaq:0.6.0" as lq
#set page(width: auto, height: auto, margin: 8pt)
#let months = ("1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月")
#let precipitation = (56, 41, 53, 42, 60, 67, 81, 62, 56, 49, 48, 54)
#let temperature = (0.5, 1.4, 4.4, 9.7, 14.4, 17.8, 19.8, 19.5, 15.5, 10.4, 5.6, 2.2)
#lq.diagram(
  width: 8cm, title: [柏林气候],
  ylabel: [气温（°C）], xlabel: [月份],
  legend: (position: left + top), margin: (top: 20%),
  xaxis: (
    ticks: months.map(rotate.with(-90deg, reflow: true)).enumerate(),
    subticks: none,
  ),
  lq.yaxis(position: right, label: [降水量（mm）],
    lq.bar(range(12), precipitation, fill: blue.lighten(40%), label: [降水量])),
  lq.plot(range(12), temperature,
    label: [气温], color: red, stroke: 1pt, mark-size: 6pt),
)
````

渲染效果：

```typst
#import "@preview/lilaq:0.6.0" as lq
#set page(width: auto, height: auto, margin: 8pt)
#let months = ("1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月")
#let precipitation = (56, 41, 53, 42, 60, 67, 81, 62, 56, 49, 48, 54)
#let temperature = (0.5, 1.4, 4.4, 9.7, 14.4, 17.8, 19.8, 19.5, 15.5, 10.4, 5.6, 2.2)
#lq.diagram(
  width: 8cm, title: [柏林气候],
  ylabel: [气温（°C）], xlabel: [月份],
  legend: (position: left + top), margin: (top: 20%),
  xaxis: (
    ticks: months.map(rotate.with(-90deg, reflow: true)).enumerate(),
    subticks: none,
  ),
  lq.yaxis(position: right, label: [降水量（mm）],
    lq.bar(range(12), precipitation, fill: blue.lighten(40%), label: [降水量])),
  lq.plot(range(12), temperature,
    label: [气温], color: red, stroke: 1pt, mark-size: 6pt),
)
```

## Fletcher

机器学习模型架构图（官方 gallery 示例 03-ml-architecture）。源码：

````typst
#import "@preview/fletcher:0.5.8" as fletcher: diagram, node, edge
#import fletcher.shapes: house, hexagon
#set page(width: auto, height: auto, margin: 5mm, fill: white)
#set text(font: "New Computer Modern")

#let blob(pos, label, tint: white, ..args) = node(
  pos, align(center, label), width: 28mm,
  fill: tint.lighten(60%), stroke: 1pt + tint.darken(20%), corner-radius: 5pt,
  ..args,
)

#diagram(
  spacing: 8pt, cell-size: (8mm, 10mm),
  edge-stroke: 1pt, edge-corner-radius: 5pt, mark-scale: 70%,
  blob((0,1), [Add & Norm], tint: yellow, shape: hexagon),
  edge(),
  blob((0,2), [Multi-Head\ Attention], tint: orange),
  blob((0,4), [Input], shape: house.with(angle: 30deg), width: auto, tint: red),
  for x in (-.3, -.1, +.1, +.3) { edge((0,2.8), (x,2.8), (x,2), "-|>") },
  edge((0,2.8), (0,4)),
  edge((0,3), "l,uu,r", "--|>"),
  edge((0,1), (0, 0.35), "r", (1,3), "r,u", "-|>"),
  edge((1,2), "d,rr,uu,l", "--|>"),
  blob((2,0), [Softmax], tint: green),
  edge("<|-"),
  blob((2,1), [Add & Norm], tint: yellow, shape: hexagon),
  edge(),
  blob((2,2), [Feed\ Forward], tint: blue),
)
````

渲染效果：

```typst
#import "@preview/fletcher:0.5.8" as fletcher: diagram, node, edge
#import fletcher.shapes: house, hexagon
#set page(width: auto, height: auto, margin: 5mm, fill: white)
#set text(font: "New Computer Modern")

#let blob(pos, label, tint: white, ..args) = node(
  pos, align(center, label), width: 28mm,
  fill: tint.lighten(60%), stroke: 1pt + tint.darken(20%), corner-radius: 5pt,
  ..args,
)

#diagram(
  spacing: 8pt, cell-size: (8mm, 10mm),
  edge-stroke: 1pt, edge-corner-radius: 5pt, mark-scale: 70%,
  blob((0,1), [Add & Norm], tint: yellow, shape: hexagon),
  edge(),
  blob((0,2), [Multi-Head\ Attention], tint: orange),
  blob((0,4), [Input], shape: house.with(angle: 30deg), width: auto, tint: red),
  for x in (-.3, -.1, +.1, +.3) { edge((0,2.8), (x,2.8), (x,2), "-|>") },
  edge((0,2.8), (0,4)),
  edge((0,3), "l,uu,r", "--|>"),
  edge((0,1), (0, 0.35), "r", (1,3), "r,u", "-|>"),
  edge((1,2), "d,rr,uu,l", "--|>"),
  blob((2,0), [Softmax], tint: green),
  edge("<|-"),
  blob((2,1), [Add & Norm], tint: yellow, shape: hexagon),
  edge(),
  blob((2,2), [Feed\ Forward], tint: blue),
)
```

## Tiaoma

条形码生成（基于 zint 的 WASM 插件，支持近百种码制）。源码：

````typst
#import "@preview/tiaoma:0.3.0"
#set page(width: auto, height: auto, margin: 5pt)

= tiáo mǎ

#tiaoma.ean("1234567890128")
````

渲染效果：

```typst
#import "@preview/tiaoma:0.3.0"
#set page(width: auto, height: auto, margin: 5pt)

= tiáo mǎ

#tiaoma.ean("1234567890128")
```

## Physica

数字时序图（官方手册示例：时钟与总线状态波形，`&` 对齐、`\` 换行需在数学模式内）。源码：

````typst
#import "@preview/physica:0.9.8": *
#set page(width: auto, height: auto, margin: 5pt)

$ "clk:" & signals("|1....|0....|1....|0....|1....|0....|1....|0..", step: #0.5em) \
  "bustyle:" & signals(" #.... X=... ..... ..... X=... ..... ..... X#.", step: #0.5em) $
````

渲染效果：

```typst
#import "@preview/physica:0.9.8": *
#set page(width: auto, height: auto, margin: 5pt)

$ "clk:" & signals("|1....|0....|1....|0....|1....|0....|1....|0..", step: #0.5em) \
  "bustyle:" & signals(" #.... X=... ..... ..... X=... ..... ..... X#.", step: #0.5em) $
```

## Zap

电路原理图（官方文档示例：电源、保险丝、三极管、运放与接地网络）。注意官方示例的 `#import "/src/lib.typ"` 是仓库内路径，独立使用时改为包导入。源码：

````typst
#import "@preview/zap:0.6.0" as zap
#set page(width: auto, height: auto, margin: 5pt, fill: white)

#let example1 = {
  import zap: *

  resistor("r1", (2, 0), (4, 2))
  resistor("r2", (6, 0), (4, 2))
  resistor("r3", (6, 0), (4, -2))
  resistor("r4", (2, 0), (4, -2))
  afuse("f1", (0, 2), "r1.out", position: 40%, label: $F_1$)
  vsource("v1", (0, -2), (0, 2), u: $u_1$, i: (content: $i_1$, anchor: "south"), label: (content: "5V", anchor: "south"))
  wire("r4.out", (0, -2))
  pnp("n1", (8, 2), envelope: true)
  wire("r1.out", "n1.b")
  capacitor("c1", "n1.e", (rel: (2, 0)), label: $C_1$)
  swire(name: "dede", "n1.c", "r4.out", axis: "y")

  node("A", (4, 2))
  node("B", (4, -2))
  opamp("o1", (13, 2.05), label: "OP1")
  wire("o1.minus", "c1.out")
  zwire("o1.out", (rel: (1, 0)))
  rheostat("r2", (rel: (1, 0), to: "o1.out"), (rel: (0, -4.05)), label: $R_"eq"$)
  swire("r2.out", "dede.p1")

  earth("g1", (11, 1))
  swire("o1.plus", "g1")
}

#let canvas = zap.circuit(example1)

#canvas
````

渲染效果：

```typst
#import "@preview/zap:0.6.0" as zap
#set page(width: auto, height: auto, margin: 5pt, fill: white)

#let example1 = {
  import zap: *

  resistor("r1", (2, 0), (4, 2))
  resistor("r2", (6, 0), (4, 2))
  resistor("r3", (6, 0), (4, -2))
  resistor("r4", (2, 0), (4, -2))
  afuse("f1", (0, 2), "r1.out", position: 40%, label: $F_1$)
  vsource("v1", (0, -2), (0, 2), u: $u_1$, i: (content: $i_1$, anchor: "south"), label: (content: "5V", anchor: "south"))
  wire("r4.out", (0, -2))
  pnp("n1", (8, 2), envelope: true)
  wire("r1.out", "n1.b")
  capacitor("c1", "n1.e", (rel: (2, 0)), label: $C_1$)
  swire(name: "dede", "n1.c", "r4.out", axis: "y")

  node("A", (4, 2))
  node("B", (4, -2))
  opamp("o1", (13, 2.05), label: "OP1")
  wire("o1.minus", "c1.out")
  zwire("o1.out", (rel: (1, 0)))
  rheostat("r2", (rel: (1, 0), to: "o1.out"), (rel: (0, -4.05)), label: $R_"eq"$)
  swire("r2.out", "dede.p1")

  earth("g1", (11, 1))
  swire("o1.plus", "g1")
}

#let canvas = zap.circuit(example1)

#canvas
```
