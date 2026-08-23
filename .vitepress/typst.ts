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

export function typstFencePlugin(md: MarkdownIt): void {
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

    return `<div class="typst-figure">${result.svg}</div>`
  }
}
