import { icons as simpleIcons } from '@iconify-json/simple-icons'
import { icons as tabler } from '@iconify-json/tabler'
import type { IconifyJSON } from '@iconify-json/simple-icons'
import { getIconData, iconToHTML, iconToSVG, replaceIDs } from '@iconify/utils'

// Icon sets available for the `::set:name::` syntax. Add more
// `@iconify-json/*` packages here to enable them.
const collections: Record<string, IconifyJSON> = {
  'simple-icons': simpleIcons,
  tabler,
}

// Build-time renderer for @mdit/plugin-icon: emits inline SVG so icons
// are part of the server-rendered HTML (no runtime/API dependency).
export const inlineSvgRender = (content: string): string => {
  const tokens = content.trim().split(/\s+/)

  const nameToken = tokens.find((token) => token.includes(':'))
  if (!nameToken) {
    console.warn(
      `[iconify] malformed icon syntax, expected "set:name": ::${content.trim()}::`,
    )
    return ''
  }

  const [prefix, iconName] = nameToken.split(':', 2)
  const collection = collections[prefix]
  if (!collection || !iconName) {
    console.warn(`[iconify] unknown icon set or malformed name: ${nameToken}`)
    return ''
  }

  const data = getIconData(collection, iconName)
  if (!data) {
    const hint = /[=/]/.test(iconName)
      ? ' (modifiers like "=24" or "/#fff" must be separate tokens, not attached to the name)'
      : ''
    console.warn(`[iconify] icon not found in "${prefix}": ${iconName}${hint}`)
    return ''
  }

  // Supported modifiers: `=size` (any CSS length) and `/color`.
  const size = tokens.find((token) => token.startsWith('='))?.slice(1)
  const color = tokens.find((token) => token.startsWith('/'))?.slice(1)

  // Default height is 1em so the icon always follows the surrounding
  // font size. VitePress's base reset forces `svg { display: block }`,
  // so re-inline it here to let icons flow inside paragraphs;
  // -0.125em vertical-align optically aligns them with text
  // (per Iconify's inline alignment recommendation).
  const { body, attributes } = iconToSVG(data, { height: size || '1em' })
  const styles = ['display:inline-block', 'vertical-align:-0.125em']
  if (color) styles.push(`color:${color}`)
  Object.assign(attributes, {
    style: styles.join(';'),
    'aria-hidden': 'true',
  })

  return iconToHTML(replaceIDs(body), attributes)
}
