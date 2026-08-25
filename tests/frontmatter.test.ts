import { describe, expect, it } from 'vitest'
import { normalizeKeywords } from '../.vitepress/frontmatter.ts'

describe('normalizeKeywords', () => {
  it('accepts string arrays as-is', () => {
    expect(normalizeKeywords(['a', 'b'])).toEqual(['a', 'b'])
  })

  it('stringifies array members', () => {
    expect(normalizeKeywords([1, true])).toEqual(['1', 'true'])
  })

  it('splits comma-separated strings', () => {
    expect(normalizeKeywords('a, b,c')).toEqual(['a', 'b', 'c'])
  })

  it('trims parts and drops empties', () => {
    expect(normalizeKeywords(['  a ', '', '  '])).toEqual(['a'])
    expect(normalizeKeywords(' , a ,,')).toEqual(['a'])
  })

  it('returns [] for unsupported shapes', () => {
    expect(normalizeKeywords(undefined)).toEqual([])
    expect(normalizeKeywords(null)).toEqual([])
    expect(normalizeKeywords(42)).toEqual([])
    expect(normalizeKeywords({ kw: 'a' })).toEqual([])
  })
})
