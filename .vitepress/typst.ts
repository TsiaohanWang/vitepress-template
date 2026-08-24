// Build-time Typst renderer: compiles ```typst fences into self-contained
// inline SVG via @myriaddreamin/typst-ts-node-compiler (native addon).
// Everything runs during markdown rendering -- SSR-safe by construction,
// zero client JS.
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import type MarkdownIt from 'markdown-it'

type TypstCompiler = import('@myriaddreamin/typst-ts-node-compiler').NodeCompiler

// The native addon resolves its platform binary through require(), so it
// must NOT be bundled -- load it through a runtime require instead.
// NOTE: the helper is deliberately NOT named `require`: esbuild rewrites
// literal require() calls in the bundled config and its interop shim breaks
// native addon modules.
const nodeRequire = createRequire(import.meta.url)

type TypstCompilerModule = typeof import('@myriaddreamin/typst-ts-node-compiler')

let compiler: TypstCompiler | undefined

function getCompiler(): TypstCompiler {
  // Instantiate through the documented static factory -- the napi-exported
  // class itself cannot be `new`ed from JS.
  compiler ??= (
    nodeRequire('@myriaddreamin/typst-ts-node-compiler') as TypstCompilerModule
  ).NodeCompiler.create()
  return compiler
}

const cacheDir = path.resolve(import.meta.dirname, 'cache', 'typst-svg')

function readCache(hash: string): string | undefined {
  try {
    return fs.readFileSync(path.join(cacheDir, hash + '.svg'), 'utf8')
  } catch {
    return undefined
  }
}

function writeCache(hash: string, svg: string): void {
  try {
    fs.mkdirSync(cacheDir, { recursive: true })
    fs.writeFileSync(path.join(cacheDir, hash + '.svg'), svg)
  } catch {
    // Cache failures are non-fatal.
  }
}

export interface TypstRenderResult {
  svg?: string
  error?: string
}

// ---------------------------------------------------------------------------
// Theme adaptation (smart mapping)
//
// The compiler emits a fixed palette: opaque white page/fills, black ink,
// grays and chromatic accents. Inline SVG participates in the page cascade,
// so instead of baking one palette we remap colors into theme-aware roles
// (mermaid's dark-theme philosophy: darken surfaces, lift lines):
//
//   near-white opaque   -> light-dark(hex, var(--vp-c-bg))
//   translucent whites  -> light-dark(hex, color-mix(bg, N%))
//   black ink           -> currentColor            follows document text color
//   bright chips L>=.62 -> lightness x~0.3         readable under light ink
//   dark lines  L<=.26  -> lifted to L=.58         visible on dark background
//   mid tones / grays   -> untouched               legible on both themes
//
// var() cannot appear in presentation attributes, and <style> tags are hard
// compile errors in markdown (client Vue templates reject side-effect tags),
// so theme switching rides on INLINE light-dark() values: each adapted paint
// becomes style="fill:light-dark(light, dark)" resolved against the
// color-scheme declared for figures in custom.css.
//
// Interior opaque whites get one refinement via paint-order pairing: a
// near-white surface immediately followed by ink acts as a text/equation
// BACKDROP and co-adapts with it; an isolated white mark (label on colored
// chip) keeps its literal color.
//// Embedded vector <image>s (Tiaoma/zint barcodes emit base64 inner SVGs that
// are isolated from page CSS -- currentColor cannot reach them) are unfolded
// into inline markup first, so every technique above applies to them too.
//
// This supersedes an svg-colorizer-based pass kept earlier in development:
// experiments against real compiler output showed its server-side matcher
// covers attribute colors only -- style-property forms and embedded payloads
// escape it, and role-aware theming needs classification it does not offer.
// Runs AFTER cache lookup: cache stores raw compiler output, therefore
// toggling `themeAdaptive` never requires cache invalidation.
// ---------------------------------------------------------------------------

interface Hsl {
  h: number
  s: number
  l: number
  a: number | undefined
}

function hexToHsl(hex: string): Hsl {
  let value = hex.slice(1)
  if (value.length <= 4) {
    value = [...value].map((c) => c + c).join('')
  }
  const r = parseInt(value.slice(0, 2), 16) / 255
  const g = parseInt(value.slice(2, 4), 16) / 255
  const b = parseInt(value.slice(4, 6), 16) / 255
  const a = value.length >= 8 ? parseInt(value.slice(6, 8), 16) / 255 : undefined
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min
  let h = 0
  let s = 0
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1))
    switch (max) {
      case r:
        h = ((g - b) / d) % 6
        break
      case g:
        h = (b - r) / d + 2
        break
      default:
        h = (r - g) / d + 4
    }
    h *= 60
    if (h < 0) h += 360
  }
  return { h, s, l, a }
}

function hslToHex({ h, s, l }: Hsl): string {
  const k = (n: number): number => (n + h / 30) % 12
  const channel = (n: number): number =>
    l - l * s * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  const to255 = (v: number): string =>
    Math.round(v * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${to255(channel(0))}${to255(channel(8))}${to255(channel(4))}`
}

// Decode base64 vector payloads embedded via <image> and splice them in as
// nested inline <svg> markup so page-level theming reaches them. Geometry /
// positioning attributes move onto the decoded root (its own duplicates are
// dropped first).
function unfoldEmbeddedSvgImages(svg: string): string {
  return svg.replace(
    /<image\b([^>]*?)\/?>(?:<\/image>)?/g,
    (match, rawAttrs: string) => {
      const payload =
        /(?:xlink:href|href)="data:image\/svg\+xml;base64,([^"]+)"/.exec(rawAttrs)
      if (!payload?.[1]) return match

      let inner = Buffer.from(payload[1], 'base64').toString('utf8')
      inner = inner
        .replace(/<\?xml[\s\S]*?\?>/g, '')
        .replace(/<!DOCTYPE[^>]*>/g, '')
        .trim()

      // Merge geometry: image attributes win, inner-root attributes (e.g.
      // intrinsic width/height/viewBox) survive where the image has none --
      // dropping them would collapse the figure's intrinsic size.
      inner = inner.replace(/^<svg\b([^>]*)>/, (_m, innerAttrs: string) => {
        const merged = new Map<string, string>()
        for (const [, k, v] of innerAttrs.matchAll(/\s([a-zA-Z:-]+)="([^"]*)"/g)) {
          merged.set(k!, v!)
        }
        for (const [, k, v] of rawAttrs.matchAll(
          /\s(x|y|width|height|preserveAspectRatio|transform)="([^"]*)"/g,
        )) {
          merged.set(k!, v!)
        }
        return `<svg ${[...merged].map(([k, v]) => `${k}="${v}"`).join(' ')}>`
      })
      return inner
    },
  )
}

const INK_SWAPS: ReadonlyArray<readonly [string, string]> = [
  ['fill="#000000"', 'fill="currentColor"'],
  ['stroke="#000000"', 'stroke="currentColor"'],
  ['fill:#000000', 'fill:currentColor'],
  ['stroke:#000000', 'stroke:currentColor'],
]

const COLOR_ATTR_RE = /\b(fill|stroke|stop-color)="(#[0-9a-fA-F]{3,8})"/g
const COLOR_STYLE_RE = /\b(fill|stroke|stop-color)(\s*:\s*)(#[0-9a-fA-F]{3,8})/gi

function isNearWhite(hex: string): boolean {
  const { s, l } = hexToHsl(hex)
  return s < 0.08 && l >= 0.93
}

// Dark-mode counterpart for one color. `allowPaper` is false for paints that
// sit INSIDE the figure: an explicit opaque white there is intentional design
// (white labels on colored chips, masked equation panels) and must survive
// both themes untouched; only translucent whites still follow the background.
// `allowPaper` is true solely for the full-bleed page-background path.
function darkCounterpart(hex: string, allowPaper: boolean): string | undefined {
  const { h, s, l, a } = hexToHsl(hex)

  if (a !== undefined && a < 1) {
    // Translucent near-whites follow the background, keeping opacity.
    if (l >= 0.9 && s < 0.08) {
      return `color-mix(in srgb, var(--vp-c-bg) ${Math.round(a * 100)}%, transparent)`
    }
    return undefined
  }

  if (s < 0.08) {
    // Neutrals: only the page canvas adapts; mid grays read fine on both.
    if (allowPaper && l >= 0.93) return 'var(--vp-c-bg)'
    return undefined
  }

  if (s >= 0.15 && l >= 0.62) {
    // Bright chip surfaces (Fletcher node tints, pale highlights): darken
    // along the same hue so light ink stays readable in dark mode.
    return hslToHex({ h, s, l: Math.min(0.3, Math.max(0.13, l * 0.3)), a: undefined })
  }
  if (s >= 0.15 && l <= 0.26) {
    // Very dark chromatic strokes disappear on dark backgrounds: lift them.
    return hslToHex({ h, s, l: 0.58, a: undefined })
  }
  return undefined
}

// One color -> inline `light-dark()` value, or undefined to keep as-is.
// light-dark() resolves against the used color-scheme (declared per figure
// in custom.css), so a single static attribute serves both themes with zero
// injected stylesheets and zero client JS. Same browser tier as the
// color-mix() already used by the theme.
function adaptValue(hex: string, allowPaper: boolean): string | undefined {
  const counterpart = darkCounterpart(hex, allowPaper)
  if (!counterpart) return undefined
  return `light-dark(${hex.toLowerCase()}, ${counterpart})`
}

// Rewrite every paint-bearing tag in one pass so multiple properties on the
// same element merge into ONE style attribute (duplicated style attributes
// would be invalid HTML). Interior opaque whites are preserved by design --
// only the page canvas carries the paper role (see applySvgTheme).
function adaptTag(tag: string): string {
  let added = ''
  let out = tag.replace(COLOR_ATTR_RE, (_m, prop: string, hex: string) => {
    const value = adaptValue(hex, false)
    if (!value) return _m
    added += `${prop}:${value};`
    return ''
  })
  out = out.replace(COLOR_STYLE_RE, (m, prop: string, sep: string, hex: string) => {
    const value = adaptValue(hex, false)
    return value ? `${prop}${sep}${value}` : m
  })
  if (!added) return out
  const cleaned = out.replace(/(\s+)\s+/g, '$1')
  const existing = /\sstyle="([^"]*)"/.exec(cleaned)
  if (existing?.[1] !== undefined) {
    return cleaned.replace(/\sstyle="[^"]*"/, ` style="${existing[1]}${added}"`)
  }
  const open = cleaned.endsWith('/>') ? -2 : -1
  return `${cleaned.slice(0, open)} style="${added}"${cleaned.slice(open)}`
}

export function applySvgTheme(input: string): string {
  // 1) Embedded vector images first: their colors must join the pipeline.
  let svg = unfoldEmbeddedSvgImages(input)

  // 2) Structural canvas detection: typst always paints the page as the very
  //    first full-bleed path ("M 0 0v ... Z"). A NON-near-white canvas means
  //    the author designed for a dark/tinted surface -- remapping ink or
  //    chips would destroy that design, so the figure passes through as-is.
  //    (Purely structural + luminance-based; no hardcoded colors.)
  const bgMatch = /<path\b[^>]*\bclass="typst-shape"[^>]*\bfill="(#[0-9a-fA-F]{3,8})"[^>]*\bd="M 0 0v /.exec(
    svg,
  )
  if (bgMatch?.[1] && !isNearWhite(bgMatch[1])) return svg

  // 3) Ink: currentColor is a CSS-wide keyword, valid both in presentation
  //    attributes and style declarations.
  for (const [from, to] of INK_SWAPS) svg = svg.replaceAll(from, to)

  // 4) The canvas path itself gets the paper role (near-white -> follows
  //    --vp-c-bg); it is rewritten ahead of the generic pass, which then
  //    treats remaining opaque whites as intentional interior design.
  svg = svg.replace(
    /<path\b([^>]*\bclass="typst-shape"[^>]*?)\bfill="(#[0-9a-fA-F]{3,8})"/,
    (_m, attrs: string, hex: string) => {
      if (!isNearWhite(hex)) return _m
      return `<path${attrs}style="fill:${adaptValue(hex, true)};"`
    },
  )

  // 5) Backed-white pairing (paint-order + element-kind semantics): an
  //    opaque near-white SHAPE immediately followed by text/ink elements
  //    acts as a text/equation BACKDROP and must follow the background too
  //    -- otherwise dark mode yields light ink on a glaring white panel.
  //    The ink may be currentColor (black source) OR chromatic (`text(red)`
  //    equations): both read on the adapted surface. A white that is never
  //    followed by ink is a deliberate mark (white label on colored chip)
  //    and stays literal -- note only SHAPES become backdrop candidates,
  //    white text glyphs never do. Scan the tag stream, hold each candidate
  //    as pending until the next painted element resolves it.
  const tags = [...svg.matchAll(/<[a-zA-Z!/][^>]*>/g)]
  const confirmed: Array<{ start: number; end: number; hex: string }> = []
  let pending: { start: number; end: number; hex: string } | undefined
  let pairGradDepth = 0
  for (const m of tags) {
    const tag = m[0]
    if (tag.startsWith('</')) {
      if (/gradient>$/i.test(tag) && pairGradDepth > 0) pairGradDepth--
      continue
    }
    if (/<(linear|radial)Gradient\b/.test(tag)) {
      pairGradDepth++
      continue
    }
    if (pairGradDepth > 0) continue // stops live outside role semantics

    const cls = /class="([^"]*)"/.exec(tag)?.[1] ?? ''
    const isShape = cls.includes('typst-shape')
    const whiteFill = /(^|\s)fill="(#[0-9a-fA-F]{3,8})"/.exec(tag)
    const anyPaint = /\b(?:fill|stroke|stop-color)="(#[0-9a-fA-F]{3,8})"/.exec(tag)

    if (
      isShape &&
      whiteFill?.[2] &&
      whiteFill[2].length <= 7 &&
      isNearWhite(whiteFill[2])
    ) {
      // A new near-white surface supersedes an unresolved pending one.
      pending = { start: m.index!, end: m.index! + tag.length, hex: whiteFill[2] }
      continue
    }

    const painted = tag.includes('currentColor') || !!anyPaint?.[1]
    if (!painted) continue // groups / geometry without paints keep context
    if (pending && !isShape) {
      // Ink or a referenced-glyph run (<use> carries no class) painted over
      // the held surface -> backdrop confirmed. The ink may be currentColor
      // (black source) OR chromatic (`text(red)` equations): both read on
      // the adapted surface.
      confirmed.push(pending)
      pending = undefined
      continue
    }
    // A painted SHAPE layer above the held white starts a different design
    // region -> the white was a deliberate mark, not a backdrop.
    pending = undefined
  }

// Rewrite confirmed backdrops from their end positions backwards so earlier
// offsets stay valid.
for (const { start, end, hex } of confirmed.reverse()) {
  const segment = svg.slice(start, end)
  const rewritten = segment.replace(
    new RegExp(`(\\s)fill="${hex}"`),
    `$1style="fill:${adaptValue(hex, true)};"`,
  )
  svg = svg.slice(0, start) + rewritten + svg.slice(end)
}

// ---------------------------------------------------------------------------
// Geometry pass: ink pinned over PRESERVED literal whites.
//
// Backdrops whose ink was too far away in paint order to be caught by the
// pairing scan stay literal (e.g. chart legends drawn early, labels much
// later). A preserved white surface forces DARK ink -- letting such ink
// follow currentColor would brighten it into an unreadable smear on the
// untouched white panel. Every currentColor-painted element whose center
// lies inside a preserved surface's bounding box is therefore reverted to
// the original black. Mid-tone surfaces (gradients) tolerate both ink
// polarities, so their covering text intentionally keeps adapting.
// ---------------------------------------------------------------------------

interface Box {
  x0: number
  y0: number
  x1: number
  y1: number
}

function pathBBox(d: string): Box | undefined {
  const tokens = d.match(/[MmLlHhVvCcSsQqTtAaZz]|-?(?:\d*\.\d+|\d+)(?:[eE][+-]?\d+)?/g)
  if (!tokens || tokens.length === 0) return undefined
  const arity: Record<string, number> = {
    M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7,
    m: 2, l: 2, h: 1, v: 1, c: 6, s: 4, q: 4, t: 2, a: 7,
  }
  let cx = 0
  let cy = 0
  let sx = 0
  let sy = 0
  let i = 0
  let cmd = ''
  let done = false
  const xs: number[] = []
  const ys: number[] = []
  while (i < tokens.length && !done) {
    const tok = tokens[i]!
    if (/^[A-Za-z]$/.test(tok)) {
      cmd = tok
      i++
      if (cmd === 'Z' || cmd === 'z') {
        cx = sx
        cy = sy
        continue
      }
    }
    const n = arity[cmd]
    if (!n) break
    const args: number[] = []
    for (let a = 0; a < n; a++) {
      const v = tokens[i]
      if (v === undefined || /^[A-Za-z]$/.test(v)) break
      args.push(parseFloat(v))
      i++
    }
    if (args.length < n) break
    const rel = cmd >= 'a' && cmd <= 'z'
    switch (cmd.toLowerCase()) {
      case 'm':
      case 'l': {
        const x = rel ? cx + args[0]! : args[0]!
        const y = rel ? cy + args[1]! : args[1]!
        cx = x
        cy = y
        if (cmd === 'm') {
          sx = x
          sy = y
        }
        break
      }
      case 'h':
        cx = rel ? cx + args[0]! : args[0]!
        break
      case 'v':
        cy = rel ? cy + args[0]! : args[0]!
        break
      case 'c':
      case 's':
      case 'q':
      case 't':
        cx += rel ? args[args.length - 2]! : 0
        cy += rel ? args[args.length - 1]! : 0
        if (!rel) {
          cx = args[args.length - 2]!
          cy = args[args.length - 1]!
        }
        break
      case 'a':
        cx += rel ? args[args.length - 2]! : 0
        cy += rel ? args[args.length - 1]! : 0
        if (!rel) {
          cx = args[args.length - 2]!
          cy = args[args.length - 1]!
        }
        break
    }
    if (Number.isFinite(cx) && Number.isFinite(cy)) {
      xs.push(cx)
      ys.push(cy)
    }
  }
  if (xs.length === 0) return undefined
  return {
    x0: Math.min(...xs),
    y0: Math.min(...ys),
    x1: Math.max(...xs),
    y1: Math.max(...ys),
  }
}

const PINNED_BLACK = '#000000'

function pinInkOverLiteralWhites(svg: string): string {
  const vb = /viewBox="([\d.eE+-]+) ([\d.eE+-]+) ([\d.eE+-]+) ([\d.eE+-]+)"/.exec(svg)
  const minArea = vb
    ? 0.002 * parseFloat(vb[3]!) * parseFloat(vb[4]!)
    : 0 // noise floor: specks/markers never become pinning zones

  const surfaces: Box[] = []
  const inkSpans: Array<{ start: number; end: number }> = []

  const tagRe = /<[a-zA-Z!/][^>]*>/g
  for (const m of svg.matchAll(tagRe)) {
    const tag = m[0]
    if (tag.startsWith('</')) continue

    const cls = /class="([^"]*)"/.exec(tag)?.[1] ?? ''
    const fillMatch = /\bfill="(#[0-9a-fA-F]{3,8})"/.exec(tag)
    const dMatch = /\bd="([^"]+)"/.exec(tag)

    // Preserved literal near-white OPAQUE shape -> protected surface.
    // Translucent whites are excluded: they adapt via color-mix alongside
    // their covering ink, so nothing may be pinned against them.
    if (
      cls.includes('typst-shape') &&
      fillMatch?.[1] &&
      fillMatch[1].length <= 7 &&
      isNearWhite(fillMatch[1]) &&
      dMatch?.[1]
    ) {
      const box = pathBBox(dMatch[1])
      if (box && (box.x1 - box.x0) * (box.y1 - box.y0) >= minArea) surfaces.push(box)
    }

    // Ink candidates: any element carrying currentColor paints.
    if (tag.includes('currentColor') && m.index !== undefined) {
      const d = dMatch?.[1]
      const usePos = /\bx="([\d.eE+-]+)".*?\by="([\d.eE+-]+)"/.exec(tag)
      let box: Box | undefined
      if (d) box = pathBBox(d)
      else if (usePos) {
        const ux = parseFloat(usePos[1]!)
        const uy = parseFloat(usePos[2]!)
        box = { x0: ux, y0: uy, x1: ux + 1, y1: uy + 1 }
      }
      if (box && surfaces.some((s) => {
        const mx = (box!.x0 + box!.x1) / 2
        const my = (box!.y0 + box!.y1) / 2
        return mx >= s.x0 && mx <= s.x1 && my >= s.y0 && my <= s.y1
      })) {
        inkSpans.push({ start: m.index, end: m.index + tag.length })
      }
    }
  }

  // Revert from the end backwards so earlier offsets stay valid.
  for (const span of inkSpans.reverse()) {
    const seg = svg.slice(span.start, span.end)
    const reverted = seg
      .replaceAll('fill="currentColor"', `fill="${PINNED_BLACK}"`)
      .replaceAll('stroke="currentColor"', `stroke="${PINNED_BLACK}"`)
      .replaceAll('fill:currentColor', `fill:${PINNED_BLACK}`)
      .replaceAll('stroke:currentColor', `stroke:${PINNED_BLACK}`)
    svg = svg.slice(0, span.start) + reverted + svg.slice(span.end)
  }
  return svg
}

  // 6) Geometry pass: pin ink over preserved literal whites (see the long
  //    comment above `pinInkOverLiteralWhites`).
  svg = pinInkOverLiteralWhites(svg)

  // 7) Theme-aware paints become inline light-dark() values. Element-wise
  //    rewriting avoids <style>/<script>-style tags entirely -- markdown
  //    content is compiled as a client Vue template where those tags are
  //    hard compile errors (ignoreSideEffectTags) and would break docs:dev.
  //
  //    Gradient definitions are exempt: typst samples them into hundreds of
  //    stops, and per-stop luminance classification remaps only the subset
  //    crossing a threshold -- neighbours diverge and the gradient develops
  //    hard bands in dark mode. Saturated gradients already read on dark
  //    backgrounds, so they pass through untouched (continuity first).
  let gradientDepth = 0
  svg = svg.replace(
    /<(\/?)([a-zA-Z][^>\s/]*)([^>]*)>/g,
    (_m, close: string, name: string, _attrs: string) => {
      const isGradient = /(?:linear|radial|conic)?[Gg]radient$/.test(name)
      if (close) {
        if (isGradient && gradientDepth > 0) gradientDepth--
        return _m
      }
      if (isGradient) gradientDepth++
      if (gradientDepth > 0) return _m
      const tag = _m
      return tag.startsWith('<!') || !/^[a-z]/i.test(name)
        ? tag
        : adaptTag(tag)
    },
  )
  return svg
}

export interface TypstFenceOptions {
  // Remap figure palettes to theme roles via inline light-dark() values
  // (ink -> currentColor, whites -> background, luminance-aware accents).
  // false emits the compiler's raw fixed palette.
  themeAdaptive?: boolean
}

export function renderTypst(source: string): TypstRenderResult {
  const hash = createHash('sha256').update(source).digest('hex').slice(0, 20)

  const cached = readCache(hash)
  if (cached !== undefined) return { svg: cached }

  const compiler = getCompiler()
  let svg: string
  try {
    svg = compiler.plainSvg({ mainFileContent: source })
  } catch {
    // Re-run through compile() purely to surface human-readable diagnostics.
    try {
      compiler.compile({ mainFileContent: source }).printDiagnostics()
    } catch {
      // Diagnostics printing itself failed -- nothing more to report.
    }
    return { error: 'Typst compilation failed (see diagnostics above)' }
  }

  writeCache(hash, svg)
  return { svg }
}

export function typstFencePlugin(md: MarkdownIt, options: TypstFenceOptions = {}): void {
  const themeAdaptive = options.themeAdaptive ?? true

  // VitePress may apply the user config to the same markdown instance more
  // than once (page render + search indexing); without this guard the second
  // application would wrap already-paired output again.
  if ((md as { __typstFencePatched?: boolean }).__typstFencePatched) return
  ;(md as { __typstFencePatched?: boolean }).__typstFencePatched = true

  const fallback = md.renderer.rules.fence

  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const token = tokens[idx]!
    // Only EXACT 3-backtick fences render. Longer fences (4+ backticks,
    // CommonMark nesting) display the source as a regular highlighted code
    // block -- the documented way to show typst source verbatim.
    if (token.info.trim() !== 'typst' || token.markup.length !== 3) {
      return fallback
        ? fallback(tokens, idx, options, env, self)
        : self.renderToken(tokens, idx, options)
    }

    const result = renderTypst(token.content)
    if (!result.svg) {
      console.warn(`[typst] ${result.error}`)
      return `<div class="typst-figure typst-figure-error"><p>Typst 渲染失败，请查看构建日志。</p></div>`
    }

    const svg = themeAdaptive ? applySvgTheme(result.svg) : result.svg
    return `<div class="typst-figure">${svg}</div>`
  }
}
