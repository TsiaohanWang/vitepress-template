---
title: 运行时 API 与主题扩展
subtitle: useData / 插槽 / enhanceApp 在本模板中的实际用法
keywords:
  - Runtime API
  - 主题扩展
  - VitePress
---

本页演示 VitePress 运行时 API 与主题扩展点在本模板中的真实用法——所有示例都对应仓库中正在运行的代码，而非虚构片段。

## 数据流：frontmatter 如何变成页面头部

模板的文章头部（标题/副标题/作者/日期/关键词标签）由一条完整的构建期 + 运行时链路驱动：

```
md frontmatter
  → config.mts transformPageData     构建期：校验 title/keywords 并归一化
  → useData().frontmatter            运行时：页面数据注入组件
  → DocHeader（doc-before 插槽）      SSR 输出文章头部
```

## useData()

访问站点配置、主题配置、页面数据与 frontmatter：

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'
import { normalizeKeywords } from '../../frontmatter'

const { frontmatter } = useData()

// transformPageData 已把 keywords 归一化为 string[]；
// 这里再走一次同一实现，保证组件被单独复用时依然安全。
const keywords = computed(() => normalizeKeywords(frontmatter.value.keywords))
</script>
```

这正是 `.vitepress/theme/components/DocHeader.vue` 的真实实现节选。`useData()` 解构出的常用字段：

| 字段 | 内容 |
|---|---|
| `site` | 站点配置（title、lang、themeConfig 等） |
| `theme` | 主题配置（nav、sidebar、search 所在之处） |
| `page` | 当前页元信息（relativePath、lastUpdated 等） |
| `frontmatter` | 当前页 frontmatter（已过构建期校验/归一化） |

## 布局插槽：doc-before

默认主题在 `DefaultTheme.Layout` 上暴露了一组命名插槽（doc-before / doc-after / aside-* / nav-bar-* 等）。模板用 `doc-before` 把 DocHeader 挂到正文上方（`.vitepress/theme/index.ts`）：

```ts
import { h } from 'vue'
import DefaultTheme from 'vitepress/theme'

export default {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'doc-before': () => h(DocHeader),
    })
  },
}
```

需要页脚声明、侧边栏广告位等，按同样方式追加其他插槽即可；可用插槽清单见官方 [自定义主题](https://vitepress.dev/guide/custom-theme) 文档。

## enhanceApp()

用于注册全局组件、自定义指令或挂载插件的扩展点——本模板即用它把 `<ActivityCalendar>` 注册为全局组件（任意页面可直接使用，无需 import）：

```ts
// .vitepress/theme/index.ts
enhanceApp({ app }) {
  app.component('ActivityCalendar', ActivityCalendar)
},
```

SSR 兼容提醒：enhanceApp 在服务端也会执行，其中只能使用 SSR 安全的逻辑；浏览器专属代码应放在组件的 `onMounted` 或 `<ClientOnly>` 内。

## 路由操作：useRouter()

自定义组件中需要编程式跳转或拦截路由时：

```vue
<script setup lang="ts">
import { useRouter } from 'vitepress'

const router = useRouter()
// router.go('/guide/')   // SPA 内部跳转
// router.onBeforeRouteChange = (to) => { /* 拦截/埋点 */ }
</script>
```

## 下一步

- 完整源码：`.vitepress/theme/index.ts` 与 `theme/components/`（DocHeader / ActivityCalendar）
- 写作侧能力对应关系见[内置增强](/guide/enhancements)
