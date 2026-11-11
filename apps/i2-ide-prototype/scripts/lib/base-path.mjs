// Normalizes the public base path the hosted build is served from ("/iSquared/").
// Shared by vite.figma.config.ts and the hosted build scripts so they cannot disagree.

export const DEFAULT_HOSTED_BASE_PATH = '/iSquared/'

export function normalizeBasePath(value) {
  const raw = String(value ?? '').trim()
  if (!raw) throw new Error('Base path must not be empty.')
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw) || raw.startsWith('//')) {
    throw new Error(`Base path must be a path, not a URL: ${raw}`)
  }
  if (/[\?#\s]/.test(raw)) {
    throw new Error(`Base path must not contain whitespace, backslashes, "?" or "#": ${raw}`)
  }
  const segments = raw.split('/').filter(Boolean)
  if (segments.some((segment) => segment === '.' || segment === '..')) {
    throw new Error(`Base path must not contain "." or ".." segments: ${raw}`)
  }
  return segments.length === 0 ? '/' : `/${segments.join('/')}/`
}

// ISQUARED_BASE_PATH wins, then Figma Make's FIGMA_PUBLIC_URL, then the dev default "/".
export function resolveBasePath(env = process.env) {
  if (env.ISQUARED_BASE_PATH) return normalizeBasePath(env.ISQUARED_BASE_PATH)
  if (env.FIGMA_PUBLIC_URL) return `${env.FIGMA_PUBLIC_URL}/`
  return '/'
}
