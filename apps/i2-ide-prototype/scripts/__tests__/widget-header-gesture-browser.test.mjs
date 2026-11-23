// Real clicks: a double-click expands immediately, a third click in the same spot
// enters fullscreen (the overlay must not treat it as "click outside"), and a later
// triple-click, Escape, or Restore returns to normal. Buttons and drags do not toggle.
import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const testDir = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(testDir, '../..')
const workspaceRoot = path.resolve(appRoot, '../../..')
const webDir = process.env.I2_BUILD_DIR || path.join(appRoot, 'dist-hosted', 'web')
const evidenceDir = path.join(workspaceRoot, 'generated', 'widget-fullscreen-gesture')

function createStaticServer(distDir) {
  const types = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.webm': 'video/webm',
    '.mp3': 'audio/mpeg',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
  }
  return http.createServer((req, res) => {
    try {
      const url = new URL(req.url, 'http://127.0.0.1')
      if (url.pathname === '/favicon.ico') {
        res.writeHead(204)
        return res.end()
      }
      let sub = decodeURIComponent(url.pathname).replace(/^\/iSquared(?=\/|$)/, '') || '/'
      if (sub === '/' || sub.endsWith('/')) sub += 'index.html'
      const filePath = path.join(distDir, sub)
      if (filePath.startsWith(distDir) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        res.writeHead(200, { 'Content-Type': types[path.extname(filePath).toLowerCase()] || 'application/octet-stream' })
        fs.createReadStream(filePath).pipe(res)
      } else {
        res.writeHead(200, { 'Content-Type': 'text/html' })
        fs.createReadStream(path.join(distDir, 'index.html')).pipe(res)
      }
    } catch (error) {
      res.writeHead(500)
      res.end(String(error))
    }
  })
}

const listen = (server) => new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server.address().port)))
const close = (server) => new Promise((resolve) => server.close(resolve))

async function dismissLimit(page) {
  const got = page.getByRole('button', { name: 'Got it' })
  const visible = await got.waitFor({ state: 'visible', timeout: 1200 }).then(() => true).catch(() => false)
  if (!visible) return
  await got.click()
  await page.locator('[data-testid="prototype-limit-modal"]').waitFor({ state: 'detached', timeout: 5000 })
}

async function pointIn(locator, dx = 36) {
  const box = await locator.boundingBox()
  assert.ok(box && box.width > 8 && box.height > 4, 'header has no box')
  return { x: box.x + Math.min(dx, Math.max(12, box.width / 4)), y: box.y + box.height / 2 }
}

async function clickAt(page, point) {
  await page.mouse.click(point.x, point.y)
}

async function hitAt(page, point) {
  return page.evaluate(({ x, y }) => {
    const el = document.elementFromPoint(x, y)
    const button = el?.closest?.('button')
    return {
      tag: el?.tagName || null,
      overlay: el?.closest?.('[data-widget-overlay]')?.getAttribute('data-widget-overlay') || null,
      header: Boolean(el?.closest?.('[data-widget-header]')),
      button: button?.getAttribute('aria-label') || button?.textContent?.trim()?.slice(0, 40) || null,
      testid: el?.closest?.('[data-testid]')?.getAttribute('data-testid') || null,
    }
  }, point)
}

test('browser: same-spot triple-click fullscreens dock, music, projects, and files, then restores', async () => {
  const chromePath = process.env.CHROME_PATH || path.join(process.env.ProgramFiles || 'C:/Program Files', 'Google/Chrome/Application/chrome.exe')
  const pwPath = path.join(workspaceRoot, 'temp', 'exact-upstream', 'node_modules', 'playwright-core')
  assert.ok(fs.existsSync(chromePath), `Chrome missing at ${chromePath}`)
  assert.ok(fs.existsSync(pwPath), `playwright-core missing at ${pwPath}`)
  assert.ok(fs.existsSync(path.join(webDir, 'index.html')), `Build missing at ${webDir}`)
  fs.mkdirSync(evidenceDir, { recursive: true })

  const { chromium } = await import(pathToFileURL(path.join(pwPath, 'index.mjs')).href)
  const server = createStaticServer(webDir)
  const port = await listen(server)
  const browser = await chromium.launch({ executablePath: chromePath, headless: true })
  const measured = { port }
  const pageErrors = []
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    page.on('pageerror', (error) => pageErrors.push(String(error)))
    await page.goto(`http://127.0.0.1:${port}/?beat=COMPLETE`, { waitUntil: 'domcontentloaded' })
    await page.locator('[data-testid="home-projects-column"]').waitFor()

    const projectsHeader = page.locator('[data-testid="active-projects-header"]')
    const projectsPoint = await pointIn(projectsHeader, 24)
    await clickAt(page, projectsPoint)
    await page.waitForTimeout(400)
    await clickAt(page, projectsPoint)
    await page.waitForTimeout(400)
    await clickAt(page, projectsPoint)
    await page.waitForTimeout(700)
    const projectsModal = page.locator('[data-testid="active-projects-modal"]')
    await projectsModal.waitFor()
    assert.equal(await projectsModal.getAttribute('data-mode'), 'fullscreen', 'natural triple-click on Active Projects')
    await page.getByRole('button', { name: 'Close active projects' }).click()
    await projectsModal.waitFor({ state: 'hidden' })

    await clickAt(page, projectsPoint)
    await page.waitForTimeout(400)
    await clickAt(page, projectsPoint)
    await page.waitForTimeout(700)
    await projectsModal.waitFor()
    assert.equal(await projectsModal.getAttribute('data-mode'), 'expanded', 'double-click still expands Active Projects')
    await page.keyboard.press('Escape')
    await projectsModal.waitFor({ state: 'hidden' })

    const musicHeader = page.locator('[data-name="LeekBeatsFrame"] [data-widget-header]').first()
    await musicHeader.waitFor()
    const musicPoint = await pointIn(musicHeader, 28)
    await clickAt(page, musicPoint)
    await page.waitForTimeout(280)
    await clickAt(page, musicPoint)
    const musicOverlay = page.locator('[data-widget-overlay="leekbeats-home"]')
    await musicOverlay.waitFor()
    assert.equal(await musicOverlay.getAttribute('data-widget-mode'), 'expanded')
    const musicHit = await hitAt(page, musicPoint)
    measured.musicThirdHit = musicHit
    await page.waitForTimeout(280)
    await clickAt(page, musicPoint)
    await page.waitForTimeout(80)
    assert.equal(
      await musicOverlay.getAttribute('data-widget-mode'),
      'fullscreen',
      `same-spot third click on Music should fullscreen, hit ${JSON.stringify(musicHit)}`,
    )
    assert.equal(await musicOverlay.locator('[data-library-mode="providers"]').count(), 1)
    const musicZoom = await musicOverlay.locator('[data-name="LeekBeatsLibrary"]').evaluate((el) => getComputedStyle(el.parentElement).zoom)
    measured.musicZoom = musicZoom

    const musicDialogHeader = musicOverlay.locator('[data-widget-header]').first()
    const restorePoint = await pointIn(musicDialogHeader, 40)
    await clickAt(page, restorePoint)
    await page.waitForTimeout(220)
    await clickAt(page, restorePoint)
    await page.waitForTimeout(220)
    await clickAt(page, restorePoint)
    await musicOverlay.waitFor({ state: 'detached' })
    assert.equal(await page.locator('[data-name="LeekBeatsWidget"]').getAttribute('data-widget-mode'), 'normal')

    await musicHeader.focus()
    await page.keyboard.press('Enter')
    await page.getByRole('dialog', { name: 'Song picker' }).waitFor()
    await page.keyboard.press('Escape')
    await page.getByRole('dialog', { name: 'Song picker' }).waitFor({ state: 'detached' })

    await page.getByRole('button', { name: 'Song picker' }).click()
    await page.getByRole('dialog', { name: 'Song picker' }).waitFor()
    await page.waitForTimeout(650)
    assert.equal(await page.locator('[data-widget-overlay="leekbeats-home"]').count(), 1, 'song picker button must not be undone by the header timer')
    await musicOverlay.getByRole('button', { name: 'Fullscreen' }).click()
    assert.equal(await musicOverlay.getAttribute('data-widget-mode'), 'fullscreen')
    await page.waitForTimeout(650)
    assert.equal(await musicOverlay.getAttribute('data-widget-mode'), 'fullscreen', 'fullscreen button must stay fullscreen')
    await page.getByRole('button', { name: 'Restore Music' }).click()
    await musicOverlay.waitFor({ state: 'detached' })

    await page.emulateMedia({ reducedMotion: 'reduce' })
    const reducedPoint = await pointIn(musicHeader, 28)
    await clickAt(page, reducedPoint)
    await page.waitForTimeout(280)
    await clickAt(page, reducedPoint)
    await page.waitForTimeout(280)
    await clickAt(page, reducedPoint)
    await musicOverlay.waitFor()
    assert.equal(await musicOverlay.getAttribute('data-widget-mode'), 'fullscreen')
    const reducedZoom = await musicOverlay.locator('[data-name="LeekBeatsLibrary"]').evaluate((el) => getComputedStyle(el.parentElement).zoom)
    measured.reducedZoom = reducedZoom
    assert.ok(reducedZoom === '1' || reducedZoom === 'normal', `reduced-motion zoom ${reducedZoom}`)
    await page.keyboard.press('Escape')
    await musicOverlay.waitFor({ state: 'detached' })
    await page.emulateMedia({ reducedMotion: 'no-preference' })

    await page.locator('[data-testid="home-projects-column"] [data-project-id="pet"]').click()
    await page.locator('[data-testid="project-home"][data-project-id="pet"]').waitFor()

    const sessionsHeader = page.locator('[data-dock-item="sessions"] [data-widget-header]').first()
    await sessionsHeader.waitFor()
    const sessionsPoint = await pointIn(sessionsHeader, 48)
    await clickAt(page, sessionsPoint)
    await page.waitForTimeout(280)
    const started = Date.now()
    await clickAt(page, sessionsPoint)
    const sessionsOverlay = page.locator('[data-widget-overlay="sessions"]')
    await sessionsOverlay.waitFor()
    const expandMs = Date.now() - started
    measured.expandMs = expandMs
    assert.ok(expandMs < 175, `double-click expand latency ${expandMs}`)
    assert.equal(await sessionsOverlay.getAttribute('data-widget-mode'), 'expanded')
    const sessionsHit = await hitAt(page, sessionsPoint)
    measured.sessionsThirdHit = sessionsHit
    await page.waitForTimeout(280)
    await clickAt(page, sessionsPoint)
    await page.waitForTimeout(80)
    assert.equal(
      await sessionsOverlay.getAttribute('data-widget-mode'),
      'fullscreen',
      `same-spot third click on Sessions should fullscreen, hit ${JSON.stringify(sessionsHit)}`,
    )
    await page.keyboard.press('Escape')
    await sessionsOverlay.waitFor({ state: 'detached' })

    const again = await pointIn(sessionsHeader, 48)
    await clickAt(page, again)
    await page.waitForTimeout(220)
    await clickAt(page, again)
    await page.waitForTimeout(220)
    await clickAt(page, again)
    await sessionsOverlay.waitFor()
    assert.equal(await sessionsOverlay.getAttribute('data-widget-mode'), 'fullscreen')
    const overlayHeader = sessionsOverlay.locator('[data-widget-header]').first()
    const overlayPoint = await pointIn(overlayHeader, 48)
    await clickAt(page, overlayPoint)
    await page.waitForTimeout(200)
    await clickAt(page, overlayPoint)
    await page.waitForTimeout(200)
    await clickAt(page, overlayPoint)
    await sessionsOverlay.waitFor({ state: 'detached' })

    await page.locator('[data-dock-item="sessions"]').hover()
    await page.locator('[data-dock-item="sessions"]').getByRole('button', { name: 'Expand Sessions' }).click()
    await sessionsOverlay.waitFor()
    assert.equal(await sessionsOverlay.getAttribute('data-widget-mode'), 'expanded')
    await page.waitForTimeout(700)
    assert.equal(await sessionsOverlay.getAttribute('data-widget-mode'), 'expanded')
    await sessionsOverlay.getByRole('button', { name: 'Fullscreen' }).click()
    assert.equal(await sessionsOverlay.getAttribute('data-widget-mode'), 'fullscreen')
    await page.waitForTimeout(700)
    assert.equal(await sessionsOverlay.getAttribute('data-widget-mode'), 'fullscreen')
    await sessionsOverlay.getByRole('button', { name: 'Restore Sessions' }).click()
    await sessionsOverlay.waitFor({ state: 'detached' })

    const play = page.locator('[data-dock-item="music"]').getByRole('button', { name: /Play|Pause/ }).first()
    await play.click()
    await page.waitForTimeout(250)
    assert.equal(await page.locator('[data-widget-overlay="music"]').count(), 0, 'transport button must not expand Music')

    const musicDockHeader = page.locator('[data-dock-item="music"] [data-widget-header]').first()
    const musicDockPoint = await pointIn(musicDockHeader, 24)
    await clickAt(page, musicDockPoint)
    await page.waitForTimeout(280)
    await clickAt(page, musicDockPoint)
    await page.waitForTimeout(280)
    const musicDockHit = await hitAt(page, musicDockPoint)
    measured.musicDockThirdHit = musicDockHit
    await clickAt(page, musicDockPoint)
    const musicDockOverlay = page.locator('[data-widget-overlay="music"]')
    await musicDockOverlay.waitFor()
    assert.equal(
      await musicDockOverlay.getAttribute('data-widget-mode'),
      'fullscreen',
      `dock Music third click hit ${JSON.stringify(musicDockHit)}`,
    )
    assert.equal(await musicDockOverlay.locator('[data-name="MusicLibrarySlot"][data-library-mode="providers"]').count(), 1)
    assert.equal(await musicDockOverlay.locator('[data-name="LeekBeatsLibrary"][data-library-mode="providers"]').count(), 1)
    await page.keyboard.press('Escape')
    await musicDockOverlay.waitFor({ state: 'detached' })

    const dragHeader = page.locator('[data-dock-item="humanTesting"] [data-widget-header]').first()
    const dragBox = await dragHeader.boundingBox()
    await page.mouse.move(dragBox.x + 20, dragBox.y + dragBox.height / 2)
    await page.mouse.down()
    await page.mouse.move(dragBox.x + 48, dragBox.y + dragBox.height / 2 + 28, { steps: 6 })
    await page.mouse.up()
    await page.waitForTimeout(400)
    assert.equal(await page.locator('[data-widget-overlay="humanTesting"]').count(), 0, 'a drag must not expand the widget')

    await page.locator('[data-project-file="Info.md"]').click()
    const viewer = page.locator('[data-testid="file-viewer"]')
    await viewer.waitFor()
    const title = page.locator('[data-testid="file-viewer-titlebar"]')
    const titlePoint = await pointIn(title, 48)
    await clickAt(page, titlePoint)
    await page.waitForTimeout(400)
    await clickAt(page, titlePoint)
    await page.waitForTimeout(400)
    await clickAt(page, titlePoint)
    await page.waitForTimeout(700)
    assert.equal(await viewer.getAttribute('data-fullscreen'), 'true', 'file title triple-click fullscreens')
    const exitPoint = await pointIn(title, 48)
    await clickAt(page, exitPoint)
    await page.waitForTimeout(400)
    await clickAt(page, exitPoint)
    await page.waitForTimeout(400)
    await clickAt(page, exitPoint)
    await page.waitForTimeout(700)
    assert.equal(await viewer.getAttribute('data-fullscreen'), 'false', 'a later triple-click leaves fullscreen')
    await viewer.getByRole('button', { name: 'Fullscreen' }).click()
    assert.equal(await viewer.getAttribute('data-fullscreen'), 'true')
    await page.waitForTimeout(700)
    assert.equal(await viewer.getAttribute('data-fullscreen'), 'true', 'fullscreen button must not be cleared by the title timer')
    await page.keyboard.press('Escape')
    await viewer.waitFor({ state: 'detached' })

    fs.writeFileSync(path.join(evidenceDir, 'measured.json'), JSON.stringify({ ...measured, pageErrors }, null, 2))
    assert.deepEqual(pageErrors, [])
  } finally {
    await browser.close()
    await close(server)
  }
})
