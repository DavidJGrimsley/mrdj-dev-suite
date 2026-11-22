// Behavioral + real-browser tests for the four approved fixes:
// 1) Music playlist (6 tracks, alternating artists including loop, hosted assets 200)
// 2) Effort preference (stops 1-5, default 3, reset, shared state, B10 left margin vs inline)
// 3) Widgets gallery "Create widget" footer action (PrototypeLimit, Got it, B18 inert, no widget added)
// 4) AuthScreen local validation + PricingOverlay credential reward for all 4 tiers
// Run `pnpm build:hosted` before running so dist-hosted/web is current.
import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'

const testDir = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(testDir, '..', '..')
const webDir = path.join(appRoot, 'dist-hosted', 'web')
const workspaceRoot = path.resolve(appRoot, '../../..')
const screenshotDir = process.env.FOUR_FIXES_SCREENSHOT_DIR || ''

const require = createRequire(import.meta.url)

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
  '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg',
  '.webm': 'video/webm',
}

function createStaticServer(distDir, basePath = '/iSquared/') {
  return http.createServer((req, res) => {
    try {
      const url = new URL(req.url, 'http://127.0.0.1')
      const pathname = url.pathname
      if (pathname === '/favicon.ico') {
        res.writeHead(204)
        return res.end()
      }
      if (!pathname.startsWith(basePath)) {
        res.writeHead(404)
        return res.end('Not Found')
      }
      let subpath = pathname.slice(basePath.length)
      if (!subpath || subpath.endsWith('/')) subpath += 'index.html'
      const filePath = path.join(distDir, subpath)
      if (filePath.startsWith(distDir) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase()
        const stat = fs.statSync(filePath)
        res.writeHead(200, {
          'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
          'Content-Length': String(stat.size),
        })
        if (req.method === 'HEAD') return res.end()
        fs.createReadStream(filePath).pipe(res)
      } else {
        res.writeHead(200, { 'Content-Type': 'text/html' })
        if (req.method === 'HEAD') return res.end()
        fs.createReadStream(path.join(distDir, 'index.html')).pipe(res)
      }
    } catch (e) {
      res.writeHead(500)
      res.end(String(e))
    }
  })
}

const listen = (server) =>
  new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server.address().port)))
const close = (server) => new Promise((resolve) => server.close(resolve))

let tmpCounter = 0
async function importBundled(relPath, define = {}) {
  const esbuild = require('esbuild')
  const tmpFile = path.join(testDir, `.tmp-four-fixes-${process.pid}-${tmpCounter++}.mjs`)
  esbuild.buildSync({
    entryPoints: [path.join(appRoot, relPath)],
    outfile: tmpFile,
    bundle: true,
    format: 'esm',
    platform: 'browser',
    external: ['react', 'react-dom', 'lucide-react', 'motion/*'],
    define,
  })
  try {
    return await import(`${pathToFileURL(tmpFile).href}?t=${Date.now()}`)
  } finally {
    fs.rmSync(tmpFile, { force: true })
  }
}

function boxesOverlap(a, b, tol = 1) {
  return (
    a.x < b.x + b.width - tol &&
    a.x + a.width > b.x + tol &&
    a.y < b.y + b.height - tol &&
    a.y + a.height > b.y + tol
  )
}

async function maybeShot(page, name) {
  if (!screenshotDir) return
  fs.mkdirSync(screenshotDir, { recursive: true })
  await page.screenshot({ path: path.join(screenshotDir, name) })
}

test('playlist module exports 6 tracks in alternating-artist order with BASE_URL and matching files', async () => {
  const mod = await importBundled('src/app/onboarding/leekBeatsPlaylist.ts', {
    'import.meta.env.BASE_URL': '"/iSquared/"',
  })
  assert.equal(mod.PLAYLIST_NAME, 'i² Curated')
  const expected = [
    { title: 'Night Market', artist: 'Leek Beats', file: 'night-market.mp3', bytes: 1842429 },
    { title: 'Lofi Midnight Club', artist: 'alex-morgan', file: 'alex-morgan-lofi-midnight-club.mp3', bytes: 4396800 },
    { title: 'Tokyo Lofi', artist: 'ZephiraMusic', file: 'zephiramusic-tokyo-lofi.mp3', bytes: 5756928 },
    { title: 'Costco Dates', artist: 'Leek Beats', file: 'costco-dates.mp3', bytes: 3394077 },
    { title: 'Lofi Relaxing', artist: 'VelarioMusic', file: 'velariomusic-lofi-relaxing.mp3', bytes: 4627200 },
    { title: 'Lofi Coffee Shop', artist: 'alex-morgan', file: 'alex-morgan-lofi-coffee-shop.mp3', bytes: 3644160 },
  ]
  assert.equal(mod.LEEKBEATS_TRACKS.length, 6)
  for (let i = 0; i < expected.length; i += 1) {
    const track = mod.LEEKBEATS_TRACKS[i]
    const exp = expected[i]
    assert.equal(track.title, exp.title)
    assert.equal(track.artist, exp.artist)
    assert.equal(track.src, `/iSquared/assets/music/${exp.file}`)
    const pubPath = path.join(appRoot, 'public', 'assets', 'music', exp.file)
    assert.ok(fs.existsSync(pubPath), `public music asset exists: ${exp.file}`)
    assert.equal(fs.statSync(pubPath).size, exp.bytes, `public byte size for ${exp.file}`)
    const next = mod.LEEKBEATS_TRACKS[(i + 1) % mod.LEEKBEATS_TRACKS.length]
    assert.notEqual(track.artist, next.artist, `no adjacent same artist at ${i} -> ${(i + 1) % 6}`)
  }
})

test('effort preference stops define 1..5 with default 3 and progressive semantics', async () => {
  const mod = await importBundled('src/app/widgets/infiePreferencesContext.tsx')
  assert.equal(mod.EFFORT_STOPS.length, 5)
  assert.deepEqual(
    mod.EFFORT_STOPS.map((s) => s.label),
    ['1', '2', '3', '4', '5'],
  )
  assert.deepEqual(
    mod.EFFORT_STOPS.map((s) => s.index),
    [0, 1, 2, 3, 4],
  )
  assert.match(mod.EFFORT_STOPS[0].description, /economical|minimal|fewest/i)
  assert.match(mod.EFFORT_STOPS[2].description, /mix|balanced|default/i)
  assert.match(mod.EFFORT_STOPS[4].description, /best|maximum/i)
})

test('browser: four approved fixes across desktop 1440x900 and narrow 768x900 & 390x844', async (t) => {
  const chromePath = process.env.CHROME_PATH || path.join(process.env.ProgramFiles || 'C:/Program Files', 'Google/Chrome/Application/chrome.exe')
  const pwPath = path.join(workspaceRoot, 'temp', 'exact-upstream', 'node_modules', 'playwright-core')
  if (!fs.existsSync(chromePath) || !fs.existsSync(pwPath)) {
    t.skip('Chrome or playwright-core not available on host')
    return
  }
  assert.ok(fs.existsSync(path.join(webDir, 'index.html')), 'run `pnpm build:hosted` before browser tests')

  const { chromium } = await import(pathToFileURL(path.join(pwPath, 'index.mjs')).href)
  const playlistMod = await importBundled('src/app/onboarding/leekBeatsPlaylist.ts', {
    'import.meta.env.BASE_URL': '"/iSquared/"',
  })
  const server = createStaticServer(webDir, '/iSquared/')
  const port = await listen(server)
  const baseUrl = `http://127.0.0.1:${port}/iSquared/`
  const browser = await chromium.launch({ executablePath: chromePath, headless: true })
  const pageErrors = []

  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })

    // ── 1. Hosted music assets & playlist wrap/skip/library ────────────────────
    await t.test('music: 6 hosted assets return 200 with exact sizes and alternate cleanly', async () => {
      for (const track of playlistMod.LEEKBEATS_TRACKS) {
        const res = await fetch(`http://127.0.0.1:${port}${track.src}`, { method: 'HEAD' })
        assert.equal(res.status, 200, `hosted asset ${track.src} returns 200`)
        const pubPath = path.join(appRoot, 'public', track.src.replace('/iSquared/', ''))
        assert.equal(Number(res.headers.get('content-length')), fs.statSync(pubPath).size, `hosted size matches ${track.src}`)
      }

      const page = await context.newPage()
      page.on('pageerror', (e) => pageErrors.push(e.message))
      try {
        await page.goto(`${baseUrl}?beat=COMPLETE`, { waitUntil: 'networkidle' })
        const expectedOrder = [
          ['Leek Beats', 'Night Market'],
          ['alex-morgan', 'Lofi Midnight Club'],
          ['ZephiraMusic', 'Tokyo Lofi'],
          ['Leek Beats', 'Costco Dates'],
          ['VelarioMusic', 'Lofi Relaxing'],
          ['alex-morgan', 'Lofi Coffee Shop'],
        ]
        for (const [artist, title] of expectedOrder) {
          assert.equal((await page.locator('[data-testid="music-track-primary"]').first().innerText()).trim(), artist)
          assert.equal((await page.locator('[data-testid="music-track-title"]').first().innerText()).trim(), title)
          await page.locator('button[aria-label="Next track"]').first().click()
        }
        // Wraps back to track 0
        assert.equal((await page.locator('[data-testid="music-track-primary"]').first().innerText()).trim(), 'Leek Beats')
        assert.equal((await page.locator('[data-testid="music-track-title"]').first().innerText()).trim(), 'Night Market')
        // Previous wraps backward to track 5
        await page.locator('button[aria-label="Previous track"]').first().click()
        assert.equal((await page.locator('[data-testid="music-track-primary"]').first().innerText()).trim(), 'alex-morgan')
        assert.equal((await page.locator('[data-testid="music-track-title"]').first().innerText()).trim(), 'Lofi Coffee Shop')

        // Open Pet Project Home & expand Music library
        await page.locator('[data-testid="home-projects-column"] button[data-project-id="pet"]').click()
        await page.waitForSelector('[data-dock-item="music"]', { timeout: 10000 })
        await page.locator('[data-dock-item="music"] button[aria-label="Expand Music"]').click()
        await page.waitForSelector('[data-name="LeekBeatsLibrary"]', { timeout: 6000 })
        assert.equal(await page.locator('[data-name="LeekBeatsLibrary"] [data-track]').count(), 6)
        assert.equal(await page.locator('[data-name="LeekBeatsLibrary"] [data-artist]').count(), 4)
        await maybeShot(page, '01-music-library-6-tracks.png')
      } finally {
        await page.close()
      }
    })

    // ── 2. Effort slider + B10 Turn 2 left margin vs narrow inline ────────────
    await t.test('effort: shared widget stops/reset + Widgets & Whatnot sliders callout, narrow and mobile', async () => {
      const page = await context.newPage()
      page.on('pageerror', (e) => pageErrors.push(e.message))
      try {
        await page.goto(`${baseUrl}?beat=COMPLETE`, { waitUntil: 'networkidle' })
        await page.locator('[data-name="HeaderWidgetsButton"]').click()
        await page.locator('[data-widget-entry="infiePreferences"]').click()
        const widget = page.locator('[data-testid="infie-preferences-widget"]')
        await widget.waitFor()
        const widgetText = await widget.innerText()
        assert.match(widgetText, /Preference Sliders/)
        assert.match(widgetText, /intended model-choice and reasoning-effort preference/i)
        assert.match(widgetText, /does not invoke models or change a real reasoning budget/i)

        const sliders = widget.getByRole('slider')
        assert.equal(await sliders.count(), 6)
        const effortSlider = widget.locator('#pref-effort [role="slider"]')
        assert.equal(await effortSlider.getAttribute('aria-valuenow'), '2')
        assert.equal(await effortSlider.getAttribute('aria-valuemax'), '4')
        assert.match(await effortSlider.getAttribute('aria-valuetext'), /^3:/)

        // Change via keyboard (including boundary clamping), reopen to confirm shared session state, then Reset to 3
        await effortSlider.focus()
        await page.keyboard.press('Home')
        await page.keyboard.press('ArrowLeft')
        assert.equal(await effortSlider.getAttribute('aria-valuenow'), '0')
        assert.match(await effortSlider.getAttribute('aria-valuetext'), /^1:/)
        await page.keyboard.press('End')
        await page.keyboard.press('ArrowRight')
        assert.equal(await effortSlider.getAttribute('aria-valuenow'), '4')
        assert.match(await effortSlider.getAttribute('aria-valuetext'), /^5:/)
        await page.keyboard.press('Home')
        assert.equal(await effortSlider.getAttribute('aria-valuenow'), '0')
        await page.keyboard.press('Escape')
        await widget.waitFor({ state: 'detached' })

        await page.locator('[data-name="HeaderWidgetsButton"]').click()
        await page.locator('[data-widget-entry="infiePreferences"]').click()
        await page.locator('[data-name="WidgetsGalleryModal"]').waitFor({ state: 'detached' })
        await widget.waitFor()
        await page.waitForTimeout(260)
        assert.equal(await widget.locator('#pref-effort [role="slider"]').getAttribute('aria-valuenow'), '0')
        await widget.locator('#pref-effort').scrollIntoViewIfNeeded()
        await maybeShot(page, '02-preference-sliders-effort.png')
        await widget.getByRole('button', { name: 'Reset', exact: true }).click()
        assert.equal(await widget.locator('#pref-effort [role="slider"]').getAttribute('aria-valuenow'), '2')
        assert.match(await widget.locator('#pref-effort [role="slider"]').getAttribute('aria-valuetext'), /^3:/)
        await page.keyboard.press('Escape')

        // Preference Sliders live in Widgets & Whatnot (B18 sliders turn), in reduced motion so
        // Continue appears immediately.
        await page.emulateMedia({ reducedMotion: 'reduce' })
        await page.goto(`${baseUrl}?beat=B18`, { waitUntil: 'networkidle' })
        const callout = page.locator('[data-name="FloatingInfieCallout"]')
        await callout.waitFor({ state: 'visible', timeout: 6000 })
        await page.getByRole('button', { name: 'Continue', exact: true }).click()
        await page.locator('[data-name="FloatingInfieCallout"][data-turn="1"]').waitFor()
        await page.getByRole('button', { name: 'Continue', exact: true }).click()
        await page.locator('[data-name="FloatingInfieCallout"][data-turn="2"]').waitFor()

        const preview = page.locator('[data-name="PreferenceSlidersPreview"]')
        await preview.waitFor({ state: 'visible', timeout: 6000 })
        assert.equal(await preview.count(), 1, 'preview renders once')
        const messageText = await callout.innerText()
        assert.match(messageText, /Preference Sliders apply to all models in all conversations/)
        assert.equal(/\bbelow\b/i.test(messageText), false, 'sliders copy must not say below')

        // Desktop 1440x900: inside Infie's callout, clear of the header and the music player, pointer interactive
        const previewBox = await preview.boundingBox()
        const calloutBox = await callout.boundingBox()
        const headerBox = await page.locator('[data-name="Header"]').boundingBox()
        const musicBox = await page.locator('[data-name="LeekBeatsWidget"]').boundingBox()
        assert.ok(previewBox && calloutBox && headerBox && musicBox)
        assert.ok(previewBox.y >= calloutBox.y && previewBox.y + previewBox.height <= calloutBox.y + calloutBox.height + 1, 'preview inside callout')
        assert.equal(boxesOverlap(previewBox, headerBox), false, 'no overlap with Header')
        assert.equal(boxesOverlap(previewBox, musicBox), false, 'no overlap with Music')

        // Real pointer click on Effort slider right edge -> moves to stop 5 (index 4)
        const b10Effort = page.locator('[id="tutorial-pref-Effort"] [role="slider"]')
        assert.equal(await b10Effort.getAttribute('aria-valuenow'), '2')
        const trackBox = await page.locator('[id="tutorial-pref-Effort"]').boundingBox()
        assert.ok(trackBox)
        await page.mouse.click(trackBox.x + trackBox.width - 4, trackBox.y + trackBox.height / 2)
        assert.equal(await b10Effort.getAttribute('aria-valuenow'), '4')
        await maybeShot(page, '03-widgets-sliders-callout.png')

        // Narrow 768x900: same preview, shared Effort value kept, no overflow
        await page.setViewportSize({ width: 768, height: 900 })
        await page.waitForTimeout(150)
        assert.equal(await preview.count(), 1)
        assert.equal(await b10Effort.getAttribute('aria-valuenow'), '4')
        assert.ok((await page.evaluate(() => document.documentElement.scrollWidth)) <= 768, 'no overflow at 768px')
        await maybeShot(page, '04-widgets-sliders-narrow-768.png')

        // Mobile 390x844: no overflow
        await page.setViewportSize({ width: 390, height: 844 })
        await page.waitForTimeout(150)
        assert.equal(await preview.count(), 1)
        assert.equal(await b10Effort.getAttribute('aria-valuenow'), '4')
        assert.ok((await page.evaluate(() => document.documentElement.scrollWidth)) <= 390, 'no overflow at 390px')
        await maybeShot(page, '05-widgets-sliders-mobile-390.png')
      } finally {
        await page.close()
      }
    })

    // ── 3. Widgets Menu "Create widget" action & B18 inertness ────────────────
    await t.test('widgets menu: Create widget raises limit, Got it keeps gallery open, zero widgets added, inert on B18', async () => {
      const page = await context.newPage()
      page.on('pageerror', (e) => pageErrors.push(e.message))
      try {
        await page.goto(`${baseUrl}?beat=COMPLETE`, { waitUntil: 'networkidle' })
        await page.locator('[data-name="HeaderWidgetsButton"]').click()
        await page.waitForSelector('[data-name="WidgetsGalleryModal"]', { timeout: 6000 })

        const initialTileCount = await page.locator('[data-name="WidgetsGalleryModal"] [data-widget-entry]').count()
        const createBtn = page.locator('[data-testid="gallery-create-widget"]')
        await createBtn.scrollIntoViewIfNeeded()
        await createBtn.waitFor({ state: 'visible' })
        assert.equal(await createBtn.getAttribute('data-widget-entry'), null, 'Create widget is non-tile')
        assert.equal((await createBtn.innerText()).trim(), 'Create widget')
        const emuHeadingBox = await page.locator('[data-name="WidgetsGalleryModal"] h4:has-text("Device Emulators")').boundingBox()
        const createBox = await createBtn.boundingBox()
        assert.ok(emuHeadingBox && createBox && createBox.y > emuHeadingBox.y, 'Create widget is after Device Emulators')
        await maybeShot(page, '06-widgets-gallery-create-button.png')

        await createBtn.click()
        const limitModal = page.locator('[data-testid="prototype-limit-modal"]')
        await limitModal.waitFor({ state: 'visible' })
        await page.waitForTimeout(260)
        const limitText = await limitModal.innerText()
        assert.match(limitText, /Create widget/)
        assert.match(limitText, /nothing is actually created or stored/i)
        await maybeShot(page, '07-create-widget-limit-modal.png')

        await page.getByRole('button', { name: 'Got it' }).click()
        await limitModal.waitFor({ state: 'detached' })
        assert.equal(await page.locator('[data-name="WidgetsGalleryModal"]').count(), 1, 'Got it closes only limit modal')
        assert.equal(await page.locator('[data-name="WidgetsGalleryModal"] [data-widget-entry]').count(), initialTileCount, 'zero widgets added')

        // Narrow 390x844 check
        await page.setViewportSize({ width: 390, height: 844 })
        await page.waitForTimeout(100)
        assert.ok((await page.evaluate(() => document.documentElement.scrollWidth)) <= 390, 'gallery fits 390px')
        await page.setViewportSize({ width: 1440, height: 900 })

        // B18 tutorialMode: button disabled/inert and clicking does not open limit
        await page.goto(`${baseUrl}?beat=B18`, { waitUntil: 'networkidle' })
        await page.locator('[data-name="HeaderWidgetsButton"]').click()
        await page.waitForSelector('[data-name="WidgetsGalleryModal"][data-tutorial="true"]', { timeout: 6000 })
        const b18Create = page.locator('[data-testid="gallery-create-widget"]')
        await b18Create.scrollIntoViewIfNeeded()
        assert.equal(await b18Create.isDisabled(), true)
        assert.equal(await b18Create.getAttribute('aria-disabled'), 'true')
        await b18Create.click({ force: true })
        await page.waitForTimeout(150)
        assert.equal(await page.locator('[data-testid="prototype-limit-modal"]').count(), 0)
        await maybeShot(page, '08-widgets-gallery-b18-inert.png')
      } finally {
        await page.close()
      }
    })

    // ── 4. AuthScreen validation & PricingOverlay credential reward ───────────
    await t.test('auth: blank/wrong blocked with accessible error, normalized email + exact password bypasses', async () => {
      const page = await context.newPage()
      page.on('pageerror', (e) => pageErrors.push(e.message))
      try {
        await page.goto(baseUrl, { waitUntil: 'networkidle' })
        await page.waitForSelector('[data-name="AuthScreen"]', { timeout: 8000 })

        const emailInput = page.getByLabel('Email address')
        const passInput = page.getByLabel('Password')
        assert.equal(await emailInput.inputValue(), '')
        assert.equal(await passInput.inputValue(), '')
        await maybeShot(page, '09-auth-blank-initial.png')

        // Blank submit -> error, stays on AuthScreen, no credential leak
        await page.getByRole('button', { name: /Sign In/i }).click()
        assert.equal(await page.locator('[data-name="AuthScreen"]').count(), 1)
        const alert = page.locator('[data-name="AuthScreen"] [role="alert"]')
        await alert.waitFor({ state: 'visible' })
        const alertId = await alert.getAttribute('id')
        const alertText = await alert.innerText()
        assert.ok(alertId)
        assert.equal(alertText.includes('dev@i2.app'), false, 'error must not disclose email')
        assert.equal(alertText.trim(), 'Invalid email or password.', 'error is generic and does not disclose credentials')
        assert.equal(await emailInput.getAttribute('aria-invalid'), 'true')
        assert.equal(await passInput.getAttribute('aria-invalid'), 'true')
        assert.equal(await emailInput.getAttribute('aria-describedby'), alertId)
        assert.equal(await passInput.getAttribute('aria-describedby'), alertId)
        await maybeShot(page, '10-auth-invalid-error.png')

        // Wrong password & wrong-case password must fail
        await emailInput.fill('dev@i2.app')
        await passInput.fill('wrong')
        await page.getByRole('button', { name: /Sign In/i }).click()
        assert.equal(await page.locator('[data-name="AuthScreen"]').count(), 1)
        assert.equal(await alert.isVisible(), true)

        await emailInput.fill('  DEV@I2.APP  ')
        await passInput.fill('PASSWORD')
        await page.getByRole('button', { name: /Sign In/i }).click()
        assert.equal(await page.locator('[data-name="AuthScreen"]').count(), 1)
        assert.equal(await alert.isVisible(), true)

        // Trimmed, case-insensitive email + exact password -> bypasses tutorial to Home
        await emailInput.fill('  DEV@I2.APP  ')
        await passInput.fill('password')
        await page.getByRole('button', { name: /Sign In/i }).click()
        await page.waitForSelector('[data-beat="COMPLETE"]', { timeout: 8000 })
        assert.equal(await page.locator('[data-name="AuthScreen"]').count(), 0)
      } finally {
        await page.close()
      }
    })

    await t.test('plan reward: pre-choice dismiss works; all 4 tiers retain modal with credentials and require Continue', async () => {
      const page = await context.newPage()
      page.on('pageerror', (e) => pageErrors.push(e.message))
      try {
        // Pre-choice dismissal checks: Escape, backdrop, Back
        await page.goto(`${baseUrl}?beat=COMPLETE&plan=1`, { waitUntil: 'networkidle' })
        await page.waitForSelector('[data-name="ChoosePlanOverlay"]')
        await page.keyboard.press('Escape')
        await page.waitForSelector('[data-name="ChoosePlanOverlay"]', { state: 'detached' })

        await page.goto(`${baseUrl}?beat=COMPLETE&plan=1`, { waitUntil: 'networkidle' })
        await page.waitForSelector('[data-name="ChoosePlanBackdrop"]')
        await page.locator('[data-name="ChoosePlanBackdrop"]').click({ position: { x: 4, y: 4 } })
        await page.waitForSelector('[data-name="ChoosePlanOverlay"]', { state: 'detached' })

        await page.goto(`${baseUrl}?beat=COMPLETE&plan=1`, { waitUntil: 'networkidle' })
        await page.getByRole('button', { name: 'Back to Home' }).click()
        await page.waitForSelector('[data-name="ChoosePlanOverlay"]', { state: 'detached' })

        const tiers = [
          { tab: 'personal', name: 'Free', cta: 'Start free' },
          { tab: 'personal', name: 'Premium', cta: 'Choose Premium' },
          { tab: 'business', name: 'Team', cta: 'Choose Team' },
          { tab: 'business', name: 'Enterprise', cta: 'Contact sales' },
        ]
        for (const tier of tiers) {
          await page.goto(`${baseUrl}?beat=COMPLETE&plan=1`, { waitUntil: 'networkidle' })
          await page.waitForSelector('[data-name="ChoosePlanOverlay"]')
          if (tier.tab === 'business') {
            await page.getByRole('button', { name: 'business', exact: true }).click()
          }
          await page.getByRole('button', { name: tier.cta }).click()

          // Same ChoosePlanOverlay stays open; tier cards replaced with credentials & exact sentence
          const overlay = page.locator('[data-name="ChoosePlanOverlay"]')
          assert.equal(await overlay.count(), 1)
          assert.equal(await page.locator('[data-selected-plan]').getAttribute('data-selected-plan'), tier.name)
          assert.equal(await page.locator('[data-testid^="pricing-tier-"]').count(), 0)
          assert.equal(await page.locator('[data-testid="reward-email"]').innerText(), 'dev@i2.app')
          assert.equal(await page.locator('[data-testid="reward-password"]').innerText(), 'password')
          assert.match(
            await overlay.innerText(),
            /Write down this email and password so you can bypass the tutorial in the future\./,
          )
          assert.equal(await page.getByRole('button', { name: 'Back to Home' }).count(), 0)

          // Escape & backdrop click must NOT dismiss after tier choice
          await page.keyboard.press('Escape')
          await page.locator('[data-name="ChoosePlanBackdrop"]').click({ position: { x: 4, y: 4 } })
          await page.waitForTimeout(100)
          assert.equal(await overlay.count(), 1, `Escape/backdrop cannot dismiss after choosing ${tier.name}`)

          if (tier.name === 'Premium') {
            await maybeShot(page, '11-plan-reward-credentials-desktop.png')
            await page.setViewportSize({ width: 390, height: 844 })
            await page.waitForTimeout(100)
            assert.ok((await page.evaluate(() => document.documentElement.scrollWidth)) <= 390, 'reward fits 390px')
            await maybeShot(page, '12-plan-reward-credentials-390.png')
            await page.setViewportSize({ width: 768, height: 900 })
            await page.waitForTimeout(100)
            assert.ok((await page.evaluate(() => document.documentElement.scrollWidth)) <= 768, 'reward fits 768px')
            await page.setViewportSize({ width: 1440, height: 900 })
          }

          // Only Continue dismisses onto Home and data-selected-plan remains set
          await page.locator('[data-testid="choose-plan-continue"]').click()
          await overlay.waitFor({ state: 'detached' })
          assert.equal(await page.locator('[data-selected-plan]').getAttribute('data-selected-plan'), tier.name)
        }
      } finally {
        await page.close()
      }
    })

    assert.deepEqual(pageErrors, [], `Expected 0 page errors, found: ${pageErrors.join(' | ')}`)
  } finally {
    await browser.close()
    await close(server)
  }
})
