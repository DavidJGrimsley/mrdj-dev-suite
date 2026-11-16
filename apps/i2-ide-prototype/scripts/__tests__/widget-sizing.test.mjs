// Unit + real-browser tests for compact music labels, tall flex-filling restored
// Web Preview, and bidirectional vertical edge resizing of dock widgets.
// Run `pnpm build:hosted` before executing so dist-hosted/web is current.
import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const testDir = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(testDir, '..', '..')
const webDir = path.join(appRoot, 'dist-hosted', 'web')
const workspaceRoot = path.resolve(appRoot, '../../..')
const screenshotDir = path.join(workspaceRoot, 'generated', 'ide-widgets-review-2026-11-15', 'hydrogen-screenshots')

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
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase()
        res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' })
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

const listen = (server) =>
  new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server.address().port)))
const close = (server) => new Promise((resolve) => server.close(resolve))

async function dragBy(page, handleBox, dx, dy, steps = 12) {
  const cx = handleBox.x + handleBox.width / 2
  const cy = handleBox.y + handleBox.height / 2
  await page.mouse.move(cx, cy)
  await page.mouse.down()
  await page.mouse.move(cx + dx, cy + dy, { steps })
  await page.mouse.up()
}

test('dockBehavior: clampPairResize conserves total height across both edge directions', async () => {
  const mod = await import(pathToFileURL(path.join(appRoot, 'src', 'app', 'widgets', 'dockBehavior.ts')).href)
  const { clampPairResize, DEFAULT_WIDGET_MIN_HEIGHT } = mod

  assert.equal(DEFAULT_WIDGET_MIN_HEIGHT, 72)

  // Bottom-edge drag down grows upper and shrinks lower proportionately
  const down = clampPairResize(150, 300, 60, 72, 160)
  assert.equal(down.abovePx, 210)
  assert.equal(down.belowPx, 240)
  assert.equal(down.abovePx + down.belowPx, 450)

  // Dragging down past lower minHeight clamps without breaking conservation
  const clampedDown = clampPairResize(150, 300, 400, 72, 160)
  assert.equal(clampedDown.belowPx, 160)
  assert.equal(clampedDown.abovePx, 290)
  assert.equal(clampedDown.abovePx + clampedDown.belowPx, 450)

  // Top-edge pull upward (negative deltaY) grows lower and shortens upper
  const pullUp = clampPairResize(210, 240, -50, 72, 160)
  assert.equal(pullUp.abovePx, 160)
  assert.equal(pullUp.belowPx, 290)
  assert.equal(pullUp.abovePx + pullUp.belowPx, 450)

  // Top-edge pull upward past upper minHeight clamps cleanly
  const clampedUp = clampPairResize(150, 300, -300, 72, 160)
  assert.equal(clampedUp.abovePx, 72)
  assert.equal(clampedUp.belowPx, 378)

  // Constrained total height smaller than sum of minimums remains non-negative & conserved
  const tight = clampPairResize(60, 60, 40, 90, 90)
  assert.equal(tight.abovePx + tight.belowPx, 120)
  assert.ok(tight.abovePx >= 24 && tight.belowPx >= 24)
})

test('dockBehavior: computeZoneResizeWeights adjusts adjacent pair while preserving other widgets', async () => {
  const mod = await import(pathToFileURL(path.join(appRoot, 'src', 'app', 'widgets', 'dockBehavior.ts')).href)
  const { computeZoneResizeWeights } = mod

  const snapshot = [
    { id: 'projectFolder', heightPx: 140, grow: false, minHeight: 72 },
    { id: 'agentTasks', heightPx: 300, grow: true, minHeight: 72 },
    { id: 'explorer', heightPx: 220, grow: false, minHeight: 72 },
  ]

  // Drag bottom edge of projectFolder down by +60px (grows projectFolder, shrinks agentTasks)
  const w1 = computeZoneResizeWeights(snapshot, {}, 0, 1, 60)
  assert.ok(w1.projectFolder > 140 / 300)
  assert.ok(w1.agentTasks < 300 / 300)
  assert.ok(Math.abs((w1.projectFolder + w1.agentTasks) - (440 / 300)) < 0.02)
  // Fixed non-adjacent widget remains unsized so it keeps its natural basis height
  assert.equal(w1.explorer, undefined)

  // Flexible non-adjacent widget preserves its proportional weight
  const flexSnapshot = snapshot.map((item) => ({ ...item, grow: true }))
  const w1Flex = computeZoneResizeWeights(flexSnapshot, {}, 0, 1, 60)
  assert.ok(Math.abs(w1Flex.explorer - 220 / 300) < 0.02)

  // Drag top edge of explorer upward by -40px (pair agentTasks=1, explorer=2)
  const w2 = computeZoneResizeWeights(snapshot, w1, 1, 2, -40)
  assert.ok(w2.explorer > 220 / 300)
  assert.ok(w2.agentTasks < 300 / 300)
  // projectFolder retains its resized weight from w1
  assert.ok(Math.abs(w2.projectFolder - 140 / 300) < 0.02)
})

test('browser: compact music artist/title, tall restored Web Preview, and top/bottom edge resizing', async (t) => {
  const chromePath = process.env.CHROME_PATH || path.join(process.env.ProgramFiles || 'C:/Program Files', 'Google/Chrome/Application/chrome.exe')
  const pwPath = path.join(workspaceRoot, 'temp', 'exact-upstream', 'node_modules', 'playwright-core')
  if (!fs.existsSync(chromePath) || !fs.existsSync(pwPath)) {
    t.skip('Chrome or playwright-core not available on host')
    return
  }
  assert.ok(fs.existsSync(path.join(webDir, 'index.html')), 'run `pnpm build:hosted` before browser tests')
  fs.mkdirSync(screenshotDir, { recursive: true })

  const { chromium } = await import(pathToFileURL(path.join(pwPath, 'index.mjs')).href)
  const appServer = createStaticServer(webDir, '/iSquared/')
  const port = await listen(appServer)
  const url = `http://127.0.0.1:${port}/iSquared/?beat=COMPLETE`

  const browser = await chromium.launch({ executablePath: chromePath, headless: true })
  const pageErrors = []
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const page = await context.newPage()
    page.on('pageerror', (err) => pageErrors.push(err.message))

    // 1. Floating Home player shows the artist too.
    await page.goto(url, { waitUntil: 'networkidle' })
    const homeMusicText = await page.locator('[data-testid="music-track-primary"]').first().innerText()
    assert.equal(homeMusicText.trim(), 'Leek Beats')

    // Open Pet Show and Tell Project Home
    await page.locator('[data-testid="home-projects-column"] button:has-text("Pet Show and Tell")').first().click()
    await page.waitForSelector('[data-testid="project-home"]', { timeout: 10000 })
    await page.waitForSelector('[data-dock-item="music"] [data-testid="music-track-primary"]', { timeout: 8000 })

    // 2. Compact music widget: shows ARTIST and SONG TITLE, not playlist title
    const primary = await page.locator('[data-dock-item="music"] [data-testid="music-track-primary"]').innerText()
    const title = await page.locator('[data-dock-item="music"] [data-testid="music-track-title"]').innerText()
    assert.equal(primary.trim(), 'Leek Beats', 'compact music primary line shows artist')
    assert.equal(title.trim(), 'Night Market', 'compact music title line shows song title')
    assert.doesNotMatch(primary, /Curated/, 'compact dock music does not show playlist title as artist')

    // Switch track and confirm artist stays Leek Beats & title updates to Costco Dates
    await page.locator('[data-dock-item="music"] button[aria-label="Next track"]').click()
    await page.waitForTimeout(150)
    assert.equal((await page.locator('[data-dock-item="music"] [data-testid="music-track-primary"]').innerText()).trim(), 'Leek Beats')
    assert.equal((await page.locator('[data-dock-item="music"] [data-testid="music-track-title"]').innerText()).trim(), 'Costco Dates')

    await page.screenshot({ path: path.join(screenshotDir, '01-compact-music.png') })

    // Providers modal still preserves i² Curated selection
    await page.locator('[data-dock-item="music"] button[aria-label="Expand Music"]').click()
    await page.waitForSelector('[data-widget-overlay="music"]', { timeout: 6000 })
    await page.locator('[data-widget-overlay="music"] button[aria-label="Fullscreen"]').click()
    await page.waitForSelector('[data-name="LeekBeatsProviders"]', { timeout: 6000 })
    const modalText = await page.locator('[data-name="LeekBeatsProviders"]').innerText()
    assert.match(modalText, /i² Curated/)
    assert.match(modalText, /Playing/)
    await page.keyboard.press('Escape')
    await page.waitForSelector('[data-name="LeekBeatsProviders"]', { state: 'detached', timeout: 6000 })

    // Left column flex-fill: agentTasks (grow) is not squeezed by fixed-basis explorer
    const leftTasksBox = await page.locator('[data-dock-item="agentTasks"]').boundingBox()
    const leftExplorerBox = await page.locator('[data-dock-item="explorer"]').boundingBox()
    assert.ok(leftTasksBox && leftTasksBox.height >= 200, `agentTasks grows properly in left column (${leftTasksBox?.height}px)`)
    assert.ok(leftExplorerBox && leftExplorerBox.height <= 230, `explorer stays near 210px basis (${leftExplorerBox?.height}px)`)

    // 3. Restored Web Preview height & flex-fill
    const initialPreviewBox = await page.locator('[data-dock-item="webPreview"]').boundingBox()
    assert.ok(initialPreviewBox && initialPreviewBox.height >= 300, `initial webPreview fills column (${initialPreviewBox?.height}px)`)

    // Remove webPreview and restore via Widgets modal ('Removed from this screen' -> '+ Web Preview')
    await page.locator('[data-dock-item="webPreview"]').hover()
    await page.locator('button[data-widget-remove="webPreview"]').click({ force: true })
    await page.waitForSelector('[data-dock-item="webPreview"]', { state: 'detached', timeout: 6000 })
    await page.locator('[data-name="HeaderWidgetsButton"]').click()
    await page.waitForSelector('button[data-restore-widget="webPreview"]', { timeout: 6000 })
    await page.locator('button[data-restore-widget="webPreview"]').click()
    await page.keyboard.press('Escape')
    await page.waitForSelector('[data-dock-item="webPreview"]', { timeout: 6000 })
    const restoredPreviewBox = await page.locator('[data-dock-item="webPreview"]').boundingBox()
    assert.ok(restoredPreviewBox && restoredPreviewBox.height >= 300, `restored webPreview fills column (${restoredPreviewBox?.height}px)`)
    await page.screenshot({ path: path.join(screenshotDir, '02-restored-web-preview.png') })

    // Remove webPreview and drag lib:emuWeb from Widgets gallery into right column
    await page.locator('[data-dock-item="webPreview"]').hover()
    await page.locator('button[data-widget-remove="webPreview"]').click({ force: true })
    await page.waitForSelector('[data-dock-item="webPreview"]', { state: 'detached', timeout: 6000 })

    await page.locator('[data-name="HeaderWidgetsButton"]').click()
    await page.waitForSelector('[data-widget-entry="emuWeb"]', { timeout: 6000 })
    const entryBox = await page.locator('[data-widget-entry="emuWeb"]').boundingBox()
    const rightZoneBox = await page.locator('[data-dock-zone="right"]').boundingBox()
    assert.ok(entryBox && rightZoneBox)
    await page.mouse.move(entryBox.x + entryBox.width / 2, entryBox.y + entryBox.height / 2)
    await page.mouse.down()
    await page.mouse.move(rightZoneBox.x + rightZoneBox.width / 2, rightZoneBox.y + rightZoneBox.height / 2, { steps: 14 })
    await page.mouse.up()

    await page.waitForSelector('[data-dock-item="lib:emuWeb"]', { timeout: 6000 })
    await page.waitForTimeout(250)
    const libPreviewBox = await page.locator('[data-dock-item="lib:emuWeb"]').boundingBox()
    assert.ok(libPreviewBox && libPreviewBox.height >= 320, `library-added Web Preview is tall & flex-filling (${libPreviewBox?.height}px)`)
    // Verify inner simulator viewport is visible and not clipped below widget bounds
    const simBox = await page.locator('[data-dock-item="lib:emuWeb"] [data-testid="library-simulator"]').boundingBox()
    assert.ok(simBox && simBox.height >= 260, `library simulator body fills height (${simBox?.height}px)`)
    assert.ok(simBox.y + simBox.height <= libPreviewBox.y + libPreviewBox.height + 2, 'library Web Preview does not overflow frame bottom')
    await page.screenshot({ path: path.join(screenshotDir, '03-library-web-preview.png') })

    // 4. Vertical edge resizing (bottom-edge & top-edge) with two stacked widgets in right column
    const humanItem = page.locator('[data-dock-item="humanTesting"]')
    const emuItem = page.locator('[data-dock-item="lib:emuWeb"]')
    const htBefore = await humanItem.boundingBox()
    const emuBefore = await emuItem.boundingBox()
    assert.ok(htBefore && emuBefore)
    const pairTotalBefore = htBefore.height + emuBefore.height

    // Check accessible separator handles exist
    const bottomHandle = page.locator('[data-resize-widget="humanTesting"][data-widget-resize="bottom"]')
    const topHandle = page.locator('[data-resize-widget="lib:emuWeb"][data-widget-resize="top"]')
    assert.equal(await bottomHandle.getAttribute('role'), 'separator')
    assert.equal(await topHandle.getAttribute('role'), 'separator')
    // Top handle should NOT exist on first widget, bottom handle should NOT exist on last widget (or single)
    assert.equal(await page.locator('[data-resize-widget="humanTesting"][data-widget-resize="top"]').count(), 0)

    // Bottom-edge drag down on humanTesting by +90px
    const bhBox = await bottomHandle.boundingBox()
    assert.ok(bhBox)
    await dragBy(page, bhBox, 0, 90)
    await page.waitForTimeout(150)

    const htAfterDown = await humanItem.boundingBox()
    const emuAfterDown = await emuItem.boundingBox()
    assert.ok(htAfterDown && emuAfterDown)
    assert.ok(htAfterDown.height >= htBefore.height + 60, `humanTesting grew on bottom drag (${htBefore.height} -> ${htAfterDown.height})`)
    assert.ok(emuAfterDown.height <= emuBefore.height - 60, `lib:emuWeb shrank proportionally (${emuBefore.height} -> ${emuAfterDown.height})`)
    assert.ok(Math.abs((htAfterDown.height + emuAfterDown.height) - pairTotalBefore) <= 3, 'pair height conserved on bottom-edge resize')

    // No horizontal/vertical overflow in right zone
    const rightOverflow = await page.locator('[data-dock-zone="right"] > div').first().evaluate((el) => el.scrollHeight - el.clientHeight)
    assert.ok(rightOverflow <= 2, `right zone has no unexpected overflow (${rightOverflow}px)`)
    await page.screenshot({ path: path.join(screenshotDir, '04-resized-bottom-edge.png') })

    // Top-edge pull upward on lib:emuWeb by -65px
    const thBox = await topHandle.boundingBox()
    assert.ok(thBox)
    await dragBy(page, thBox, 0, -65)
    await page.waitForTimeout(150)

    const htAfterUp = await humanItem.boundingBox()
    const emuAfterUp = await emuItem.boundingBox()
    assert.ok(htAfterUp && emuAfterUp)
    assert.ok(emuAfterUp.height >= emuAfterDown.height + 40, `lib:emuWeb grew on top-edge upward drag (${emuAfterDown.height} -> ${emuAfterUp.height})`)
    assert.ok(htAfterUp.height <= htAfterDown.height - 40, `humanTesting shrank proportionately (${htAfterDown.height} -> ${htAfterUp.height})`)
    assert.ok(Math.abs((htAfterUp.height + emuAfterUp.height) - pairTotalBefore) <= 3, 'pair height conserved on top-edge resize')
    await page.screenshot({ path: path.join(screenshotDir, '05-resized-top-edge.png') })

    // Extreme downward drag respects minHeight clamp on lib:emuWeb (>= 155px)
    const bhBox2 = await bottomHandle.boundingBox()
    assert.ok(bhBox2)
    await dragBy(page, bhBox2, 0, 500)
    await page.waitForTimeout(150)
    const emuClamped = await emuItem.boundingBox()
    assert.ok(emuClamped && emuClamped.height >= 155, `lib:emuWeb respects usable minHeight (${emuClamped?.height}px)`)

    // Keyboard resize via ArrowUp on bottomHandle reduces humanTesting & enlarges lib:emuWeb
    await bottomHandle.focus()
    await page.keyboard.press('Shift+ArrowUp')
    await page.waitForTimeout(120)
    const emuAfterKey = await emuItem.boundingBox()
    assert.ok(emuAfterKey && emuAfterKey.height > emuClamped.height + 15, `keyboard Shift+ArrowUp resized pair (${emuClamped.height} -> ${emuAfterKey.height})`)

    // Persistence across navigating Home and back to Pet Show and Tell
    const savedEmuH = emuAfterKey.height
    await page.locator('button:has-text("i2")').first().click()
    await page.waitForSelector('[data-testid="home-projects-column"] button:has-text("Pet Show and Tell")', { timeout: 8000 })
    await page.locator('[data-testid="home-projects-column"] button:has-text("Pet Show and Tell")').first().click()
    await page.waitForSelector('[data-dock-item="lib:emuWeb"]', { timeout: 8000 })
    await page.waitForTimeout(200)
    const emuRestored = await page.locator('[data-dock-item="lib:emuWeb"]').boundingBox()
    assert.ok(emuRestored && Math.abs(emuRestored.height - savedEmuH) <= 4, `resized size persisted across navigation (${savedEmuH} vs ${emuRestored?.height})`)

    assert.deepEqual(pageErrors, [], `unexpected page errors: ${pageErrors.join('; ')}`)
  } finally {
    await browser.close()
    await close(appServer)
  }
})


test('browser: bottom panel stays anchored, fits arrivals, and permits manual stacking and height', async () => {
  const { chromium } = await import(pathToFileURL(path.join(workspaceRoot, 'temp/exact-upstream/node_modules/playwright-core/index.mjs')).href)
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true })
  const server = createStaticServer(webDir)
  const port = await listen(server)
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    await page.goto(`http://127.0.0.1:${port}/iSquared/?beat=COMPLETE`)
    await page.locator('[data-testid="home-projects-column"] button:has-text("Pet Show and Tell")').first().click()
    const panel = page.locator('[data-dock-panel="bottom"]')
    const drag = async (source, target, ratio = .5) => {
      const a = await source.boundingBox(), b = await target.boundingBox()
      await page.mouse.move(a.x + 35, a.y + 12); await page.mouse.down()
      await page.mouse.move(b.x + b.width * ratio, b.y + Math.min(b.height * .5, 80), { steps: 24 }); await page.mouse.up()
      await page.waitForTimeout(150)
    }
    await drag(page.locator('[data-dock-item="explorer"] [data-widget-header]'), page.locator('[data-dock-zone="bottom"]'))
    assert.equal(await panel.locator('[data-dock-column]').count(), 2)
    assert.equal(await panel.locator('[data-dock-item="sessions"] [data-compact="true"]').count(), 1)
    const fit = async () => page.evaluate(() => {
      const panel = document.querySelector('[data-dock-panel="bottom"]'), center = document.querySelector('[data-dock-center]')
      const r = panel.getBoundingClientRect()
      return { h: r.height, bottom: r.bottom, center: center.clientHeight, viewport: innerHeight,
        widgets: [...panel.querySelectorAll('[data-dock-item]')].map(e => ({bottom: e.getBoundingClientRect().bottom, height:e.clientHeight})) }
    })
    const initial = await fit()
    assert.ok(initial.h <= initial.center * .5 + 1, JSON.stringify(initial))
    const explorer = panel.locator('[data-dock-item="explorer"]')
    for (let i = 0; i < 10; i++) {
      const closed = explorer.locator('[data-explorer-folder][aria-expanded="false"]')
      if (!await closed.count()) break
      await closed.first().click()
    }
    const expanded = await fit()
    assert.ok(expanded.bottom <= expanded.viewport && expanded.widgets.every(w => w.bottom <= expanded.bottom + 1), JSON.stringify(expanded))
    assert.ok(Math.abs(initial.h - expanded.h) < 2, 'Expanding folders does not grow the panel')
    await page.screenshot({path:path.join(screenshotDir, '06-bottom-explorer-bounded.png')})
    await drag(page.locator('[data-dock-item="projectFolder"] [data-widget-header]'), page.locator('[data-dock-zone="bottom"]'))
    const shortStack = await page.evaluate(() => [...document.querySelectorAll('[data-dock-zone="bottom"] [data-dock-column]')].map(e => [...e.querySelectorAll('[data-dock-item]')].map(w => w.getAttribute('data-dock-item'))))
    assert.ok(shortStack.some(ids => ids.includes('sessions') && ids.includes('projectFolder')), 'short folder stacks under Sessions')
    assert.equal(shortStack.length, 2)
    // Once installed, the same widget can still be explicitly stacked inside another column.
    await drag(explorer.locator('[data-widget-header]'), panel.locator('[data-dock-column]').first())
    assert.equal(await panel.locator('[data-dock-column]').count(), 1)
    assert.equal(await panel.locator('[data-dock-item]').count(), 3)
    const splitter = await page.locator('[data-dock-splitter="bottom"]').boundingBox()
    await page.mouse.move(splitter.x + 30, splitter.y + 3); await page.mouse.down()
    await page.mouse.move(splitter.x + 30, splitter.y - 290, {steps:20}); await page.mouse.up()
    const manual = await fit()
    assert.ok(manual.h > manual.center * .5, JSON.stringify(manual))
    assert.ok(manual.bottom <= manual.viewport + 1)
    await page.screenshot({path:path.join(screenshotDir, '07-bottom-manual-expanded.png')})
    await page.setViewportSize({width:1000,height:560}); await page.waitForTimeout(200)
    const small = await fit()
    assert.ok(small.bottom <= small.viewport + 1, JSON.stringify(small))
  } finally { await browser.close(); await close(server) }
})
