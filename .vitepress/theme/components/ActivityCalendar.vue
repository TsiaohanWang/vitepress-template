<script setup lang="ts">
import { computed, reactive } from 'vue'
import { useData } from 'vitepress'

/**
 * GitHub-style activity calendar backed by this repository's git history.
 *
 * - `scope="site"` (default): commits across the whole repository.
 * - `scope="page"`: only commits that touched the current Markdown file.
 *
 * The build attaches per-page git data (`__git`, collected in config.mts'
 * transformPageData) to every page payload; this file is a single, purely
 * presentational component reading it through useData(). Colors derive from
 * the site brand token, so light/dark and theme changes apply automatically.
 */

const props = withDefaults(defineProps<{
  scope?: 'site' | 'page'
}>(), { scope: 'site' })

const { page } = useData()

interface GridDay {
  date: string
  count: number
  /** 0 (empty) … 4 (busiest), quartiles over non-zero days. */
  level: 0 | 1 | 2 | 3 | 4
}

interface GitActivityPayload {
  /** 371 calendar dates (YYYY-MM-DD), Sunday-aligned through build week. */
  dates: string[]
  /** Site-wide commit counts aligned with `dates`. */
  site: number[]
  /** Counts for the current page (null = untouched page). */
  page: number[] | null
}

const git = computed<GitActivityPayload | null>(
  () => (page.value as { __git?: GitActivityPayload }).__git ?? null,
)

const CELL = 11
const GAP = 3
const PITCH = CELL + GAP
const RADIUS = 2
/** Left gutter for weekday labels / top gutter for month labels. */
const LEFT = 30
const TOP = 18

const MONTH_LABELS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
const WEEKDAY_ROWS: Array<{ row: number; label: string }> = [
  { row: 1, label: '一' },
  { row: 3, label: '三' },
  { row: 5, label: '五' },
]

function parseISO(date: string): Date {
  const [y = 0, m = 1, d = 1] = date.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function monthOf(date: string): string {
  return MONTH_LABELS[parseISO(date).getMonth()] ?? ''
}

function formatTooltipDate(date: string): string {
  const d = parseISO(date)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

const days = computed<GridDay[]>(() => {
  const payload = git.value
  if (!payload) return []

  const series = props.scope === 'page' ? payload.page : payload.site
  const source: GridDay[] = payload.dates.map((date, i) => ({
    date,
    count: series?.[i] ?? 0,
    level: 0,
  }))

  const nonZero = source.filter(d => d.count > 0).map(d => d.count)
  const max = nonZero.length > 0 ? Math.max(...nonZero) : 0
  const step = Math.max(1, Math.ceil(max / 4))
  return source.map(d => ({
    ...d,
    level: d.count === 0 ? 0 : (Math.min(4, Math.ceil(d.count / step)) as GridDay['level']),
  }))
})

/** Columns of exactly 7 rows; the loader guarantees Sunday alignment. */
const weeks = computed<GridDay[][]>(() => {
  const out: GridDay[][] = []
  for (let i = 0; i < days.value.length; i += 7) {
    out.push(days.value.slice(i, i + 7))
  }
  return out
})

const width = LEFT + weeks.value.length * PITCH - GAP
const height = TOP + 7 * PITCH - GAP

/** One label where a new month starts, skipping crowded neighbors. */
const monthLabels = computed(() => {
  const labels: Array<{ x: number; text: string }> = []
  weeks.value.forEach((week, index) => {
    const first = week[0]
    if (!first) return
    const text = monthOf(first.date)
    const prev = labels[labels.length - 1]
    if (!prev || prev.text !== text) {
      labels.push({ x: index, text })
    }
  })
  return labels.filter((label, index) =>
    index === 0 ? labels[1] != null && labels[1].x - label.x >= 2 : true,
  )
})

const tip = reactive({ visible: false, x: 0, y: 0, text: '' })

function showTip(event: MouseEvent, day: GridDay) {
  const host = (event.currentTarget as SVGRectElement).ownerSVGElement?.parentElement
  const svgRect = host?.getBoundingClientRect()
  if (!svgRect) return
  const countText = day.count > 0 ? `${day.count} 次提交` : '没有提交'
  tip.text = `${countText} · ${formatTooltipDate(day.date)}`
  tip.x = event.clientX - svgRect.left
  tip.y = event.clientY - svgRect.top
  tip.visible = true
}

function hideTip() {
  tip.visible = false
}
</script>

<template>
  <div class="activity-calendar">
    <svg
      class="ac-grid"
      :viewBox="`0 0 ${width} ${height}`"
      role="img"
      aria-label="项目提交活动热力图"
    >
      <!-- Month labels -->
      <text
        v-for="label in monthLabels"
        :key="`m${label.x}`"
        class="ac-text"
        :x="LEFT + label.x * PITCH"
        :y="11"
      >
        {{ label.text }}
      </text>

      <!-- Weekday labels -->
      <text
        v-for="{ row, label } in WEEKDAY_ROWS"
        :key="`w${row}`"
        class="ac-text"
        text-anchor="end"
        :x="LEFT - GAP"
        :y="TOP + row * PITCH + CELL - 2"
      >
        {{ label }}
      </text>

      <!-- Cells -->
      <template v-for="(week, wi) in weeks" :key="`c${wi}`">
        <rect
          v-for="(day, di) in week"
          :key="day.date"
          class="ac-cell"
          :class="`ac-level-${day.level}`"
          :x="LEFT + wi * PITCH"
          :y="TOP + di * PITCH"
          :width="CELL"
          :height="CELL"
          :rx="RADIUS"
          :ry="RADIUS"
          :aria-label="`${day.count} 次提交 · ${formatTooltipDate(day.date)}`"
          @mouseenter="showTip($event, day)"
          @mousemove="showTip($event, day)"
          @mouseleave="hideTip"
        />
      </template>
    </svg>
    <div
      v-show="tip.visible"
      class="ac-tip"
      :style="{ left: `${tip.x}px`, top: `${tip.y}px` }"
    >
      {{ tip.text }}
    </div>
  </div>
</template>

<style scoped>
.activity-calendar {
  position: relative;
  /* Keep clearance from surrounding blocks: on the home layout the markdown
     body follows the features grid with no intrinsic gap. */
  margin-top: 24px;
  padding: 16px;
  border-radius: 12px;
  background-color: var(--vp-c-bg-soft);
}

/* Scale the whole grid to the container width; the viewBox keeps the
   aspect ratio so cells stay square at any size. */
.ac-grid {
  display: block;
  width: 100%;
  height: auto;
}

.ac-text {
  font-size: 10px;
  fill: var(--vp-c-text-3);
}

.ac-cell {
  /* Page-background cells stay visible against the soft container box. */
  fill: var(--vp-c-bg);
}

/* Intensity ramp derived from the site brand color; mixing with the page
   background keeps cells opaque and lets theme tokens drive dark mode. */
.ac-level-1 { fill: color-mix(in srgb, var(--vp-c-brand-1) 30%, var(--vp-c-bg)); }
.ac-level-2 { fill: color-mix(in srgb, var(--vp-c-brand-1) 55%, var(--vp-c-bg)); }
.ac-level-3 { fill: color-mix(in srgb, var(--vp-c-brand-1) 80%, var(--vp-c-bg)); }
.ac-level-4 { fill: var(--vp-c-brand-1); }

.ac-cell:hover {
  stroke: var(--vp-c-text-2);
  stroke-width: 1;
}

.ac-tip {
  position: absolute;
  transform: translate(-50%, calc(-100% - 8px));
  padding: 5px 10px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background-color: var(--vp-c-bg-elv);
  box-shadow: var(--vp-shadow-2);
  font-size: 12px;
  line-height: 1.4;
  white-space: nowrap;
  color: var(--vp-c-text-1);
  pointer-events: none;
  z-index: 10;
}
</style>
