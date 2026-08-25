import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/700.css'
import { h } from 'vue'
import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import ActivityCalendar from './components/ActivityCalendar.vue'
import DocHeader from './components/DocHeader.vue'
// Keep this import LAST so custom.css can win equal-specificity ties
// against the default theme's styles.
import './custom.css'

export default {
  extends: DefaultTheme,

  Layout() {
    return h(DefaultTheme.Layout, null, {
      // Frontmatter-driven header above the document content (SSR-rendered).
      'doc-before': () => h(DocHeader),
    })
  },

  enhanceApp({ app }) {
    // Globally registered so any page — home layout or regular content — can
    // drop in <ActivityCalendar /> without imports.
    app.component('ActivityCalendar', ActivityCalendar)
  },
} satisfies Theme
