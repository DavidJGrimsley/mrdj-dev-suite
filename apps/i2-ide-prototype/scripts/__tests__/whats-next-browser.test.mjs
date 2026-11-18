// Real-browser acceptance for Home "What's Next" against the hosted build (dist-hosted/web).
// Pet states are produced by the real reducer and seeded through its sessionStorage key; Field Notes
// and Experimemo are created through their real Import / Jenny flows. Run `pnpm build:hosted` first.
import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const petData = await import('../../src/app/pet/petSessionData.ts')
const { createInitialPetReplayState, petReplayReducer, PET_SESSION_STORAGE_KEY, PET_WRAP_UP_STEPS, PET_CODING_DURATION_MS } = petData

const testDir = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(testDir, '..', '..')
const webDir = path.join(appRoot, 'dist-hosted', 'web')
const workspaceRoot = path.resolve(appRoot, '../../..')
const snapshotRoot = `${workspaceRoot}/generated/exact-jenny/tutorial`
const V1_DIR = `${snapshotRoot}/v1-starter/extracted`
const V2_DIR = `${snapshotRoot}/v2-merged/dist`

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain',
  '.wasm': 'application/wasm',
  '.ttf': 'font/ttf',
}

function createStaticServer(distDir, basePath = '/') {
  return http.createServer((req, res) => {
    try {
      const url = new URL(req.url, 'http://127.0.0.1')
      if (url.pathname === '/favicon.ico') {
        res.writeHead(204)
        return res.end()
      }
      if (!url.pathname.startsWith(basePath)) {
        res.writeHead(404)
        return res.end('Not Found')
      }
      let sub = decodeURIComponent(url.pathname.slice(basePath.length))
      if (!sub || sub.endsWith('/')) sub += 'index.html'
      const filePath = path.join(distDir, sub)
      if (filePath.startsWith(distDir) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        res.writeHead(200, { 'Content-Type': MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream' })
        fs.createReadStream(filePath).pipe(res)
      } else {
        res.writeHead(200, { 'Content-Type': 'text/html' })
        fs.createReadStream(path.join(distDir, 'index.html')).pipe(res)
      }
    } catch (e) {
      res.writeHead(500)
      res.end(String(e))
    }
  })
}

const listen = (server) => new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server.address().port)))
const close = (server) => new Promise((resolve) => server.close(resolve))

// ── Real Pet reducer states ──────────────────────────────────────────────────
function petState(target) {
  let s = createInitialPetReplayState()
  s = petReplayReducer(s, { type: 'APPROVE_PLAN', now: 0 })
  s = petReplayReducer(s, { type: 'TICK', now: PET_CODING_DURATION_MS })
  s = petReplayReducer(s, { type: 'TEST_APP' })
  for (const c of s.checklist) s = petReplayReducer(s, { type: 'TOGGLE_CHECKLIST', id: c.id })
  s = petReplayReducer(s, { type: 'VERIFY_TESTING' })
  s = petReplayReducer(s, { type: 'OPEN_PR' })
  s = petReplayReducer(s, { type: 'START_WRAP_UP' })
  for (let i = 0; i < PET_WRAP_UP_STEPS.length; i++) s = petReplayReducer(s, { type: 'WRAP_UP_STEP' })
  s = petReplayReducer(s, { type: 'MERGE_PR' })
  if (target === 'MERGED') return s
  s = petReplayReducer(s, { type: 'SUBMIT_BLANK_REPORT' })
  assert.equal(s.status, 'COMPLETE')
  return s
}

async function seedPet(context, state) {
  // Seed once per tab; later reloads keep whatever the app saved.
  await context.addInitScript(
    ([key, value]) => {
      if (!sessionStorage.getItem('__whats_next_seeded')) {
        sessionStorage.setItem(key, value)
        sessionStorage.setItem('__whats_next_seeded', '1')
      }
    },
    [PET_SESSION_STORAGE_KEY, JSON.stringify(state)],
  )
}

// ── Page helpers ─────────────────────────────────────────────────────────────
const row = (page) => page.locator('[data-name="HomeInfieActionRow"]')
const recs = (page) => page.locator('[data-testid="home-recommendation"]')
const chatText = (page) => page.locator('.i2-conversation-scroll').first().innerText()

async function openHome(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.locator('[data-testid="home-whats-next-button"]').waitFor({ timeout: 15000 })
}

async function backHome(page) {
  await page.getByTitle('Back to i2 Home').first().click()
  await page.locator('[data-testid="home-whats-next-button"]').waitFor({ timeout: 8000 })
}

async function runWhatsNext(page) {
  await page.locator('[data-testid="home-whats-next-button"]').click()
  await page.locator('[data-testid="home-idle-actions"]').waitFor({ state: 'detached', timeout: 8000 })
  await page.locator('[data-testid="home-whats-next-proposals"], [data-testid="home-whats-next-button"]').first().waitFor({ timeout: 8000 })
  await page.waitForFunction(() => !document.querySelector('[data-testid="home-whats-next-scanning"]'), null, { timeout: 8000 })
}

async function recIds(page) {
  return recs(page).evaluateAll((els) => els.map((e) => e.getAttribute('data-recommendation-id')))
}

async function completeJenny(page) {
  await page.locator('button:has-text("Generate new")').click()
  await page.waitForSelector('[data-testid="tutorial-jenny-screen"]', { timeout: 8000 })
  for (let i = 0; i < 27; i++) {
    const btn = page.locator('[data-testid="sample-answer-button"]')
    await btn.waitFor({ state: 'visible', timeout: 8000 })
    await btn.click()
    await page.waitForTimeout(80)
  }
  await page.waitForSelector('[data-testid="tutorial-jenny-screen"]', { state: 'detached', timeout: 12000 })
  await page.locator('[data-testid="project-home"][data-project-id="experimemo"]').waitFor({ timeout: 8000 })
}

async function importFieldNotes(page) {
  await page.getByRole('button', { name: 'Import Project' }).click()
  await page.locator('[data-testid="import-choice"]').click()
  await page.locator('[data-testid="import-message-purpose"]').waitFor({ timeout: 8000 })
  await page.locator('[data-testid="import-reply"]').fill('A private notebook for field notes')
  await page.locator('[data-testid="import-send"]').click()
  await page.locator('[data-testid="project-home"][data-project-id="field-notes"]').waitFor({ timeout: 12000 })
}

test('browser: Home What\'s Next discovery', async (t) => {
  const chromePath = process.env.CHROME_PATH || path.join(process.env.ProgramFiles || 'C:/Program Files', 'Google/Chrome/Application/chrome.exe')
  const pwPath = path.join(workspaceRoot, 'temp', 'exact-upstream', 'node_modules', 'playwright-core')
  if (!fs.existsSync(chromePath) || !fs.existsSync(pwPath)) {
    t.skip('Chrome or playwright-core not available on host')
    return
  }
  assert.ok(fs.existsSync(path.join(webDir, 'index.html')), 'run `pnpm build:hosted` before the browser test')
  const { chromium } = await import(pathToFileURL(path.join(pwPath, 'index.mjs')).href)

  const servers = [createStaticServer(webDir, '/iSquared/')]
  const haveSnapshots = fs.existsSync(path.join(V1_DIR, 'index.html')) && fs.existsSync(path.join(V2_DIR, 'index.html'))
  if (haveSnapshots) servers.push(createStaticServer(V1_DIR), createStaticServer(V2_DIR))
  const ports = await Promise.all(servers.map(listen))
  const previewQuery = haveSnapshots
    ? `&preview_v1=${encodeURIComponent(`http://127.0.0.1:${ports[1]}/`)}&preview_v2=${encodeURIComponent(`http://127.0.0.1:${ports[2]}/`)}`
    : ''
  const appUrl = (extra = '') => `http://127.0.0.1:${ports[0]}/iSquared/?beat=COMPLETE${previewQuery}${extra}`

  const browser = await chromium.launch({ executablePath: chromePath, headless: true })
  const pageErrors = []
  const newPage = async (opts = {}, seed) => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...opts })
    if (seed) await seedPet(context, seed)
    const page = await context.newPage()
    page.on('pageerror', (e) => pageErrors.push(e.message))
    return page
  }

  try {
    await t.test('initial layout: What\'s Next plus the current Add Comments action only', async () => {
      const page = await newPage()
      await openHome(page, appUrl())
      const buttons = row(page).locator('button')
      assert.equal(await buttons.count(), 2)
      assert.match(await page.locator('[data-testid="home-pet-action-button"]').innerText(), /Approve Plan[\s\S]*Add Comments/)
      assert.equal(await recs(page).count(), 0)
      await page.context().close()
    })

    await t.test('What\'s Next dissolves the buttons, Infie scans, then proposes the Pet action; Not Hotdog has no pending items', async () => {
      const page = await newPage()
      await openHome(page, appUrl())
      await page.locator('[data-testid="home-whats-next-button"]').click()
      await page.locator('[data-testid="home-whats-next-scanning"]').waitFor({ timeout: 3000 })
      assert.equal(await page.locator('[data-testid="home-pet-action-button"]').count(), 0, 'idle actions dissolved')
      assert.equal(await page.locator('[data-testid="home-whats-next-button"]').count(), 0)
      assert.equal(await page.locator('[data-testid="home-whats-next-scanning"]').getAttribute('role'), 'status')
      await page.getByText('Scanning your open projects…').waitFor()
      await page.locator('[data-testid="home-whats-next-proposals"]').waitFor({ timeout: 5000 })

      assert.deepEqual(await recIds(page), ['pet'])
      const pet = recs(page).first()
      assert.equal(await pet.getAttribute('data-destination-kind'), 'session')
      assert.equal(await pet.getAttribute('data-destination-id'), 'add-comments')
      assert.match(await pet.innerText(), /Review Plan[\s\S]*Add Comments[\s\S]*Pet Show and Tell/)
      assert.match(await pet.getAttribute('aria-label'), /open Add Comments in Pet Show and Tell/)
      assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-recommendation-id')), 'pet', 'focus moves to the first suggestion')

      const chat = await chatText(page)
      assert.match(chat, /What's next\?/)
      assert.match(chat, /Not Hotdog: no pending items\./)
      assert.match(chat, /Here's the one thing I'd pick up next/)
      assert.equal(/hotdog/i.test(await page.locator('[data-testid="home-whats-next-proposals"]').innerText()), false)
      assert.equal(/Field Notes|Experimemo/.test(await page.locator('[data-testid="home-whats-next-proposals"]').innerText()), false, 'no false suggestions')

      // Navigating only: the session opens still in PLAN REVIEW.
      await pet.click()
      await page.locator('[data-testid="session-screen"]').waitFor({ timeout: 8000 })
      assert.equal(await page.locator('[data-testid="session-screen"]').getAttribute('data-session-status'), 'PLAN REVIEW')

      // Revisit: Home starts over with the idle layout.
      await page.locator('[data-testid="pet-explore-home-button"]').click().catch(() => backHome(page))
      await page.locator('[data-testid="home-whats-next-button"]').waitFor({ timeout: 8000 })
      assert.equal(await page.locator('[data-testid="home-pet-action-button"]').count(), 1)
      assert.equal(await recs(page).count(), 0)
      await page.context().close()
    })

    await t.test('leaving Home mid-scan cancels the run: no stale suggestions on return', async () => {
      const page = await newPage()
      await openHome(page, appUrl())
      await page.locator('[data-testid="home-whats-next-button"]').click()
      await page.locator('[data-testid="home-projects-column"] [data-project-id="nothotdog"]').click()
      await page.locator('[data-testid="project-home"][data-project-id="nothotdog"]').waitFor()
      await backHome(page)
      await page.waitForTimeout(2000)
      assert.equal(await recs(page).count(), 0)
      assert.equal(await page.locator('[data-testid="home-pet-action-button"]').count(), 1)
      assert.equal(/Scanning your open projects/.test(await chatText(page)), false)
      await page.context().close()
    })

    await t.test('Pet MERGED proposes its completion report', async () => {
      const page = await newPage({}, petState('MERGED'))
      await openHome(page, appUrl())
      await runWhatsNext(page)
      assert.deepEqual(await recIds(page), ['pet'])
      assert.match(await recs(page).first().innerText(), /Submit Report/)
      await recs(page).first().click()
      await page.locator('[data-testid="session-screen"]').waitFor()
      assert.equal(await page.locator('[data-testid="session-screen"]').getAttribute('data-session-status'), 'MERGED')
      await page.context().close()
    })

    await t.test('Pet COMPLETE goes to Project Home for Update Main / Reconcile, and is not suggested once main is updated', async () => {
      const page = await newPage({}, petState('COMPLETE'))
      await openHome(page, appUrl())
      await runWhatsNext(page)
      assert.deepEqual(await recIds(page), ['pet'])
      const rec = recs(page).first()
      assert.equal(await rec.getAttribute('data-destination-kind'), 'project')
      assert.match(await rec.innerText(), /Update Main or Reconcile[\s\S]*Pet Show and Tell/)
      await rec.click()
      await page.locator('[data-testid="project-home"][data-project-id="pet"]').waitFor()
      await page.locator('[data-testid="project-update-main-button"]').click()
      await backHome(page)

      await runWhatsNext(page)
      assert.equal(await recs(page).count(), 0, 'finished session is not suggested')
      const chat = await chatText(page)
      assert.match(chat, /Add Comments is complete and main is updated — no pending items/)
      assert.match(chat, /Not Hotdog: no pending items/)
      assert.match(chat, /Nothing is waiting on you right now/)
      assert.equal(await page.locator('[data-testid="home-whats-next-button"]').count(), 1, 'a fresh scan stays available')
      await page.context().close()
    })

    await t.test('imported Field Notes and generated Experimemo: max three, deterministic order, real destinations', async () => {
      const page = await newPage()
      await openHome(page, appUrl())
      await importFieldNotes(page)
      await backHome(page)
      await runWhatsNext(page)
      assert.deepEqual(await recIds(page), ['pet', 'field-notes'])
      assert.match(await chatText(page), /Field Notes has 9 sessions open — open the project to review them/)
      const fn = recs(page).nth(1)
      assert.equal(await fn.getAttribute('data-destination-id'), 'field-notes')
      await fn.click()
      await page.locator('[data-testid="project-home"][data-project-id="field-notes"]').waitFor()
      await backHome(page)

      await completeJenny(page)
      await backHome(page)
      await runWhatsNext(page)
      assert.deepEqual(await recIds(page), ['pet', 'field-notes', 'experimemo'])
      assert.equal(await recs(page).count(), 3)
      const exp = recs(page).nth(2)
      assert.match(await exp.innerText(), /Plan first session[\s\S]*Experimemo/)
      assert.equal(await exp.getAttribute('data-destination-kind'), 'project')
      await exp.click()
      await page.locator('[data-testid="project-home"][data-project-id="experimemo"]').waitFor()

      // Drive Experimemo to its real session, then What's Next points into that unfinished session.
      await page.locator('[data-testid="whats-next-button"]:not([disabled])').click({ timeout: 10000 })
      await page.locator('[data-testid="composer-send"]:not([disabled])').waitFor({ timeout: 10000 })
      await page.locator('[data-testid="composer-send"]').click()
      await page.waitForFunction(() => document.querySelector('[data-testid="composer-input"]')?.value === 'Let a model propose one.', null, { timeout: 10000 })
      await page.locator('[data-testid="composer-send"]:not([disabled])').click()
      await page.locator('[data-testid="start-session-button"]:not([disabled])').waitFor({ timeout: 30000 })
      await page.locator('[data-testid="start-session-button"]').click()
      await page.locator('[data-testid="session-screen"]').waitFor({ timeout: 8000 })
      await backHome(page)
      await runWhatsNext(page)
      assert.deepEqual(await recIds(page), ['pet', 'field-notes', 'experimemo'])
      const sess = recs(page).nth(2)
      assert.equal(await sess.getAttribute('data-destination-kind'), 'session')
      assert.equal(await sess.getAttribute('data-destination-id'), 'experimemo-session')
      assert.match(await sess.innerText(), /Experiment schema and screens/)
      await sess.click()
      await page.locator('[data-testid="session-screen"]').waitFor()
      assert.equal(await page.locator('[data-testid="session-screen"]').getAttribute('data-session-status'), 'CODING')
      await page.context().close()
    })

    await t.test('reduced motion: no blur dissolve, shorter scan, same proposals', async () => {
      const page = await newPage({ reducedMotion: 'reduce' })
      await openHome(page, appUrl())
      const started = Date.now()
      await page.locator('[data-testid="home-whats-next-button"]').click()
      await page.locator('[data-testid="home-whats-next-proposals"]').waitFor({ timeout: 5000 })
      const elapsed = Date.now() - started
      assert.ok(elapsed < 1200, `reduced-motion proposals took ${elapsed}ms`)
      assert.deepEqual(await recIds(page), ['pet'])
      await page.context().close()
    })

    await t.test('guided tutorial keeps its greyed-out Home actions and never scans', async () => {
      const page = await newPage()
      await page.goto(`http://127.0.0.1:${ports[0]}/iSquared/?beat=B20`, { waitUntil: 'domcontentloaded' })
      await page.locator('[data-name="HomeInfieActionRow"]').waitFor({ timeout: 15000 })
      const disabled = row(page).locator('button[data-tutorial-disabled="true"]')
      assert.equal(await disabled.count(), 2)
      assert.equal(await page.locator('[data-testid="home-whats-next-button"]').count(), 0)
      await disabled.first().click({ force: true })
      await page.waitForTimeout(800)
      assert.equal(await page.locator('[data-testid="home-whats-next-scanning"], [data-testid="home-whats-next-proposals"]').count(), 0)
      await page.context().close()
    })

    assert.deepEqual(pageErrors, [], 'no page errors')
  } finally {
    await browser.close()
    await Promise.all(servers.map(close))
  }
})
