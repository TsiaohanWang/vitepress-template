import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/700.css'
import { h } from 'vue'
import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import ActivityCalendar from './components/ActivityCalendar.vue'
import AutoActivityCalendar from './components/AutoActivityCalendar.vue'
import DocHeader from './components/DocHeader.vue'
// Keep this import LAST so custom.css can win equal-specificity ties
// against the default theme's styles.
import './custom.css'

// 把自动活动日历的开关提升为一等 themeConfig 项（与内建配置同处一处，
// 客户端经 useData().theme 读取，见 AutoActivityCalendar.vue）。
// 本文件在 tsconfig 覆盖范围内，因此 config.mts 的字面量也获得该字段类型。
declare module 'vitepress' {
  namespace DefaultTheme {
    interface Config {
      /**
       * 非 home 内容页底部自动挂载本页提交日历（scope="page"）。
       * 默认开启；设为 false 后仅保留 Markdown 中显式的 <ActivityCalendar />。
       * 单页豁免：在该页 frontmatter 写 activityCalendar: false。
       */
      autoPageActivityCalendar?: boolean
    }
  }
}

export default {
  extends: DefaultTheme,

  Layout() {
    return h(DefaultTheme.Layout, null, {
      // Frontmatter-driven header above the document content (SSR-rendered).
      'doc-before': () => h(DocHeader),
      // 非 home 内容页底部自动挂载本页提交日历（取代 lastUpdated 的位置）：
      // 开关是 themeConfig.autoPageActivityCalendar（缺省开启），
      // 单页豁免用 frontmatter activityCalendar: false。
      'doc-footer-before': () => h(AutoActivityCalendar),
    })
  },

  enhanceApp({ app }) {
    // Globally registered so any page — home layout or regular content — can
    // drop in <ActivityCalendar /> without imports.
    app.component('ActivityCalendar', ActivityCalendar)
  },
} satisfies Theme
