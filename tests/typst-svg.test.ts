import { describe, expect, it } from 'vitest'
import {
  applySvgTheme,
  compileCacheKey,
  parseColorValue,
  pinAudit,
  stripScripts,
} from '../.vitepress/typst.ts'

function expectRGB(
  raw: string,
  r: number,
  g: number,
  b: number,
  a?: number,
): void {
  const c = parseColorValue(raw)
  expect(c).toBeDefined()
  expect(c?.r).toBeCloseTo(r, 4)
  expect(c?.g).toBeCloseTo(g, 4)
  expect(c?.b).toBeCloseTo(b, 4)
  if (a === undefined) expect(c?.a).toBeUndefined()
  else expect(c?.a).toBeCloseTo(a, 4)
}

describe('parseColorValue', () => {
  it('parses 3-digit hex', () => {
    expectRGB('#fff', 1, 1, 1)
  })

  it('parses 4-digit hex with alpha (digit doubling)', () => {
    // #abcd -> #aabbccdd
    expectRGB('#abcd', 0xaa / 255, 0xbb / 255, 0xcc / 255, 0xdd / 255)
  })

  it('rejects invalid hex lengths such as #12345', () => {
    expect(parseColorValue('#12345')).toBeUndefined()
    expect(parseColorValue('#1234567')).toBeUndefined()
  })

  it('parses 8-digit hex with alpha', () => {
    expectRGB('#11223344', 0x11 / 255, 0x22 / 255, 0x33 / 255, 0x44 / 255)
  })

  it('parses comma rgb/rgba syntax with channel scaling and alpha clamp', () => {
    expectRGB('rgb(255, 0, 128)', 1, 0, 128 / 255)
    expectRGB('rgba(0, 0, 255, 0.5)', 0, 0, 1, 0.5)
    expectRGB('rgba(0, 0, 255, 2)', 0, 0, 1, 1)
  })

  it('parses space-separated rgb syntax with slash alpha', () => {
    expectRGB('rgb(255 0 128 / 0.25)', 1, 0, 128 / 255, 0.25)
  })

  it('parses hsl/hsla', () => {
    expectRGB('hsl(120, 100%, 50%)', 0, 1, 0)
    expectRGB('hsla(240, 100%, 50%, 0.25)', 0, 0, 1, 0.25)
  })

  it('resolves named colors including grey aliases and rebeccapurple', () => {
    expectRGB('rebeccapurple', 102 / 255, 51 / 255, 153 / 255)
    expectRGB('white', 1, 1, 1)

    const gray = parseColorValue('gray')
    const grey = parseColorValue('grey')
    expect(gray).toEqual(grey)
  })

  it('maps transparent to fully transparent black', () => {
    expect(parseColorValue('transparent')).toEqual({ r: 0, g: 0, b: 0, a: 0 })
  })

  it('returns undefined for keywords and functional references', () => {
    expect(parseColorValue('currentColor')).toBeUndefined()
    expect(parseColorValue('none')).toBeUndefined()
    expect(parseColorValue('inherit')).toBeUndefined()
    expect(parseColorValue('url(#grad)')).toBeUndefined()
    expect(parseColorValue('var(--x)')).toBeUndefined()
  })

  it('returns undefined for unknown words', () => {
    expect(parseColorValue('banana')).toBeUndefined()
  })
})

describe('applySvgTheme', () => {
  it('maps ink to currentColor and gives the near-white canvas the paper role', () => {
    const input =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">'
      + '<path class="typst-shape" fill="#ffffff" d="M 0 0v 10h 10V 0z"/>'
      + '<path fill="#000000" d="M 1 1L 2 2"/></svg>'
    const out = applySvgTheme(input)
    expect(out).toContain('style="fill:light-dark(#ffffff, var(--vp-c-bg));"')
    expect(out).toContain('fill="currentColor"')
  })

  it('passes through figures authored on a dark canvas verbatim', () => {
    const input =
      '<svg viewBox="0 0 10 10">'
      + '<path class="typst-shape" fill="#111111" d="M 0 0v 10h 10z"/>'
      + '<path fill="#ffffff" d="M 1 1L 2 2"/></svg>'
    expect(applySvgTheme(input)).toBe(input)
  })

  it('self-pins covering ink inside a literal light surface to black', () => {
    const input =
      '<svg viewBox="0 0 100 100">'
      + '<circle class="typst-shape" fill="#f2f2f2" stroke="currentColor"'
      + ' d="M 50 20 A 30 30 0 1 0 50.1 20z"/></svg>'
    const out = applySvgTheme(input)
    expect(out).toContain('stroke="#000000"')
    expect(out).not.toContain('stroke="currentColor"')
    expect(out).toContain('fill="#f2f2f2"')
    expect(pinAudit(out)).toHaveLength(0)
  })

  it('pins currentColor ink contained in a preserved light panel', () => {
    // The gray panel (#d9d9d9) stays literal (mid-gray band), and the glyph
    // drawn after it is a typst-shape so pairing confirmation never fires --
    // exactly the "legend panel keeps white, its ink pins" rule.
    const input =
      '<svg viewBox="0 0 100 100">'
      + '<path class="typst-shape" fill="#d9d9d9" d="M 10 10L 90 10L 90 90L 10 90z"/>'
      + '<path class="typst-shape" fill="currentColor" d="M 45 45L 55 45L 55 55L 45 55z"/></svg>'
    const out = applySvgTheme(input)
    expect(out).toContain('fill="#d9d9d9"')
    expect(out).toContain('fill="#000000"')
    expect(out).not.toContain('fill="currentColor"')
    expect(pinAudit(out)).toHaveLength(0)
  })

  it('leaves gradient stop colors untouched (continuity exemption)', () => {
    const input =
      '<svg viewBox="0 0 10 10"><defs><linearGradient id="g">'
      + '<stop stop-color="#ff0000"/><stop offset="1" stop-color="#0000ff"/>'
      + '</linearGradient></defs>'
      + '<path fill="url(#g)" d="M 0 0v 10h 10z"/></svg>'
    const out = applySvgTheme(input)
    expect(out).toContain('stop-color="#ff0000"')
    expect(out).toContain('stop-color="#0000ff"')
  })
})

describe('stripScripts', () => {
  it('removes script elements with content', () => {
    expect(stripScripts('<svg><script>alert(1)</script><rect/></svg>')).toBe(
      '<svg><rect/></svg>',
    )
  })

  it('removes self-closing script elements', () => {
    expect(stripScripts('<svg><script src="x.js"/><rect/></svg>')).toBe(
      '<svg><rect/></svg>',
    )
  })

  it('matches case-insensitively', () => {
    expect(stripScripts('<svg><SCRIPT>x</SCRIPT></svg>')).toBe('<svg></svg>')
  })

  it('leaves script-free markup untouched', () => {
    const svg = '<svg><path d="M 0 0"/></svg>'
    expect(stripScripts(svg)).toBe(svg)
  })
})

describe('compileCacheKey', () => {
  it('is deterministic for identical sources', () => {
    expect(compileCacheKey('$ x = 1 $')).toBe(compileCacheKey('$ x = 1 $'))
  })

  it('differs for different sources', () => {
    expect(compileCacheKey('$ x = 1 $')).not.toBe(compileCacheKey('$ x = 2 $'))
  })

  it('yields a 20-char hex key', () => {
    expect(compileCacheKey('hello')).toMatch(/^[0-9a-f]{20}$/)
  })
})
