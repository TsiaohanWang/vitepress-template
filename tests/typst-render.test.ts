import { describe, expect, it } from 'vitest'
import { renderTypst } from '../.vitepress/typst.ts'

// End-to-end smoke tests against the real native addon. They double as a
// guard that the N-API binary keeps loading through the runtime require in
// fresh environments (CI included).

describe('renderTypst (native compiler)', () => {
  it(
    'compiles a minimal figure to inline svg',
    () => {
      const source =
        '#set page(width: auto, height: auto, margin: 2pt)\n'
        + '#rect(width: 3cm, height: 1cm)'
      const res = renderTypst(source)
      expect(res.error).toBeUndefined()
      expect(res.svg).toContain('<svg')
    },
    30_000,
  )

  it(
    'reports an error payload for broken sources instead of throwing',
    () => {
      const res = renderTypst('#this-is-not-valid-typst();')
      expect(res.error).toBeTruthy()
      expect(res.svg).toBeUndefined()
    },
    30_000,
  )
})
