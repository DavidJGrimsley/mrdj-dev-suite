import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const srcDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'src')

function* sourceFiles(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) yield* sourceFiles(full)
    else if (/\.(tsx?|css)$/.test(entry.name)) yield full
  }
}

// A literal "/assets/..." is resolved against the site root and breaks under /iSquared/.
// Public-folder files must go through assetUrl() (src/app/assetUrl.ts).
test('public asset URLs go through assetUrl() so the hosted base path applies', () => {
  const offenders = []
  for (const file of sourceFiles(srcDir)) {
    fs.readFileSync(file, 'utf8')
      .split(/\r?\n/)
      .forEach((line, index) => {
        if (/["'`(]\/assets\//.test(line) && !/assetUrl\(/.test(line)) {
          offenders.push(`${path.relative(srcDir, file)}:${index + 1}`)
        }
      })
  }
  assert.deepEqual(offenders, [])
})
