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
// Role mapping (mermaid-style: darken surfaces, lift lines):
//   near-black ink          -> currentColor          follows document text
//   page canvas (near-white)-> var(--vp-c-bg)        explicit call-site only
//   bright chips L>=.62     -> lightness x~0.3        readable under light ink
//   dark strokes L<=.26     -> lifted to L=.58        visible on dark background
//   mid tones / grays       -> untouched              legible on both themes
//
// var() cannot appear in presentation attributes, and <style> tags are hard
// compile errors in markdown (client Vue templates reject side-effect tags),
// so theme switching rides on INLINE light-dark() values resolved against
// the color-scheme declared for figures in custom.css.
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
    'indigo 4b0082 ivory fffff0 khaki f0e68c lavender e6e6fa lawngreen 7cfc00 ' +
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
// Color grammar per CSS Color 4: hex forms, functional rgb()/rgba() and
// hsl()/hsla() (comma and modern space syntax), CSS named colors. Deliberate
// non-members: none/url()/var()/currentColor/inherit -- they carry no theme
// role and must survive verbatim.
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
    const conv = /^rgb/i.test(v)
      ? nums.map((n, idx) => (idx < 3 ? n / 255 : n))
      : nums.map((n, idx) => (idx < 3 ? (n <= 1 ? n : n / 255) : n))
    const r = conv[0]
    const g = conv[1]
    const b = conv[2]
    const a = conv[3]
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
    const hue = nums[0] ?? 0
    const sat = (nums[1] ?? 0) / 100
    const lig = (nums[2] ?? 0) / 100
    const { r, g, b } = hslToRgb(hue, Math.min(1, Math.max(0, sat)), Math.min(1, Math.max(0, lig)))
    const a = nums[3]
    return { r, g, b, a: a !== undefined ? Math.min(1, Math.max(0, a)) : undefined }
  }

  if (/^[a-zA-Z]+$/.test(v)) return NAMED_COLORS.get(lower)
  return undefined
}

function isOpaque(rgb: RGBa | undefined): boolean {
  return !!rgb && (rgb.a === undefined || rgb.a >= 1)
}

// Original drawing ink: black or a very dark neutral.
function isInkColor(rgb: RGBa): boolean {
  if (!isOpaque(rgb)) return false
  const { s, l } = rgbToHsl(rgb)
  return l <= 0.1 && s <= 0.35
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

  if (allowPaper && s < 0.25 && l >= 0.55) {
    // Paper role: light surfaces co-adapt with their covering ink.
    return 'var(--vp-c-bg)'
  }

  if (s < 0.08) {
    return undefined // mid grays read fine on both themes
  }

  if (l >= 0.62) {
    // Bright chip surfaces: darken along the same hue so light ink stays
    // readable in dark mode.
    const dark = hslToRgb(h, s, Math.min(0.3, Math.max(0.13, l * 0.3)))
    return rgbToHex({ ...dark })
  }
  if (l <= 0.26) {
    // Very dark chromatic strokes disappear on dark backgrounds: lift them.
    return rgbToHex({ ...hslToRgb(h, s, 0.58) })
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

// Geometry pass: ink pinned over PRESERVED literal light surfaces.
//
// Backdrops whose ink was too far away in paint order for the pairing scan
// stay literal (chart legends drawn early, labels much later). A preserved
// light surface forces DARK ink -- letting such ink follow currentColor
// would brighten it into an unreadable smear on the untouched panel. Every
// ink element whose center lies inside a preserved surface's polygon/bbox is
// therefore reverted to original black.
//
// Surface eligibility: literal light OPAQUE fills that are SOLID in their
// bounding box (polyArea/bboxArea >= SOLID_RATIO). Thin strokes and ring
// outlines collapse to ~zero polygon area and never create pinning zones (a
// ring's bbox would otherwise swallow the whole atom). Translucent whites
// are excluded too -- they adapt alongside their covering ink. Gradient
// defs are exempt upstream; their mid-tone stops tolerate both polarities,
// so covering text keeps adapting there by design.
const SOLID_RATIO = 0.12

function pinInkOverLiteralSurfaces(svg: string): string {
  const vb = /viewBox="([\d.eE+-]+) ([\d.eE+-]+) ([\d.eE+-]+) ([\d.eE+-]+)"/.exec(svg)
  const minArea = vb
    ? 0.002 * parseFloat(vb[3]!) * parseFloat(vb[4]!)
    : 0 // noise floor: specks/markers never become pinning zones

  const surfaces: Box[] = []
  const inkSpans: Array<{ start: number; end: number }> = []
  let gradDepth = 0

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
    if (gradDepth > 0) continue // stops live outside role semantics
    if (m.index === undefined) continue

    const cls = /class="([^"]*)"/.exec(tag)?.[1] ?? ''
    const fillMatch = /\bfill="([^"]*)"/.exec(tag)
    const fillRgb = fillMatch?.[1] ? parseColorValue(fillMatch[1]) : undefined
    const dMatch = /\bd="([^"]+)"/.exec(tag)

    // Preserved literal light OPAQUE shape -> protected surface.
    // Translucent lights are excluded: they adapt via color-mix alongside
    // their covering ink, so nothing may be pinned against them.
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
        surfaces.push(geo.box)
      }
    }

    // Tag-local self-pin: a light literal fill sharing its tag with
    // currentColor paints (electron dots: gray fill + adapting outline)
    // keeps its original dark outline in both themes.
    let selfPinned = false
    if (
      fillRgb &&
      fillMatch![1]!.length <= 7 &&
      isLightSurfaceRGB(fillRgb) &&
      tag.includes('currentColor')
    ) {
      inkSpans.push({ start: m.index, end: m.index + tag.length })
      selfPinned = true
    }

    // Ink candidates: currentColor elements whose center lies inside any
    // protected surface (nucleus text over the gray disc, legend labels
    // over white panels, ...).
    if (tag.includes('currentColor') && !selfPinned) {
      const d = dMatch?.[1]
      const usePos = /\bx="([\d.eE+-]+)".*?\by="([\d.eE+-]+)"/.exec(tag)
      let box: Box | undefined
      if (d) box = pathGeometry(d)?.box
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
      .replaceAll('fill="currentColor"', 'fill="#000000"')
      .replaceAll('stroke="currentColor"', 'stroke="#000000"')
      .replaceAll('fill:currentColor', 'fill:#000000')
      .replaceAll('stroke:currentColor', 'stroke:#000000')
    svg = svg.slice(0, span.start) + reverted + svg.slice(span.end)
  }
  return svg
}

export function applySvgTheme(input: string): string {
  // 1) Embedded vector images first: their colors must join the pipeline.
  let svg = unfoldEmbeddedSvgImages(input)

  // 2) Structural canvas detection: typst always paints the page as the very
  //    first full-bleed path ("M 0 0v ... Z"). A NON-near-white canvas means
  //    the author designed for a dark/tinted surface -- remapping ink or
  //    chips would destroy that design, so the figure passes through as-is.
  //    (Purely structural + luminance-based; no hardcoded colors.)
  const bgMatch =
    /<path\b[^>]*\bclass="typst-shape"[^>]*\bfill="([^"]*)"[^>]*\bd="M 0 0v /.exec(svg)
  const bgRgb = bgMatch?.[1] ? parseColorValue(bgMatch[1]) : undefined
  const bgIsAdaptiveWhite = !!bgRgb && isOpaque(bgRgb) && isLightSurfaceRGB(bgRgb)
  if (bgMatch && !bgIsAdaptiveWhite) return svg

  // 3) Ink: currentColor is a CSS-wide keyword, valid both in presentation
  //    attributes and style declarations.
  for (const [from, to] of INK_SWAPS) svg = svg.replaceAll(from, to)

  // 4) The canvas path itself gets the paper role (near-white -> follows
  //    --vp-c-bg).
  svg = svg.replace(
    /<path\b([^>]*\bclass="typst-shape"[^>]*?)\bfill="([^"]*)"/,
    (_m, attrs: string, value: string) => {
      const rgb = parseColorValue(value)
      if (!rgb || !isOpaque(rgb) || !isLightSurfaceRGB(rgb)) return _m
      const mapped = adaptPaint(value, true)
      if (!mapped) return _m
      return `<path${attrs}style="fill:${mapped};"`
    },
  )

  // 5) Backed-light pairing (paint-order + element-kind semantics): an
  //    opaque near-white SHAPE immediately followed by painted elements acts
  //    as a text/equation BACKDROP and co-adapts with them; an isolated
  //    light mark stays literal. Scan the tag stream, hold each candidate as
  //    pending until the next painted element resolves it.
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
        // A new near-white surface supersedes an unresolved pending one.
        pending = { start: m.index!, end: m.index! + tag.length, raw: fillMatch![1]! }
        continue
      }

      if (!painted) continue
      if (pending && !isShape) {
        // Painted content over the held surface -> backdrop confirmed.
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
  //    Excluded subtrees: gradient defs (continuity), masks/filters (their
  //    arithmetic depends on exact colors), clipPaths (no visible paint),
  //    scripts. <style> blocks get their CSS text transformed separately.
  const EXCLUDED = new Set([
    'linearGradient',
    'radialGradient',
    'mask',
    'filter',
    'clipPath',
    'script',
    'style',
  ])
  const edits: Array<{ start: number; end: number; text: string }> = []
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

  // 8) Geometry pinning runs LAST: it reverts covering ink to literal black,
  //    and any earlier pass must not reinterpret that decision.
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
