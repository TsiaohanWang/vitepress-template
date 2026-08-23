---
title: Typst 图表示例
subtitle: 通过 typst.ts 在构建期将 ```typst 代码块渲染为内联 SVG
keywords:
  - Typst
  - CeTZ
  - Alchemist
  - Lilaq
---

本页演示 ```typst 围栏代码块的构建期渲染：代码经 typst.ts 编译为自包含的内联 SVG，无客户端 JS、无运行时请求。

约定：

- **3 个反引号**的 ````typst 围栏会被编译渲染为 SVG
- **4 个及以上反引号**的围栏按普通代码块展示——这是在文档中书写 typst 源码原文的标准方式

图表类内容建议在源码中设置 `#set page(width: auto, height: auto, margin: ...)`，使 SVG 尺寸贴合图形本身而非 A4 页面。

## CeTZ

单位圆三角函数图（官方 gallery 示例 karls-picture）。源码：

````typst
#import "@preview/cetz:0.5.2"
#set page(width: auto, height: auto, margin: .5cm)

#show math.equation: block.with(fill: white, inset: 1pt)

// Create a new canvas to draw on
#cetz.canvas(length: 3cm, {
  import cetz.draw: *

  // Change the design for all elements after it
  set-style(
    mark: (fill: black, scale: 2),
    stroke: (thickness: 0.4pt, cap: "round"),
    angle: (
      radius: 0.3,
      label-radius: .22,
      fill: green.lighten(80%),
      stroke: (paint: green.darken(50%))
    ),
    content: (padding: 1pt)
  )

  // Draws the grid behind the circle
  grid((-1.5, -1.5), (1.4, 1.4), step: 0.5, stroke: gray + 0.2pt)

  // Draw the unit circle
  circle((0,0), radius: 1)

  // Draw the axis lines and axis labels
  line((-1.5, 0), (1.5, 0), mark: (end: "stealth"))
  content((), $ x $, anchor: "west")
  line((0, -1.5), (0, 1.5), mark: (end: "stealth"))
  content((), $ y $, anchor: "south")

  // Draw the number steps on the x-axis
  for (x, ct) in ((-1, $ -1 $), (-0.5, $ -1/2 $), (1, $ 1 $)) {
    line((x, 3pt), (x, -3pt))
    content((), anchor: "north", ct)
  }

  // Draw the number steps on the y-axis
  for (y, ct) in ((-1, $ -1 $), (-0.5, $ -1/2 $), (0.5, $ 1/2 $), (1, $ 1 $)) {
    line((3pt, y), (-3pt, y))
    content((), anchor: "east", ct)
  }

  // Draw the green angle
  cetz.angle.angle((0,0), (1,0), (1, calc.tan(30deg)),
    label: text(green, [#sym.alpha]))

  // Draw the hypothenuse of the triangle
  line((0,0), (1, calc.tan(30deg)))

  // Change the stroke for all upcoming elements
  set-style(stroke: (thickness: 1.2pt))

  // Draw the inner opposite leg of the triangle:
  // "The intersection of a vertical line (|-) through (30deg, 1) and a horizontal line through (0, 0)"
  line((30deg, 1), ((), "|-", (0,0)), stroke: (paint: red), name: "sin")
  // Place the text halfway through on the opposite leg
  content(("sin.start", 50%, "sin.end"), text(red)[$ sin alpha $])

  // Draw the adjacent leg of the triangle
  line("sin.end", (0,0), stroke: (paint: blue), name: "cos")
  // Place the text halfway and position it below the line
  content(("cos.start", 50%, "cos.end"), text(blue)[$ cos alpha $], anchor: "north")

  // Draw the outer opposite leg of the triangle
  line((1, 0), (1, calc.tan(30deg)), name: "tan", stroke: (paint: orange))
  // Draw the tangent equasion at the top and to the right of the line
  content("tan.end", $ tan alpha = sin alpha / cos alpha $, anchor: "west")
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
    angle: (
      radius: 0.3,
      label-radius: .22,
      fill: green.lighten(80%),
      stroke: (paint: green.darken(50%))
    ),
    content: (padding: 1pt)
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

  cetz.angle.angle((0,0), (1,0), (1, calc.tan(30deg)),
    label: text(green, [#sym.alpha]))

  line((0,0), (1, calc.tan(30deg)))

  set-style(stroke: (thickness: 1.2pt))

  line((30deg, 1), ((), "|-", (0,0)), stroke: (paint: red), name: "sin")
  content(("sin.start", 50%, "sin.end"), text(red)[$ sin alpha $])

  line("sin.end", (0,0), stroke: (paint: blue), name: "cos")
  content(("cos.start", 50%, "cos.end"), text(blue)[$ cos alpha $], anchor: "north")

  line((1, 0), (1, calc.tan(30deg)), name: "tan", stroke: (paint: orange))
  content("tan.end", $ tan alpha = sin alpha / cos alpha $, anchor: "west")
})
```

## Alchemist

化学骨架式结构图（官方手册示例）。源码：

````typst
#import "@preview/alchemist:0.2.0": *
#set page(width: auto, height: auto, margin: 6pt)
#skeletize({
  cycle(6, {
    branch({
      single()
      fragment("HO")
    })
    single()
    double()
    cycle(6,{
      single(stroke:transparent)
      single(
        stroke:transparent,
        to: 1
      )
      fragment("HN")
      branch({
        single(angle:-1)
        fragment("CH_3")
      })
      single(from:1)
      single()
      branch({
        cram-filled-left(angle: 2)
        fragment("OH")
      })
      single()
    })
    single()
    double()
    single()
    branch({
      single()
      fragment("HO")
    })
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
    branch({
      single()
      fragment("HO")
    })
    single()
    double()
    cycle(6,{
      single(stroke:transparent)
      single(
        stroke:transparent,
        to: 1
      )
      fragment("HN")
      branch({
        single(angle:-1)
        fragment("CH_3")
      })
      single(from:1)
      single()
      branch({
        cram-filled-left(angle: 2)
        fragment("OH")
      })
      single()
    })
    single()
    double()
    single()
    branch({
      single()
      fragment("HO")
    })
    double()
  })
})
```

## Lilaq

柏林气候图（双轴柱线复合图）。源码：

````typst
#import "@preview/lilaq:0.6.0" as lq
#set page(width: auto, height: auto, margin: 8pt)
#let months = ("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec")
#let precipitation = (56, 41, 53, 42, 60, 67, 81, 62, 56, 49, 48, 54)
#let temperature = (0.5, 1.4, 4.4, 9.7, 14.4, 17.8, 19.8, 19.5, 15.5, 10.4, 5.6, 2.2)
#lq.diagram(
  width: 8cm,
  title: [Climate of Berlin],
  ylabel: [Temperature in °C],
  xlabel: [Month],
  legend: (position: left + top),
  margin: (top: 20%),
  xaxis: (
    ticks: months.map(rotate.with(-90deg, reflow: true)).enumerate(),
    subticks: none,
  ),
  lq.yaxis(
    position: right,
    label: [Precipitation in mm],
    lq.bar(range(12), precipitation, fill: blue.lighten(40%), label: [Precipitation]),
  ),
  lq.plot(
    range(12), temperature,
    label: [Temperature], color: red, stroke: 1pt, mark-size: 6pt,
  ),
)
````

渲染效果：

```typst
#import "@preview/lilaq:0.6.0" as lq
#set page(width: auto, height: auto, margin: 8pt)
#let months = ("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec")
#let precipitation = (56, 41, 53, 42, 60, 67, 81, 62, 56, 49, 48, 54)
#let temperature = (0.5, 1.4, 4.4, 9.7, 14.4, 17.8, 19.8, 19.5, 15.5, 10.4, 5.6, 2.2)
#lq.diagram(
  width: 8cm,
  title: [Climate of Berlin],
  ylabel: [Temperature in °C],
  xlabel: [Month],
  legend: (position: left + top),
  margin: (top: 20%),
  xaxis: (
    ticks: months.map(rotate.with(-90deg, reflow: true)).enumerate(),
    subticks: none,
  ),
  lq.yaxis(
    position: right,
    label: [Precipitation in mm],
    lq.bar(range(12), precipitation, fill: blue.lighten(40%), label: [Precipitation]),
  ),
  lq.plot(
    range(12), temperature,
    label: [Temperature], color: red, stroke: 1pt, mark-size: 6pt,
  ),
)
```
