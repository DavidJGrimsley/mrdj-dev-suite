import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { normalizeBasePath, resolveBasePath } from '../lib/base-path.mjs'
import { verifyHostedOutput } from '../lib/verify-hosted-output.mjs'
import { outputFileHashes, validateHostedOutputLocation } from '../lib/hosted-output-safety.mjs'

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

test('hosted output protection preserves unrelated files and rejects changed builds', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'isq-output-safety-'))
  try {
    const out = path.join(root, 'public')
    const web = path.join(out, 'web')
    fs.mkdirSync(web, { recursive: true })
    fs.writeFileSync(path.join(out, 'important.txt'), 'preserve me')
    fs.writeFileSync(path.join(web, 'index.html'), 'existing source')
    assert.throws(() => validateHostedOutputLocation(root, out, false), /without a matching hosted build manifest/)
    assert.equal(fs.readFileSync(path.join(out, 'important.txt'), 'utf8'), 'preserve me')
    assert.equal(fs.readFileSync(path.join(web, 'index.html'), 'utf8'), 'existing source')
    const fileHashes = outputFileHashes(web)
    fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify({ fileCount: 1, indexHtmlSha256: fileHashes['index.html'] }))
    assert.throws(() => validateHostedOutputLocation(root, out, false), /no file inventory/)
    fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify({ fileCount: 1, indexHtmlSha256: fileHashes['index.html'], fileHashes }))
    assert.doesNotThrow(() => validateHostedOutputLocation(root, out, false))
    fs.mkdirSync(path.join(web, 'untracked-empty'))
    assert.throws(() => validateHostedOutputLocation(root, out, false), /untracked empty directory/)
    fs.rmdirSync(path.join(web, 'untracked-empty'))
    fs.writeFileSync(path.join(out, 'isquared-web.tgz'), 'unrelated archive')
    assert.throws(() => validateHostedOutputLocation(root, out, true), /archive not recorded/)
    assert.equal(fs.readFileSync(path.join(out, 'isquared-web.tgz'), 'utf8'), 'unrelated archive')
    fs.writeFileSync(path.join(web, 'index.html'), 'user edits')
    assert.throws(() => validateHostedOutputLocation(root, out, false), /changed since/)
    assert.throws(() => validateHostedOutputLocation(root, path.resolve(root, '..'), false), /subdirectory/)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
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
