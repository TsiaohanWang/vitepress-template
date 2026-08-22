import { icon } from '@mdit/plugin-icon'
import { defineConfig } from 'vitepress'
import type { DefaultTheme } from 'vitepress'
import navJson from '../nav.json'
import sidebarJson from '../sidebar.json'
import { inlineSvgRender } from './iconify'

const nav = navJson as DefaultTheme.NavItem[]
const sidebar = sidebarJson as Record<string, DefaultTheme.SidebarItem[]>

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

    // Extra custom containers, styled in theme/custom.css
    // (Obsidian-inspired accent colors + title icons).
    container: {
      customContainers: {
        note: 'Note',
        question: 'Question',
        example: 'Example',
        abstract: 'Abstract',
        bug: 'Bug',
      },
    },

    // Emoji-like inline icons: `::set:name::`, `=size`, `/color`.
    // Rendered to inline SVG at build time (SSR-friendly).
    config: (md) => {
      md.use(icon, { render: inlineSvgRender })
    },
  },

  // Enforce required frontmatter on content pages (everything except the
  // home layout): "title" and "keywords". Keywords are normalized to a
  // string[] so DocHeader always receives an array.
  transformPageData(pageData) {
    const fm = pageData.frontmatter
    if (fm.layout === 'home') return

    const problems: string[] = []
    if (!fm.title) problems.push('"title" is required')

    const keywords = Array.isArray(fm.keywords)
      ? fm.keywords
      : typeof fm.keywords === 'string' && fm.keywords.trim() !== ''
        ? fm.keywords.split(',').map((part) => part.trim()).filter(Boolean)
        : []
    if (keywords.length === 0) {
      problems.push('"keywords" is required (array or comma-separated)')
    } else {
      fm.keywords = keywords
    }

    if (problems.length > 0) {
      throw new Error(`[frontmatter] ${pageData.relativePath}: ${problems.join('; ')}`)
    }
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
