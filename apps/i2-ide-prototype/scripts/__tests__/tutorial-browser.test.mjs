// Real-browser acceptance walkthrough of the Experimemo product flow, from Jenny completion to the
// approved Infinite Intelligence lesson, against the hosted build (dist-hosted/web) with the two real
// Exact web snapshots served over loopback. Run `pnpm build:hosted` first.
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
const snapshotRoot = `${workspaceRoot}/generated/exact-jenny/tutorial`
const V1_DIR = `${snapshotRoot}/v1-starter/extracted`
const V2_DIR = `${snapshotRoot}/v2-merged/dist`
const screenshotDir = `${snapshotRoot}/session-review-polish/screenshots`

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
  '.plan': 'application/octet-stream',
}

function createStaticServer(distDir, basePath = '/') {
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

const FORBIDDEN_VIEWER_TEXT = [
  /\bV[12]\b/,
  /\bMDS\b/,
  /reference app/i,
  /existing Experimemo/i,
  /screens-and-function/,
  /PhotoShare|usePhotoShare|PhotoPicker|Supabase|pet-show/i,
  /4452d03e|9398d982|cbdf5465/,
  /127\.0\.0\.1|localhost/,
]

function assertNoForbiddenText(text, where) {
  for (const re of FORBIDDEN_VIEWER_TEXT) {
    assert.equal(re.test(text), false, `${where} must not match ${re}`)
  }
}

async function completeJenny(page) {
  await page.locator('button:has-text("Generate new")').click()
  await page.waitForSelector('[data-testid="tutorial-jenny-screen"]', { timeout: 8000 })
  for (let i = 0; i < 26; i++) {
    const btn = page.locator('[data-testid="sample-answer-button"]')
    await btn.waitFor({ state: 'visible', timeout: 8000 })
    await btn.click()
    await page.waitForTimeout(80)
  }
  const approve = page.locator('[data-testid="sample-answer-button"]')
  await approve.waitFor({ state: 'visible', timeout: 8000 })
  assert.match(await approve.innerText(), /Yes, generate Experimemo\./i)
  await approve.click()
  await page.waitForSelector('[data-testid="tutorial-jenny-screen"]', { state: 'detached', timeout: 12000 })
  await page.waitForSelector('[data-testid="inline-web-preview"]', { timeout: 8000 })
}

/** Layout size of the iframe element plus what the page inside actually sees. */
async function geometry(iframeLocator, expected) {
  const handle = await iframeLocator.elementHandle()
  assert.ok(handle, 'iframe element present')
  const frame = await handle.contentFrame()
  assert.ok(frame, 'iframe has a content frame')
  await frame.waitForSelector('#exact-root', { state: 'attached', timeout: 15000 })
  const read = async () => ({
    layout: await handle.evaluate((n) => ({ w: n.clientWidth, h: n.clientHeight })),
    inner: await frame.evaluate(() => ({
      iw: window.innerWidth,
      ih: window.innerHeight,
      desktop: window.matchMedia('(min-width: 769px)').matches,
      narrow: window.matchMedia('(max-width: 768px)').matches,
      landscape: window.matchMedia('(orientation: landscape)').matches,
    })),
  })
  let g = await read()
  for (let i = 0; i < 40 && (g.inner.iw !== expected.width || g.inner.ih !== expected.height); i++) {
    await new Promise((r) => setTimeout(r, 100))
    g = await read()
  }
  return g
}

function assertViewport(g, expected, label) {
  assert.equal(g.layout.w, expected.width, `${label}: iframe element clientWidth`)
  assert.equal(g.layout.h, expected.height, `${label}: iframe element clientHeight`)
  assert.equal(g.inner.iw, expected.width, `${label}: document innerWidth inside the iframe`)
  assert.equal(g.inner.ih, expected.height, `${label}: document innerHeight inside the iframe`)
  assert.equal(g.inner.desktop, expected.width > 768, `${label}: (min-width: 769px) media query`)
  assert.equal(g.inner.narrow, expected.width <= 768, `${label}: (max-width: 768px) media query`)
  assert.equal(g.inner.landscape, expected.width > expected.height, `${label}: (orientation: landscape) media query`)
}

test('browser acceptance: Experimemo product flow from Jenny completion to approved lesson', async (t) => {
  const chromePath = process.env.CHROME_PATH || path.join(process.env.ProgramFiles || 'C:/Program Files', 'Google/Chrome/Application/chrome.exe')
  const pwPath = `${workspaceRoot}/temp/exact-upstream/node_modules/playwright-core`

  if (!fs.existsSync(chromePath) || !fs.existsSync(pwPath)) {
    t.skip('Chrome or playwright-core not available on host')
    return
  }
  assert.ok(fs.existsSync(path.join(webDir, 'index.html')), 'run `pnpm build:hosted` before the browser test')
  assert.ok(fs.existsSync(path.join(V1_DIR, 'index.html')), 'starter snapshot present')
  assert.ok(fs.existsSync(path.join(V2_DIR, 'index.html')), 'app snapshot present')

  fs.mkdirSync(screenshotDir, { recursive: true })
  const shot = async (page, name) => {
    const file = path.join(screenshotDir, name)
    await page.waitForTimeout(600) // let colour transitions, fades and smooth scrolling finish
    await page.screenshot({ path: file })
    assert.ok(fs.existsSync(file), `${name} saved`)
    return file
  }

  const { chromium } = await import(pathToFileURL(path.join(pwPath, 'index.mjs')).href)

  const appServer = createStaticServer(webDir, '/iSquared/')
  const v1Server = createStaticServer(V1_DIR)
  const v2Server = createStaticServer(V2_DIR)
  const [appPort, v1Port, v2Port] = await Promise.all([listen(appServer), listen(v1Server), listen(v2Server)])
  const previewQuery = `preview_v1=${encodeURIComponent(`http://127.0.0.1:${v1Port}/`)}&preview_v2=${encodeURIComponent(`http://127.0.0.1:${v2Port}/`)}`
  const appUrl = (extra = '') => `http://127.0.0.1:${appPort}/iSquared/?beat=COMPLETE&${previewQuery}${extra}`

  const browser = await chromium.launch({ executablePath: chromePath, headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  const pageErrors = []
  const unexpectedRequests = []
  page.on('pageerror', (err) => pageErrors.push(err.message))
  page.on('console', (msg) => {
    if (msg.type() === 'error') pageErrors.push(msg.text())
  })
  page.on('request', (req) => {
    const url = req.url()
    if (
      !url.startsWith('http://127.0.0.1:') &&
      !url.startsWith('data:') &&
      !url.startsWith('blob:') &&
      !/^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(url) &&
      !/^https:\/\/static\.figma\.com\/font\//.test(url)
    ) {
      unexpectedRequests.push(url)
    }
  })

  const inlineFrame = () => page.locator('[data-testid="inline-web-preview"] iframe[data-testid="preview-iframe"]')
  const modalFrame = () => page.locator('.z-50:has(button[aria-label="Close emulator"]) iframe[data-testid="preview-iframe"]')
  const homeComposerStage = async () => ({
    value: await page.locator('[data-testid="composer-input"]').inputValue(),
    placeholder: await page.locator('[data-testid="composer-input"]').getAttribute('placeholder'),
    glow: await page.locator('[data-testid="composer-send"]').getAttribute('data-glow'),
  })

  try {
    await t.test('nothing Experimemo exists on ordinary Home before Jenny completes', async () => {
      await page.goto(appUrl(), { waitUntil: 'domcontentloaded' })
      await page.waitForSelector('button:has-text("Generate new")', { timeout: 15000 })
      const homeText = await page.locator('body').innerText()
      assert.equal(/Experimemo/i.test(homeText), false, 'no Experimemo project on Home before generation')
      assert.equal(await page.locator('button:has-text("Watch Tutorial")').count(), 0)

      // Jenny cannot be opened through a query shortcut
      await page.goto(appUrl('&tutorial=1'), { waitUntil: 'domcontentloaded' })
      await page.waitForSelector('button:has-text("Generate new")', { timeout: 15000 })
      assert.equal(await page.isVisible('[data-testid="tutorial-jenny-screen"]'), false)

      // The Sessions dropdown on Home lists no Experimemo session either
      await page.locator('[data-name="HeaderBreadcrumbs"] button[title="Sessions"]').click()
      const dropdown = await page.locator('[data-name="SessionDropdownMenu"]').innerText()
      assert.equal(/Experimemo|Experiment schema/i.test(dropdown), false)
      await page.keyboard.press('Escape')
    })

    await t.test('Jenny completion opens an almost-empty project with the real starter preview', async () => {
      await completeJenny(page)

      const breadcrumbs = page.locator('[data-name="HeaderBreadcrumbs"]')
      assert.match(await breadcrumbs.innerText(), /Experimemo/)

      // No session of any kind exists yet
      assert.equal(await page.locator('[data-testid="experimemo-session-card"]').count(), 0)
      assert.equal(await page.locator('[data-testid="start-experimemo-session-button"]').count(), 0)
      assert.ok(await page.locator('[data-testid="project-sessions-empty"]').isVisible())
      assert.equal(await page.locator('[data-testid="session-screen"]').count(), 0)
      await breadcrumbs.locator('button[title="Sessions"]').click()
      assert.ok(await page.locator('[data-testid="session-dropdown-empty"]').isVisible(), 'dropdown has no session entries')
      assert.equal(/Experiment schema/i.test(await page.locator('[data-name="SessionDropdownMenu"]').innerText()), false)
      await page.keyboard.press('Escape')

      const text = await page.locator('body').innerText()
      assertNoForbiddenText(text, 'project home')
      for (const gone of ['Recent Activity', 'Synthesize CESS', 'Multi-Agent Session', 'Verification', 'app.contract', 'Define Experiment data schema']) {
        assert.equal(text.includes(gone), false, `project home must not show "${gone}"`)
      }

      // Project folder: the four memory docs only
      const folder = page.locator('div:has(> div > div > span:text-is("Project Folder"))').first()
      for (const f of ['Info.md', 'Todo.md', 'Style.md', 'Guidelines.md']) {
        assert.ok((await page.locator(`text=${f}`).count()) > 0, `${f} listed`)
      }

      // Restored Human Testing widget, initially empty
      const human = page.locator('[data-name="HumanTestingPanel"]')
      assert.match(await human.innerText(), /Human Testing 0\/0/i)
      assert.equal(await human.locator('[data-human-task-id]').count(), 0)

      // Explorer is bottom-left, the widened right column holds Human Testing + the preview
      const explorer = await page.locator('[data-testid="project-explorer"]').boundingBox()
      const chat = await page.locator('[data-testid="composer-input"]').boundingBox()
      const preview = await page.locator('[data-testid="inline-web-preview"]').boundingBox()
      assert.ok(explorer.x + explorer.width <= chat.x, 'Explorer sits left of the chat')
      assert.ok(explorer.y > 400, 'Explorer is at the bottom of the left column')
      assert.ok(preview.x >= chat.x + chat.width - 2, 'preview lives in the right column')
      assert.ok(preview.width >= 330 && preview.width <= 340, `right column widened to 336px (got ${preview.width})`)

      // Infie's first words are exact and What's Next glows
      const messages = page.locator('[data-testid="flow-message"]')
      assert.equal(await messages.count(), 1)
      assert.equal(
        (await messages.first().locator('p').innerText()).trim(),
        "This is what your app currently looks like. It's just a shell with the framework and setup in place."
      )
      assert.equal(await page.locator('[data-testid="whats-next-button"]').getAttribute('data-glow'), 'true')
      assert.equal(await page.locator('[data-testid="start-session-button"]').count(), 0)
    })

    await t.test('starter preview is the real app at desktop/portrait by default and rotates for real', async () => {
      assert.equal(await page.locator('[data-testid="preview-device-desktop"]').getAttribute('aria-pressed'), 'true')
      assert.equal(await page.locator('[data-testid="preview-orientation-portrait"]').getAttribute('aria-pressed'), 'true')

      const frame = page.frameLocator('[data-testid="inline-web-preview"] iframe[data-testid="preview-iframe"]')
      await frame.locator('text=Hello from Experimemo').waitFor({ state: 'visible', timeout: 20000 })
      const rootText = await frame.locator('#exact-root').innerText()
      assert.match(rootText, /Hello from Experimemo/)
      assert.equal(await page.locator('[data-testid="exact-web-preview-frame"]').first().getAttribute('data-preview-version'), 'v1')

      assertViewport(await geometry(inlineFrame(), { width: 960, height: 1200 }), { width: 960, height: 1200 }, 'desktop portrait')

      // The outer frame is a scale-to-fit wrapper: visually small, layout size untouched
      const viewportBox = await page.locator('[data-testid="inline-web-preview"] [data-testid="preview-viewport"]').boundingBox()
      assert.ok(viewportBox.width < 340, `scaled to fit the column (got ${viewportBox.width})`)
      assert.ok(viewportBox.height < 460, `scaled to fit the height cap (got ${viewportBox.height})`)

      await page.locator('[data-testid="preview-orientation-landscape"]').click()
      assertViewport(await geometry(inlineFrame(), { width: 1200, height: 960 }), { width: 1200, height: 960 }, 'desktop landscape')

      await page.locator('[data-testid="preview-device-mobile"]').click()
      assertViewport(await geometry(inlineFrame(), { width: 720, height: 390 }), { width: 720, height: 390 }, 'mobile landscape')

      await page.locator('[data-testid="preview-orientation-portrait"]').click()
      assertViewport(await geometry(inlineFrame(), { width: 390, height: 720 }), { width: 390, height: 720 }, 'mobile portrait')

      await page.locator('[data-testid="preview-device-desktop"]').click()
      assertViewport(await geometry(inlineFrame(), { width: 960, height: 1200 }), { width: 960, height: 1200 }, 'desktop portrait again')

      assert.equal(await page.locator('[data-testid="preview-viewport-controls"] input').count(), 0)
      assert.equal(await page.locator('[data-testid="inline-web-preview"] a[href]').count(), 0, 'no link exposing the preview URL')
      assertNoForbiddenText(await page.locator('[data-testid="inline-web-preview"]').innerText(), 'preview widget')
      await shot(page, '01-project-home-starter.png')
    })

    await t.test('enlarged modal shares the same viewport state and the same real iframe content', async () => {
      await page.locator('[data-testid="preview-orientation-landscape"]').click()
      await page.locator('[data-testid="inline-web-preview-enlarge"]').click()
      await page.waitForSelector('button[aria-label="Close emulator"]')
      await modalFrame().waitFor({ state: 'attached', timeout: 10000 })
      assertViewport(await geometry(modalFrame(), { width: 1200, height: 960 }), { width: 1200, height: 960 }, 'modal desktop landscape')
      const modalToolbar = page.locator('.z-50:has(button[aria-label="Close emulator"]) [data-testid="preview-viewport-controls"]')
      assert.equal(await modalToolbar.locator('[data-testid="preview-orientation-landscape"]').getAttribute('aria-pressed'), 'true')

      // Fit-to-modal: the modal viewport is readable and fully inside the window
      const modalViewport = await page.locator('.z-50:has(button[aria-label="Close emulator"]) [data-testid="preview-viewport"]').boundingBox()
      assert.ok(modalViewport.width > 700, `modal viewport is larger than the inline one (got ${modalViewport.width})`)
      assert.ok(modalViewport.y >= 0 && modalViewport.y + modalViewport.height <= 900)
      const frame = page.frameLocator('.z-50:has(button[aria-label="Close emulator"]) iframe[data-testid="preview-iframe"]')
      await frame.locator('text=Hello from Experimemo').waitFor({ state: 'visible', timeout: 20000 })

      await modalToolbar.locator('[data-testid="preview-device-mobile"]').click()
      await modalToolbar.locator('[data-testid="preview-orientation-portrait"]').click()
      assertViewport(await geometry(modalFrame(), { width: 390, height: 720 }), { width: 390, height: 720 }, 'modal mobile portrait')
      await shot(page, '02-emulator-modal-mobile.png')

      await page.keyboard.press('Escape')
      await page.waitForSelector('button[aria-label="Close emulator"]', { state: 'detached' })
      // State changed in the modal is what the inline widget now shows
      assert.equal(await page.locator('[data-testid="inline-web-preview"] [data-testid="preview-device-mobile"]').getAttribute('aria-pressed'), 'true')
      assertViewport(await geometry(inlineFrame(), { width: 390, height: 720 }), { width: 390, height: 720 }, 'inline reflects modal')
      await page.locator('[data-testid="preview-device-desktop"]').click()
      await page.locator('[data-testid="preview-orientation-portrait"]').click()
    })

    await t.test("What's Next -> scanning -> uneditable Bundle it! -> schema question -> uneditable Let a model propose one.", async () => {
      await page.locator('[data-testid="whats-next-button"]').click()
      const messages = page.locator('[data-testid="flow-message"]')
      await page.waitForFunction(() =>
        [...document.querySelectorAll('[data-testid="flow-message"]')].some((m) => m.textContent.includes('Scanning project files...'))
      )
      assert.equal(await page.locator('[data-testid="whats-next-button"]').count(), 0, 'What\'s Next is single-use')

      await page.waitForFunction(() =>
        [...document.querySelectorAll('[data-testid="flow-message"]')].some((m) =>
          m.textContent.includes('Would you like to do one at a time or bundle it in one session?')
        ),
        null,
        { timeout: 10000 }
      )
      const composer = await homeComposerStage()
      assert.equal(composer.value, 'Bundle it!', 'Bundle it! sits in the real composer')
      assert.equal(composer.glow, 'true', 'Send glows')
      const inputEl = page.locator('[data-testid="composer-input"]')
      assert.equal(await inputEl.getAttribute('readonly'), '', 'Bundle it! is uneditable')
      await inputEl.type(' something else').catch(() => {})
      assert.equal(await inputEl.inputValue(), 'Bundle it!', 'typing cannot alter Bundle it!')
      assert.equal(await page.locator('button:has-text("Bundle it!")').count(), 0, 'no answer chip')
      assert.equal(await page.locator('[data-testid="start-session-button"]').count(), 0)
      assert.equal(await page.locator('[data-testid="experimemo-session-card"]').count(), 0)
      await shot(page, '03-bundle-it-prefilled.png')

      // Send moves to schema definition question
      await page.locator('[data-testid="composer-send"]').click()
      await page.waitForFunction(() =>
        [...document.querySelectorAll('[data-testid="flow-message"]')].some((m) =>
          m.textContent.includes('define the Experiment schema yourself')
        ),
        null,
        { timeout: 8000 }
      )
      const userBubble = page.locator('[data-testid="flow-message"][data-role="user"]')
      assert.equal((await userBubble.last().locator('p').innerText()).trim(), 'Bundle it!')
      assert.equal(await inputEl.inputValue(), 'Let a model propose one.')
      assert.equal(await inputEl.getAttribute('readonly'), '', 'schema answer is uneditable')
      assert.equal(await page.locator('[data-testid="composer-send"]').getAttribute('data-glow'), 'true')
      await inputEl.type(' custom').catch(() => {})
      assert.equal(await inputEl.inputValue(), 'Let a model propose one.')
      await shot(page, '03b-schema-question-prefilled.png')
    })

    await t.test('Send starts ping-pong planning with progressive Plan widget -> Start Session', async () => {
      await page.locator('[data-testid="composer-send"]').click()
      assert.equal(await page.locator('[data-testid="composer-input"]').inputValue(), '', 'composer cleared')
      await page.waitForFunction(() =>
        [...document.querySelectorAll('[data-testid="flow-message"]')].some((m) =>
          m.textContent.includes('Starting ping-pong planning with your available providers.')
        )
      )

      // Progressive Plan widget replaces Sessions panel during planning
      const planWidget = page.locator('[data-testid="plan-widget"]')
      await planWidget.waitFor({ state: 'visible', timeout: 8000 })
      const initialPlanCursor = Number(await planWidget.getAttribute('data-plan-cursor'))

      await page.locator('[data-testid="start-session-button"]').waitFor({ state: 'visible', timeout: 25000 })
      const finalPlanCursor = Number(await planWidget.getAttribute('data-plan-cursor'))
      assert.ok(finalPlanCursor > initialPlanCursor, `Plan widget progressed (${initialPlanCursor} -> ${finalPlanCursor})`)
      const planWidgetText = await planWidget.innerText()
      assert.match(planWidgetText, /Claude Opus 5\.5/)
      assert.match(planWidgetText, /GPT-5\.4 Mini/)
      assert.match(planWidgetText, /experiments\.json/)
      assert.match(planWidgetText, /device\.camera purpose\.camera/)

      for (const provider of ['openai', 'claude', 'gemini']) {
        assert.ok(
          (await page.locator(`[data-testid="flow-message"][data-role="${provider}"]`).count()) >= 1,
          `${provider} took part in planning`
        )
      }
      const planText = (await page.locator('[data-testid="flow-message"]').allInnerTexts()).join(' ')
      assert.equal(planText.toLowerCase().includes('what are we building'), false)
      assert.match(planText, /Claude Opus 5\.5/)
      assert.match(planText, /No top-tier models \(such as Astra or Fable\) are required/)
      assert.equal(await page.locator('[data-testid="start-session-button"]').getAttribute('data-glow'), 'true')
      assert.equal(await page.locator('[data-testid="composer-input"]').getAttribute('placeholder'), 'Change the plan')
      assert.equal(await page.locator('[data-testid="experimemo-session-card"]').count(), 0)
      await shot(page, '04-plan-ready.png')

      // An edit is acknowledged locally and shown in Plan widget without starting a session
      await page.locator('[data-testid="composer-input"]').fill('Please keep it simple')
      await page.keyboard.press('Enter')
      await page.waitForFunction(() =>
        [...document.querySelectorAll('[data-testid="flow-message"]')].some((m) => m.textContent.includes("I've added that to the plan notes"))
      )
      assert.match(await planWidget.innerText(), /Please keep it simple/)
      assert.ok(await page.locator('[data-testid="start-session-button"]').isVisible())
      assertNoForbiddenText(await page.locator('body').innerText(), 'planning view')
    })

    await t.test('Start Session creates CODING with topic tabs, custom SVG provider icons, empty diffs and unchecked human rows', async () => {
      await page.locator('[data-testid="start-session-button"]').dblclick()
      await page.waitForSelector('[data-testid="session-screen"]', { timeout: 8000 })
      const screen = page.locator('[data-testid="session-screen"]')
      assert.equal(await screen.getAttribute('data-session-status'), 'CODING')
      assert.equal(await screen.getAttribute('data-active-tab'), 'infie')
      assert.equal(await page.locator('[data-testid="lesson-form"]').count(), 0, 'form hidden before merge')

      const crumbs = await page.locator('[data-name="HeaderBreadcrumbs"]').innerText()
      assert.match(crumbs, /Experimemo/)
      assert.match(crumbs, /Experiment schema and screens/)
      assert.equal(/Session\b$/.test(crumbs.trim()), false)

      const tabs = page.locator('[role="tab"]')
      assert.equal(await tabs.count(), 4, 'Infie plus three topic worker tabs')
      assert.deepEqual(
        (await tabs.allInnerTexts()).map((x) => x.split('\n')[0].trim()),
        ['Infie', 'Schema & storage', 'New, Track & editor', 'Photo capture']
      )
      assert.equal(await page.locator('#tab-agent-openai').getAttribute('aria-label'), 'Schema & storage (OpenAI)')
      assert.equal(await page.locator('#tab-agent-claude').getAttribute('aria-label'), 'New, Track & editor (Claude)')
      assert.equal(await page.locator('#tab-agent-gemini').getAttribute('aria-label'), 'Photo capture (Gemini)')
      for (const pid of ['openai', 'claude', 'gemini']) {
        assert.ok((await page.locator(`#tab-agent-${pid} svg`).count()) >= 1, `${pid} tab renders recognizable SVG icon`)
      }

      // Current diffs start empty and there is no developer branch
      assert.ok(await page.locator('[data-testid="diffs-empty"]').isVisible())
      const diffsText = await screen.innerText()
      assert.equal(diffsText.includes('screens-and-function'), false)
      assert.match(diffsText, /0 files/)
      assert.equal(/[+-]\d+/.test(await page.locator('[data-testid="diffs-empty"]').locator('xpath=ancestor::div[contains(@class,"bg-[#1a1a1a]")]').innerText()), false, 'no numeric change counts')

      // Goal & plan, agent tasks (pending) and Human Testing (third row web-testable)
      assert.match(diffsText, /Define the Experiment schema and local storage, build the New, Track and editor screens, and add photo capture\./)
      for (const p of ['openai', 'claude', 'gemini']) {
        assert.equal(await page.locator(`[data-testid="session-task-${p}"]`).getAttribute('data-task-status'), 'pending')
      }
      const human = page.locator('[data-name="HumanTestingPanel"]')
      assert.match(await human.innerText(), /Human Testing 0\/3/i)
      assert.match(await human.innerText(), /Try the photo attachment control in the web preview/)
      assert.equal(/on Android/i.test(await human.innerText()), false, 'no untestable Android human requirement')
      assert.equal(await human.locator('[data-human-task-id]').count(), 3)
      assert.equal(await human.locator('[data-human-task-id][data-done="true"]').count(), 0)
      assertNoForbiddenText(diffsText, 'session screen')
      assert.equal(diffsText.includes('Verification'), false)
      assert.equal(diffsText.includes('Simulated'), false)

      // Layout: Explorer bottom-left, preview in the widened right column, still the starter app
      const explorer = await page.locator('text=Explorer').first().boundingBox()
      assert.ok(explorer.x < 260, 'Explorer is in the left column')
      const preview = await page.locator('[data-testid="inline-web-preview"]').boundingBox()
      assert.ok(preview.width >= 330 && preview.width <= 340)
      await page.frameLocator('[data-testid="inline-web-preview"] iframe[data-testid="preview-iframe"]')
        .locator('text=Hello from Experimemo').waitFor({ state: 'visible', timeout: 20000 })

      // Header dropdowns list only Experimemo session & project
      await page.locator('[data-name="HeaderBreadcrumbs"] button[title="Sessions"]').click()
      const sess = await page.locator('[data-name="SessionDropdownMenu"]').innerText()
      assert.match(sess, /Experiment schema and screens/)
      assert.equal(/Add Comments|Fix Reactions/.test(sess), false)
      await page.keyboard.press('Escape')
      await page.locator('[data-name="HeaderBreadcrumbs"] button[title="Projects"]').click()
      const proj = await page.locator('[data-name="ProjectDropdownMenu"]').innerText()
      assert.match(proj, /Experimemo/)
      assert.equal(/Pet Show and Tell|Not Hotdog/.test(proj), false)
      await page.keyboard.press('Escape')

      // Only the Continue action is offered; no second Start Session
      assert.equal(await page.locator('[data-testid="flow-action-delegate"]').getAttribute('data-glow'), 'true')
      assert.match(await page.locator('[data-testid="flow-action-delegate"]').innerText(), /Continue/)
      assert.equal(await page.locator('[data-testid="start-session-button"]').count(), 0)
      await shot(page, '05-session-started.png')
    })

    await t.test('tabs: keyboard navigation across all four, provider tabs wait for the handoff', async () => {
      const screen = page.locator('[data-testid="session-screen"]')
      await page.locator('#tab-agent-openai').click()
      assert.match(await page.locator('#panel-agent-openai').innerText(), /Waiting for Infie's handoff/)
      await page.locator('#tab-agent-gemini').focus()
      await page.keyboard.press('ArrowRight')
      assert.equal(await screen.getAttribute('data-active-tab'), 'infie')
      await page.keyboard.press('ArrowLeft')
      assert.equal(await screen.getAttribute('data-active-tab'), 'gemini')
      await page.keyboard.press('Home')
      assert.equal(await screen.getAttribute('data-active-tab'), 'infie')
      await page.keyboard.press('End')
      assert.equal(await screen.getAttribute('data-active-tab'), 'gemini')
      await page.keyboard.press('Home')
      assert.equal(await screen.getAttribute('data-active-tab'), 'infie')
    })

    await t.test('OpenAI glows before checking off, diffs & Claude unlock update, and worker composer shows PrototypeLimit on that tab', async () => {
      await page.locator('[data-testid="flow-action-delegate"]').click()
      assert.equal(await page.locator('[data-testid="flow-action-delegate"]').count(), 0, 'Continue is single-use')
      await page.waitForSelector('#tab-agent-openai[data-nudge="true"]')
      for (const provider of ['openai', 'claude', 'gemini']) {
        assert.equal(await page.locator(`#panel-agent-infie [data-testid="handoff-jump-${provider}"]`).count(), 1)
      }
      assert.equal(await page.locator('[data-testid="session-task-openai"]').getAttribute('data-task-status'), 'pending')
      assert.equal(await page.locator('[data-testid="diffs-empty"]').isVisible(), true)

      await page.locator('#tab-agent-claude').click()
      assert.equal(await page.locator('#panel-agent-claude [data-testid^="handoff-jump-"]').count(), 0)
      assert.match(await page.locator('#panel-agent-claude').innerText(), /Waiting for Schema & storage before starting the screens/)

      // Worker-tab composer routes to THAT tab and triggers shared PrototypeLimit (no unrelated app buttons)
      const composerInput = page.locator('[data-testid="composer-input"]')
      assert.match(await composerInput.getAttribute('placeholder'), /New, Track & editor \(Claude\)/)
      await composerInput.fill('Use ISO timestamps for experiment records')
      await page.locator('[data-testid="composer-send"]').click()
      const limitCard = page.locator('[data-name="PrototypeLimitCard"]')
      await limitCard.waitFor({ state: 'visible', timeout: 5000 })
      const limitText = await limitCard.innerText()
      assert.match(limitText, /Prototype Limit/)
      assert.equal(/Pet Show and Tell|Not Hotdog/.test(limitText), false, 'no unrelated navigation buttons')
      await shot(page, '06b-worker-prototype-limit.png')
      await limitCard.locator('button:has-text("Return to tab")').click()
      await limitCard.waitFor({ state: 'detached' })
      assert.equal(await page.locator('[data-testid="session-screen"]').getAttribute('data-active-tab'), 'claude')
      assert.match(await page.locator('#panel-agent-claude').innerText(), /Use ISO timestamps for experiment records/)

      await page.locator('#tab-agent-infie').click()
      await page.locator('#panel-agent-infie [data-testid="handoff-jump-openai"]').click()
      assert.equal(await page.locator('[data-testid="session-screen"]').getAttribute('data-active-tab'), 'openai')
      assert.equal(await page.locator('#panel-agent-openai [data-testid^="handoff-jump-"]').count(), 0)
      await page.waitForFunction(() => document.querySelector('#panel-agent-openai')?.textContent.includes('Starting on the Experiment record'))
      assert.equal(await page.locator('[data-testid="session-task-openai"]').getAttribute('data-task-status'), 'in progress')
      assert.equal(await page.locator('[data-testid="diffs-empty"]').isVisible(), true, 'no diffs before the report')

      // Observe glow BEFORE check/strike-off, then completion & glow clear
      await page.waitForSelector('[data-testid="session-task-openai"][data-task-glow="true"]', { timeout: 15000 })
      assert.equal(await page.locator('[data-testid="agent-tasks-panel"]').getAttribute('data-task-widget-glow'), 'true')
      await shot(page, '06-openai-tab-and-glow.png')
      await page.waitForSelector('[data-testid="session-task-openai"][data-task-status="completed"]', { timeout: 5000 })
      await page.waitForSelector('[data-testid="session-task-openai"][data-task-glow="false"]', { timeout: 5000 })

      await page.waitForSelector('#tab-agent-infie[data-nudge="true"]')
      await page.locator('#tab-agent-infie').click()
      const infie = await page.locator('#panel-agent-infie').innerText()
      assert.match(infie, /OpenAI → Infie/)
      assert.match(infie, /New, Track & editor/)
      assert.equal(infie.includes('Open OpenAI'), false)
      assert.equal(infie.includes('Open the Claude tab'), false)
      assert.equal(/Use ISO timestamps/.test(infie), false, 'worker chat must not leak to Infie tab')
      const diffNames = await page.locator('[data-testid="session-screen"]').innerText()
      assert.match(diffNames, /app\.ts/)
      assert.match(diffNames, /experiment-store\.ts/)
      assert.match(diffNames, /2 files/)
      assert.equal(await page.locator('[data-testid="inline-web-preview"] [data-testid="exact-web-preview-frame"]').getAttribute('data-preview-version'), 'v1')
      assert.equal(await page.locator('#tab-agent-claude[data-nudge="true"]').count(), 1)
    })

    await t.test('Claude builds screens (with reduced-motion respected), and preview updates to real v2 app', async () => {
      await page.emulateMedia({ reducedMotion: 'reduce' })
      try {
        await page.locator('#tab-agent-claude').click()
        await page.waitForSelector('[data-testid="session-task-claude"][data-task-glow="true"]', { timeout: 15000 })
        const panelAnim = await page.locator('[data-testid="agent-tasks-panel"]').evaluate((el) => getComputedStyle(el).animationName)
        assert.equal(panelAnim, 'none', 'reduced motion disables pulse animation while preserving glow border')
        await page.waitForSelector('[data-testid="session-task-claude"][data-task-status="completed"]', { timeout: 5000 })
      } finally {
        await page.emulateMedia({ reducedMotion: 'no-preference' })
      }

      await page.locator('#tab-agent-infie').click()
      assert.match(await page.locator('#panel-agent-infie').innerText(), /Claude → Infie/)
      assert.match(await page.locator('[data-testid="session-screen"]').innerText(), /app\.contract/)

      const exp = page.locator('[data-testid="inline-web-preview"] [data-testid="exact-web-preview-frame"]')
      assert.equal(await exp.getAttribute('data-preview-version'), 'v2')
      const frame = page.frameLocator('[data-testid="inline-web-preview"] iframe[data-testid="preview-iframe"]')
      await frame.locator('text=Experiment title').waitFor({ state: 'visible', timeout: 25000 })
      const newText = await frame.locator('#exact-root').innerText()
      assert.match(newText, /Experimemo/)
      assert.equal(/Hello from Experimemo/.test(newText), false, 'preview is no longer the starter')
      await frame.locator('[role="tab"]:has-text("Track"):visible').first().click()
      await frame.locator('text=Bean sprouts under different light conditions').waitFor({ state: 'visible', timeout: 15000 })
      assertViewport(await geometry(inlineFrame(), { width: 960, height: 1200 }), { width: 960, height: 1200 }, 'new app at desktop portrait')
      await shot(page, '07-preview-new-app.png')
    })

    await t.test('Gemini flags verified Exact camera issue; Infie consults OpenAI & Claude and notes plan.md; Fix Problems -> Human Testing glow', async () => {
      await page.locator('#tab-agent-gemini').click()
      await page.waitForFunction(() => document.querySelector('#panel-agent-gemini')?.textContent.includes('Flagging this to Infie'), null, { timeout: 15000 })
      const gem = await page.locator('#panel-agent-gemini').innerText()
      assert.match(gem, /device\.camera purpose\.camera/)
      assert.match(gem, /strings\/en\.json/)
      assert.match(gem, /purpose\.camera/)

      const screen = page.locator('[data-testid="session-screen"]')
      assert.equal(await screen.getAttribute('data-session-status'), 'REVIEW FIXES')
      assert.equal(await page.locator('[data-testid="session-task-gemini"]').getAttribute('data-task-status'), 'needs fix')

      await page.locator('#tab-agent-infie').click()
      await page.locator('[data-testid="session-plan-md-note"]').waitFor({ state: 'visible', timeout: 12000 })
      const infieText = await page.locator('#panel-agent-infie').innerText()
      assert.match(infieText, /OpenAI/)
      assert.match(infieText, /Claude/)
      assert.match(infieText, /plan\.md/)

      const fix = page.locator('[data-testid="flow-action-fix"]')
      assert.match(await fix.innerText(), /Fix Problems/)
      assert.equal(await fix.getAttribute('data-glow'), 'true')
      await shot(page, '08-review-fixes-camera-triage.png')
      await fix.click()
      assert.equal(await screen.getAttribute('data-session-status'), 'FIXING')
      assert.equal(await page.locator('[data-testid="flow-action-fix"]').count(), 0)
      assert.equal(await page.locator('#panel-agent-infie [data-testid="handoff-jump-gemini"]').count(), 2)

      await page.locator('#tab-agent-gemini').click()
      assert.equal(await page.locator('#panel-agent-gemini [data-testid^="handoff-jump-"]').count(), 0)
      await page.waitForFunction(() => document.querySelector('#panel-agent-gemini')?.textContent.includes('Sent the fix summary to Infie'), null, { timeout: 15000 })
      await page.locator('#tab-agent-infie').click()
      await page.waitForSelector('[data-testid="session-task-gemini"][data-task-status="completed"]', { timeout: 5000 })
      await page.waitForSelector('[data-testid="session-task-gemini"][data-task-glow="false"]', { timeout: 5000 })

      assert.equal(await screen.getAttribute('data-session-status'), 'NEEDS YOU')
      assert.equal(await page.locator('[data-testid="composer-input"]').inputValue(), '', 'Yes, propose it. is removed')
      assert.equal(await page.locator('[data-testid="lesson-form"]').count(), 0, 'form still strictly hidden')
      assert.equal(await page.locator('[data-testid="flow-action-open-pr"]').count(), 0, 'Open PR hidden while human tests incomplete')
      assert.equal(await page.locator('[data-name="HumanTestingPanel"]').getAttribute('data-human-testing-glow'), 'true')
      assert.equal(await page.locator('[data-testid="inline-web-preview"]').getAttribute('data-web-preview-glow'), 'true')
      assert.equal(await page.locator('[data-testid="session-web-preview-button"]').getAttribute('data-web-preview-glow'), 'true')
      await shot(page, '08b-human-testing-glow.png')

      // Toggle human testing rows manually; Open PR appears only after all 3 pass
      for (const hid of ['exp-human-1', 'exp-human-2']) {
        await page.locator(`[data-human-task-id="${hid}"]`).click()
        assert.equal(await page.locator('[data-testid="flow-action-open-pr"]').count(), 0)
      }
      await page.locator('[data-human-task-id="exp-human-3"]').click()
      assert.equal(await screen.getAttribute('data-session-status'), 'VERIFIED')
      await page.locator('[data-testid="flow-action-open-pr"]').waitFor({ state: 'visible' })
    })

    await t.test('Open PR -> Review Changes split -> Wrap up -> Present changes & Auto-merge -> multi-lesson form -> Clean up -> Project Home', async () => {
      const screen = page.locator('[data-testid="session-screen"]')
      await page.locator('[data-testid="flow-action-open-pr"]').click()
      assert.equal(await screen.getAttribute('data-session-status'), 'PR OPEN')
      await page.locator('[data-testid="flow-action-review-changes"]').click()

      const prWidget = page.locator('[data-testid="pr-review-widget"]')
      await prWidget.waitFor({ state: 'visible' })
      assert.equal(await page.locator('[data-testid="session-center-workspace"]').getAttribute('data-review-open'), 'true')
      assert.equal(await page.locator('[data-name="HumanTestingPanel"]').count(), 0, 'right sidebar hidden during PR review split')
      const chatBox = await page.locator('[data-testid="session-center-workspace"] > div').first().boundingBox()
      const prBox = await prWidget.boundingBox()
      assert.ok(prBox.x > chatBox.x + 100 && Math.abs(chatBox.width - prBox.width) < 40, 'center splits ~50/50 side-by-side on desktop')
      const prText = await prWidget.innerText()
      assert.match(prText, /Pull Request Review/)
      assert.match(prText, /app\/data\/experiments\.json|app\.ts/)
      assert.equal(/PR #|\+\d+|-\d+/.test(prText), false, 'no fabricated PR # or line counts')
      assert.equal(await page.locator('button:has-text("Check Project")').count(), 0, 'Wrap up replaces Check Project for tutorial review')
      await shot(page, '09-pr-review-split.png')

      // Narrow 390px stacks chat & PR widget vertically without clipping
      await page.setViewportSize({ width: 390, height: 844 })
      await page.waitForTimeout(150)
      const mobileChat = await page.locator('[data-testid="session-center-workspace"] > div').first().boundingBox()
      const mobilePr = await prWidget.boundingBox()
      assert.ok(mobilePr.y >= mobileChat.y + mobileChat.height - 4, 'PR widget stacks vertically below chat on narrow width')
      assert.ok((await page.evaluate(() => document.documentElement.scrollWidth)) <= 390, 'PR split fits 390px without horizontal scroll')
      await shot(page, '12b-pr-review-mobile.png')
      await page.setViewportSize({ width: 1440, height: 900 })

      // Wrap up polls simulated Doctor, CI & review comments to green, then exposes Auto-merge and Present changes
      await page.locator('[data-testid="flow-action-wrap-up"]').click()
      await page.locator('[data-testid="flow-action-auto-merge"]').waitFor({ state: 'visible', timeout: 15000 })
      await page.locator('[data-testid="flow-action-present-changes"]').waitFor({ state: 'visible', timeout: 5000 })
      assert.equal(await prWidget.getAttribute('data-wrapup-phase'), 'green')
      assert.equal(await page.locator('[data-testid="lesson-form"]').count(), 0, 'form stays hidden before Auto-merge')
      await shot(page, '09b-wrapup-green-actions.png')

      // Branch B: Present changes opens emulator, closes split cleanly, and adds unchecked "Sanity check app after bug fixes"
      await page.locator('[data-testid="flow-action-present-changes"]').click()
      await page.waitForSelector('button[aria-label="Close emulator"]')
      await modalFrame().waitFor({ state: 'attached', timeout: 10000 })
      await page.keyboard.press('Escape')
      await page.waitForSelector('button[aria-label="Close emulator"]', { state: 'detached' })

      assert.equal(await page.locator('[data-testid="flow-action-auto-merge"]').count(), 0, 'no second Auto-merge button on Present changes branch')
      assert.equal(await page.locator('[data-testid="pr-review-widget"]').count(), 0, 'normal layout returns cleanly after Present changes')
      assert.equal(await screen.getAttribute('data-session-status'), 'PR OPEN', 'still PR OPEN while sanity check is unchecked')
      assert.equal(await page.locator('[data-testid="lesson-form"]').count(), 0, 'completion form blocked until sanity check task is checked')
      const sanityRow = page.locator('[data-human-task-id="exp-human-sanity"]')
      await sanityRow.waitFor({ state: 'visible', timeout: 5000 })
      assert.match(await sanityRow.innerText(), /^Sanity check app after bug fixes$/)
      assert.equal(await sanityRow.getAttribute('data-done'), 'false')
      assert.equal(await page.locator('[data-name="HumanTestingPanel"]').getAttribute('data-human-testing-glow'), 'true')
      await shot(page, '09c-present-changes-sanity-check.png')

      // Checking "Sanity check app after bug fixes" automatically simulates merge and opens the completion form
      await sanityRow.click()
      assert.equal(await screen.getAttribute('data-session-status'), 'MERGED')
      const form = page.locator('[data-testid="lesson-form"]')
      await form.waitFor({ state: 'visible' })
      const summary = await form.locator('#b17-summary').inputValue()
      const action = await form.locator('#b17-corrected-action').inputValue()
      assert.match(summary, /schema & offline store/i)
      assert.match(summary, /New\/Track\/Editor/i)
      assert.match(summary, /camera permission/i)
      assert.match(action, /strings\/en\.json/)
      assert.equal(/comment sheet|platform before choosing a command/i.test(summary + action), false, 'no PhotoShare defaults')
      await shot(page, '10-lesson-form.png')

      await form.locator('[data-name="SessionCompletionSubmit"]').click()
      await page.waitForFunction(() => document.querySelector('[data-testid="session-screen"]')?.getAttribute('data-session-status') === 'COMPLETE')
      assert.equal(await page.locator('[data-testid="lesson-form"]').count(), 0)

      // Single Clean up Session -> Confirm returns cleanly to Project Home retaining live v2 preview
      await page.locator('[data-testid="flow-action-cleanup"]').waitFor({ state: 'visible' })
      assert.equal(await page.locator('[data-testid="session-back-to-project-button"]').count(), 0)
      await page.locator('[data-testid="flow-action-cleanup"]').click()
      const cleanupText = await page.locator('#panel-agent-infie').innerText()
      assert.match(cleanupText, /archive this session, delete its local worktree, and delete its remote branch/)
      assert.doesNotMatch(cleanupText.split('\n').slice(-1)[0], /simulated|no real/i)
      await page.locator('[data-testid="flow-action-confirm-cleanup"]').waitFor({ state: 'visible' })
      await shot(page, '11-cleanup-confirm.png')

      await page.locator('[data-testid="flow-action-confirm-cleanup"]').click()
      await page.waitForSelector('[data-testid="project-sessions-empty"]', { timeout: 10000 })
      assert.equal(await page.locator('[data-testid="session-screen"]').count(), 0, 'session retired cleanly')
      assert.match(await page.locator('[data-testid="project-sessions-empty"]').innerText(), /1 completed session archived/)
      assert.equal(await page.locator('[data-testid="experimemo-session-card"]').count(), 0, 'no ghost session')

      // Project home retains live v2 preview after session cleanup
      const homePreview = page.locator('[data-testid="inline-web-preview"] [data-testid="exact-web-preview-frame"]')
      assert.equal(await homePreview.getAttribute('data-preview-version'), 'v2')
      const v2HomeFrame = page.frameLocator('[data-testid="inline-web-preview"] iframe[data-testid="preview-iframe"]')
      await v2HomeFrame.locator('text=Experiment title').waitFor({ state: 'visible', timeout: 20000 })
      assertNoForbiddenText(await page.locator('body').innerText(), 'project home after cleanup')
      await shot(page, '11b-project-home-after-cleanup.png')

      // i2 Home shows 0 active sessions and reload resets tutorial cleanly
      await page.locator('[data-name="HeaderBreadcrumbs"] button[title="Back to i2 Home"]').click()
      await page.waitForSelector('button[data-project-id="experimemo"]', { timeout: 10000 })
      assert.match(await page.locator('button[data-project-id="experimemo"]').innerText(), /0 sessions/)

      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.waitForSelector('button:has-text("Generate new")', { timeout: 15000 })
      assert.equal(/Experimemo/i.test(await page.locator('body').innerText()), false)
      assert.equal(await page.locator('[data-testid="session-screen"]').count(), 0)
    })

    await t.test('narrow screens stay usable with Experimemo (no horizontal overflow)', async () => {
      await completeJenny(page)
      await page.setViewportSize({ width: 390, height: 844 })
      await page.waitForTimeout(300)
      assert.ok((await page.evaluate(() => document.documentElement.scrollWidth)) <= 390, 'project home fits 390px')
      assert.ok(await page.locator('[data-testid="composer-input"]').isVisible())
      await page.locator('[data-testid="whats-next-button"]').click()
      await page.locator('[data-testid="composer-send"][data-glow="true"]').waitFor({ timeout: 10000 })
      await page.locator('[data-testid="composer-send"]').click()
      await page.locator('[data-testid="composer-send"][data-glow="true"]').waitFor({ timeout: 10000 })
      await page.locator('[data-testid="composer-send"]').click()
      await page.locator('[data-testid="start-session-button"]').waitFor({ state: 'visible', timeout: 25000 })
      await page.locator('[data-testid="start-session-button"]').click()
      await page.waitForSelector('[data-testid="session-screen"]')
      assert.equal(await page.locator('[role="tab"]').count(), 4)
      for (const id of ['infie', 'openai', 'claude', 'gemini']) {
        assert.ok(await page.locator(`#tab-agent-${id}`).isVisible())
        const box = await page.locator(`#tab-agent-${id}`).boundingBox()
        assert.ok(box.x >= 0 && box.x + box.width <= 390, `${id} tab fully inside the 390px viewport (x=${box.x}, w=${box.width})`)
      }
      assert.ok((await page.evaluate(() => document.documentElement.scrollWidth)) <= 390, 'session fits 390px')
      await shot(page, '12-session-mobile.png')

      // The enlarged preview stays reachable and fits the narrow window
      await page.locator('[data-testid="session-web-preview-button"]').click()
      await page.waitForSelector('button[aria-label="Close emulator"]')
      await modalFrame().waitFor({ state: 'attached', timeout: 10000 })
      const narrowModal = await page.locator('.z-50:has(button[aria-label="Close emulator"]) [data-testid="preview-viewport"]').boundingBox()
      assert.ok(narrowModal.x >= 0 && narrowModal.x + narrowModal.width <= 390, 'modal viewport fits inside 390px')
      assertViewport(await geometry(modalFrame(), { width: 960, height: 1200 }), { width: 960, height: 1200 }, 'narrow modal desktop portrait')
      await shot(page, '12b-modal-mobile.png')
      await page.keyboard.press('Escape')
      await page.setViewportSize({ width: 1440, height: 900 })
    })

    await t.test('direct Auto-merge branch skips sanity task and opens completion form immediately', async () => {
      const screen = page.locator('[data-testid="session-screen"]')
      await page.locator('[data-testid="flow-action-delegate"]').click()
      await page.locator('#tab-agent-openai').click()
      await page.waitForSelector('[data-testid="session-task-openai"][data-task-status="completed"]', { timeout: 15000 })
      await page.locator('#tab-agent-infie').click()
      await page.locator('#tab-agent-claude').click()
      await page.waitForSelector('[data-testid="session-task-claude"][data-task-status="completed"]', { timeout: 15000 })
      await page.locator('#tab-agent-infie').click()
      await page.locator('#tab-agent-gemini').click()
      await page.waitForFunction(() => document.querySelector('#panel-agent-gemini')?.textContent.includes('Flagging this to Infie'), null, { timeout: 15000 })
      await page.locator('#tab-agent-infie').click()
      await page.locator('[data-testid="flow-action-fix"]').waitFor({ state: 'visible', timeout: 12000 })
      await page.locator('[data-testid="flow-action-fix"]').click()
      await page.locator('#tab-agent-gemini').click()
      await page.waitForFunction(() => document.querySelector('#panel-agent-gemini')?.textContent.includes('Sent the fix summary to Infie'), null, { timeout: 15000 })
      await page.locator('#tab-agent-infie').click()
      await page.waitForSelector('[data-testid="session-task-gemini"][data-task-status="completed"]', { timeout: 5000 })
      for (const hid of ['exp-human-1', 'exp-human-2', 'exp-human-3']) {
        await page.locator(`[data-human-task-id="${hid}"]`).click()
      }
      await page.locator('[data-testid="flow-action-open-pr"]').click()
      await page.locator('[data-testid="flow-action-review-changes"]').click()
      await page.locator('[data-testid="flow-action-wrap-up"]').click()
      await page.locator('[data-testid="flow-action-auto-merge"]').waitFor({ state: 'visible', timeout: 15000 })
      assert.equal(await page.locator('[data-human-task-id="exp-human-sanity"]').count(), 0)
      await page.locator('[data-testid="flow-action-auto-merge"]').click()
      assert.equal(await screen.getAttribute('data-session-status'), 'MERGED')
      await page.locator('[data-testid="lesson-form"]').waitFor({ state: 'visible', timeout: 5000 })
      assert.equal(await page.locator('[data-human-task-id="exp-human-sanity"]').count(), 0, 'direct Auto-merge never adds optional sanity task')
    })

    await t.test('unavailable preview is honest on unconfigured hosts AND recovers on Retry after loopback server restart', async () => {
      const remote = await context.newPage()
      let tempPreviewServer = null
      try {
        await remote.goto(`http://127.0.0.1:${appPort}/iSquared/?beat=COMPLETE&mock_remote_host=1`, { waitUntil: 'domcontentloaded' })
        await remote.waitForSelector('button:has-text("Generate new")', { timeout: 15000 })
        await completeJenny(remote)
        const unavailable = remote.locator('[data-testid="preview-unavailable"]')
        await unavailable.waitFor({ state: 'visible' })
        const text = await unavailable.innerText()
        assert.match(text, /Preview unavailable/)
        assertNoForbiddenText(text, 'unavailable state')
        assert.equal(await remote.locator('iframe').count(), 0, 'no iframe is attempted')
        assert.equal(await remote.locator('input[placeholder*="http"]').count(), 0, 'no URL configuration control')

        // Now test local disconnected loopback server -> immediate unavailable (not sad chrome-error iframe) -> Retry after restart
        tempPreviewServer = createStaticServer(V1_DIR)
        const deadPort = await listen(tempPreviewServer)
        await close(tempPreviewServer)
        tempPreviewServer = null

        await remote.goto(
          `http://127.0.0.1:${appPort}/iSquared/?beat=COMPLETE&preview_v1=${encodeURIComponent(`http://127.0.0.1:${deadPort}`)}&preview_v2=${encodeURIComponent(`http://127.0.0.1:${v2Port}`)}`,
          { waitUntil: 'domcontentloaded' }
        )
        await remote.waitForSelector('button:has-text("Generate new")', { timeout: 15000 })
        await completeJenny(remote)
        await unavailable.waitFor({ state: 'visible', timeout: 5000 })
        assert.equal(await remote.locator('[data-testid="inline-web-preview"] iframe').count(), 0, 'stopped loopback server must not mount sad-page iframe')
        await remote.screenshot({ path: path.join(screenshotDir, '13-preview-unavailable.png') })

        // Restart loopback server on that same port and click Retry
        tempPreviewServer = createStaticServer(V1_DIR)
        await new Promise((resolve) => tempPreviewServer.listen(deadPort, '127.0.0.1', resolve))
        await remote.locator('[data-testid="inline-web-preview"] [data-testid="preview-retry-button"]').click()
        const recoveredFrame = remote.frameLocator('[data-testid="inline-web-preview"] iframe[data-testid="preview-iframe"]')
        await recoveredFrame.locator('text=Hello from Experimemo').waitFor({ state: 'visible', timeout: 20000 })
      } finally {
        if (tempPreviewServer) await close(tempPreviewServer)
        await remote.close()
      }
    })

    await t.test('existing projects and onboarding are unaffected', async () => {
      const other = await context.newPage()
      const otherErrors = []
      other.on('pageerror', (err) => otherErrors.push(err.message))
      try {
        await other.goto(appUrl(), { waitUntil: 'domcontentloaded' })
        await other.waitForSelector('button[data-project-id="pet"]', { timeout: 15000 })
        await other.locator('button[data-project-id="pet"]').click()
        await other.waitForFunction(() => /Human Testing 1\/4/i.test(document.body.innerText), null, { timeout: 10000 })
        const homeText = await other.locator('body').innerText()
        assert.match(homeText, /Human Testing 1\/4/i)
        assert.match(homeText, /Recent Activity/i)
        assert.match(homeText, /Wrap up/i)
        assert.equal(/Experimemo/.test(homeText), false)
        assert.equal(await other.locator('[data-testid="inline-web-preview"]').count(), 0)

        await other.locator('[data-name="DemoSessionCard"]').click()
        await other.waitForSelector('[data-testid="session-screen"]')
        const screen = other.locator('[data-testid="session-screen"]')
        const sessionText = await screen.innerText()
        assert.match(sessionText, /Human Testing 1\/4/i)
        assert.match(sessionText, /Explorer/i)
        assert.match(sessionText, /What's Next/i)
        assert.equal(await other.locator('[role="tab"]').count(), 0, 'original single-chat tab bar')
        assert.equal(/Experimemo|Gemini/.test(sessionText), false)

        // Original behaviours still work: the composer talks to Infie; What's Next advances the status
        await other.locator('input[placeholder^="Ask Infie"]').fill('Check the comment sheet')
        await other.keyboard.press('Enter')
        await other.waitForFunction(() => document.body.textContent.includes("I've folded that into the current session context."))
        const humanRow = other.locator('[data-human-task-id]').nth(1)
        await humanRow.click()
        assert.match(await screen.innerText(), /Human Testing 1\/4/i)
      } finally {
        await other.close()
      }

      // The existing opening gates B00 until dismissed, then onboarding reaches Infie's arrival.
      const onboarding = await context.newPage()
      try {
        await onboarding.goto(`http://127.0.0.1:${appPort}/iSquared/?onboarding=1`, { waitUntil: 'domcontentloaded' })
        await onboarding.waitForSelector('[data-beat="B00"]', { timeout: 10000 })
        await onboarding.getByRole('dialog', { name: 'Napoleon Hill opening quotation' }).waitFor({ state: 'visible', timeout: 10000 })
        await onboarding.keyboard.press('Escape')
        await onboarding.waitForSelector('[data-beat="B01"]', { timeout: 15000 })
        assert.equal(await onboarding.locator('button:has-text("Generate new")').count(), 0)
      } finally {
        await onboarding.close()
      }
      assert.deepEqual(otherErrors, [])
    })

    const seriousErrors = pageErrors.filter((e) => !e.includes('favicon') && !/404/.test(e))
    assert.deepEqual(unexpectedRequests, [], `Expected 0 external model/API/PR network requests, found: ${unexpectedRequests.join(' | ')}`)
    assert.deepEqual(seriousErrors, [], `Expected 0 serious page errors, found: ${seriousErrors.join(' | ')}`)
  } finally {
    await browser.close()
    await Promise.all([close(appServer), close(v1Server), close(v2Server)])
  }
})
