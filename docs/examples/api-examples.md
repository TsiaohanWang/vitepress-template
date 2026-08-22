---
title: Runtime API Examples
keywords:
  - Runtime API
  - VitePress
---

This page demonstrates the runtime APIs provided by VitePress.

The main use case of VitePress runtime APIs is customizing
the default theme or building custom themes.

```ts
import { useData } from 'vitepress'

const { theme, page, params } = useData()
```

## `useData()`

Returns the site, theme, and page data. See
[`useData`](https://vitepress.dev/reference/runtime-api#usedata) for details.

## `useRoute()`

```ts
import { useRoute } from 'vitepress'

const route = useRoute()
```

Returns the current route object.
