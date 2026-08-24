import { icon } from '@mdit/plugin-icon'
import { defineConfig } from 'vitepress'
import type { DefaultTheme } from 'vitepress'
import navJson from '../nav.json' with { type: 'json' }
import sidebarJson from '../sidebar.json' with { type: 'json' }
import { normalizeKeywords } from './frontmatter.ts'
import { inlineSvgRender } from './iconify.ts'
import { mustacheGuard } from './markdown-guards.ts'
import { typstFencePlugin } from './typst.ts'

// Theme-adaptive Typst figures: ink follows the document text color and, in
// dark mode, whites follow the page background (see typst.ts + custom.css).
// Flip to false to emit the compiler's fixed black-on-white palette.
const typstThemeAdaptive = true

const nav = navJson as DefaultTheme.NavItem[]
const sidebar = sidebarJson as Record<string, DefaultTheme.SidebarItem[]>

// https://vitepress.dev/reference/site-config
export default defineConfig({
  // Content separation: config lives in `.vitepress/` (project root),
  // all Markdown content lives in `docs/`.
  srcDir: 'docs',

  // Site-level options
  lang: 'zh-CN',
  title: 'My Awesome Project',
  description: 'A VitePress Site',
  cleanUrls: true,

  // Git-based "last updated" timestamps.
  lastUpdated: true,

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

      // Compile ```typst fences to inline SVG at build time (typst.ts).
      md.use(typstFencePlugin, { themeAdaptive: typstThemeAdaptive })
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
    sidebarMenuLabel: '菜单',
    returnToTopLabel: '回到顶部',
    darkModeSwitchLabel: '外观',
    outline: { label: '本页内容', level: [2, 3] },
    docFooter: { prev: '上一页', next: '下一页' },
    lastUpdated: { text: '最后更新于' },

    // Local full-text search. The stock tokenizer splits on whitespace and
    // punctuation only, so Chinese phrases would be indexed as single giant
    // terms and never match partial queries; an Intl.Segmenter tokenizer
    // (word granularity) indexes CJK dictionary words instead while latin
    // and digit runs stay intact. The function MUST stay self-contained --
    // VitePress serializes it into the client payload without its scope.
    search: {
      provider: 'local',
      options: {
        miniSearch: {
          options: {
            // Keep word-like segments only (drops punctuation/whitespace
            // runs); term casing is normalized by MiniSearch's processTerm.
            tokenize: (text: string): string[] =>
              [
                ...new Intl.Segmenter('zh-CN', { granularity: 'word' }).segment(
                  text,
                ),
              ]
                .filter((part) => part.isWordLike)
                .map((part) => part.segment),
          },
        },
        translations: {
          button: { buttonText: '搜索文档', buttonAriaLabel: '搜索文档' },
          modal: {
            displayDetails: '查看详细列表',
            resetButtonTitle: '清除查询条件',
            backButtonTitle: '关闭',
            noResultsText: '没有找到相关结果',
            footer: { selectText: '选择', navigateText: '切换', closeText: '关闭' },
          },
        },
      },
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/vuejs/vitepress' },
    ],
  },
})
