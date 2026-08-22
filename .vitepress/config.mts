import { icon } from '@mdit/plugin-icon'
import { defineConfig } from 'vitepress'
import type { DefaultTheme } from 'vitepress'
import navJson from '../nav.json' with { type: 'json' }
import sidebarJson from '../sidebar.json' with { type: 'json' }
import { normalizeKeywords } from './frontmatter.ts'
import { inlineSvgRender } from './iconify.ts'
import { mustacheGuard } from './markdown-guards.ts'

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

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
  ],

  markdown: {
    // Requires the `markdown-it-mathjax3` peer dependency.
    // https://vitepress.dev/guide/markdown#math-equations
    math: true,

    // Extra custom containers, styled in theme/custom.css
    // (Obsidian-inspired accent colors + title icons).
    // Default titles are unified to ALL CAPS across every type.
    container: {
      infoLabel: 'INFO',
      tipLabel: 'TIP',
      warningLabel: 'WARNING',
      dangerLabel: 'DANGER',
      detailsLabel: 'DETAILS',
      customContainers: {
        note: 'NOTE',
        question: 'QUESTION',
        example: 'EXAMPLE',
        abstract: 'ABSTRACT',
        bug: 'BUG',
      },
    },

    // Emoji-like inline icons: `::set:name::`, `=size`, `/color`.
    // Rendered to inline SVG at build time (SSR-friendly).
    config: (md) => {
      md.use(icon, { render: inlineSvgRender })

      // See markdown-guards.ts for details.
      md.use(mustacheGuard)
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

    const keywords = normalizeKeywords(fm.keywords)
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
    logo: { src: '/favicon.svg', alt: 'My Awesome Project' },
    nav,
    sidebar,

    // Chinese UI strings for the default theme chrome.
    // Outline levels stay at the default (h2-h3).
    outline: { label: '本页内容', level: [2, 3] },
    docFooter: { prev: '上一页', next: '下一页' },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/vuejs/vitepress' },
    ],
  },
})
