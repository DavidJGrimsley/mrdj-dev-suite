// Static checks for a hosted (subpath) build. Pure file inspection so it can be unit tested
// and run against any directory produced by `pnpm build:hosted`.
import fs from 'node:fs'
import path from 'node:path'

const TEXT_EXTENSIONS = new Set(['.html', '.js', '.mjs', '.css', '.json', '.svg', '.txt', '.webmanifest'])
const FORBIDDEN_FILE = /(\.map$|^\.env|\.sqlite3?$|\.db$|^\.git(ignore|attributes)?$)/i
const LOCAL_URL = /(?:https?|wss?):\/\/(?:localhost|127\.0\.0\.1|\[::1\])/i
const SECRET_MARKERS = ['ISQUARED_BETA_CODE_PEPPER', 'ISQUARED_ADMIN_PASSWORD_HASH', 'scrypt$']

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) yield* walk(full)
    else if (entry.isFile()) yield full
  }
}

export function verifyHostedOutput({ dir, basePath, requirePetPreviews = false }) {
  const errors = []
  const files = []
  const indexPath = path.join(dir, 'index.html')

  if (!fs.existsSync(indexPath)) {
    return { errors: [`index.html not found in ${dir}`], files }
  }

  for (const file of walk(dir)) {
    const rel = path.relative(dir, file).split(path.sep).join('/')
    files.push(rel)

    if (FORBIDDEN_FILE.test(path.basename(file))) {
      errors.push(`${rel}: file type must not be shipped in the hosted build`)
    }

    if (!TEXT_EXTENSIONS.has(path.extname(file).toLowerCase())) continue
    const text = fs.readFileSync(file, 'utf8')

    if (/\/\/[#@]\s*sourceMappingURL=/.test(text)) errors.push(`${rel}: contains a sourceMappingURL`)
    if (LOCAL_URL.test(text)) errors.push(`${rel}: references a localhost URL`)
    for (const marker of SECRET_MARKERS) {
      if (text.includes(marker)) errors.push(`${rel}: contains access-control marker "${marker}"`)
    }
  }

  const checkHtmlUrls = (htmlPath, expectedBase, label) => {
    const html = fs.readFileSync(htmlPath, 'utf8')
    for (const match of html.matchAll(/\b(?:src|href)=["']([^"']+)["']/g)) {
      const url = match[1]
      if (/^(?:[a-z][a-z0-9+.-]*:|#|data:)/i.test(url) || url.startsWith('//')) continue
      if (url.startsWith('/') && !url.startsWith(expectedBase)) {
        errors.push(`${label}: "${url}" is not under base ${expectedBase}`)
      } else if (!url.startsWith('/')) {
        errors.push(`${label}: "${url}" is relative; expected an absolute path under ${expectedBase}`)
      }
    }
    if (!/<script[^>]+(?:type="module"[^>]+src="[^"]+"|src="[^"]+"[^>]*defer)/.test(html)) {
      errors.push(`${label}: no entry script found`)
    }
    return html
  }

  const rootHtml = checkHtmlUrls(indexPath, basePath, 'index.html')
  if (!/<script[^>]+type="module"[^>]+src="[^"]+"/.test(rootHtml)) {
    errors.push('index.html: no module script found')
  }

  for (const ver of ['v1', 'v2']) {
    const nestedDir = path.join(dir, 'preview', 'pet-show-and-tell', ver)
    const nestedIndex = path.join(nestedDir, 'index.html')
    const nestedMeta = path.join(nestedDir, 'metadata.json')
    const exists = fs.existsSync(nestedIndex)
    if (requirePetPreviews && !exists) {
      errors.push(`preview/pet-show-and-tell/${ver}/index.html not found`)
      continue
    }
    if (exists) {
      const expectedBase = `${basePath}preview/pet-show-and-tell/${ver}/`
      const nestedHtml = checkHtmlUrls(
        nestedIndex,
        expectedBase,
        `preview/pet-show-and-tell/${ver}/index.html`,
      )
      if (!nestedHtml.includes('data-i2-pet-index-shim="1"')) {
        errors.push(`preview/pet-show-and-tell/${ver}/index.html: missing pre-router path normalization shim`)
      }
      if (!fs.existsSync(nestedMeta)) {
        errors.push(`preview/pet-show-and-tell/${ver}/metadata.json not found`)
      }
    }
  }

  return { errors, files }
}
