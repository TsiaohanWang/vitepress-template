import { defineConfig } from 'vitepress'
import type { DefaultTheme } from 'vitepress'
import navJson from '../nav.json'
import sidebarJson from '../sidebar.json'

const nav = navJson as DefaultTheme.NavItem[]
const sidebar = sidebarJson as DefaultTheme.SidebarItem[]

// https://vitepress.dev/reference/site-config
export default defineConfig({
  // Content separation: config lives in `.vitepress/` (project root),
  // all Markdown content lives in `docs/`.
  srcDir: 'docs',

  // Site-level options
  title: 'My Awesome Project',
  description: 'A VitePress Site',
  cleanUrls: true,

  markdown: {
    // Requires the `markdown-it-mathjax3` peer dependency.
    // https://vitepress.dev/guide/markdown#math-equations
    math: true,
  },

  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav,
    sidebar,

    socialLinks: [
      { icon: 'github', link: 'https://github.com/vuejs/vitepress' },
    ],
  },
})
