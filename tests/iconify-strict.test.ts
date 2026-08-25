import { describe, expect, it } from 'vitest'

// Must be assigned before the module under test is imported: strictness is
// captured at module load time. Vitest isolates workers per file, so this
// environment mutation cannot leak into the non-strict suite.
process.env.ICONIFY_STRICT = '1'

describe('inlineSvgRender in ICONIFY_STRICT mode', () => {
  it('throws instead of warning on unknown icons', async () => {
    const { inlineSvgRender } = await import('../.vitepress/iconify.ts')
    expect(() => inlineSvgRender('nope:thing')).toThrow(/^\[iconify\]/)
  })

  it('still renders valid icons', async () => {
    const { inlineSvgRender } = await import('../.vitepress/iconify.ts')
    expect(inlineSvgRender('simple-icons:vuedotjs')).toContain('<svg')
  })
})
