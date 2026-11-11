import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { normalizeBasePath, resolveBasePath } from '../lib/base-path.mjs'
import { verifyHostedOutput } from '../lib/verify-hosted-output.mjs'

function makeBuild(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'isq-hosted-'))
  for (const [rel, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true })
    fs.writeFileSync(path.join(dir, rel), content)
  }
  return dir
}

const GOOD_INDEX =
  '<!doctype html><html><head><script type="module" src="/iSquared/assets/index-abc.js"></script>' +
  '<link rel="stylesheet" href="/iSquared/assets/index-abc.css"></head><body></body></html>'

test('normalizeBasePath adds slashes and rejects URLs and traversal', () => {
  assert.equal(normalizeBasePath('iSquared'), '/iSquared/')
  assert.equal(normalizeBasePath('/iSquared/'), '/iSquared/')
  assert.equal(normalizeBasePath('/'), '/')
  assert.throws(() => normalizeBasePath('https://example.com/x/'))
  assert.throws(() => normalizeBasePath('//example.com/'))
  assert.throws(() => normalizeBasePath('/a/../b/'))
  assert.throws(() => normalizeBasePath(''))
  assert.throws(() => normalizeBasePath('/a b/'))
})

test('resolveBasePath prefers ISQUARED_BASE_PATH and defaults to "/" for local dev', () => {
  assert.equal(resolveBasePath({}), '/')
  assert.equal(resolveBasePath({ FIGMA_PUBLIC_URL: '/figma' }), '/figma/')
  assert.equal(resolveBasePath({ ISQUARED_BASE_PATH: 'iSquared', FIGMA_PUBLIC_URL: '/figma' }), '/iSquared/')
})

test('verifyHostedOutput accepts a clean subpath build', () => {
  const dir = makeBuild({
    'index.html': GOOD_INDEX,
    'assets/index-abc.js': 'console.log("hi")',
    'assets/index-abc.css': 'body{margin:0}',
  })
  const { errors } = verifyHostedOutput({ dir, basePath: '/iSquared/' })
  assert.deepEqual(errors, [])
})

test('verifyHostedOutput flags root-relative html URLs, source maps, localhost and secrets', () => {
  const dir = makeBuild({
    'index.html': GOOD_INDEX.replace('/iSquared/assets/index-abc.css', '/assets/index-abc.css'),
    'assets/index-abc.js':
      'fetch("http://localhost:3000/x");process.ISQUARED_BETA_CODE_PEPPER\n//# sourceMappingURL=index-abc.js.map',
    'assets/index-abc.js.map': '{}',
    'data/beta.sqlite': 'x',
  })
  const { errors } = verifyHostedOutput({ dir, basePath: '/iSquared/' })
  const joined = errors.join('\n')
  assert.match(joined, /index\.html: "\/assets\/index-abc\.css" is not under base/)
  assert.match(joined, /sourceMappingURL/)
  assert.match(joined, /localhost URL/)
  assert.match(joined, /ISQUARED_BETA_CODE_PEPPER/)
  assert.match(joined, /index-abc\.js\.map: file type must not be shipped/)
  assert.match(joined, /beta\.sqlite: file type must not be shipped/)
})
