import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'

export default {
  extends: DefaultTheme,

  enhanceApp() {
    // Extend the default theme here, e.g. register global components.
  },
} satisfies Theme
