import { icons as simpleIcons } from '@iconify-json/simple-icons'
import { icons as tabler } from '@iconify-json/tabler'
import { icons as gravityUi } from '@iconify-json/gravity-ui'
import { icons as circleFlags } from '@iconify-json/circle-flags'
import type { IconifyJSON } from '@iconify-json/simple-icons'
import { getIconData, iconToHTML, iconToSVG, replaceIDs } from '@iconify/utils'

// Icon sets available for the `::set:name::` syntax. Add more
// `@iconify-json/*` packages here to enable them.
const collections: Record<string, IconifyJSON> = {
  'simple-icons': simpleIcons,
  tabler,
  'gravity-ui': gravityUi,
  'circle-flags': circleFlags,
}

// Whitelists for the `=size` / `/color` modifiers: size must be a plain
// CSS length, color a valid-length hex (#rgb / #rgba / #rrggbb / #rrggbbaa)
// or named value. Anything else is rejected before it can reach the
// generated SVG attributes/style, so a typo can never inject markup or CSS
// into the built HTML. Note {3,8}-style ranges would also admit invalid
// lengths like #12345 -- enumerate the legal widths explicitly.
const SIZE_PATTERN = /^\d+(?:\.\d+)?(?:em|rem|px|%)?$/
const COLOR_PATTERN = /^(?:#[0-9a-fA-F]{3,4}|#[0-9a-fA-F]{6}|#[0-9a-fA-F]{8}|[a-zA-Z]+)$/

// Set ICONIFY_STRICT=1 (e.g. in CI) to turn every icon warning into a
// hard build failure instead of silently dropping the icon.
const strict = process.env.ICONIFY_STRICT === '1'

const fail = (message: string): void => {
  if (strict) throw new Error(`[iconify] ${message}`)
  console.warn(`[iconify] ${message}`)
}

// Build-time renderer for @mdit/plugin-icon: emits inline SVG so icons
// are part of the server-rendered HTML (no runtime/API dependency).
export const inlineSvgRender = (content: string): string => {
  const tokens = content.trim().split(/\s+/)

  const nameToken = tokens.find((token) => token.includes(':'))
  if (!nameToken) {
    fail(`malformed icon syntax, expected "set:name": ::${content.trim()}::`)
    return ''
  }

  const [prefix, iconName] = nameToken.split(':', 2)
  if (!prefix || !iconName) {
    fail(`unknown icon set or malformed name: ${nameToken}`)
    return ''
  }
  const collection = collections[prefix]
  if (!collection) {
    fail(`unknown icon set or malformed name: ${nameToken}`)
    return ''
  }

  const data = getIconData(collection, iconName)
  if (!data) {
    const hint = /[=/]/.test(iconName)
      ? ' (modifiers like "=24" or "/#fff" must be separate tokens, not attached to the name)'
      : ''
    fail(`icon not found in "${prefix}": ${iconName}${hint}`)
    return ''
  }

  // Supported modifiers: `=size` and `/color`, each a separate token.
  // Invalid values warn and are ignored; the bare icon still renders.
  let size: string | undefined
  const rawSize = tokens.find((token) => token.startsWith('=') && token.length > 1)?.slice(1)
  if (rawSize !== undefined) {
    if (SIZE_PATTERN.test(rawSize)) {
      size = rawSize
    } else {
      fail(`invalid size modifier "=${rawSize}", expected e.g. "=24" or "=1.5em"`)
    }
  }

  let color: string | undefined
  const rawColor = tokens.find((token) => token.startsWith('/') && token.length > 1)?.slice(1)
  if (rawColor !== undefined) {
    if (COLOR_PATTERN.test(rawColor)) {
      color = rawColor
    } else {
      fail(`invalid color modifier "/${rawColor}", expected hex or named color`)
    }
  }

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
