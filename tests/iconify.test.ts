import { describe, expect, it } from 'vitest'
import { inlineSvgRender } from '../.vitepress/iconify.ts'

describe('inlineSvgRender', () => {
  it('renders a known icon as inline svg', () => {
    const svg = inlineSvgRender('simple-icons:vuedotjs')
    expect(svg).toContain('<svg')
    expect(svg).toContain('aria-hidden="true"')
  })

  it('defaults height to 1em for text-relative sizing', () => {
    expect(inlineSvgRender('tabler:home')).toContain('height="1em"')
  })

  it('applies a whitelisted size modifier', () => {
    expect(inlineSvgRender('simple-icons:vuedotjs =24')).toContain(
      'height="24"',
    )
  })

  it('applies a whitelisted color modifier via CSS color', () => {
    expect(inlineSvgRender('gravity-ui:house /#181717')).toContain(
      'color:#181717',
    )
  })

  it('ignores an invalid size modifier but still renders the icon', () => {
    const svg = inlineSvgRender('simple-icons:vuedotjs =wide')
    expect(svg).toContain('<svg')
    expect(svg).toContain('height="1em"')
  })

  it('rejects invalid-length hex colors (regression: #12345)', () => {
    const svg = inlineSvgRender('simple-icons:vuedotjs /#12345')
    expect(svg).toContain('<svg')
    expect(svg).not.toContain('color:#12345')
  })

  it('accepts legal hex widths (3 digits)', () => {
    expect(inlineSvgRender('simple-icons:vuedotjs /#f60')).toContain(
      'color:#f60',
    )
  })

  it('returns empty for unknown icon sets', () => {
    expect(inlineSvgRender('nope:thing')).toBe('')
  })

  it('returns empty for unknown icon names', () => {
    expect(inlineSvgRender('simple-icons:this-icon-does-not-exist')).toBe('')
  })

  it('returns empty when the name token lacks a set prefix', () => {
    expect(inlineSvgRender('plainname')).toBe('')
  })

  it('rejects modifiers attached to the name (documented trap)', () => {
    // "::set:name=24::" makes "name=24" the lookup key -> icon not found.
    expect(inlineSvgRender('simple-icons:vuedotjs=24')).toBe('')
  })
})
