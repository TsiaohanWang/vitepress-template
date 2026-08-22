// Normalize a frontmatter "keywords" value into a clean string[]:
// accepts an array or a comma-separated string; parts are trimmed and
// empties dropped. Shared by the build-time validation (config.mts) and
// the DocHeader component so both sides always agree on the shape.
export const normalizeKeywords = (raw: unknown): string[] => {
  const parts = Array.isArray(raw) ? raw : typeof raw === 'string' ? raw.split(',') : []
  return parts.map((part) => String(part).trim()).filter((part) => part !== '')
}
