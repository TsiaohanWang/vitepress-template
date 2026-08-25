import MarkdownIt from 'markdown-it'
import { describe, expect, it } from 'vitest'
import { mustacheGuard } from '../.vitepress/markdown-guards.ts'

const md = new MarkdownIt().use(mustacheGuard)

describe('mustacheGuard', () => {
  it('escapes double mustaches in prose into HTML entities', () => {
    expect(md.render('value {{ user.name }} here')).toContain(
      '&#123;&#123; user.name &#125;&#125;',
    )
  })

  it('escapes mustaches inside headings', () => {
    expect(md.render('# Title {{x}}')).toContain(
      'Title &#123;&#123;x&#125;&#125;',
    )
  })

  it('leaves single braces untouched', () => {
    expect(md.render('a { b }')).toContain('a { b }')
  })

  it('escapes braces in inline code while keeping the <code> wrapper', () => {
    expect(md.render('use `{{ x }}` here')).toContain(
      '<code>&#123;&#123; x &#125;&#125;</code>',
    )
  })

  it('leaves fenced code blocks untouched', () => {
    expect(md.render('```\n{{ raw }}\n```')).toContain('{{ raw }}')
  })

  it('renders benign prose unchanged apart from brace entities', () => {
    expect(md.render('plain text')).toBe('<p>plain text</p>\n')
  })
})
