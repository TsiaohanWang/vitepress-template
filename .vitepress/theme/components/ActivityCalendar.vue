<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
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

// Responsive strategy: cells keep their NATURAL size everywhere. When the
// container cannot fit all 53 week columns, the OLDEST columns are dropped
// from the left (the grid always shows the most recent weeks) instead of
// shrinking the cells or scrolling. Wide containers scale up to fill.
// SSR renders the full grid; the measurement below only ever trims after
// mount, so hydration stays deterministic.
const scrollEl = ref<HTMLElement | null>(null)
const innerWidth = ref(0)
let observer: ResizeObserver | undefined

onMounted(() => {
  if (!scrollEl.value) return
  observer = new ResizeObserver((entries) => {
    innerWidth.value = entries[0]?.contentRect.width ?? 0
  })
  observer.observe(scrollEl.value)
})

onUnmounted(() => observer?.disconnect())

const naturalWidth = LEFT + weeks.value.length * PITCH - GAP
const fillsContainer = computed(() => innerWidth.value === 0 || innerWidth.value >= naturalWidth)

/** Week columns kept after left-trimming (most recent N). */
const shownWeeks = computed<GridDay[][]>(() => {
  if (fillsContainer.value) return weeks.value
  const fit = Math.floor((innerWidth.value - LEFT + GAP) / PITCH)
  return weeks.value.slice(-Math.max(4, fit))
})

const width = computed(() => LEFT + shownWeeks.value.length * PITCH - GAP)
const height = TOP + 7 * PITCH - GAP
const gridCssWidth = computed(() => (fillsContainer.value ? '100%' : `${width.value}px`))

/** One label where a new month starts, skipping crowded neighbors. */
const monthLabels = computed(() => {
  const labels: Array<{ x: number; text: string }> = []
  shownWeeks.value.forEach((week, index) => {
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

const tip = reactive({ visible: false, x: 0, y: 0, flip: false, text: '' })

function showTip(event: MouseEvent, day: GridDay) {
  const host = (event.currentTarget as SVGRectElement).ownerSVGElement?.parentElement
  const svgRect = host?.getBoundingClientRect()
  if (!svgRect || !host) return
  const countText = day.count > 0 ? `${day.count} 次提交` : '没有提交'
  tip.text = `${countText} · ${formatTooltipDate(day.date)}`
  // The wrapper scrolls horizontally on narrow screens; the tooltip lives in
  // scrolled content coordinates, clamped to the VISIBLE window so the
  // overflow clip can never cut it off. Near the top edge it flips below
  // the cursor instead of clipping above.
  const rawX = event.clientX - svgRect.left + host.scrollLeft
  const rawY = event.clientY - svgRect.top + host.scrollTop
  // Tooltip width runs ~170px with a full date string; clamp with margin.
  const half = 90
  tip.x = Math.min(Math.max(rawX, host.scrollLeft + half), host.scrollLeft + host.clientWidth - half)
  tip.y = rawY
  tip.flip = rawY - 44 < host.scrollTop
  tip.visible = true
}

function hideTip() {
  tip.visible = false
}
</script>

<template>
  <div class="activity-calendar">
    <div ref="scrollEl" class="ac-scroll">
    <svg
      class="ac-grid"
      :style="{ width: gridCssWidth }"
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
      <template v-for="(week, wi) in shownWeeks" :key="week[0]?.date ?? `c${wi}`">
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
      :class="{ 'ac-tip-flip': tip.flip }"
      :style="{ left: `${tip.x}px`, top: `${tip.y}px` }"
    >
      {{ tip.text }}
    </div>
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
.ac-scroll {
  position: relative;
}

/* Cells keep their natural size; the svg fills wide containers and lets the
   column trimming handle narrow ones (see shownWeeks). */
.ac-grid {
  display: block;
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
}

.ac-tip-flip {
  transform: translate(-50%, 14px);
}

.ac-tip, .ac-tip-flip {
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
