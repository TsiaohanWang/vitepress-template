import { execFileSync } from 'node:child_process'
import { icon } from '@mdit/plugin-icon'
import { defineConfig } from 'vitepress'
import type { DefaultTheme } from 'vitepress'
import navJson from '../nav.json' with { type: 'json' }
import sidebarJson from '../sidebar.json' with { type: 'json' }
import { normalizeKeywords } from './frontmatter.ts'
import { inlineSvgRender } from './iconify.ts'
import { mustacheGuard } from './markdown-guards.ts'
import { typstFencePlugin } from './typst.ts'

// ---------------------------------------------------------------------------
// Git activity for <ActivityCalendar /> (theme/components/ActivityCalendar.vue)
//
// `transformPageData` below attaches a per-page `__git` payload built from
// this data. Everything runs in Node at build/dev time only. Results are
// memoized with a short TTL so a build collects exactly once while a long
// dev session still picks up new commits within a minute.
// ---------------------------------------------------------------------------

interface GitActivityPayload {
  /** 371 calendar dates (YYYY-MM-DD), Sunday-aligned through build week. */
  dates: string[]
  /** Site-wide commit counts aligned with `dates`. */
  site: number[]
  /** Counts for this page aligned with `dates` (null = untouched page). */
  page: number[] | null
}

const GIT_DAY_MS = 86_400_000
const GIT_WEEKS = 53
const GIT_TTL_MS = 60_000

let gitCache: {
  at: number
  dates: string[]
  site: number[]
  pageByRel: Record<string, number[]>
} | null = null

function gitDates(dates: string): string[] {
  return dates.split('\n').filter(Boolean)
}

function collectGitActivity(relativePath: string): GitActivityPayload {
  if (gitCache && Date.now() - gitCache.at < GIT_TTL_MS) {
    return {
      dates: gitCache.dates,
      site: gitCache.site,
      page: gitCache.pageByRel[relativePath] ?? null,
    }
  }

  const today = new Date()
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  // Sunday-aligned start 52 weeks back; pad forward to Saturday so every
  // week column is complete (53 x 7 cells, like GitHub's graph).
  let start = new Date(end.getTime() - (GIT_WEEKS - 1) * 7 * GIT_DAY_MS)
  start = new Date(start.getTime() - start.getDay() * GIT_DAY_MS)
  const gridEnd = new Date(end.getTime() + (6 - end.getDay()) * GIT_DAY_MS)

  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const since = fmt(start)

  // Not a git checkout (tarball deploy, shallow clone, ...): degrade to an
  // all-zero calendar instead of failing the build.
  const safeLog = (args: string[]): string[] => {
    try {
      return gitDates(
        execFileSync('git', ['log', ...args, '--date=short', '--no-merges', `--since=${since}`], {
          encoding: 'utf8',
          maxBuffer: 64 * 1024 * 1024,
        }),
      )
    } catch {
      return []
    }
  }

  const siteCounts = new Map<string, number>()
  for (const date of safeLog(['--pretty=format:%cd'])) {
    siteCounts.set(date, (siteCounts.get(date) ?? 0) + 1)
  }

  const pageCounts = new Map<string, Map<string, number>>()
  let curDate: string | null = null
  for (const line of safeLog(['--name-only', '--pretty=format:%cd'])) {
    const trimmed = line.trim()
    if (!trimmed) {
      curDate = null
      continue
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      curDate = trimmed
      continue
    }
    if (!curDate || !trimmed.startsWith('docs/')) continue
    const rel = trimmed.slice('docs/'.length)
    let perDate = pageCounts.get(rel)
    if (!perDate) {
      perDate = new Map()
      pageCounts.set(rel, perDate)
    }
    perDate.set(curDate, (perDate.get(curDate) ?? 0) + 1)
  }

  const dates: string[] = []
  const site: number[] = []
  for (let t = start.getTime(); t <= gridEnd.getTime(); t += GIT_DAY_MS) {
    const date = fmt(new Date(t))
    dates.push(date)
    site.push(siteCounts.get(date) ?? 0)
  }

  const pageByRel: Record<string, number[]> = {}
  for (const [rel, perDate] of pageCounts) {
    const series = dates.map(date => perDate.get(date) ?? 0)
    // Skip untouched pages to keep every page payload small.
    if (series.some(n => n > 0)) pageByRel[rel] = series
  }

  gitCache = { at: Date.now(), dates, site, pageByRel }
  return { dates, site, page: pageByRel[relativePath] ?? null }
}

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

  // Attach this repository's git activity to every page payload so
  // <ActivityCalendar /> can read it client-side via useData() — no extra
  // files, no runtime fetch (see theme/components/ActivityCalendar.vue for
  // the consuming side). Collected once per process and re-used per page.
  transformPageData(pageData) {
    ;(pageData as { __git?: GitActivityPayload }).__git
      = collectGitActivity(pageData.relativePath)

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
