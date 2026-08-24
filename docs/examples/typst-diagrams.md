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

本页集中展示 ```typst 围栏的构建期渲染结果：代码经 typst.ts 编译为自包含内联 SVG，无客户端 JS、无运行时请求；所有图形均针对明暗主题做了自适应处理（机制与围栏层级约定见 [Typst 图表](/guide/typst)）。

## CeTZ

单位圆三角函数图（官方 gallery 示例 `karls-picture`）。

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


官方 CeTZ-Plot gallery 分组柱状图（`cetz` 0.5.2 + `cetz-plot` 0.1.4；白底图例卡与柱体之间隔有其他图层，衬板配对不生效——暗色下保持白卡黑字的原始卡片形态）：

```typst
#import "@preview/cetz:0.5.2": canvas, draw
#import "@preview/cetz-plot:0.1.4": chart

#set page(width: auto, height: auto, margin: .5cm)

#let data2 = (
  ([15-24], 18.0, 20.1, 23.0, 17.0),
  ([25-29], 16.3, 17.6, 19.4, 15.3),
  ([30-34], 14.0, 15.3, 13.9, 18.7),
  ([35-44], 35.5, 26.5, 29.4, 25.8),
  ([45-54], 25.0, 20.6, 22.4, 22.0),
  ([55+],   19.9, 18.2, 19.2, 16.4),
)

#canvas({
  draw.set-style(legend: (fill: white), barchart: (bar-width: .8, cluster-gap: 0))
  chart.barchart(mode: "clustered",
                 size: (9, auto),
                 label-key: 0,
                 value-key: (..range(1, 5)),
                 x-tick-step: 2.5,
                 data2,
                 labels: ([Low], [Medium], [High], [Very high]),
                 legend: "inner-north-east")
})

```

## Alchemist

化学骨架式结构图（官方手册示例）。

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


官方 README 立体键与着色化学链示例（红/蓝/加粗键与楔形键）：

```typst
#import "@preview/alchemist:0.2.0": *
#set page(width: auto, height: auto, margin: 5pt)
#skeletize({
  fragment(name: "A", "A")
  single()
  fragment("B")
  branch({
    single(angle: 1)
    fragment(
      "W",
      links: (
        "A": double(stroke: red),
      ),
    )
    single()
    fragment(name: "X", "X")
  })
  branch({
    single(angle: -1)
    fragment("Y")
    single()
    fragment(
      name: "Z",
      "Z",
      links: (
        "X": single(stroke: black + 3pt),
      ),
    )
  })
  single()
  fragment(
    "C",
    links: (
      "X": cram-filled-left(fill: blue),
      "Z": single(),
    ),
  )
})

```

## Lilaq

柏林气候图（双轴柱线复合图；轴标与图例用中文书写，展示 Typst 的 CJK 排版能力——渲染依赖构建环境的中文字体）。

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


官方 quickstart「Precious data」双序列图（方/圆标记 + 函数曲线）：

```typst
#import "@preview/lilaq:0.6.0" as lq
#set page(width: auto, height: auto, margin: 5pt)
#let xs = (0, 1, 2, 3, 4)

#lq.diagram(
  title: [Precious data],
  xlabel: $x$,
  ylabel: $y$,

  lq.plot(xs, (3, 5, 4, 2, 3), mark: "s", label: [A]),
  lq.plot(
    xs, x => 2 * calc.cos(x) + 3,
    mark: "o", label: [B]
  )
)

```

## Fletcher

机器学习模型架构图（官方 gallery 示例 03-ml-architecture）。

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


官方 README 状态机——节点填充为**径向渐变**，同时考验渐变豁免与文字墨迹适配：

```typst
#import "@preview/fletcher:0.5.8" as fletcher: diagram, node, edge
#set page(width: auto, height: auto, margin: 5pt)
#set text(10pt)
#diagram(
	node-stroke: .1em,
	node-fill: gradient.radial(blue.lighten(80%), blue, center: (30%, 20%), radius: 80%),
	spacing: 4em,
	edge((-1, 0), "r", "-|>", `open(path)`, label-pos: 0, label-side: center),
	node((0, 0), `reading`, radius: 2em),
	edge(`read()`, "-|>"),
	node((1, 0), `eof`, radius: 2em),
	edge(`close()`, "-|>"),
	node((2, 0), `closed`, radius: 2em, extrude: (-2.5, 0)),
	edge((0, 0), (0, 0), `read()`, "--|>", bend: 130deg),
	edge((0, 0), (2, 0), `close()`, "-|>", bend: -40deg),
)

```

## Tiaoma

条形码生成（基于 zint 的 WASM 插件，支持近百种码制）。

```typst
#import "@preview/tiaoma:0.3.0"
#set page(width: auto, height: auto, margin: 5pt)

= tiáo mǎ

#tiaoma.ean("1234567890128")
```


官方 QR 码（`tiaoma.qrcode`）：

```typst
#import "@preview/tiaoma:0.3.0"
#set page(width: auto, height: auto, margin: 5pt)

#tiaoma.qrcode("https://typst.app")

```

## Physica

数字时序图（官方手册示例：时钟与总线状态波形，`&` 对齐、`\` 换行需在数学模式内）。

```typst
#import "@preview/physica:0.9.8": *
#set page(width: auto, height: auto, margin: 5pt)

$ "clk:" & signals("|1....|0....|1....|0....|1....|0....|1....|0..", step: #0.5em) \
  "bustyle:" & signals(" #.... X=... ..... ..... X=... ..... ..... X#.", step: #0.5em) $
```


官方向量微积分记号（`curl` / `grad` / `tensor` / `pdv`）：

```typst
#import "@preview/physica:0.9.8": *
#set page(width: auto, height: auto, margin: 5pt)

$ curl (grad f), tensor(T, -mu, +nu), pdv(f, x, y, [1, 2]) $

```

## Zap

电路原理图（官方文档示例：电源、保险丝、三极管、运放与接地网络）。注意官方示例的 `#import "/src/lib.typ"` 是仓库内路径，独立使用时改为包导入。

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


官方极简电路（node + 带电流标注的电阻）：

```typst
#import "@preview/zap:0.6.0"
#set page(width: auto, height: auto, margin: 5pt)

#zap.circuit({
    import zap: *

    // Here is a minimalist example
    node("B", (0, 0))
    resistor("r1", "B", (rel: (0, 4)), i: $i_1$)
})

```

## Atomic

原子结构图（Bohr 模型，官方 README 示例：铜原子显式电子层排布 + 铁原子自动填充轨道）：

```typst
#import "@preview/atomic:1.0.0": atom
#set page(width: auto, height: auto, margin: 5pt)

#atom(29, 64, "Cu", (1, 8, 18, 2))
#h(12pt)
#atom(26, 56, "Fe", 26)
```

## Timeliney

甘特图（官方 README 全功能示例：双级表头、任务组、里程碑与网格；`stroke` 尺寸类颜色随主题自适应，236 处墨迹跟随文字色）：

```typst
<code>#set page(width: 17cm, height: auto, margin: 5pt)
#import "@preview/timeliney:0.4.0"

#timeliney.timeline(
  show-grid: true,
  {
    import timeliney: *
      
    headerline(group(([*2023*], 4)), group(([*2024*], 4)))
    headerline(
      group(..range(4).map(n => strong("Q" + str(n + 1)))),
      group(..range(4).map(n => strong("Q" + str(n + 1)))),
    )
  
    taskgroup(
      title: [*Research*],
      content: text(10pt, white)[*John + Julia*],
      style: (stroke: 14pt + black),
      {
        task(
          "Research the market",
          (from: 0, to: 2, content: text(9pt)[John (70% done)]),
          style: (stroke: 13pt + gray),
        )
        task(
          "Conduct user surveys",
          (from: 1, to: 3, content: text(9pt)[Julia (50% done)]),
          style: (stroke: 13pt + gray),
        )
      },
    )

    taskgroup(title: [*Development*], {
      task("Create mock-ups", (2, 3), style: (stroke: 2pt + gray))
      task("Develop application", (3, 5), style: (stroke: 2pt + gray))
      task("QA", (3.5, 6), style: (stroke: 2pt + gray))
    })

    taskgroup(title: [*Marketing*], {
      task("Press demos", (3.5, 7), style: (stroke: 2pt + gray))
      task("Social media advertising", (6, 7.5), style: (stroke: 2pt + gray))
    })

    milestone(
      at: 3.75,
      style: (stroke: (dash: "dashed")),
      align(center, [
        *Conference demo*\
        Dec 2023
      ])
    )

    milestone(
      at: 6.5,
      style: (stroke: (dash: "dashed")),
      align(center, [
        *App store launch*\
        Aug 2024
      ])
    )
  }
)
```
