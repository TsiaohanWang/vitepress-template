import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
// Keep this import LAST so custom.css can win equal-specificity ties
// against the default theme's styles.
import './custom.css'

export default {
  extends: DefaultTheme,

  enhanceApp() {
    // Extend the default theme here, e.g. register global components.
  },
} satisfies Theme
