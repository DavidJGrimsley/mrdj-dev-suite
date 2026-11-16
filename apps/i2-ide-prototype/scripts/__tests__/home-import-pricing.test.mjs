// Home import, nine-session limits, pricing copy, and the Active Projects column.
import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const testDir = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(testDir, '..', '..')
const workspaceRoot = path.resolve(appRoot, '../../..')
const homeBuild = process.env.I2_BUILD_DIR || path.join(appRoot, 'dist-hosted', 'web')

const pricing = await import('../../src/app/home/pricing.ts')
const layout = await import('../../src/app/home/homeLayout.ts')
const imported = await import('../../src/app/home/importedProject.ts')

const KNOWN_STATUSES = [
  'READY', 'CODING', 'WAITING ON TEST', 'NEEDS YOU', 'REVIEW FIXES', 'FIXING',
  'VERIFIED', 'PR OPEN', 'MERGED', 'COMPLETE', 'BLOCKED', 'PAUSED',
]

test('pricing copy drops Pro and keeps the approved session lines', () => {
  const names = pricing.tierNames([...pricing.PERSONAL_TIERS, ...pricing.BUSINESS_TIERS])
  assert.deepEqual(names, ['Free', 'Premium', 'Team', 'Enterprise'])
  const free = pricing.PERSONAL_TIERS[0].bullets
  const premium = pricing.PERSONAL_TIERS[1].bullets
  const team = pricing.BUSINESS_TIERS[0].bullets
  assert.ok(free.includes('Limited number of active sessions'))
  assert.equal(free.includes('1 active session'), false)
  assert.ok(premium.includes('Unlimited sessions'))
  assert.ok(premium.includes('Optional Session Completion Forms'))
  assert.equal(premium.some((b) => /priority|cloud emulator|up to 8|conflict resolution|PR lifecycle/i.test(b)), false)
  assert.ok(team.includes('Everything in Premium'))
  assert.equal(team.some((b) => /Everything in Pro|role-based|design system/i.test(b)), false)
  assert.equal(/\bPro\b/.test(pricing.HOME_PRICING_REPLY), false)
  assert.match(pricing.HOME_PRICING_REPLY, /Premium for unlimited sessions/)
})

test('active projects stay fixed for the tutorial and two projects', () => {
  assert.equal(layout.activeProjectsFit(2, false), 'fixed')
  assert.equal(layout.activeProjectsFit(2, true), 'fixed')
  assert.equal(layout.activeProjectsFit(4, true), 'fixed')
  assert.equal(layout.activeProjectsFit(3, false), 'grow')
  assert.equal(layout.activeProjectsFit(4, false), 'grow')
  assert.equal(layout.headerClickAction(1), null)
  assert.equal(layout.headerClickAction(2), 'expand')
  assert.equal(layout.headerClickAction(3), 'fullscreen')
  assert.equal(layout.ACTIVE_PROJECTS_FIXED_HEIGHT_CLASS, 'lg:h-[604px]')
  assert.equal(layout.HOME_BOTTOM_PADDING_CLASS, 'pb-[48px]')
})

test('imported Field Notes has nine existing statuses and one folder', () => {
  assert.equal(imported.IMPORTED_SESSIONS.length, 9)
  assert.equal(imported.IMPORT_FOLDER_LABEL, 'field-notes/')
  assert.equal(imported.IMPORT_PROJECT_ID, 'field-notes')
  const statuses = imported.IMPORTED_SESSIONS.map((s) => s.status)
  assert.equal(new Set(statuses).size, 9)
  for (const status of statuses) assert.ok(KNOWN_STATUSES.includes(status), status)
  assert.equal(imported.IMPORT_SCAN_STEPS.some((step) => /mds/i.test(step)), false)
  assert.match(imported.IMPORT_SIMULATION_LINE, /Generate a new project/)
  assert.match(imported.IMPORT_SIMULATION_LINE, /info\.md/)
  assert.match(imported.IMPORT_FLAG_MESSAGE, /Capture quick notes/)
  assert.match(imported.IMPORT_START_LINE, /Nine sessions/)
  const totals = imported.IMPORTED_SESSIONS.map((s) => `${s.agentDone}/${s.agentTotal}/${s.humanDone}/${s.humanTotal}`)
  assert.equal(new Set(totals).size, 9)
})

function createStaticServer(distDir) {
  const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.ttf': 'font/ttf' }
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
  // The test id sits on a zero-size wrapper; the dialog itself is position:fixed.
  const modal = page.locator('[data-testid="prototype-limit-modal"]')
  const got = page.getByRole('button', { name: 'Got it' })
  await got.waitFor({ state: 'visible', timeout: 5000 })
  await got.click()
  await modal.waitFor({ state: 'detached', timeout: 5000 })
}

test('browser: import lifecycle, limits, pricing, and active projects', async () => {
  const chromePath = process.env.CHROME_PATH || path.join(process.env.ProgramFiles || 'C:/Program Files', 'Google/Chrome/Application/chrome.exe')
  const pwPath = path.join(workspaceRoot, 'temp', 'exact-upstream', 'node_modules', 'playwright-core')
  assert.ok(fs.existsSync(chromePath), `Chrome missing at ${chromePath}`)
  assert.ok(fs.existsSync(pwPath), `playwright-core missing at ${pwPath}`)
  assert.ok(fs.existsSync(path.join(homeBuild, 'index.html')), `Build missing at ${homeBuild}`)

  const { chromium } = await import(pathToFileURL(path.join(pwPath, 'index.mjs')).href)
  const server = createStaticServer(homeBuild)
  const port = await listen(server)
  const browser = await chromium.launch({ executablePath: chromePath, headless: true })
  const pageErrors = []
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const page = await context.newPage()
    page.on('pageerror', (err) => pageErrors.push(err.message))
    await page.goto(`http://127.0.0.1:${port}/?beat=COMPLETE`, { waitUntil: 'domcontentloaded' })

    const column = page.locator('[data-testid="home-projects-column"]')
    await column.waitFor()
    assert.equal(await column.getAttribute('data-projects-fit'), 'fixed')
    assert.equal(await column.getAttribute('data-project-count'), '2')
    assert.match(await column.getAttribute('class'), /h-\[604px\]/)
    assert.match(await page.locator('[data-testid="home-canvas"]').getAttribute('class'), /pb-\[48px\]/)

    await page.getByPlaceholder(/Talk to Infie/).fill('pricing')
    await page.getByPlaceholder(/Talk to Infie/).press('Enter')
    await page.getByText(pricing.HOME_PRICING_REPLY).waitFor({ timeout: 4000 })

    await page.getByRole('button', { name: 'Import Project' }).click()
    const choice = page.locator('[data-testid="import-choice"]')
    await choice.waitFor()
    assert.equal(await choice.count(), 1)
    assert.equal(await choice.getAttribute('data-import-folder'), 'field-notes/')
    assert.equal(await page.locator('[data-testid="import-picker"] button').count(), 2)
    await choice.click()

    await page.locator('[data-testid="import-message-purpose"]').waitFor({ timeout: 8000 })
    assert.equal(await page.locator('[data-testid="import-flow"]').innerText().then((text) => /mds/i.test(text)), false)
    await page.locator('[data-testid="import-reply"]').fill('A private notebook for field notes')
    await page.locator('[data-testid="import-send"]').click()
    await page.locator('[data-testid="import-message-simulation"]').waitFor({ timeout: 4000 })
    assert.match(await page.locator('[data-testid="import-message-simulation"]').innerText(), /Generate a new project/)
    await page.locator('[data-testid="import-message-flag"]').waitFor({ timeout: 4000 })
    await page.locator('[data-testid="import-message-start"]').waitFor({ timeout: 4000 })
    await page.locator('[data-testid="project-home"][data-project-id="field-notes"]').waitFor({ timeout: 8000 })

    const cards = page.locator('[data-sessions-layout] [data-session-card]')
    assert.equal(await cards.count(), 9)
    const homeText = await page.locator('[data-testid="project-home"]').innerText()
    for (const status of imported.IMPORT_SESSION_STATUSES) assert.match(homeText, new RegExp(status))

    await page.locator('[data-sessions-layout] [data-session-card="fn-capture"]').click()
    await dismissLimit(page)
    assert.equal(await page.locator('[data-testid="session-screen"]').count(), 0)

    await page.locator('[data-testid="header-session-menu"]').click()
    await page.locator('[data-session-id="fn-sync"]').click()
    await dismissLimit(page)
    assert.equal(await page.locator('[data-testid="session-screen"]').count(), 0)

    const photosCard = page.locator('[data-sessions-layout] [data-session-card="fn-photos"]')
    const inlineAction = photosCard.locator('button', { hasText: 'Test now' })
    if (await inlineAction.count()) await inlineAction.click()
    else {
      await photosCard.hover()
      await page.getByRole('button', { name: 'Test now', exact: true }).click()
    }
    await dismissLimit(page)
    assert.equal(await page.locator('[data-testid="session-screen"]').count(), 0)

    await page.locator('[data-project-file="Info.md"]').click()
    await dismissLimit(page)
    assert.equal(await page.locator('[data-testid="file-viewer"]').count(), 0)

    await page.locator('[data-explorer-folder="project"]').click()
    await dismissLimit(page)
    assert.equal(await page.locator('[data-testid="file-viewer"]').count(), 0)

    await page.locator('[data-testid="simulator-session-select"]').click()
    await page.locator('[data-sim-option="fn-export"]').click({ force: true })
    assert.equal(await page.locator('[data-testid="session-screen"]').count(), 0)
    await page.locator('[data-testid="simulator-limit"]').click()
    const limitText = await page.locator('[data-testid="prototype-limit-modal"]').textContent()
    assert.match(limitText, /Field Notes/)
    await dismissLimit(page)

    await page.getByTitle('Back to i2 Home').click()
    await column.waitFor()
    assert.equal(await column.getAttribute('data-projects-fit'), 'grow')
    assert.equal(await column.getAttribute('data-project-count'), '3')
    assert.equal(/h-\[604px\]/.test(await column.getAttribute('class')), false)
    await page.locator('[data-project-id="field-notes"]').waitFor()

    await page.locator('[data-testid="active-projects-expand"]').click()
    const modal = page.locator('[data-testid="active-projects-modal"]')
    await modal.waitFor()
    assert.equal(await modal.getAttribute('data-mode'), 'expanded')
    const listed = await modal.innerText()
    assert.match(listed, /Field Notes/)
    assert.match(listed, /Pet Show and Tell/)
    assert.match(listed, /Not Hotdog/)
    const overflow = await page.locator('[data-testid="active-projects-scroll"]').evaluate((el) => el.scrollHeight > el.clientHeight)
    assert.equal(overflow, true)
    await page.locator('[data-testid="active-projects-fullscreen"]').click()
    assert.equal(await modal.getAttribute('data-mode'), 'fullscreen')
    const fullBox = await modal.boundingBox()
    assert.ok(fullBox.width > 1200 && fullBox.height > 750, `fullscreen box ${JSON.stringify(fullBox)}`)
    await page.getByLabel('Close active projects').click()
    await modal.waitFor({ state: 'hidden' })

    await page.getByRole('button', { name: 'Import Project' }).click()
    await page.locator('[data-testid="import-empty"]').waitFor()
    assert.equal(await page.locator('[data-testid="import-choice"]').count(), 0)
    await page.keyboard.press('Escape')

    await page.locator('[data-testid="home-projects-column"] [data-project-id="pet"]').click()
    await page.locator('[data-testid="project-home"][data-project-id="pet"]').waitFor()
    await page.locator('[data-sessions-layout] [data-session-card="add-comments"]').click()
    await page.locator('[data-testid="session-screen"]').waitFor()
    assert.equal(await page.locator('[data-testid="prototype-limit-modal"]').count(), 0)
    await page.locator('[data-project-file="Info.md"]').click()
    await page.locator('[data-testid="file-viewer"]').waitFor()
    await page.keyboard.press('Escape')

    await page.getByTitle('Back to i2 Home').click()
    await page.locator('[data-testid="home-projects-column"] [data-project-id="nothotdog"]').click()
    await page.locator('[data-testid="project-home"][data-project-id="nothotdog"]').waitFor()
    await page.locator('[data-project-file="Info.md"]').click()
    const hotdog = await page.locator('[data-testid="prototype-limit-modal"]').textContent()
    assert.match(hotdog, /Not Hotdog/)
    await dismissLimit(page)
    assert.equal(await page.locator('[data-testid="file-viewer"]').count(), 0)
    assert.equal(await page.locator('[data-sessions-layout] [data-session-card="not-hotdog"]').count(), 0)
    assert.equal(await page.locator('[data-sessions-layout] [data-session-card]').count(), 0)

    await page.getByTitle('Back to i2 Home').click()
    await page.getByRole('button', { name: 'Generate New Project' }).click()
    const jennyScreen = page.locator('[data-testid="tutorial-jenny-screen"]')
    await jennyScreen.waitFor({ timeout: 8000 })
    const jennyText = await jennyScreen.innerText()
    assert.match(jennyText, /What are we building\?|What's the idea\?/)
    assert.match(jennyText, /Turn 1 of 26/)
    const answerBtn = page.locator('[data-testid="sample-answer-button"]')
    for (let i = 0; i < 27; i++) {
      await page.waitForFunction(() => {
        const b = document.querySelector('[data-testid="sample-answer-button"]')
        return b && !b.disabled
      })
      await answerBtn.click()
    }
    await page.locator('[data-testid="project-home"][data-project-id="experimemo"]').waitFor({ timeout: 10000 })
    await page.getByTitle('Back to i2 Home').click()
    await column.waitFor()
    assert.equal(await column.getAttribute('data-projects-fit'), 'grow')
    assert.equal(await column.getAttribute('data-project-count'), '4')

    const b12 = await context.newPage()
    b12.on('pageerror', (err) => pageErrors.push(err.message))
    await b12.goto(`http://127.0.0.1:${port}/?beat=B12`, { waitUntil: 'domcontentloaded' })
    const b12Col = b12.locator('[data-testid="home-projects-column"]')
    await b12Col.waitFor({ timeout: 8000 })
    assert.equal(await b12Col.getAttribute('data-projects-fit'), 'fixed')
    assert.equal(await b12Col.getAttribute('data-project-count'), '2')
    assert.match(await b12Col.getAttribute('class'), /h-\[604px\]/)
    assert.match(await b12.locator('[data-testid="home-canvas"]').getAttribute('class'), /pb-\[48px\]/)

    const plans = await context.newPage()
    plans.on('pageerror', (err) => pageErrors.push(err.message))
    await plans.goto(`http://127.0.0.1:${port}/?beat=COMPLETE&plan=1`, { waitUntil: 'domcontentloaded' })
    await plans.locator('[data-testid="pricing-tier-Free"]').waitFor({ timeout: 5000 })
    const freeText = await plans.locator('[data-testid="pricing-tier-Free"]').innerText()
    const premiumText = await plans.locator('[data-testid="pricing-tier-Premium"]').innerText()
    assert.match(freeText, /Limited number of active sessions/)
    assert.match(premiumText, /Unlimited sessions/)
    assert.match(premiumText, /Optional Session Completion Forms/)
    assert.equal(await plans.getByRole('button', { name: 'Choose Pro' }).count(), 0)
    await plans.getByRole('button', { name: 'business', exact: true }).click()
    await plans.locator('[data-testid="pricing-tier-Team"]').waitFor()
    const teamText = await plans.locator('[data-testid="pricing-tier-Team"]').innerText()
    assert.match(teamText, /Everything in Premium/)
    assert.equal(/Everything in Pro/.test(teamText), false)
    assert.deepEqual(pageErrors, [])
  } finally {
    await browser.close()
    await close(server)
  }
})
