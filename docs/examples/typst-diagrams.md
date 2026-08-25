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
  - Atomic
  - Timeliney
---

本页集中展示 ```typst 围栏的构建期渲染结果：代码经 typst.ts 编译为自包含内联 SVG，无客户端 JS、无运行时请求；所有图形均针对明暗主题做了自适应处理（机制与围栏层级约定见 [Typst 图表](/guide/typst)）。

九个库的快速定位如下表，各节再展开介绍功能用途与本页示例：

| 库 | 类别 | 功能用途 |
| --- | --- | --- |
| [CeTZ](https://typst.app/universe/package/cetz/) | 通用绘图 | TikZ 风格画布引擎，自由绘制任意示意图；`cetz-plot` 扩展提供统计图表 |
| [Alchemist](https://typst.app/universe/package/alchemist/) | 化学 | 骨架式化学结构：碳环、化学键、立体楔形与反应关系 |
| [Lilaq](https://typst.app/universe/package/lilaq/) | 科学绘图 | 轴系完备的出版级统计图表（折线 / 柱状 / 函数曲线等） |
| [Fletcher](https://typst.app/universe/package/fletcher/) | 结构图 | 节点—箭头图表：交换图、状态机、架构与流程图 |
| [Tiaoma](https://typst.app/universe/package/tiaoma/) | 条码 | EAN-8 / EAN-13 商品条码与 QR 矩阵码 |
| [Physica](https://typst.app/universe/package/physica/) | 物理记号 | 向量微积分、张量、狄拉克记号与时序波形图 |
| [Zap](https://typst.app/universe/package/zap/) | 电工电子 | CircuiTikZ 风格的电路原理图 |
| [Atomic](https://typst.app/universe/package/atomic/) | 物理 | Bohr 原子结构模型图 |
| [Timeliney](https://typst.app/universe/package/timeliney/) | 项目管理 | 甘特图 / 项目时间线：任务组、里程碑、网格 |

## CeTZ

**通用二维绘图** —— Typst 生态中最接近 LaTeX TikZ 的画布式绘图引擎。核心是 `canvas` / `draw` 两层接口：坐标系与缩放、直线/圆弧/贝塞尔路径、矩形/圆/多边形等形状、箭头标记、角度与文字标注，配合 `set-style` 统一管理线宽、填充与标注风格——几乎任何自定义示意图都能从零逐点构造。官方扩展 [`cetz-plot`](https://typst.app/universe/package/cetz-plot/) 在同一画布上封装出柱状图、折线图、直方图等统计图表类型，适合教科书级数学插图与对布局有精确要求的自由绘图。

本页示例：单位圆上的三角函数几何定义（角 α 与 sin/cos/tan 对应线段）；`cetz-plot` 分组柱状图 → [官方页面](https://typst.app/universe/package/cetz/)：

```typst
#import "@preview/cetz:0.5.2": canvas, draw
#import "@preview/cetz:0.5.2"
#import "@preview/cetz-plot:0.1.4": chart
#set page(width: auto, height: auto, margin: 8pt)

#grid(
  columns: 2,
  column-gutter: 28pt,
  align: center + horizon,
  [
    #show math.equation: block.with(fill: white, inset: 1pt)
    #canvas(length: 3cm, {
      import draw: *
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
  ],
  [
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
  ],
)
```

## Alchemist

**化学结构式** —— 以「骨架式」（skeletal formula）为范式的有机化学绘图包：`cycle` 绘制并嵌套碳环（含稠环拼接）、单/双/三键沿链行走、`cram-*` 系列表达立体化学楔形键、`fragment` 插入原子团、`branch` 挂接取代基，还可跨片段指定化学键的着色与加粗来表达反应关系。指令式 API 贴近手写结构式的思路，适合有机化学教学材料与论文插图。

本页示例：稠环分子骨架（HO/NH/OH 取代基、红色双键与填充楔形立体键）；多片段间着色键连接的反应示意 → [官方页面](https://typst.app/universe/package/alchemist/)：

```typst
#import "@preview/alchemist:0.2.0": *
#set page(width: auto, height: auto, margin: 8pt)

#grid(
  columns: 2,
  column-gutter: 28pt,
  align: center + horizon,
  [
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
  ],
  [
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
  ],
)
```

## Lilaq

**科学统计图表** —— 面向科研出版的轴系绘图框架（官网 [lilaq.dev](https://lilaq.dev)）：以 `diagram` 为入口声明坐标系，内置刻度/子刻度、轴标题、旋转标签、图例定位与双 y 轴等出版级要素；折线/散点、柱状、函数曲线等序列类型可直接混排在同一张图中，样式高度可定制。适合实验数据成图与教学图表。

本页示例：柏林气候双轴图（月降水柱状 + 气温折线）；官方 quickstart 的数据点序列与余弦函数曲线复合图 → [官方页面](https://typst.app/universe/package/lilaq/)：

```typst
#import "@preview/lilaq:0.6.0" as lq
#set page(width: auto, height: auto, margin: 8pt)

#grid(
  columns: 2,
  column-gutter: 28pt,
  align: center + horizon,
  [
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
  ],
  [
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
  ],
)
```

## Fletcher

**节点—箭头图表** —— 数学与计算机科学领域的连线图专用包：在坐标网格上放置节点（内置 house / hexagon 等异形与圆角矩形），用 `edge` 声明折线路径、弯折角度、虚线样式、箭头端型与标签位置，自动处理正交路由与避让。交换图、有限状态机、神经网络架构图与流程图都是其典型场景。

本页示例：Transformer 编码器块架构图（多头注意力 / 前馈网络 / 归一化层）；文件读写状态机（自环与跨状态回边） → [官方页面](https://typst.app/universe/package/fletcher/)：

```typst
#import "@preview/fletcher:0.5.8" as fletcher: diagram, node, edge
#import fletcher.shapes: house, hexagon
#set page(width: auto, height: auto, margin: 8pt)

#grid(
  columns: 2,
  column-gutter: 28pt,
  align: center + horizon,
  [
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
  ],
  [
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
  ],
)
```

## Tiaoma

**条码生成** —— 直接输出印刷级条码的轻量工具包：按标准编码规则生成 EAN-8 / EAN-13 商品条码与 QR 矩阵码，纯矢量输出、任意缩放不失真。适合书籍封底、票据、名片等需要内嵌条码的排版场景。

本页示例：EAN-13 商品条码（含人读数字）；指向 typst.app 的 QR 码 → [官方页面](https://typst.app/universe/package/tiaoma/)：

```typst
#import "@preview/tiaoma:0.3.0"
#set page(width: auto, height: auto, margin: 8pt)

#grid(
  columns: 2,
  column-gutter: 28pt,
  align: center + horizon,
  [
    = tiáo mǎ

    #tiaoma.ean("1234567890128")
  ],
  [
    #tiaoma.qrcode("https://typst.app")
  ],
)
```

## Physica

**物理记号与时序图** —— 两块能力：其一是物理学排版记号体系——向量微积分算子（grad / div / curl / 拉普拉斯）、张量指标、偏导数简写、量子力学的狄拉克记号等，让公式书写贴近惯用的 physics 风格；其二是 `signals()` 时序波形图，以字符语言描述电平翻转即可绘制时钟、总线等数字信号波形。适合讲义、习题与硬件文档。

本页示例：时钟与总线信号的时序波形；旋度恒等式、张量记号与混合偏导数 → [官方页面](https://typst.app/universe/package/physica/)：

```typst
#import "@preview/physica:0.9.8": *
#set page(width: auto, height: auto, margin: 8pt)

#grid(
  columns: 2,
  column-gutter: 28pt,
  align: center + horizon,
  [
    $ "clk:" & signals("|1....|0....|1....|0....|1....|0....|1....|0..", step: #0.5em) \
      "bustyle:" & signals(" #.... X=... ..... ..... X=... ..... ..... X#.", step: #0.5em) $
  ],
  [
    $ curl (grad f), tensor(T, -mu, +nu), pdv(f, x, y, [1, 2]) $
  ],
)
```

## Zap

**电路原理图** —— 设计灵感来自 CircuiTikZ 的电路绘制包：内置电阻/电位器、电容、电源、熔断器、BJT 三极管、运放、接地等常用元器件符号，`wire` / `swire` / `zwire` 三种走线助手覆盖直连、正交绕行与命名节点中继，电压电流标签随元件声明一并标注。适合电工电子课程讲义与硬件文档中的原理图。

本页示例：电阻桥 + PNP 三极管 + 运放反馈网络的完整电路（含接地与等效电阻标注）；最小电阻支路演示 → [官方页面](https://typst.app/universe/package/zap/)：

```typst
#import "@preview/zap:0.6.0" as zap
#set page(width: auto, height: auto, margin: 8pt)

#grid(
  columns: 2,
  column-gutter: 28pt,
  align: center + horizon,
  [
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
  ],
  [
    #zap.circuit({
        import zap: *

        node("B", (0, 0))
        resistor("r1", "B", (rel: (0, 4)), i: $i_1$)
    })
  ],
)
```

## Atomic

**原子结构模型** —— 一行代码绘制 Bohr 行星模型图：给定质子数、质量数、元素符号即可生成带核标注的壳层电子结构图；电子排布既可用元组显式指定每层电子数，也可传入电子总数由包按壳层容量规则自动填充。适合化学 / 物理入门教材的原子插图。

本页示例：Cu-64 显式四层排布 (1, 8, 18, 2)；Fe-56 自动填充 26 个电子 → [官方页面](https://typst.app/universe/package/atomic/)：

```typst
#import "@preview/atomic:1.0.0": atom
#set page(width: auto, height: auto, margin: 8pt)

#grid(
  columns: 2,
  column-gutter: 28pt,
  align: center + horizon,
  atom(29, 64, "Cu", (1, 8, 18, 2)),
  atom(26, 56, "Fe", 26),
)
```

## Timeliney

**甘特图 / 项目时间线** —— 项目进度图表专用包：`headerline` 支持「年份 + 季度」这类两级分组表头，任务经 `taskgroup` / `task` 组织并可在进度条上直接标注负责人与完成度，`milestone` 以菱形里程碑加虚线引线标记关键节点，`show-grid` 打开背景网格辅助时间对齐；任务条的粗细、颜色与虚线样式完全可控。适合项目汇报与研究计划书。

本页示例：2023–2024 双年季度表头下研究 / 开发 / 市场三组任务，以及会议演示与应用商店上线两个里程碑 → [官方页面](https://typst.app/universe/package/timeliney/)：

```typst
#set page(width: 17cm, height: auto, margin: 5pt)
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
