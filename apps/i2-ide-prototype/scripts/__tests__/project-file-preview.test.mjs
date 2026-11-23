// Contracts for the B09 info.md / todo.md previews (src/app/onboarding/ProjectFilePreview.tsx).
// Renders the component to static markup so the example content, reduced-motion resting states and
// controlled steps are checked without a browser.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const onboardingDir = path.join(appRoot, 'src', 'app', 'onboarding')
const read = (rel) => fs.readFileSync(path.join(onboardingDir, rel), 'utf8')

let modPromise
function loadPreview() {
  modPromise ??= (async () => {
    const esbuild = await import('esbuild')
    const outfile = path.join(appRoot, 'node_modules', '.cache', 'project-file-preview-test', 'bundle.mjs')
    await esbuild.build({
      stdin: {
        contents: [
          `export * from './ProjectFilePreview.tsx';`,
          `export * from './projectFilePreviewData.ts';`,
          `export { createElement } from 'react';`,
          `export { renderToStaticMarkup } from 'react-dom/server';`,
        ].join('\n'),
        resolveDir: onboardingDir,
        loader: 'ts',
      },
      bundle: true,
      packages: 'external',
      format: 'esm',
      platform: 'node',
      jsx: 'automatic',
      outfile,
      logLevel: 'silent',
    })
    return import(`${pathToFileURL(outfile).href}?t=${Date.now()}`)
  })()
  return modPromise
}

async function render(props) {
  const mod = await loadPreview()
  return mod.renderToStaticMarkup(mod.createElement(mod.ProjectFilePreview, props))
}
const count = (html, needle) => html.split(needle).length - 1

test('scope: new preview files only import react, motion, lucide-react and local data', () => {
  for (const file of ['ProjectFilePreview.tsx', 'projectFilePreviewData.ts']) {
    const imports = [...read(file).matchAll(/from\s+["']([^"']+)["']/g)].map((m) => m[1])
    for (const spec of imports) {
      assert.ok(['react', 'motion/react', 'lucide-react', './projectFilePreviewData'].includes(spec), `${file}: ${spec}`)
    }
  }
})

test('data: every info check points at a real info.md line and the flagged one rests under reduced motion', async () => {
  const mod = await loadPreview()
  const ids = new Set(mod.INFO_LINES.map((l) => l.id))
  for (const c of mod.INFO_CHECKS) assert.ok(ids.has(c.line), c.session)
  assert.equal(mod.INFO_CHECKS[mod.INFO_RESTING_STEP].verdict, 'flag')
  assert.equal(mod.TODO_EVENTS.length, mod.TODO_STEP_COUNT)
  for (const item of mod.TODO_ITEMS) {
    assert.ok(item.appearsAt >= 0 && item.appearsAt < mod.TODO_STEP_COUNT, item.id)
    if (item.doneAt !== undefined) assert.ok(item.doneAt >= item.appearsAt && item.doneAt < mod.TODO_STEP_COUNT, item.id)
  }
  const sources = new Set(mod.TODO_ITEMS.map((i) => i.source))
  for (const s of ['you', 'github', 'info', 'infie']) assert.ok(sources.has(s), `todo source ${s} is shown`)
})

test('info.md preview: recognizable file, sample project and every Session check under reduced motion', async () => {
  const html = await render({ file: 'info', reducedMotion: true })
  assert.match(html, /data-name="ProjectInfoPreview"/)
  assert.match(html, /data-file="info\.md"/)
  assert.match(html, /data-reduced-motion="true"/)
  assert.match(html, /data-step="1"/)
  assert.match(html, /role="figure"/)
  for (const text of ['info.md', 'Sprout', 'Purpose:', 'For:', 'Must:', 'session/watering-streaks', 'session/ad-banner', 'session/offline-cache', 'Infie:']) {
    assert.ok(html.includes(text), text)
  }
  assert.match(html, /data-info-line="must" data-active="true"/)
  assert.equal(count(html, 'data-active="true"'), 1)
})

test('todo.md preview: reduced motion rests on the finished list with one item checked off', async () => {
  const html = await render({ file: 'todo', reducedMotion: true })
  assert.match(html, /data-name="ProjectTodoPreview"/)
  assert.match(html, /data-file="todo\.md"/)
  assert.match(html, /data-step="3"/)
  assert.equal(count(html, 'data-visible="true"'), 4)
  assert.equal(count(html, 'data-done="true"'), 1)
  assert.match(html, /data-todo="reminders" data-visible="true" data-done="true"/)
  for (const text of ['todo.md', 'GitHub #42', 'info.md', 'Checked off!']) assert.ok(html.includes(text), text)
})

test('controlled step: todo items arrive in order and hidden rows stay out of the a11y tree', async () => {
  const first = await render({ file: 'todo', reducedMotion: false, step: 0 })
  assert.equal(count(first, 'data-visible="true"'), 2)
  assert.equal(count(first, 'data-visible="false" data-done="false" aria-hidden="true"'), 2)
  const third = await render({ file: 'todo', reducedMotion: false, step: 2 })
  assert.match(third, /data-todo="offline" data-visible="true"/)
  assert.match(third, /data-todo-event="info"/)
  const wrapped = await render({ file: 'info', reducedMotion: false, step: 5 })
  assert.match(wrapped, /data-step="2"/)
})
