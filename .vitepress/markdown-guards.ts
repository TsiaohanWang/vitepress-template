import type { MarkdownIt, RendererRule } from 'markdown-it'

// Escape literal "{{"/"}}" in prose and inline code into HTML entities.
//
// Pages are compiled as Vue templates: unescaped mustaches there either
// crash the build ("{{ a b c }}") or are silently evaluated away
// ("{{ user.name }}"). Entities render as literal braces while being
// invisible to the compiler. Fenced blocks are unaffected (their token
// types differ); raw HTML/SFC authors keep full Vue support because html
// tokens bypass this rule.
export const mustacheGuard = (md: MarkdownIt): void => {
  const escapeMustaches = (raw: string): string =>
    md.utils
      .escapeHtml(raw)
      .replaceAll('{{', '&#123;&#123;')
      .replaceAll('}}', '&#125;&#125;')

  const guard: RendererRule = (tokens, idx) =>
    escapeMustaches(tokens[idx]?.content ?? '')

  md.renderer.rules.text = guard

  // Inline code keeps its <code> wrapper (native behaviour) while the
  // content itself is still brace-escaped.
  md.renderer.rules.code_inline = (tokens, idx) =>
    `<code>${escapeMustaches(tokens[idx]?.content ?? '')}</code>`
}
