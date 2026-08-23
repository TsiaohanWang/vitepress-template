---
layout: home

hero:
  name: "My Awesome Project"
  text: "A VitePress Site"
  tagline: My great project tagline
  actions:
    - theme: brand
      text: 模板指南
      link: /guide/
    - theme: alt
      text: Markdown Examples
      link: /examples/markdown-examples

features:
  - title: 配置与内容分离
    details: 所有 VitePress 配置集中在 .vitepress/，正文只保留纯 Markdown（docs/），二者互不干扰。
  - title: 全程 TypeScript
    details: .mts 配置 + .ts 主题代码，配备 tsc --noEmit 类型检查与 vitepress/client 类型支持。
  - title: 构建时数学公式
    details: 官方 markdown.math 方案（markdown-it-mathjax3），公式在构建时渲染为静态 HTML，无运行时依赖。
  - title: Iconify 图标语法
    details: "emoji 风格 ::set:name:: 写法，构建时内联 SVG 嵌入段落，随字号缩放并支持尺寸/颜色修饰。"
  - title: 主题化自定义容器
    details: "内置与扩展共 10 种容器，Obsidian 风格主题色 + gravity-ui 标题图标；行内代码与链接颜色跟随正文。"
  - title: Typst 科学图表
    details: "```typst 围栏构建期编译为内联 SVG——CeTZ、Alchemist、Lilaq、Fletcher、Tiaoma 实测可用，失败不中断构建。"
---
