// Dock collapse, flow, header gestures, session cards, glow, ellipsis, and the simulator chip.
import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const testDir = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(testDir, '../..')
const workspaceRoot = path.resolve(appRoot, '../../..')
const dockBuild = process.env.I2_BUILD_DIR || path.join(appRoot, 'dist-hosted', 'web')
const evidence = path.join(workspaceRoot, 'generated', 'ide-widgets-audit-2026-11-14', 'dock-evidence')
const behavior = await import('../../src/app/widgets/dockBehavior.ts')

test('collapse remembers a partial mix and the header gap is longer than 175ms', () => {
  assert.ok(behavior.HEADER_CLICK_GAP_MS > 175)
  const defaults = { left: 236, right: 336, bottom: 300 }
  const partial = behavior.nextDockCollapse({ left: 0, right: 336, bottom: 280 }, null, defaults)
  assert.deepEqual(partial.sizes, { left: 0, right: 0, bottom: 0 })
  assert.deepEqual(partial.remembered, { left: 0, right: 336, bottom: 280 })
  const restored = behavior.nextDockCollapse(partial.sizes, partial.remembered, defaults)
  assert.deepEqual(restored.sizes, { left: 0, right: 336, bottom: 280 })
  assert.equal(behavior.bottomPanelHeight(300, 900, 180, 8), 300)
  assert.equal(behavior.bottomPanelHeight(300, 900, 180, 8, 1200), 450)
  assert.equal(behavior.bottomPanelHeight(800, 900, 180, 8, 1200, true), 800)
  assert.equal(behavior.bottomPanelHeight(1000, 900, 180, 8, 1200, true), 844)
  assert.equal(behavior.bottomPanelHeight(300, 420, 180, 8), 210)
  assert.equal(behavior.bottomPanelHeight(0, 900), 0)
  assert.equal(behavior.bottomPanelHeight(240, 900, 180, 8, 380), 380)
  assert.equal(behavior.bottomPanelHeight(240, 480, 180, 8, 380), 240)
  assert.equal(behavior.bottomPanelHeight(0, 900, 180, 8, 380), 0)
})

test('a second header click expands immediately and a later third click reaches fullscreen', () => {
  let g = { count: 0, mode: 'normal', pendingToggle: false }
  g = behavior.applyHeaderClick(g, false)
  assert.equal(g.mode, 'normal')
  g = behavior.applyHeaderClick(g, false)
  assert.equal(g.mode, 'expanded')
  assert.equal(g.pendingToggle, false)
  const stayed = behavior.expireHeaderGesture(g)
  assert.equal(stayed.mode, 'expanded')
  g = behavior.applyHeaderClick({ count: 0, mode: 'normal', pendingToggle: false }, false)
  g = behavior.applyHeaderClick(g, false)
  g = behavior.applyHeaderClick(g, false)
  assert.equal(g.mode, 'fullscreen')
  assert.equal(g.count, 0)
  const custom = behavior.applyHeaderClick(
    behavior.applyHeaderClick({ count: 0, mode: 'normal', pendingToggle: false }, true),
    true,
  )
  assert.equal(custom.customCall, true)
  const third = behavior.applyHeaderClick(custom, true)
  assert.equal(third.customCall, false)
})

test('a third click on the overlay continues the gesture, and later clicks restore', () => {
  const anchor = { left: 100, top: 40, right: 280, bottom: 68 }
  assert.equal(behavior.pointInHeaderAnchor(anchor, 140, 50), true)
  assert.equal(behavior.pointInHeaderAnchor(anchor, 90, 50), false)
  assert.equal(behavior.pointInHeaderAnchor(anchor, 96, 50), true)
  const open = { onInteractive: false, onOwnedHeader: false, gestureOpen: true, inAnchor: true, onForeignHeader: false, onOwnOverlay: true }
  assert.equal(behavior.classifyHeaderGestureClick(open), 'continue')
  assert.equal(behavior.classifyHeaderGestureClick({ ...open, onInteractive: true }), null)
  assert.equal(behavior.classifyHeaderGestureClick({ ...open, onOwnOverlay: false }), null)
  assert.equal(behavior.classifyHeaderGestureClick({ ...open, onForeignHeader: true }), null)
  assert.equal(behavior.classifyHeaderGestureClick({ ...open, gestureOpen: false }), null)
  assert.equal(behavior.classifyHeaderGestureClick({ ...open, inAnchor: false, onOwnedHeader: true }), 'header')

  const step = (g, kind) => {
    const decision = behavior.classifyHeaderGestureClick({
      onInteractive: kind === 'button',
      onOwnedHeader: kind === 'header',
      gestureOpen: g.count > 0,
      inAnchor: kind !== 'outside',
      onForeignHeader: kind === 'foreign',
      onOwnOverlay: kind === 'continue' || kind === 'outside',
    })
    if (!decision) return g
    return behavior.applyHeaderClick(g, false)
  }
  let g = { count: 0, mode: 'normal', pendingToggle: false }
  g = step(g, 'header')
  g = step(g, 'header')
  assert.equal(g.mode, 'expanded')
  assert.equal(g.pendingToggle, false)
  g = step(g, 'button')
  assert.equal(g.mode, 'expanded')
  assert.equal(g.count, 2)
  g = step(g, 'continue')
  assert.equal(g.mode, 'fullscreen')
  assert.equal(g.count, 0)

  g = { count: 0, mode: 'fullscreen', pendingToggle: false }
  g = step(g, 'header')
  g = step(g, 'header')
  assert.equal(g.mode, 'fullscreen')
  assert.equal(g.pendingToggle, true)
  assert.equal(behavior.expireHeaderGesture(g).mode, 'expanded')
  g = step(g, 'header')
  assert.equal(g.mode, 'normal')

  g = { count: 0, mode: 'expanded', pendingToggle: false }
  g = step(g, 'header')
  g = step(g, 'header')
  assert.equal(behavior.expireHeaderGesture(g).mode, 'normal')
  g = step({ count: 0, mode: 'expanded', pendingToggle: false }, 'header')
  g = step(g, 'header')
  g = step(g, 'continue')
  assert.equal(g.mode, 'fullscreen')
})

test('session cards use width, music stacks with Current Goal, and popovers stay inside the viewport', () => {
  assert.equal(behavior.sessionsUseFullCards(false, 500, 2), false)
  assert.equal(behavior.sessionsUseFullCards(true, 120, 9), true)
  assert.equal(behavior.sessionsUseFullCards(false, 0, 4), true)
  assert.equal(behavior.sessionsUseFullCards(false, 336, 1, 'right'), false)
  assert.equal(behavior.sessionsUseFullCards(false, 336, 1, 'left'), false)
  assert.equal(behavior.sessionsUseFullCards(true, 336, 1, 'right'), true)
  assert.equal(behavior.sessionsUseFullCards(false, 336, 1, 'bottom'), true)
  assert.equal(behavior.HOVER_OPEN_MS, 250)
  assert.equal(behavior.HUG_CARD_WIDTH, 340)
  const cols = behavior.toColumns(['music', 'goalPlan', 'sessions'], () => false)
  assert.deepEqual(cols, [['music', 'goalPlan'], ['sessions']])
  const pos = behavior.popoverPosition({ left: 20, right: 180, top: 40 }, { width: 400, height: 300 })
  assert.ok(pos.left >= 8)
  assert.ok(pos.top >= 8)
  assert.ok(pos.left + pos.width <= 392)
  assert.ok(pos.top + 220 <= 300)
})

test('ordinary session strip is not a tab list and both shells call toggleAll', () => {
  const app = fs.readFileSync(path.join(appRoot, 'src/app/App.tsx'), 'utf8')
  const ordinary = app.slice(app.indexOf('data-testid="session-tab-strip"'), app.indexOf('data-testid="session-tab-strip"') + 400)
  assert.match(ordinary, /onDoubleClick=\{\(\) => sizes\.toggleAll\(\)\}/)
  assert.equal(ordinary.includes('role="tab"'), false)
  const agents = app.slice(app.indexOf('data-testid="session-agent-tabs"') - 180, app.indexOf('data-testid="session-agent-tabs"') + 220)
  assert.match(agents, /role="tablist"/)
  assert.match(agents, /sizes\.toggleAll\(\)/)
  assert.match(app, /data-testid="project-infie-header"/)
  const panel = fs.readFileSync(path.join(appRoot, 'src/app/widgets/SessionsPanel.tsx'), 'utf8')
  assert.equal(panel.includes('onMouseEnter'), false)
  assert.equal(panel.includes('onMouseLeave'), false)
  const css = fs.readFileSync(path.join(appRoot, 'src/styles/widgets.css'), 'utf8')
  assert.equal(css.includes('z-index: 9999'), false)
  assert.equal(css.includes('local('), false)
  assert.equal(css.includes('align-self: baseline'), false)
  assert.match(css, /ellipsis-latin\.ttf/)
})

function createStaticServer(distDir) {
  const types = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.ttf': 'font/ttf',
    '.woff2': 'font/woff2',
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
  const visible = await got.waitFor({ state: 'visible', timeout: 1500 }).then(() => true).catch(() => false)
  if (!visible) return
  await got.click()
  await page.locator('[data-testid="prototype-limit-modal"]').waitFor({ state: 'detached', timeout: 5000 })
}

test('browser: dock panels, gestures, cards, glow, ellipsis, and the read-only chip', async () => {
  const chromePath = process.env.CHROME_PATH || path.join(process.env.ProgramFiles || 'C:/Program Files', 'Google/Chrome/Application/chrome.exe')
  const pwPath = path.join(workspaceRoot, 'temp', 'exact-upstream', 'node_modules', 'playwright-core')
  assert.ok(fs.existsSync(chromePath), `Chrome missing at ${chromePath}`)
  assert.ok(fs.existsSync(pwPath), `playwright-core missing at ${pwPath}`)
  assert.ok(fs.existsSync(path.join(dockBuild, 'index.html')), `Build missing at ${dockBuild}`)
  fs.mkdirSync(evidence, { recursive: true })
  const { chromium } = await import(pathToFileURL(path.join(pwPath, 'index.mjs')).href)
  const server = createStaticServer(dockBuild)
  const port = await listen(server)
  const browser = await chromium.launch({ executablePath: chromePath, headless: true })
  const measured = {}
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    const pageErrors = []
    page.on('pageerror', (error) => pageErrors.push(String(error)))
    await page.goto(`http://127.0.0.1:${port}/?beat=COMPLETE`, { waitUntil: 'domcontentloaded' })
    await page.locator('[data-testid="home-projects-column"]').waitFor()
    await page.locator('[data-testid="home-projects-column"] [data-project-id="pet"]').click()
    await page.locator('[data-testid="project-home"][data-project-id="pet"]').waitFor()

    const readSides = async () => ({
      left: Number(await page.locator('[data-dock-splitter="left"]').getAttribute('aria-valuenow')),
      right: Number(await page.locator('[data-dock-splitter="right"]').getAttribute('aria-valuenow')),
      bottom: Number(await page.locator('[data-dock-splitter="bottom"]').getAttribute('aria-valuenow')),
    })
    const before = await readSides()
    assert.ok(before.left > 0 && before.right > 0 && before.bottom > 0)

    const fit = await page.evaluate(() => {
      const centre = document.querySelector('[data-dock-center]')
      const panel = document.querySelector('[data-dock-panel="bottom"]')
      const chat = document.querySelector('[data-dock-chat]')
      const flow = document.querySelector('[data-dock-flow-list]')
      const send = document.querySelector('[data-testid="composer-send"]')
      const panelRect = panel.getBoundingClientRect()
      const centreRect = centre.getBoundingClientRect()
      const sendRect = send.getBoundingClientRect()
      let clip = null
      let node = panel.parentElement
      while (node) {
        const overflow = getComputedStyle(node).overflowY
        if (overflow === 'hidden' || overflow === 'clip' || overflow === 'auto' || overflow === 'scroll') {
          const box = node.getBoundingClientRect()
          if (panelRect.top < box.top - 1 || panelRect.bottom > box.bottom + 1) clip = node.getAttribute('data-testid') || node.className
        }
        node = node.parentElement
      }
      return {
        panelHeight: panelRect.height,
        declared: Number(panel.getAttribute('data-panel-height')),
        chatHeight: chat.getBoundingClientRect().height,
        centreHeight: centreRect.height,
        flowOverflow: getComputedStyle(flow).overflowY,
        panelOverflow: getComputedStyle(panel).overflowY,
        sendTop: sendRect.top,
        sendBottom: sendRect.bottom,
        clip,
      }
    })
    measured.desktop = fit
    assert.equal(fit.clip, null)
    assert.ok(Math.abs(fit.panelHeight - before.bottom) < 4, `panel ${fit.panelHeight} vs splitter ${before.bottom}`)
    assert.equal(fit.declared, before.bottom)
    assert.ok(fit.chatHeight >= 180, `chat ${fit.chatHeight}`)
    assert.equal(fit.flowOverflow, 'auto')
    assert.equal(fit.panelOverflow, 'hidden')
    assert.ok(fit.sendTop >= 0 && fit.sendBottom <= 900)

    const splitter = page.locator('[data-dock-splitter="bottom"]')
    const splitBox = await splitter.boundingBox()
    await page.mouse.move(splitBox.x + 30, splitBox.y + 4)
    await page.mouse.down()
    await page.mouse.move(splitBox.x + 30, splitBox.y - 48, { steps: 8 })
    await page.mouse.up()
    const grown = Number(await splitter.getAttribute('aria-valuenow'))
    assert.ok(grown > before.bottom, `splitter ${before.bottom} -> ${grown}`)

    await page.setViewportSize({ width: 1440, height: 560 })
    await page.waitForTimeout(200)
    const short = await page.evaluate(() => {
      const panel = document.querySelector('[data-dock-panel="bottom"]')
      const chat = document.querySelector('[data-dock-chat]')
      const centre = document.querySelector('[data-dock-center]')
      const bar = document.querySelector('[data-dock-splitter="bottom"]')
      return {
        panel: panel.getBoundingClientRect().height,
        declared: Number(panel.getAttribute('data-panel-height')),
        chat: chat.getBoundingClientRect().height,
        centre: centre.clientHeight,
        bar: bar.offsetHeight,
        splitter: Number(bar.getAttribute('aria-valuenow')),
      }
    })
    measured.shortViewport = short
    assert.ok(short.splitter > 0)
    assert.ok(short.panel <= short.splitter + 1)
    assert.ok(short.chat >= 48, `short chat ${short.chat}`)
    const room = short.centre - 48 - short.bar
    if (short.splitter > room + 1) assert.ok(short.panel <= room + 2, `cap panel ${short.panel} room ${room}`)
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.waitForTimeout(150)
    // A splitter double-click toggles that one side to 0, and the next one restores its default.
    await splitter.dblclick()
    assert.equal(Number(await splitter.getAttribute('aria-valuenow')), 0)
    await splitter.dblclick()
    assert.equal(Number(await splitter.getAttribute('aria-valuenow')), before.bottom)

    const mounted = async () => page.locator('[data-dock-item]').count()
    const mountedBefore = await mounted()
    await page.locator('[data-testid="project-infie-header"]').dblclick()
    const collapsed = await readSides()
    assert.deepEqual(collapsed, { left: 0, right: 0, bottom: 0 })
    assert.equal(await mounted(), mountedBefore)
    assert.equal(await page.locator('[data-dock-splitter]').count(), 3)
    await page.locator('[data-testid="project-infie-header"]').dblclick()
    assert.deepEqual(await readSides(), before)

    await page.locator('[data-dock-splitter="left"]').dblclick()
    assert.equal((await readSides()).left, 0)
    await page.locator('[data-testid="project-infie-header"]').dblclick()
    assert.deepEqual(await readSides(), { left: 0, right: 0, bottom: 0 })
    await page.locator('[data-testid="project-infie-header"]').dblclick()
    assert.deepEqual(await readSides(), { left: 0, right: before.right, bottom: before.bottom })
    await page.locator('[data-dock-splitter="left"]').dblclick()
    assert.deepEqual(await readSides(), before)

    const sessionsHeader = page.locator('[data-dock-item="sessions"] [data-widget-header]').first()
    await page.evaluate(() => {
      window.__expandMark = 0
      window.__expandObserver = new MutationObserver(() => {
        if (document.querySelector('[data-widget-overlay="sessions"]') && !window.__expandMark) window.__expandMark = performance.now()
      })
      window.__expandObserver.observe(document.body, { childList: true, subtree: true })
    })
    await sessionsHeader.click({ position: { x: 48, y: 10 } })
    await page.waitForTimeout(300)
    const started = await page.evaluate(() => performance.now())
    await sessionsHeader.click({ position: { x: 48, y: 10 } })
    await page.locator('[data-widget-overlay="sessions"]').waitFor()
    const expandMs = await page.evaluate((t0) => window.__expandMark - t0, started)
    measured.expandMs = expandMs
    assert.ok(expandMs >= 0 && expandMs < 175, `expand latency ${expandMs}`)
    await page.waitForTimeout(280)
    await page.locator('[data-widget-overlay="sessions"] [data-widget-header]').first().click({ position: { x: 48, y: 10 } })
    await page.waitForFunction(() => document.querySelector('[data-widget-overlay="sessions"]')?.getAttribute('data-widget-mode') === 'fullscreen')
    const hug = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('[data-widget-overlay="sessions"] [data-session-card]')]
      const layout = document.querySelector('[data-widget-overlay="sessions"] [data-sessions-layout]')
      const a = cards[0]?.getBoundingClientRect()
      const b = cards[1]?.getBoundingClientRect()
      const twoColumns = Boolean(a && b && Math.abs(a.top - b.top) < 24 && Math.abs(a.left - b.left) > 40)
      return {
        hug: layout?.getAttribute('data-session-hug'),
        layout: layout?.getAttribute('data-sessions-layout'),
        cardWidth: cards[0]?.clientWidth ?? 0,
        cardHeight: cards[0]?.clientHeight ?? 0,
        layoutHeight: layout?.getBoundingClientRect().height ?? 0,
        twoColumns,
        count: cards.length,
      }
    })
    measured.hug = hug
    assert.equal(hug.hug, 'true')
    assert.equal(hug.layout, 'cards')
    assert.equal(hug.count, 1, `fullscreen sessions cards ${hug.count}`)
    assert.ok(hug.cardWidth >= 180 && hug.cardWidth <= 560, `hug width ${hug.cardWidth}`)
    assert.ok(hug.cardHeight > 80 && hug.cardHeight < 320, `hug height ${hug.cardHeight}`)
    assert.ok(hug.layoutHeight >= hug.cardHeight)
    await page.keyboard.press('Escape')
    await page.locator('[data-widget-overlay="sessions"]').waitFor({ state: 'detached' })

    const drag = async (from, to, dxRatio) => {
      const a = await from.boundingBox()
      const b = await to.boundingBox()
      await page.mouse.move(a.x + Math.min(24, a.width / 2), a.y + a.height / 2)
      await page.mouse.down()
      await page.mouse.move(b.x + b.width * dxRatio, b.y + b.height * 0.55, { steps: 14 })
      await page.mouse.up()
      await page.waitForTimeout(80)
    }
    const bottomPanelBeforeStack = (await page.locator('[data-dock-panel="bottom"]').boundingBox()).height
    const bottomColumn = page.locator('[data-dock-zone="bottom"] [data-dock-column]').first()
    await drag(page.locator('[data-dock-item="humanTesting"] [data-widget-header]'), bottomColumn, 0.5)
    const stacked = await page.evaluate(() => {
      const columns = [...document.querySelectorAll('[data-dock-zone="bottom"] [data-dock-column]')]
      const panel = document.querySelector('[data-dock-panel="bottom"]')
      const flow = document.querySelector('[data-dock-flow-list]')
      const chat = document.querySelector('[data-dock-chat]')
      return {
        cols: columns.map((col) => ({
          stack: col.getAttribute('data-dock-stack'),
          ids: [...col.querySelectorAll(':scope > [data-dock-item]')].map((el) => el.getAttribute('data-dock-item')),
        })),
        panelHeight: panel.getBoundingClientRect().height,
        flowHeight: flow.offsetHeight,
        chatHeight: chat.getBoundingClientRect().height,
      }
    })
    measured.stacked = stacked
    assert.ok(stacked.cols.some((col) => col.ids.includes('humanTesting')))
    assert.equal(await page.locator('[data-dock-item="sessions"] [data-compact="true"]').count(), 1)
    assert.ok(stacked.panelHeight <= bottomPanelBeforeStack + 2, `fit before growing: ${bottomPanelBeforeStack} -> ${stacked.panelHeight}`)
    assert.ok(stacked.chatHeight >= 180, `chat height after stack ${stacked.chatHeight}`)

    // Manual splitter drag downward shrinks the auto-grown bottom panel responsively.
    const splitAfterStack = await splitter.boundingBox()
    await page.mouse.move(splitAfterStack.x + 30, splitAfterStack.y + 4)
    await page.mouse.down()
    await page.mouse.move(splitAfterStack.x + 30, splitAfterStack.y + 70, { steps: 8 })
    await page.mouse.up()
    await page.waitForTimeout(80)
    const manualShrunkHeight = (await page.locator('[data-dock-panel="bottom"]').boundingBox()).height
    measured.manualShrunkHeight = manualShrunkHeight
    assert.ok(manualShrunkHeight < stacked.panelHeight - 40, `manual shrink ${stacked.panelHeight} -> ${manualShrunkHeight}`)

    const columnsBefore = stacked.cols.length
    const zoneBox = await page.locator('[data-dock-zone="bottom"]').boundingBox()
    const preview = await page.locator('[data-dock-item="webPreview"] [data-widget-header]').boundingBox()
    await page.mouse.move(preview.x + 20, preview.y + preview.height / 2)
    await page.mouse.down()
    await page.mouse.move(zoneBox.x + zoneBox.width - 24, zoneBox.y + Math.min(36, zoneBox.height / 2), { steps: 16 })
    await page.mouse.up()
    await page.waitForTimeout(120)
    const afterCols = await page.evaluate(() => [...document.querySelectorAll('[data-dock-zone="bottom"] [data-dock-column]')].map((col) => [...col.querySelectorAll(':scope > [data-dock-item]')].map((el) => el.getAttribute('data-dock-item'))))
    measured.columns = { before: columnsBefore, after: afterCols }
    assert.ok(afterCols.length > columnsBefore, JSON.stringify(measured.columns))

    await page.locator('[data-dock-item="projectFolder"]').hover()
    await page.locator('[data-widget-remove="projectFolder"]').click()
    await page.locator('[data-dock-item="projectFolder"]').waitFor({ state: 'detached' })
    await page.getByRole('button', { name: 'Widgets' }).click()
    await page.locator('[data-restore-widget="projectFolder"]').click()
    await page.locator('[data-dock-item="projectFolder"]').waitFor()
    await page.keyboard.press('Escape')

    const play = page.locator('[data-dock-item="music"]').getByRole('button', { name: /Play|Pause/ }).first()
    await play.click()
    assert.equal(await page.locator('[data-widget-overlay="music"]').count(), 0)

    const previewHeader = page.locator('[data-dock-item="webPreview"] [data-widget-header]').first()
    await previewHeader.click({ position: { x: 24, y: 8 } })
    await page.waitForTimeout(280)
    await previewHeader.click({ position: { x: 24, y: 8 } })
    const closeEmulator = page.getByRole('button', { name: 'Close emulator' })
    await closeEmulator.waitFor()
    assert.equal(await page.locator('[data-widget-overlay="webPreview"]').count(), 0)
    await closeEmulator.click()
    await closeEmulator.waitFor({ state: 'detached' })

    await page.setViewportSize({ width: 1100, height: 820 })
    await page.waitForTimeout(200)
    let layout = await page.locator('[data-sessions-layout]').getAttribute('data-sessions-layout')
    if (layout !== 'compact') {
      await page.setViewportSize({ width: 980, height: 820 })
      await page.waitForTimeout(200)
      layout = await page.locator('[data-sessions-layout]').getAttribute('data-sessions-layout')
    }
    measured.sessionLayout = layout
    assert.equal(layout, 'compact')
    const compact = page.locator('[data-sessions-layout] [data-compact="true"]').first()
    await compact.hover()
    await page.waitForTimeout(180)
    assert.equal(await page.locator('[data-session-popover]').count(), 0)
    await page.waitForTimeout(140)
    const pop = page.locator('[data-session-popover]')
    await pop.waitFor()
    const popBox = await pop.boundingBox()
    const view = page.viewportSize()
    assert.ok(popBox.x >= 0 && popBox.y >= 0)
    assert.ok(popBox.x + popBox.width <= view.width + 1)
    assert.ok(popBox.y + popBox.height <= view.height + 1)
    await compact.focus()
    await pop.waitFor()
    await page.mouse.move(0, 0)
    await page.waitForTimeout(200)

    await page.emulateMedia({ reducedMotion: 'reduce' })
    const glow = await page.evaluate(() => {
      const item = document.querySelector('[data-dock-item="humanTesting"]')
      const host = item.querySelector('[data-widget-header]') || item
      host.classList.add('infie-glow')
      const style = getComputedStyle(host)
      const hostRect = host.getBoundingClientRect()
      const ring = { top: hostRect.top - 18, right: hostRect.right + 18, bottom: hostRect.bottom + 18, left: hostRect.left - 18 }
      const blocked = []
      const shell = []
      let node = host.parentElement
      while (node && node !== document.body) {
        const overflow = getComputedStyle(node).overflowY
        const clips = overflow === 'hidden' || overflow === 'clip' || overflow === 'auto'
        if (clips) {
          const box = node.getBoundingClientRect()
          const cuts = ring.top < box.top - 1 || ring.bottom > box.bottom + 1 || ring.left < box.left - 1 || ring.right > box.right + 1
          const dock = node.hasAttribute('data-dock-panel') || node.hasAttribute('data-dock-panel-body') || node.hasAttribute('data-dock-zone') || node.hasAttribute('data-dock-column') || node.hasAttribute('data-dock-item') || node.hasAttribute('data-dock-center') || node.hasAttribute('data-dock-chat')
          const label = node.getAttribute('data-dock-panel') || node.getAttribute('data-dock-item') || (node.hasAttribute('data-dock-center') ? 'center' : node.hasAttribute('data-dock-panel-body') ? 'panel-body' : node.className?.toString?.().slice(0, 60) || node.tagName)
          if (dock) blocked.push(label)
          else if (cuts) shell.push(label)
        }
        node = node.parentElement
      }
      const probe = document.createElement('button')
      probe.setAttribute('data-name', 'SessionCompletionSubmit')
      probe.className = 'infie-glow'
      probe.textContent = 'Submit'
      document.body.appendChild(probe)
      const submit = getComputedStyle(probe)
      return {
        z: style.zIndex,
        shadow: style.boxShadow,
        animation: style.animationName,
        blocked,
        shell,
        submitPointer: submit.pointerEvents,
        submitZ: submit.zIndex,
      }
    })
    measured.glow = { z: glow.z, animation: glow.animation, blocked: glow.blocked, shell: glow.shell, submitZ: glow.submitZ }
    assert.equal(glow.z, '40')
    assert.match(glow.shadow, /70px|rgba\(45,\s*212,\s*191/)
    assert.equal(glow.animation, 'none')
    assert.deepEqual(glow.blocked, [])
    assert.equal(glow.submitPointer, 'auto')
    assert.equal(glow.submitZ, '40')
    await page.locator('[data-testid="composer-input"]').fill('hello dock')
    await page.locator('[data-testid="composer-send"]').click()
    await dismissLimit(page)

    const ellipsis = await page.evaluate(async () => {
      await document.fonts.ready
      const probe = document.createElement('div')
      probe.id = 'ellipsis-probe'
      probe.style.cssText = "position:fixed;left:12px;top:12px;z-index:5;background:#111;padding:12px;display:flex;flex-direction:column;gap:8px"
      probe.innerHTML = `
        <div id="ellipsis-literal" style="font-family:'Rounded_Mplus_1c',sans-serif;font-size:32px;color:#fff;line-height:40px">Period. Ellipsis…</div>
        <div id="ellipsis-cut" style="font-family:'Rounded_Mplus_1c',sans-serif;font-size:32px;color:#fff;width:150px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">Sending photos feature</div>`
      document.body.appendChild(probe)
      await document.fonts.load("32px 'Rounded_Mplus_1c'", '…')
      await document.fonts.ready
      const canvas = document.createElement('canvas')
      canvas.width = 420
      canvas.height = 80
      const ctx = canvas.getContext('2d')
      ctx.font = "32px 'Rounded_Mplus_1c', sans-serif"
      ctx.fillStyle = '#fff'
      ctx.textBaseline = 'alphabetic'
      ctx.fillText('.', 20, 50)
      ctx.fillText('…', 80, 50)
      const ink = (x0, x1) => {
        const data = ctx.getImageData(x0, 0, x1 - x0, 80).data
        let top = -1
        let bottom = -1
        for (let y = 0; y < 80; y++) {
          for (let x = 0; x < x1 - x0; x++) {
            if (data[(y * (x1 - x0) + x) * 4 + 3] > 20) {
              if (top < 0) top = y
              bottom = y
            }
          }
        }
        return { top, bottom }
      }
      return { period: ink(10, 50), ellipsis: ink(70, 220), font: document.fonts.check("32px 'Rounded_Mplus_1c'") }
    })
    measured.ellipsis = ellipsis
    assert.equal(ellipsis.font, true)
    assert.ok(Math.abs(ellipsis.period.bottom - ellipsis.ellipsis.bottom) <= 8, JSON.stringify(ellipsis))
    await page.locator('#ellipsis-literal').screenshot({ path: path.join(evidence, 'ellipsis-literal.png') })
    await page.locator('#ellipsis-cut').screenshot({ path: path.join(evidence, 'ellipsis-truncated.png') })

    await page.setViewportSize({ width: 1440, height: 900 })
    await page.locator('[data-project-file="Info.md"]').click()
    const chip = await page.locator('[data-testid="file-viewer-readonly"]').innerText()
    assert.match(chip, /simulator limitation/i)
    assert.match(chip, /full app/i)
    await page.getByRole('button', { name: 'Close files' }).click()

    await page.locator('[data-sessions-layout] [data-session-card="add-comments"]').click()
    await page.locator('[data-testid="session-screen"]').waitFor()
    const strip = page.locator('[data-testid="session-tab-strip"]')
    await strip.waitFor()
    assert.equal(await strip.getAttribute('role'), null)
    assert.equal(await strip.locator('[role="tab"]').count(), 0)
    const sessionBefore = {
      left: Number(await page.locator('[data-dock-splitter="left"]').getAttribute('aria-valuenow')),
      right: Number(await page.locator('[data-dock-splitter="right"]').getAttribute('aria-valuenow')),
      bottom: Number(await page.locator('[data-dock-splitter="bottom"]').getAttribute('aria-valuenow')),
    }
    await strip.dblclick()
    assert.deepEqual({
      left: Number(await page.locator('[data-dock-splitter="left"]').getAttribute('aria-valuenow')),
      right: Number(await page.locator('[data-dock-splitter="right"]').getAttribute('aria-valuenow')),
      bottom: Number(await page.locator('[data-dock-splitter="bottom"]').getAttribute('aria-valuenow')),
    }, { left: 0, right: 0, bottom: 0 })
    assert.ok(await page.locator('[data-dock-item]').count() > 0)
    await strip.dblclick()
    assert.equal(Number(await page.locator('[data-dock-splitter="left"]').getAttribute('aria-valuenow')), sessionBefore.left)
    assert.equal(Number(await page.locator('[data-dock-splitter="bottom"]').getAttribute('aria-valuenow')), sessionBefore.bottom)

    const sessionDrag = async (from, toSelector, dxRatio) => {
      const a = await from.boundingBox()
      await page.mouse.move(a.x + Math.min(24, a.width / 2), a.y + a.height / 2)
      await page.mouse.down()
      await page.mouse.move(a.x + Math.min(24, a.width / 2) + 14, a.y + a.height / 2 + 14)
      await page.waitForTimeout(40)
      const to = page.locator(toSelector).first()
      await to.waitFor({ state: 'visible' })
      const b = await to.boundingBox()
      const spot = await page.evaluate((selector) => {
        const zone = document.querySelector(selector)
        if (!zone) return { error: 'missing' }
        const rect = zone.getBoundingClientRect()
        const layersAt = (x, y) => [...document.elementsFromPoint(x, y)].slice(0, 6).map((el) => ({
          zone: el.getAttribute?.('data-dock-zone') || null,
          panel: el.getAttribute?.('data-dock-panel') || null,
          body: el.hasAttribute?.('data-dock-panel-body') || false,
          cls: typeof el.className === 'string' ? el.className.slice(0, 70) : el.tagName,
        }))
        const cx = rect.left + rect.width / 2
        const cy = rect.top + Math.min(rect.height / 2, 24)
        const el = document.elementFromPoint(cx, cy)
        return {
          rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
          zoneName: el?.closest('[data-dock-zone]')?.getAttribute('data-dock-zone') || null,
          item: el?.closest('[data-dock-item]')?.getAttribute('data-dock-item') || null,
          center: layersAt(cx, cy),
          point: { x: cx, y: cy },
        }
      }, toSelector)
      if (toSelector.includes('bottom') && spot.zoneName !== 'bottom') {
        throw new Error(`drop missed ${JSON.stringify(spot)} box ${JSON.stringify(b)}`)
      }
      const x = spot.point?.x ?? (b.x + b.width * dxRatio)
      const y = spot.point?.y ?? (b.y + b.height / 2)
      await page.mouse.move(x, y, { steps: 8 })
      await page.mouse.up()
      await page.waitForTimeout(80)
    }
    const sessionBottomBeforeFirst = (await page.locator('[data-testid="session-screen"] [data-dock-panel="bottom"]').boundingBox()).height
    assert.equal(sessionBottomBeforeFirst, 0)
    await sessionDrag(page.locator('[data-dock-item="goalPlan"] [data-widget-header]'), '[data-testid="session-screen"] [data-dock-zone="bottom"]', 0.5)
    const sessionBottomAfterFirst = (await page.locator('[data-testid="session-screen"] [data-dock-panel="bottom"]').boundingBox()).height
    assert.ok(sessionBottomAfterFirst >= 240, `session bottom opened 0 -> ${sessionBottomAfterFirst}`)
    await sessionDrag(page.locator('[data-dock-item="music"] [data-widget-header]'), '[data-testid="session-screen"] [data-dock-zone="bottom"] [data-dock-column]', 0.5)
    await sessionDrag(page.locator('[data-dock-item="humanTesting"] [data-widget-header]'), '[data-testid="session-screen"] [data-dock-zone="bottom"] [data-dock-column]', 0.5)
    const goalStack = await page.evaluate(() => {
      const columns = [...document.querySelectorAll('[data-testid="session-screen"] [data-dock-zone="bottom"] [data-dock-column]')]
      const panel = document.querySelector('[data-testid="session-screen"] [data-dock-panel="bottom"]')
      const chat = document.querySelector('[data-testid="session-screen"] [data-dock-chat]')
      return {
        cols: columns.map((col) => [...col.querySelectorAll(':scope > [data-dock-item]')].map((el) => el.getAttribute('data-dock-item'))),
        panelHeight: panel.getBoundingClientRect().height,
        chatHeight: chat.getBoundingClientRect().height,
      }
    })
    measured.goalStack = { ...goalStack, beforeFirst: sessionBottomBeforeFirst, afterFirst: sessionBottomAfterFirst }
    assert.ok(goalStack.cols.flat().includes('music') && goalStack.cols.flat().includes('goalPlan') && goalStack.cols.flat().includes('humanTesting'))
    assert.ok(goalStack.panelHeight <= sessionBottomAfterFirst + 2, `fit before growing: ${sessionBottomAfterFirst} -> ${goalStack.panelHeight}`)
    assert.ok(goalStack.chatHeight >= 180, `session chat ${goalStack.chatHeight}`)

    await page.evaluate(() => localStorage.clear())
    await page.goto(`http://127.0.0.1:${port}/?beat=COMPLETE&plan=1`, { waitUntil: 'domcontentloaded' })
    await page.locator('[data-testid="pricing-tier-Premium"]').waitFor()
    assert.equal(await page.locator('[data-testid="pricing-tier-Pro"]').count(), 0)
    await page.getByRole('button', { name: 'Back to Home' }).click()
    await page.getByRole('button', { name: 'Import Project' }).waitFor()

    // Single-session project (Pet Show and Tell) uses full cards in bottom zone, but forces compact list cards in 336px right sidebar.
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.locator('button[data-project-id="pet"]').click()
    await page.locator('[data-testid="project-home"]').waitFor()
    assert.equal(await page.locator('[data-sessions-layout]').getAttribute('data-sessions-layout'), 'cards')
    {
      const fromBox = await page.locator('[data-dock-item="sessions"] [data-widget-header]').boundingBox()
      const rightBox = await page.locator('[data-dock-zone="right"]').boundingBox()
      await page.mouse.move(fromBox.x + Math.min(24, fromBox.width / 2), fromBox.y + fromBox.height / 2)
      await page.mouse.down()
      await page.mouse.move(rightBox.x + rightBox.width * 0.5, rightBox.y + 24, { steps: 14 })
      await page.mouse.up()
      await page.waitForTimeout(80)
    }
    const singleSidebarLayout = await page.locator('[data-dock-zone="right"] [data-sessions-layout]').getAttribute('data-sessions-layout')
    const singleSidebarCompactCount = await page.locator('[data-dock-zone="right"] [data-sessions-layout] [data-compact="true"]').count()
    measured.singleSessionSidebar = { layout: singleSidebarLayout, compactCount: singleSidebarCompactCount }
    assert.equal(singleSidebarLayout, 'compact')
    assert.equal(singleSidebarCompactCount, 1)

    fs.writeFileSync(path.join(evidence, 'measured.json'), JSON.stringify(measured, null, 2))
    assert.deepEqual(pageErrors, [])
  } finally {
    await browser.close()
    await close(server)
  }
})
