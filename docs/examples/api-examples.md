---
title: Runtime API 示例
subtitle: 在正文与主题中使用 VitePress 提供的运行时 API
keywords:
  - Runtime API
  - VitePress
---

本页演示 VitePress 运行时 API 的基本用法。这类 API 主要用于自定义默认主题或开发自定义主题；本站的 DocHeader 文章头部组件正是基于它们实现的。

## useData()

访问站点配置、页面 frontmatter 与主题数据：

**输入**

```vue
<script setup>
import { useData } from 'vitepress'

// 本页头部展示的标题与关键词即来自 frontmatter
const { theme, page, frontmatter } = useData()
</script>
```

**说明**

- `frontmatter.title` / `keywords` 由本页头部组件（DocHeader）消费
- `page.headers` 在未启用 `markdown.headers` 时为空数组，属正常现象

## useRoute()

访问当前路由信息：

**输入**

```vue
<script setup>
import { useRoute } from 'vitepress'

const route = useRoute()
</script>
```

详见 [Runtime API Reference](https://vitepress.dev/reference/runtime-api)。
