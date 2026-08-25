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

let compilerVersion: string | undefined

function getCompilerVersion(): string {
  // Resolved through the same runtime require as the addon itself and
  // memoized, so hash computation stays free after the first call.
  compilerVersion ??= (
    nodeRequire(
      '@myriaddreamin/typst-ts-node-compiler/package.json',
    ) as { version: string }
  ).version
  return compilerVersion
}

/**
 * Content hash serving as the compile-cache key. Includes the compiler
 * version so upgrading the native addon invalidates every cached SVG in one
 * step (output markup may change between releases) without manual cleanup;
 * the source alone would keep serving stale figures across upgrades.
 */
export function compileCacheKey(source: string): string {
  return createHash('sha256')
    .update(`${getCompilerVersion()}\u0000${source}`)
    .digest('hex')
    .slice(0, 20)
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

// Defense-in-depth sanitizer for markup that ships as inline SVG straight
// into the page DOM:
//   * <script> elements are dropped entirely;
//   * on* event-handler attributes are dropped too -- an <svg onload=...>
//     executes code without any script element being present.
// Applied before the compile cache so sanitized markup is what gets
// persisted (re-served cache stays clean), at the splice point where
// embedded <image> payloads are decoded, and once more over the fully
// unfolded tree -- sanitization must never depend on any single call site.
const SCRIPT_ELEMENT_RE = /<script\b[^>]*>[\s\S]*?<\/script\s*>|<script\b[^>]*\/\s*>/gi
// Event handlers are exactly the SVG/HTML attributes whose name starts with
// "on"; no standard presentation attribute shares that prefix, so a bare
// prefix match is precise enough for sanitizer duty. Quoted values are
// consumed wholesale so a ">" inside them cannot truncate the match early.
const EVENT_HANDLER_ATTR_RE = /\s+on[a-zA-Z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/g

export function sanitizeSvg(svg: string): string {
  return svg.replace(SCRIPT_ELEMENT_RE, '').replace(EVENT_HANDLER_ATTR_RE, '')
}

export interface TypstRenderResult {
  svg?: string
  error?: string
}

// ---------------------------------------------------------------------------
// Theme adaptation (SVG-standard color mapping)
//
// Coverage per SVG 1.1/2 + CSS Color Module Level 4:
//   * paint attributes AND inline style declarations carrying
//       - #rgb / #rgba / #rrggbb / #rrggbbaa
//       - rgb()/rgba() and hsl()/hsla(), comma or space syntax
//       - CSS named colors (full extended list incl. grey/rebecca aliases)
//     all resolve into one pipeline.
//   * Presentation-attribute inheritance (<g fill=...>) keeps working: group
//     tags adapt exactly like leaves.
//   * currentColor passes through untouched -- it already tracks the theme.
//   * none / url(#ref) / var(...) never resolve and stay verbatim.
//   * <style> blocks: color literals inside declarations are rewritten with
//     the same value mapping (selectors untouched).
//   * Excluded subtrees (depth-tracked): linear/radialGradient definitions
//     (per-stop remapping bands gradients -- continuity first), <mask> and
//     <filter> (luminance/filter arithmetic depends on exact colors),
//     <clipPath> (no visible paint), <script>.
//
// GOVERNING LAW -- bidirectional cluster coherence:
//   backdrop adapted    ->  its covering ink adapts with it;
//   backdrop unchanged  ->  its covering ink keeps the ORIGINAL color.
// The pairing scan enforces the "adapted" half; the geometry pass enforces
// the "unchanged" half. An invariant audit (`pinAudit`) asserts zero
// violations across every shipped figure.
//
// Role mapping (mermaid-style: darken surfaces, lift lines):
//   near-black ink        -> currentColor             follows document text
//   light surfaces L>=.55 -> paper role where paired; otherwise literal
//   bright chips L>=.62   -> lightness x~0.3          readable under light ink
//   dark strokes L<=.26   -> lifted to L=.58          visible on dark background
//   mid tones / grays     -> untouched                legible on both themes
//
// var() cannot appear in presentation attributes, so theme switching rides
// on INLINE light-dark() values resolved against the color-scheme declared
// for figures in custom.css. Geometry pinning executes LAST so its literal
// blacks survive every earlier pass.
// ---------------------------------------------------------------------------

interface RGBa {
  r: number
  g: number
  b: number
  a?: number | undefined
}

interface Box {
  x0: number
  y0: number
  x1: number
  y1: number
}

function rgbToHsl({ r, g, b }: Omit<RGBa, 'a'>): { h: number; s: number; l: number } {
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
  return { h, s, l }
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  const k = (n: number): number => (n + h / 30) % 12
  const channel = (n: number): number =>
    l - l * s * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return { r: channel(0), g: channel(8), b: channel(4) }
}

function hexToRgb(hex: string): RGBa | undefined {
  let v = hex.slice(1)
  if (v.length <= 4) v = [...v].map((c) => c + c).join('')
  if (v.length !== 6 && v.length !== 8) return undefined
  const r = parseInt(v.slice(0, 2), 16) / 255
  const g = parseInt(v.slice(2, 4), 16) / 255
  const b = parseInt(v.slice(4, 6), 16) / 255
  const a = v.length >= 8 ? parseInt(v.slice(6, 8), 16) / 255 : undefined
  if ([r, g, b].some((c) => !Number.isFinite(c))) return undefined
  return { r, g, b, a }
}

function rgbToHex({ r, g, b, a }: RGBa): string {
  const ch = (v: number): string =>
    Math.round(Math.min(1, Math.max(0, v)) * 255)
      .toString(16)
      .padStart(2, '0')
  const base = `#${ch(r)}${ch(g)}${ch(b)}`
  return a === undefined ? base : base + ch(a)
}

// Full CSS Color Module Level 4 named colors (grey aliases included).
const NAMED_COLORS: ReadonlyMap<string, RGBa> = (() => {
  const data =
    'aliceblue f0f8ff antiquewhite faebd7 aqua 00ffff aquamarine 7fffd4 azure f0ffff ' +
    'beige f5f5dc bisque ffe4c4 black 000000 blanchedalmond ffebcd blue 0000ff ' +
    'blueviolet 8a2be2 brown a52a2a burlywood deb887 cadetblue 5f9ea0 chartreuse 7fff00 ' +
    'chocolate d2691e coral ff7f50 cornflowerblue 6495ed cornsilk fff8dc crimson dc143c ' +
    'cyan 00ffff darkblue 00008b darkcyan 008b8b darkgoldenrod b8860b darkgray a9a9a9 ' +
    'darkgreen 006400 darkgrey a9a9a9 darkkhaki bdb76b darkmagenta 8b008b ' +
    'darkolivegreen 556b2f darkorange ff8c00 darkorchid 9932cc darkred 8b0000 ' +
    'darksalmon e9967a darkseagreen 8fbc8f darkslateblue 483d8b darkslategray 2f4f4f ' +
    'darkslategrey 2f4f4f darkturquoise 00ced1 darkviolet 9400d3 deeppink ff1493 ' +
    'deepskyblue 00bfff dimgray 696969 dimgrey 696969 dodgerblue 1e90ff firebrick b22222 ' +
    'floralwhite fffaf0 forestgreen 228b22 fuchsia ff00ff gainsboro dcdcdc ' +
    'ghostwhite f8f8ff gold ffd700 goldenrod daa520 gray 808080 green 008000 ' +
    'greenyellow adff2f grey 808080 honeydew f0fff0 hotpink ff69b4 indianred cd5c5c ' +
    'indigo 4b0082 ivory fffff0 khaki f0e68c lavender e6e6fa lavenderblush fff0f5 lawngreen 7cfc00 ' +
    'lemonchiffon fffacd lightblue add8e6 lightcoral f08080 lightcyan e0ffff ' +
    'lightgoldenrodyellow fafad2 lightgray d3d3d3 lightgreen 90ee90 lightgrey d3d3d3 ' +
    'lightpink ffb6c1 lightsalmon ffa07a lightseagreen 20b2aa lightskyblue 87cefa ' +
    'lightslategray 778899 lightslategrey 778899 lightsteelblue b0c4de lightyellow ffffe0 ' +
    'lime 00ff00 limegreen 32cd32 linen faf0e6 magenta ff00ff maroon 800000 ' +
    'mediumaquamarine 66cdaa mediumblue 0000cd mediumorchid ba55d3 mediumpurple 9370db ' +
    'mediumseagreen 3cb371 mediumslateblue 7b68ee mediumspringgreen 00fa9a ' +
    'mediumturquoise 48d1cc mediumvioletred c71585 midnightblue 191970 mintcream f5fffa ' +
    'mistyrose ffe4e1 moccasin ffe4b5 navajowhite ffdead navy 000080 oldlace fdf5e6 ' +
    'olive 808000 olivedrab 6b8e23 orange ffa500 orangered ff4500 orchid da70d6 ' +
    'palegoldenrod eee8aa palegreen 98fb98 paleturquoise afeeee palevioletred db7093 ' +
    'papayawhip ffefd5 peachpuff ffdab9 peru cd853f pink ffc0cb plum dda0dd ' +
    'powderblue b0e0e6 purple 800080 rebeccapurple 663399 red ff0000 rosybrown bc8f8f ' +
    'royalblue 4169e1 saddlebrown 8b4513 salmon fa8072 sandybrown f4a460 seagreen 2e8b57 ' +
    'seashell fff5ee sienna a0522d silver c0c0c0 skyblue 87ceeb slateblue 6a5acd ' +
    'slategray 708090 slategrey 708090 snow fffafa springgreen 00ff7f steelblue 4682b4 ' +
    'tan d2b48c teal 008080 thistle d8bfd8 tomato ff6347 turquoise 40e0d0 violet ee82ee ' +
    'wheat f5deb3 white ffffff whitesmoke f5f5f5 yellow ffff00 yellowgreen 9acd32'
  const map = new Map<string, RGBa>()
  const words = data.split(/\s+/)
  for (let i = 0; i + 1 < words.length; i += 2) {
    const rgb = hexToRgb('#' + words[i + 1]!)
    if (rgb) map.set(words[i]!, rgb)
  }
  return map
})()

const NUM_SRC = '-?(?:\\d*\\.\\d+|\\d+)(?:[eE][+-]?\\d+)?'
const COLOR_VALUE_RE = new RegExp(
  '#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})(?!\\w)' +
    '|\\brgba?\\(\\s*' + NUM_SRC + '(?:\\s*,\\s*' + NUM_SRC + '){2,3}\\s*\\)' +
    '|\\brgba?\\(\\s*' + NUM_SRC + '(?:\\s+' + NUM_SRC + '){2}(?:\\s*/\\s*' + NUM_SRC + ')?\\s*\\)' +
    '|\\bhsla?\\(\\s*(?:' + NUM_SRC + ')(?:deg|turn)?\\s*,\\s*' + NUM_SRC + '\\s*,\\s*' + NUM_SRC + '\\s*\\)' +
    '|\\bhsla?\\(\\s*(?:' + NUM_SRC + ')(?:deg|turn)?\\s+' + NUM_SRC + '\\s+' + NUM_SRC + '(?:\\s*/\\s*' + NUM_SRC + ')?\\s*\\)' +
    '|[a-zA-Z][a-zA-Z0-9]{2,}',
  'g',
)

export function parseColorValue(raw: string): RGBa | undefined {
  const v = raw.trim()
  const lower = v.toLowerCase()
  if (lower === 'transparent') return { r: 0, g: 0, b: 0, a: 0 }
  if (lower === 'currentcolor' || lower === 'none' || lower === 'inherit') return undefined
  if (lower.startsWith('url(') || lower.startsWith('var(')) return undefined
  if (v.startsWith('#')) return hexToRgb(v)

  if (/^rgba?\(/i.test(v)) {
    const nums = [...v.matchAll(new RegExp(NUM_SRC, 'gi'))].map((x) => parseFloat(x[0]))
    if (nums.length < 3) return undefined
    const scaled = nums.map((n, idx) => (/^rgb/i.test(v) && idx < 3 ? n / 255 : n))
    const r = scaled[0]
    const g = scaled[1]
    const b = scaled[2]
    const a = scaled[3]
    if ([r, g, b].some((c) => !Number.isFinite(c))) return undefined
    return {
      r: r!,
      g: g!,
      b: b!,
      a: a !== undefined ? Math.min(1, Math.max(0, a)) : undefined,
    }
  }

  if (/^hsla?\(/i.test(v)) {
    const nums = [...v.matchAll(new RegExp(NUM_SRC, 'gi'))].map((x) => parseFloat(x[0]))
    if (nums.length < 3) return undefined
    const { r, g, b } = hslToRgb(
      nums[0] ?? 0,
      Math.min(1, Math.max(0, (nums[1] ?? 0) / 100)),
      Math.min(1, Math.max(0, (nums[2] ?? 0) / 100)),
    )
    const a = nums[3]
    return { r, g, b, a: a !== undefined ? Math.min(1, Math.max(0, a)) : undefined }
  }

  if (/^[a-zA-Z]+$/.test(v)) return NAMED_COLORS.get(lower)
  return undefined
}

function isOpaque(rgb: RGBa | undefined): boolean {
  return !!rgb && (rgb.a === undefined || rgb.a >= 1)
}

// Ink pole of the polarity formula: dark achromatic colors act as
// foreground regardless of element role (text, hairline, filled band).
// Band edge 0.35: anything at or below reads as "dark on light" in light
// mode and would be unreadable on a dark page if kept (cf. Dark Reader's
// achromatic inversion; WCAG contrast against --vp-c-bg is guaranteed by
// the theme tokens themselves).
function isInkColor(rgb: RGBa): boolean {
  if (!isOpaque(rgb)) return false
  const { s, l } = rgbToHsl(rgb)
  return l <= 0.35 && s < 0.25
}

function isNearWhiteRGB(rgb: RGBa): boolean {
  const { s, l } = rgbToHsl(rgb)
  return s < 0.08 && l >= 0.93
}

// Unified light-surface candidate: one predicate across canvas detection,
// backdrop pairing and geometry pinning. Covers pure whites AND light
// neutrals/pastels (atomic's luma(90%) discs, pale chips kept literal).
function isLightSurfaceRGB(rgb: RGBa): boolean {
  if (!isOpaque(rgb)) return false
  const { s, l } = rgbToHsl(rgb)
  return s < 0.25 && l >= 0.55
}

// Dark-mode counterpart policy for one resolved paint. `allowPaper` enables
// the background-following role (page canvas + confirmed backdrops only).
function darkCounterpartRGB(rgb: RGBa, allowPaper: boolean): string | undefined {
  const a = rgb.a
  const { h, s, l } = rgbToHsl(rgb)

  if (a !== undefined && a < 1) {
    // Translucent near-whites follow the background, keeping opacity.
    if (l >= 0.9 && s < 0.08) {
      return `color-mix(in srgb, var(--vp-c-bg) ${Math.round(a * 100)}%, transparent)`
    }
    return undefined
  }

  // Paper role: the whole light band co-adapts with covering ink.
  if (allowPaper && s < 0.25 && l >= 0.55) return 'var(--vp-c-bg)'

  if (s < 0.08) return undefined // mid grays read fine on both themes

  if (l >= 0.62) {
    // Bright chip surfaces: darken along the same hue so light ink stays
    // readable in dark mode.
    const dark = hslToRgb(h, s, Math.min(0.3, Math.max(0.13, l * 0.3)))
    return rgbToHex({ ...dark })
  }
  if (l <= 0.26) {
    // Very dark chromatic strokes disappear on dark backgrounds: lift them.
    return rgbToHex(hslToRgb(h, s, 0.58))
  }
  return undefined
}

// One paint value -> theme-adaptive inline value, or undefined to keep as-is.
// Ink resolves to currentColor; everything else becomes light-dark(original,
// counterpart) preserving the author's spelling verbatim.
function adaptPaint(raw: string, allowPaper: boolean): string | undefined {
  const rgb = parseColorValue(raw)
  if (!rgb) return undefined
  if (isInkColor(rgb)) return 'currentColor'
  const counterpart = darkCounterpartRGB(rgb, allowPaper)
  if (!counterpart) return undefined
  return `light-dark(${raw.trim()}, ${counterpart})`
}

const INK_SWAPS: ReadonlyArray<readonly [string, string]> = [
  ['fill="#000000"', 'fill="currentColor"'],
  ['stroke="#000000"', 'stroke="currentColor"'],
  ['fill:#000000', 'fill:currentColor'],
  ['stroke:#000000', 'stroke:currentColor'],
]

// Rewrite every paint-bearing tag in one pass so multiple properties on the
// same element merge into ONE style attribute (duplicated style attributes
// would be invalid HTML). Interior opaque lights are preserved by design --
// only the page canvas carries the paper role (see applySvgTheme).
function adaptTag(tag: string): string {
  let added = ''
  let out = tag.replace(
    /\b(fill|stroke|stop-color)="([^"]*)"/g,
    (_m, prop: string, value: string) => {
      if (!value.trim()) return _m
      const mapped = adaptPaint(value, false)
      if (!mapped) return _m
      added += `${prop}:${mapped};`
      return ''
    },
  )
  out = out.replace(
    /\b(fill|stroke|stop-color)(\s*:\s*)([^;"']+)/gi,
    (m, prop: string, sep: string, value: string) => {
      const trimmed = value.trim()
      if (/^(none|currentColor)$/i.test(trimmed)) return m
      const mapped = adaptPaint(value, false)
      return mapped ? `${prop}${sep}${mapped}` : m
    },
  )
  if (!added) return out
  const cleaned = out.replace(/(\s+)\s+/g, '$1')
  const existing = /\sstyle="([^"]*)"/.exec(cleaned)
  if (existing?.[1] !== undefined) {
    return cleaned.replace(/\sstyle="[^"]*"/, ` style="${existing[1]}${added}"`)
  }
  const open = cleaned.endsWith('/>') ? -2 : -1
  return `${cleaned.slice(0, open)} style="${added}"${cleaned.slice(open)}`
}

// Rewrite color literals inside a <style> block's CSS text. Selectors and
// non-color declarations pass through untouched; url()/var() values do not
// match the color grammar and are skipped automatically.
function adaptStyleBlock(css: string): string {
  return css.replace(COLOR_VALUE_RE, (value) => {
    if (/^(none|transparent)$/i.test(value)) return value
    if (/^currentcolor$/i.test(value)) return 'currentColor'
    const rgb = parseColorValue(value)
    if (!rgb) return value
    if (isInkColor(rgb)) return 'currentColor'
    const counterpart = darkCounterpartRGB(rgb, false)
    if (!counterpart) return value
    return `light-dark(${value}, ${counterpart})`
  })
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

      // Decode -> strip XML prologue -> SANITIZE before splicing: embedded
      // payloads join the page DOM as raw markup and would otherwise bypass
      // every outer filter -- this is the security boundary, not a nicety.
      let inner = sanitizeSvg(
        Buffer.from(payload[1], 'base64').toString('utf8')
          .replace(/<\?xml[\s\S]*?\?>/g, '')
          .replace(/<!DOCTYPE[^>]*>/g, ''),
      ).trim()

      // Merge scope discipline: parse ONLY the decoded root tag's own
      // attributes, then overlay the whitelisted geometry keys from the
      // <image>. Scanning the whole inner document here would hoist leaf
      // attributes (d=, x/y of trailing <text>s, font-*) onto the root and
      // translate the barcode out of the canvas.
      const merged = new Map<string, string>()
      const rootOpen = /^<svg\b([^>]*)>/.exec(inner)?.[1]
      if (rootOpen !== undefined) {
        for (const [, k, v] of rootOpen.matchAll(/\s([a-zA-Z:-]+)="([^"]*)"/g)) {
          merged.set(k!, v!)
        }
      }
      for (const [, k, v] of rawAttrs.matchAll(
        /\s(x|y|width|height|preserveAspectRatio|transform)="([^"]*)"/g,
      )) {
        merged.set(k!, v!)
      }
      inner = inner.replace(
        /^<svg\b[^>]*/,
        `<svg ${[...merged].map(([k, v]) => `${k}="${v}"`).join(' ')}>`,
      )
      return inner
    },
  )
}

function pathGeometry(d: string): { box: Box; polyArea: number } | undefined {
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
  const pts: Array<[number, number]> = []
  while (i < tokens.length) {
    const tok = tokens[i]!
    if (/^[A-Za-z]$/.test(tok)) {
      cmd = tok
      i++
      if (cmd === 'Z' || cmd === 'z') {
        pts.push([sx, sy])
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
        cx = rel ? cx + args[0]! : args[0]!
        cy = rel ? cy + args[1]! : args[1]!
        if (cmd.toLowerCase() === 'm') {
          sx = cx
          sy = cy
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
      case 'a': {
        const dx = args[args.length - 2]!
        const dy = args[args.length - 1]!
        if (rel) {
          cx += dx
          cy += dy
        } else {
          cx = dx
          cy = dy
        }
        break
      }
    }
    if (Number.isFinite(cx) && Number.isFinite(cy)) pts.push([cx, cy])
  }
  if (pts.length < 2) return undefined
  const xs = pts.map((p) => p[0])
  const ys = pts.map((p) => p[1])
  const box: Box = {
    x0: Math.min(...xs),
    y0: Math.min(...ys),
    x1: Math.max(...xs),
    y1: Math.max(...ys),
  }
  // shoelace over sampled outline (implicit closure); curve control points
  // are excluded, so area is a slight under-estimate -- fine for ratios.
  let polyArea = 0
  for (let k = 0; k < pts.length; k++) {
    const ax = pts[k]![0]
    const ay = pts[k]![1]
    const bx = pts[(k + 1) % pts.length]![0]
    const by = pts[(k + 1) % pts.length]![1]
    polyArea += ax * by - bx * ay
  }
  return { box, polyArea: Math.abs(polyArea) / 2 }
}

// ---------------------------------------------------------------------------
// CLUSTER GEOMETRY (transform-aware)
//
// GOVERNING LAW -- polarity formula over the achromatic axis (S < 0.25),
// evaluated on HSL lightness of each opaque paint, INDEPENDENT of element
// role (a black band is ink, however thick it is):
//
//   L >= 0.55  paper pole  -- backdrop role only: canvas & confirmed
//                             backdrops -> var(--vp-c-bg); interior paper
//                             stays literal and becomes a PINNING ZONE
//                             whose covering ink is locked black
//   L <= 0.35  ink pole    -- foreground role: always -> currentColor
//   0.35<L<0.55 mid neutrals -- preserved (readable on both themes;
//                             inverting them would flatten shading)
//   chromatic (S >= 0.25)  -- identity preserved, luminance extremes
//                             corrected only (see darkCounterpartRGB)
//
// Cluster coherence pairs surfaces with the ink they carry:
//   paper zone (light band/card) -> covering ink LOCKED black
//   ink zone (dark band)         -> covering paper-pole paint pairs to
//                                   light-dark(original, var(--vp-c-bg))
//                                   (white label on a black Gantt bar)
// Community anchors: Dark Reader achromatic inversion, WCAG contrast via
// theme tokens, Mermaid semantic roles, single-SVG light-dark() delivery.
// ---------------------------------------------------------------------------

type Matrix = [number, number, number, number, number, number]

const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0]

function parseMatrixAttr(tag: string): Matrix | undefined {
  const m = /\btransform="matrix\(([^"]+)\)"/.exec(tag)
  if (!m) return undefined
  const p = m[1]!.split(/[\s,]+/).map(Number)
  if (p.length !== 6 || p.some((n) => Number.isNaN(n))) return undefined
  return p as Matrix
}

function mulMatrix(a: Matrix, b: Matrix): Matrix {
  return [
    a[0]! * b[0]! + a[2]! * b[1]!,
    a[1]! * b[0]! + a[3]! * b[1]!,
    a[0]! * b[2]! + a[2]! * b[3]!,
    a[1]! * b[2]! + a[3]! * b[3]!,
    a[0]! * b[4]! + a[2]! * b[5]! + a[4]!,
    a[1]! * b[4]! + a[3]! * b[5]! + a[5]!,
  ]
}

function applyMatrix(m: Matrix, x: number, y: number): [number, number] {
  return [m[0]! * x + m[2]! * y + m[4]!, m[1]! * x + m[3]! * y + m[5]!]
}

function mapDeviceBox(m: Matrix, box: Box): Box {
  const p1 = applyMatrix(m, box.x0, box.y0)
  const p2 = applyMatrix(m, box.x1, box.y1)
  return {
    x0: Math.min(p1[0]!, p2[0]!),
    y0: Math.min(p1[1]!, p2[1]!),
    x1: Math.max(p1[0]!, p2[0]!),
    y1: Math.max(p1[1]!, p2[1]!),
  }
}

interface ClusterZone {
  box: Box
  /** Offset range of the zone-creating tag (self-pin guard). */
  tagStart: number
  tagEnd: number
}

interface ClusterScan {
  /** Adaptive-ink tags that must be locked black (paper zones). */
  pins: Array<{ start: number; end: number; desc: string }>
  /** Ink-pole bands: contained paper-pole paints pair to the background. */
  darkZones: ClusterZone[]
}

function scanClusters(svg: string): ClusterScan {
  const vb = /viewBox="([\d.eE+-]+) ([\d.eE+-]+) ([\d.eE+-]+) ([\d.eE+-]+)"/.exec(svg)
  const minArea = vb
    ? 0.002 * parseFloat(vb[3]!) * parseFloat(vb[4]!)
    : 0 // noise floor: specks/markers never become zones

  // A "solid" surface fills its bounding box (discs/rects); thin strokes and
  // ring outlines collapse to ~zero polygon area and must never create
  // zones (a ring's bbox would swallow the whole atom).
  const SOLID_RATIO = 0.12

  const lightZones: ClusterZone[] = []
  const darkZones: ClusterZone[] = []
  const pins: Array<{ start: number; end: number; desc: string }> = []
  let gradDepth = 0

  // Transform chain: every open tag pushes its parent matrix; typst-ts
  // emits matrix() exclusively, translations/flips only, |det| == 1, so
  // local area tests transfer to device space unchanged.
  let cur: Matrix = IDENTITY
  const openTags: Array<{ name: string; saved: Matrix }> = []

  for (const m of svg.matchAll(/<(\/?)([a-zA-Z][^>\s/]*)([^<>]*)>/g)) {
    const close = m[1] === '/'
    const name = m[2]!
    const tag = m[0]
    const attrs = m[3] ?? ''
    if (close) {
      const top = openTags.pop()
      if (top && top.name === name) cur = top.saved
      if (/gradient>$/i.test(tag) && gradDepth > 0) gradDepth--
      continue
    }
    const tm = parseMatrixAttr(attrs)
    if (tm) cur = mulMatrix(cur, tm)
    const selfClosing = /\/\>\s*$/.test(tag)
    if (!selfClosing) openTags.push({ name, saved: cur })

    if (/<(linear|radial)Gradient\b/.test(tag)) {
      gradDepth++
      continue
    }
    if (gradDepth > 0) continue // stops live outside role semantics
    if (m.index === undefined) continue
    const tagStart = m.index
    const tagEnd = tagStart + tag.length

    const cls = /class="([^"]*)"/.exec(tag)?.[1] ?? ''
    const fillMatch = /\bfill="([^"]*)"/.exec(tag)
    const fillRgb = fillMatch?.[1] ? parseColorValue(fillMatch[1]) : undefined
    const dMatch = /\bd="([^"]+)"/.exec(tag)

    // THICK-STROKE BANDS (Gantt/task bars): stroke-width >= 6pt carries
    // surface polarity -- paper-pole bands become pinning zones, ink-pole
    // bands become dark-card zones. Threshold far above line-weight
    // conventions, far below figure dims -> generalizes across libraries.
    const swNum = /\bstroke-width="([\d.]+)"/.exec(tag)
    if (swNum?.[1] && parseFloat(swNum[1]) >= 6 && dMatch?.[1]) {
      const geo = pathGeometry(dMatch[1])
      if (geo) {
        const half = parseFloat(swNum[1]) / 2
        const local: Box = {
          x0: geo.box.x0 - half,
          y0: geo.box.y0 - half,
          x1: geo.box.x1 + half,
          y1: geo.box.y1 + half,
        }
        const strokeRgb = parseColorValue(/\bstroke="([^"]*)"/.exec(tag)?.[1] ?? '')
        const zone: ClusterZone = { box: mapDeviceBox(cur, local), tagStart, tagEnd }
        if (strokeRgb && isLightSurfaceRGB(strokeRgb)) lightZones.push(zone)
        else if (strokeRgb && isInkColor(strokeRgb)) darkZones.push(zone)
      }
    }

    // Preserved literal light OPAQUE solid shape -> protected paper zone.
    if (
      cls.includes('typst-shape') &&
      fillMatch?.[1] &&
      fillMatch[1].length <= 7 &&
      fillRgb &&
      isLightSurfaceRGB(fillRgb) &&
      dMatch?.[1]
    ) {
      const geo = pathGeometry(dMatch[1])
      if (
        geo &&
        (geo.box.x1 - geo.box.x0) * (geo.box.y1 - geo.box.y0) >= minArea &&
        geo.polyArea >= SOLID_RATIO * (geo.box.x1 - geo.box.x0) * (geo.box.y1 - geo.box.y0)
      ) {
        lightZones.push({ box: mapDeviceBox(cur, geo.box), tagStart, tagEnd })
      }
    }

    // Tag-local self-pin: a light literal fill sharing its tag with
    // currentColor paints (electron dots: gray fill + adapting outline).
    let selfPinned = false
    if (
      fillRgb &&
      fillMatch?.[1] !== undefined &&
      fillMatch[1].length <= 7 &&
      isLightSurfaceRGB(fillRgb) &&
      tag.includes('currentColor')
    ) {
      pins.push({ start: tagStart, end: tagEnd, desc: 'self-pin' })
      selfPinned = true
    }

    // Containment candidates: currentColor elements whose device-space
    // center falls inside a paper zone.
    if (tag.includes('currentColor') && !selfPinned) {
      const d = dMatch?.[1]
      const usePos = /\bx="([\d.eE+-]+)".*?\by="([\d.eE+-]+)"/.exec(tag)
      let center: [number, number] | undefined
      if (d) {
        const geo = pathGeometry(d)
        if (geo) {
          center = applyMatrix(
            cur,
            (geo.box.x0 + geo.box.x1) / 2,
            (geo.box.y0 + geo.box.y1) / 2,
          )
        }
      } else if (usePos) {
        center = applyMatrix(cur, parseFloat(usePos[1]!), parseFloat(usePos[2]!))
      }
      if (
        center &&
        lightZones.some(
          (z) =>
            center![0] >= z.box.x0 && center![0] <= z.box.x1
            && center![1] >= z.box.y0 && center![1] <= z.box.y1,
        )
      ) {
        pins.push({ start: tagStart, end: tagEnd, desc: 'containment' })
      }
    }
  }
  return { pins, darkZones }
}

function scanPinCandidates(
  svg: string,
): Array<{ start: number; end: number; desc: string }> {
  return scanClusters(svg).pins
}

function pinInkOverLiteralSurfaces(svg: string): string {
  const candidates = scanClusters(svg).pins

  // Revert from the end backwards so earlier offsets stay valid.
  for (const cand of candidates.reverse()) {
    const seg = svg.slice(cand.start, cand.end)
    const reverted = seg
      .replaceAll('fill="currentColor"', 'fill="#000000"')
      .replaceAll('stroke="currentColor"', 'stroke="#000000"')
      .replaceAll('fill:currentColor', 'fill:#000000')
      .replaceAll('stroke:currentColor', 'stroke:#000000')
    svg = svg.slice(0, cand.start) + reverted + svg.slice(cand.end)
  }
  return svg
}

// Inverted clusters: paper-pole paints carried OVER an ink-pole band
// (white percentage label on a black Gantt bar). The band adapts to
// currentColor, so its light paint pairs with the background instead --
// light mode keeps white-on-black, dark mode shows bg-on-text-colored.
function pairLightOverDarkBands(svg: string): string {
  const { darkZones } = scanClusters(svg)
  if (darkZones.length === 0) return svg

  const edits: Array<{ start: number; end: number; text: string }> = []
  let gradDepth = 0
  let cur: Matrix = IDENTITY
  const openTags: Array<{ name: string; saved: Matrix }> = []

  for (const m of svg.matchAll(/<(\/?)([a-zA-Z][^>\s/]*)([^<>]*)>/g)) {
    const close = m[1] === '/'
    const name = m[2]!
    const tag = m[0]
    const attrs = m[3] ?? ''
    if (close) {
      const top = openTags.pop()
      if (top && top.name === name) cur = top.saved
      if (/gradient>$/i.test(tag) && gradDepth > 0) gradDepth--
      continue
    }
    const tm = parseMatrixAttr(attrs)
    if (tm) cur = mulMatrix(cur, tm)
    const selfClosing = /\/\>\s*$/.test(tag)
    if (!selfClosing) openTags.push({ name, saved: cur })

    if (/<(linear|radial)Gradient\b/.test(tag)) {
      gradDepth++
      continue
    }
    if (gradDepth > 0) continue
    if (m.index === undefined) continue

    // The band element itself never pairs with itself.
    if (darkZones.some((z) => z.tagStart === m.index)) continue

    for (const prop of ['fill', 'stroke'] as const) {
      const attrRe = new RegExp(`\\b${prop}="([^"]*)"`)
      const attr = attrRe.exec(tag)
      const raw = attr?.[1]
      if (!raw || raw.length > 7) continue
      const rgb = parseColorValue(raw)
      if (!rgb || !isLightSurfaceRGB(rgb)) continue

      const d = /\bd="([^"]+)"/.exec(tag)?.[1]
      const usePos = /\bx="([\d.eE+-]+)".*?\by="([\d.eE+-]+)"/.exec(tag)
      let center: [number, number] | undefined
      if (d) {
        const geo = pathGeometry(d)
        if (geo) {
          center = applyMatrix(cur, (geo.box.x0 + geo.box.x1) / 2, (geo.box.y0 + geo.box.y1) / 2)
        }
      } else if (usePos) {
        center = applyMatrix(cur, parseFloat(usePos[1]!), parseFloat(usePos[2]!))
      }
      if (!center) continue
      const inside = darkZones.some(
        (z) =>
          center![0] >= z.box.x0 && center![0] <= z.box.x1
          && center![1] >= z.box.y0 && center![1] <= z.box.y1,
      )
      if (!inside) continue

      const mapped = `light-dark(${raw}, var(--vp-c-bg))`
      const stripped = tag.replace(attrRe, '')
      const open = stripped.endsWith('/>') ? -2 : -1
      const existing = /\sstyle="([^"]*)"/.exec(stripped)
      let text: string
      if (existing?.[1] !== undefined) {
        text = stripped.replace(/\sstyle="[^"]*"/, ` style="${existing[1]}${prop}:${mapped};"`)
      } else {
        text = `${stripped.slice(0, open)} style="${prop}:${mapped};"${stripped.slice(open)}`
      }
      edits.push({ start: m.index, end: m.index + tag.length, text })
      break
    }
  }

  for (const e of edits.reverse()) {
    svg = svg.slice(0, e.start) + e.text + svg.slice(e.end)
  }
  return svg
}

// Test hook: after adaptation this must report ZERO entries -- any hit means
// an adaptive ink element still sits inside a preserved light surface,
// violating bidirectional cluster coherence.
export function pinAudit(svg: string): Array<Record<string, unknown>> {
  return scanPinCandidates(svg)
}

export function applySvgTheme(input: string): string {
  // 1) Embedded vector images first: their colors must join the pipeline.
  //    The unfolded result is re-sanitized as a whole -- unfolding splices
  //    external markup into the tree, so "no scripts / no event handlers
  //    reach the DOM" must hold on the OUTPUT side too, not just the input.
  let svg = sanitizeSvg(unfoldEmbeddedSvgImages(input))

  // 2) Structural canvas detection: passthrough only for an AUTHORED opaque
  //    tint outside the light band (dark/tinted designs). `fill: none` or
  //    missing paint means a transparent canvas -- adapt normally.
  const bgMatch =
    /<path\b[^>]*\bclass="typst-shape"[^>]*\bfill="([^"]*)"[^>]*\bd="M 0 0v /.exec(svg)
  const bgRgb = bgMatch?.[1] ? parseColorValue(bgMatch[1]) : undefined
  if (bgMatch?.[1] && bgRgb && isOpaque(bgRgb) && !isLightSurfaceRGB(bgRgb)) return svg

  // 3) Inverted clusters first: paper-pole paints over ink-pole bands pair
  //    with the background while the band color is still literal (the ink
  //    swap below would erase the polarity evidence).
  svg = pairLightOverDarkBands(svg)

  // 4) Ink: currentColor is a CSS-wide keyword, valid both in presentation
  //    attributes and style declarations.
  for (const [from, to] of INK_SWAPS) svg = svg.replaceAll(from, to)

  // 5) The canvas path itself gets the paper role (light -> follows
  //    --vp-c-bg).
  svg = svg.replace(
    /<path\b([^>]*\bclass="typst-shape"[^>]*?)\bfill="([^"]*)"/,
    (_m, attrs: string, value: string) => {
      const rgb = parseColorValue(value)
      if (!rgb || !isOpaque(rgb) || !isNearWhiteRGB(rgb)) return _m
      const mapped = adaptPaint(value, true)
      if (!mapped) return _m
      return `<path${attrs}style="fill:${mapped};"`
    },
  )

  // 6) Backed-light pairing (paint-order semantics): an opaque light SHAPE
  //    immediately followed by painted elements co-adapts with them; an
  //    isolated light mark stays literal. Gradient interiors are skipped
  //    (stops live outside role semantics).
  {
    let pending: { start: number; end: number; raw: string } | undefined
    let gradDepth = 0
    const confirms: Array<{ start: number; end: number; raw: string }> = []
    for (const m of svg.matchAll(/<[a-zA-Z!/][^>]*>/g)) {
      const tag = m[0]
      if (tag.startsWith('</')) {
        if (/gradient>$/i.test(tag) && gradDepth > 0) gradDepth--
        continue
      }
      if (/<(linear|radial)Gradient\b/.test(tag)) {
        gradDepth++
        continue
      }
      if (gradDepth > 0) continue

      const cls = /class="([^"]*)"/.exec(tag)?.[1] ?? ''
      const isShape = cls.includes('typst-shape')
      const fillMatch = /\bfill="([^"]*)"/.exec(tag)
      const fillRgb = fillMatch?.[1] ? parseColorValue(fillMatch[1]) : undefined
      const anyPaint = /\b(?:fill|stroke|stop-color)="([^"]*)"/.exec(tag)
      const painted =
        tag.includes('currentColor') || (!!anyPaint?.[1] && !!parseColorValue(anyPaint[1]))

      if (isShape && fillRgb && isOpaque(fillRgb) && isLightSurfaceRGB(fillRgb)) {
        pending = { start: m.index!, end: m.index! + tag.length, raw: fillMatch![1]! }
        continue
      }

      if (!painted) continue
      if (pending && !isShape) {
        confirms.push(pending)
        pending = undefined
        continue
      }
      pending = undefined
    }
    for (const { start, end, raw } of confirms.reverse()) {
      const segment = svg.slice(start, end)
      const mapped = adaptPaint(raw, true)
      if (!mapped) continue
      const rewritten = segment.replace(
        new RegExp(`(\\s)fill="${raw}"`),
        `$1style="fill:${mapped};"`,
      )
      svg = svg.slice(0, start) + rewritten + svg.slice(end)
    }
  }

  // 7) Theme-aware paints become inline light-dark() values. Element-wise
  //    rewriting avoids <style>/<script>-style tags entirely -- markdown
  //    content is compiled as a client Vue template where those tags are
  //    hard compile errors (ignoreSideEffectTags) and would break docs:dev.
  //
  //    Excluded subtrees: gradient defs (continuity), masks/filters (exact-
  //    color arithmetic), clipPaths (no visible paint), scripts. <style>
  //    blocks get their CSS text transformed separately.
  const EXCLUDED = new Set([
    'linearGradient',
    'radialGradient',
    'mask',
    'filter',
    'clipPath',
    'script',
    'style',
  ])
  type Edit = { start: number; end: number; text: string }
  const edits: Edit[] = []
  const stack: string[] = []
  for (const m of svg.matchAll(/<(\/?)([a-zA-Z][^>\s/]*)([^<>]*)>/g)) {
    const full = m[0]
    const close = m[1]!
    const name = m[2]!
    const start = m.index!
    const end = start + full.length
    const selfClosing = /\/>\s*$/.test(full)

    if (close) {
      if (stack[stack.length - 1] === name) stack.pop()
      continue
    }

    if (EXCLUDED.has(name)) {
      if (name === 'style') {
        // Transform the CSS text itself; selectors pass through untouched.
        const closeIdx = svg.indexOf('</style>', start + full.length)
        const innerEnd = closeIdx === -1 ? svg.length : closeIdx
        edits.push({
          start: start + full.length,
          end: innerEnd,
          text: adaptStyleBlock(svg.slice(start + full.length, innerEnd)),
        })
        continue
      }
      if (!selfClosing) stack.push(name)
      continue
    }

    if (stack.length > 0) continue // inside an excluded subtree
    edits.push({ start, end, text: adaptTag(full) })
  }
  for (const e of edits.reverse()) {
    svg = svg.slice(0, e.start) + e.text + svg.slice(e.end)
  }

  // 8) Cluster enforcement runs LAST: geometry pinning reverts covering
  //    ink to literal black -- nothing after this point may reinterpret
  //    that decision. (Light-over-dark pairing ran early, step 3.)
  svg = pinInkOverLiteralSurfaces(svg)
  return svg
}

export interface TypstFenceOptions {
  // Remap figure palettes to theme roles via inline light-dark() values
  // (ink -> currentColor, whites -> background, luminance-aware accents).
  // false emits the compiler's raw fixed palette.
  themeAdaptive?: boolean
}

export function renderTypst(source: string): TypstRenderResult {
  const hash = compileCacheKey(source)

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

  svg = sanitizeSvg(svg)
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
