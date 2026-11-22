// Real-browser walkthrough of the five-tutorial split (generated/infie-tutorial-split-proposal.md)
// against the hosted build (dist-hosted/web). Run `pnpm build:hosted` first. Reduced motion keeps
// the same content and order with instant text, so every line can be checked in sequence.
import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const testDir = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(testDir, '..', '..')
const workspaceRoot = path.resolve(appRoot, '../../..')
const webDir = process.env.I2_BUILD_DIR || path.join(appRoot, 'dist-hosted', 'web')

function createStaticServer(distDir) {
  const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webm': 'video/webm', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2', '.ttf': 'font/ttf' }
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

const REMOVED = [
  'may take around 15 minutes',
  "I've filled in some dummy data for this tutorial",
  "So that's the flow of a session",
  'This IDE is just one surface of iSquared.',
  "For now, let's head Home.",
  'Try moving the music player to the bottom panel',
]

/** Waits until Infie's current line (center stage, docked chat, or callout) contains `text`. */
async function line(page, text) {
  await page.waitForFunction(
    (t) => [...document.querySelectorAll('[data-slot="infie-message"], [data-name="FloatingInfieCallout"]')].some((el) => el.textContent.includes(t)),
    text,
    { timeout: 15000 },
  )
}
async function cont(page) {
  await page.getByRole('button', { name: 'Continue', exact: true }).click({ timeout: 10000 })
}
async function beat(page, id) {
  await page.waitForSelector(`[data-beat="${id}"]`, { timeout: 15000 })
}
async function profileName(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('i2.onboarding.profile') || 'null')?.name ?? null)
}

/** Runs Meet Infie from B02 to its final Continue, asserting every staged line and reveal. */
async function runMeetInfie(page, { name, provider }) {
  await line(page, "Hi there. I'm Infie. What should I call you?")
  await page.locator('#onboarding-name').fill(name)
  await page.locator('#onboarding-email').fill(`${name.toLowerCase()}@e.mail`)
  await page.getByRole('button', { name: 'Submit', exact: true }).click()

  await line(page, `Nice to meet you, ${name}. I can see you're level zero.`)
  await page.locator('[data-name="Level"]').waitFor()
  await cont(page)
  await line(page, 'What a noob.')
  await cont(page)

  await line(page, 'Tell me a little about what you like to build and why.')
  await page.locator('#onboarding-project-interest').fill('Tiny games')
  await page.getByRole('button', { name: 'Send', exact: true }).click()
  await line(page, "I don't do much coding myself.")
  await cont(page)

  await line(page, "Btw… it's kinda quiet. Do you like music?")
  await cont(page)
  await line(page, 'Your music player will be right here when you want it')
  assert.equal(await page.locator('[data-name="LeekBeatsWidget"]').count(), 1, 'one music player')
  await cont(page)

  await line(page, "I'm all ears if you want to speak conversationally. The built-in music will automatically turn down")
  await page.getByRole('button', { name: 'Not now', exact: true }).click()
  await line(page, 'Of course you can use the keyboard and mouse.')
  await line(page, "Or pick up a gamepad if that's more your groove.")
  await line(page, 'Prefer a joystick and programmable keypad? You can do that too.')
  await line(page, 'Since navigating the UI and executing common actions are mapped to a controller')
  await cont(page)

  await line(page, "I'm your orchestrator, coordinator, question-answerer, and maybe friend.")
  await cont(page)
  await line(page, 'I help manage your tasks and projects, even after weeks away.')
  await cont(page)
  await line(page, 'You can ask me for help with any part of the IDE just by holding the hotkeys')
  await page.locator('[data-name="OnboardingHotkeyCard"]').waitFor()
  await cont(page)

  await line(page, "Here's how navigation works: i² takes you Home")
  await page.locator('[data-name="HeaderBreadcrumbs"]').waitFor()
  assert.equal(await page.locator('[data-name="WorkspaceVerticalTree"]').count(), 0, 'workspace tree moved to Project & Session Flow')
  await cont(page)

  await line(page, 'I am run by an open-weight LLM plus a decision model')
  await cont(page)
  await line(page, 'You can use any combination of models for your Session Agents')
  await page.locator(`[data-provider-id="${provider}"]`).click()
  await page.locator('[data-name="SimulatedModelSignInModal"] button', { hasText: 'Connect' }).click()
  await line(page, 'Checking your developer environment...')
  await cont(page)
  assert.equal(await page.locator('[data-name="PreferenceSlidersPreview"]').count(), 0, 'sliders moved to Widgets & Whatnot')

  await line(page, 'Click Learn for tutorials and lessons, and Widgets to customize your workspace.')
  await page.locator('[data-name="HeaderTutorialsWidgetsGames"]').waitFor()
  await cont(page)
  await line(page, "Your alerts, notifications and settings live here. I'll also help you manage the Global To-Do list.")
  await page.locator('[data-name="HeaderNotificationsSettings"]').waitFor()
  await cont(page)

  await line(page, 'Let me scoot over and make some room.')
  await line(page, 'This is i² Home. The Workspace and Emulators controls switch between your work and your previews.')
  assert.ok(await page.getByText('Screen 1', { exact: true }).count(), 'Workspace/Emulators toggle revealed')
  assert.equal(await page.locator('[data-testid="active-projects-header"]').count(), 0, 'Active Projects not yet revealed')
  await cont(page)
  await line(page, 'You can resume projects that are already onboarded to iSquared.')
  await page.locator('[data-testid="active-projects-header"]').waitFor()
  assert.equal(await page.getByRole('button', { name: 'Import Project' }).count(), 0, 'Generate/Import not yet revealed')
  await cont(page)
  await line(page, 'You can also start new projects or onboard existing ones to iSquared.')
  await page.getByRole('button', { name: 'Import Project' }).waitFor()
  await cont(page)
  await line(page, 'I can also help you manage our Global To-Do list: it includes open project tasks and reminders')
  assert.equal(await page.locator('[data-name="HomeInfieActionRow"] [data-tutorial-disabled]').count(), 0, 'action buttons not yet revealed')
  await cont(page)
  await line(page, "I'll present Action Buttons specific to the next steps of your projects")
  await page.locator('[data-name="HomeInfieActionRow"] [data-tutorial-disabled]').first().waitFor()
  await cont(page)

  await line(page, "Learn has the other tutorials whenever you're ready.")
  await cont(page)
  await line(page, "Speaking of… there's your first level.")
  await cont(page)
  await beat(page, 'COMPLETE')
}

test('browser: five-tutorial split — Meet Infie, replay, Learn, offers, suppression, Project & Session Flow', async (t) => {
  const chromePath = process.env.CHROME_PATH || path.join(process.env.ProgramFiles || 'C:/Program Files', 'Google/Chrome/Application/chrome.exe')
  const pwPath = path.join(workspaceRoot, 'temp', 'exact-upstream', 'node_modules', 'playwright-core')
  assert.ok(fs.existsSync(chromePath), `Chrome missing at ${chromePath}`)
  assert.ok(fs.existsSync(pwPath), `playwright-core missing at ${pwPath}`)
  assert.ok(fs.existsSync(path.join(webDir, 'index.html')), `Build missing at ${webDir}`)

  const { chromium } = await import(pathToFileURL(path.join(pwPath, 'index.mjs')).href)
  const server = createStaticServer(webDir)
  const port = await listen(server)
  const base = `http://127.0.0.1:${port}/iSquared/`
  const browser = await chromium.launch({ executablePath: chromePath, headless: true })
  const pageErrors = []
  const seenLines = new Set()
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })

    await t.test('Meet Infie first run ends on Home with level 1 and the plan choice; a replay keeps real state', async () => {
      const page = await context.newPage()
      page.on('pageerror', (e) => pageErrors.push(e.message))
      await page.exposeFunction('__i2Line', (text) => seenLines.add(text))
      await page.addInitScript(() => {
        new MutationObserver(() => {
          for (const el of document.querySelectorAll('[data-slot="infie-message"]')) window.__i2Line?.(el.textContent)
        }).observe(document, { subtree: true, childList: true, characterData: true })
      })
      try {
        await page.goto(`${base}?onboarding=1`, { waitUntil: 'domcontentloaded' })
        await page.getByRole('dialog', { name: 'Napoleon Hill opening quotation' }).waitFor({ state: 'visible', timeout: 10000 })
        await page.keyboard.press('Escape')
        await beat(page, 'B01')
        assert.equal(await page.locator('[data-testid="exit-tutorial"]').count(), 0, 'first run has no exit')
        await runMeetInfie(page, { name: 'Ada', provider: 'claude' })

        // First completion: level 1 and the existing plan choice, finishing in place on Home.
        await page.getByText('Choose your plan').waitFor({ timeout: 5000 })
        await page.keyboard.press('Escape')
        await page.getByText('Choose your plan').waitFor({ state: 'detached', timeout: 5000 })
        assert.match(await page.locator('[data-name="Level"]').innerText(), /1/)
        assert.equal(await page.locator('[data-testid="home-projects-column"]').count(), 1, 'finished on i² Home')
        assert.equal(await profileName(page), 'Ada')

        // Replay from Learn: staged reveals run again, but the profile, level and models are restored
        // and the plan choice is not shown a second time. The music player stays mounted throughout.
        await page.getByRole('button', { name: 'Learn', exact: true }).click()
        await page.locator('[data-testid="learn-tutorial-meet-infie"]').click()
        await beat(page, 'B00')
        assert.equal(await page.locator('[data-name="LeekBeatsWidget"]').count(), 1, 'music player survives the replay start')
        await page.locator('[data-testid="exit-tutorial"]').waitFor()
        await runMeetInfie(page, { name: 'Grace', provider: 'gemini' })
        await page.waitForTimeout(900)
        assert.equal(await page.getByText('Choose your plan').count(), 0, 'plan choice only on the first completion')
        assert.match(await page.locator('[data-name="Level"]').innerText(), /1/)
        assert.equal(await profileName(page), 'Ada', 'replay restores the real profile')
        assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('i2.onboarding.models'))), ['claude'])

        // Exit mid-replay keeps everything too.
        await page.getByRole('button', { name: 'Learn', exact: true }).click()
        await page.locator('[data-testid="learn-tutorial-meet-infie"]').click()
        await line(page, "Hi there. I'm Infie.")
        await page.locator('[data-testid="exit-tutorial"]').click()
        await beat(page, 'COMPLETE')
        assert.match(await page.locator('[data-name="Level"]').innerText(), /1/)
        assert.equal(await page.locator('[data-name="LeekBeatsWidget"]').count(), 1)

        for (const removed of REMOVED) {
          assert.equal([...seenLines].some((l) => l.includes(removed)), false, `removed line shown: ${removed}`)
        }
      } finally {
        await page.close()
      }
    })

    await t.test('Learn lists five tutorials; Education is a prototype limit; fullscreen and close', async () => {
      const page = await context.newPage()
      page.on('pageerror', (e) => pageErrors.push(e.message))
      try {
        await page.goto(`${base}?beat=COMPLETE`, { waitUntil: 'domcontentloaded' })
        await page.getByRole('button', { name: 'Learn', exact: true }).click()
        const modal = page.locator('[data-testid="learn-modal"]')
        await modal.waitFor()
        const ids = await modal.locator('[data-testid^="learn-tutorial-"]').evaluateAll((els) => els.map((el) => el.getAttribute('data-testid')))
        assert.deepEqual(ids, ['meet-infie', 'project-session', 'widgets', 'generate', 'import'].map((id) => `learn-tutorial-${id}`))
        await modal.getByRole('button', { name: 'Fullscreen' }).click()
        await modal.getByRole('button', { name: 'Exit fullscreen' }).waitFor()
        await modal.locator('[data-testid="learn-education"]').click()
        const limit = page.locator('[data-testid="prototype-limit-modal"]')
        await limit.waitFor({ state: 'visible' })
        assert.match(await limit.innerText(), /computer science, game development and level-increase lessons/i)
        await page.getByRole('button', { name: 'Got it' }).click()
        await modal.getByRole('button', { name: 'Close Learn' }).click()
        await modal.waitFor({ state: 'detached' })

        // Generate from Learn opens Jenny; Import from Learn opens the existing picker.
        await page.getByRole('button', { name: 'Learn', exact: true }).click()
        await page.locator('[data-testid="learn-tutorial-import"]').click()
        await page.locator('[data-testid="import-picker"]').waitFor()
        await page.keyboard.press('Escape')
      } finally {
        await page.close()
      }
    })

    await t.test('Learn keyboard: Tab stays inside, Education limit stacks on top, focus returns to its opener', async () => {
      const page = await context.newPage()
      page.on('pageerror', (e) => pageErrors.push(e.message))
      const focusIn = (selector) => page.evaluate((s) => Boolean(document.activeElement?.closest(s)), selector)
      const focusedTestId = () => page.evaluate(() => document.activeElement?.getAttribute('data-testid') ?? null)
      const focusedIsLearnTrigger = () => page.evaluate(() => document.activeElement?.hasAttribute('data-learn-trigger') ?? false)
      try {
        await page.goto(`${base}?beat=COMPLETE`, { waitUntil: 'domcontentloaded' })
        const learnButton = page.getByRole('button', { name: 'Learn', exact: true })
        const modal = page.locator('[data-testid="learn-modal"]')
        const dialog = page.getByRole('dialog', { name: 'Learn' })
        const limit = page.locator('[data-testid="prototype-limit-modal"]')

        // Opened from the keyboard, the first tutorial has focus and Tab/Shift+Tab never leave Learn.
        await learnButton.focus()
        await page.keyboard.press('Enter')
        await dialog.waitFor()
        assert.equal(await focusedTestId(), 'learn-tutorial-meet-infie')
        const stops = await dialog.evaluate((el) => el.querySelectorAll('button').length)
        for (let i = 0; i < stops + 2; i++) {
          await page.keyboard.press('Tab')
          assert.ok(await focusIn('[data-testid="learn-modal"] [role="dialog"]'), `Tab ${i + 1} stays in Learn`)
        }
        for (let i = 0; i < stops + 2; i++) {
          await page.keyboard.press('Shift+Tab')
          assert.ok(await focusIn('[data-testid="learn-modal"] [role="dialog"]'), `Shift+Tab ${i + 1} stays in Learn`)
        }

        // Education opens its prototype limit above Learn: it takes focus, keeps Tab, and Escape
        // closes only the limit, returning focus to Education inside the still-open Learn.
        await page.locator('[data-testid="learn-education"]').focus()
        await page.keyboard.press('Enter')
        await limit.waitFor({ state: 'visible' })
        await page.getByRole('dialog', { name: /Education/ }).waitFor()
        assert.ok(await focusIn('[data-testid="prototype-limit-modal"]'), 'the limit takes focus')
        for (let i = 0; i < 6; i++) {
          await page.keyboard.press('Tab')
          assert.ok(await focusIn('[data-testid="prototype-limit-modal"]'), `Tab ${i + 1} stays in the limit`)
        }
        await page.keyboard.press('Escape')
        await limit.waitFor({ state: 'detached' })
        await page.waitForTimeout(250)
        assert.equal(await modal.count(), 1, 'Escape on the limit leaves Learn open')
        assert.equal(await focusedTestId(), 'learn-education', 'focus returns to Education')

        // Got it closes the limit the same way.
        await page.keyboard.press('Enter')
        await limit.waitFor({ state: 'visible' })
        await page.getByRole('button', { name: 'Got it' }).click()
        await limit.waitFor({ state: 'detached' })
        assert.equal(await modal.count(), 1)

        // Escape now closes Learn and focus goes back to the header's Learn button.
        await page.keyboard.press('Escape')
        await modal.waitFor({ state: 'detached' })
        assert.ok(await focusedIsLearnTrigger(), 'Escape returns focus to Learn')

        // Mouse open + Close Learn, and a backdrop click, restore focus the same way.
        await learnButton.click()
        await dialog.waitFor()
        await page.getByRole('button', { name: 'Close Learn' }).click()
        await modal.waitFor({ state: 'detached' })
        assert.ok(await focusedIsLearnTrigger(), 'Close Learn returns focus to Learn')
        await learnButton.click()
        await dialog.waitFor()
        await page.mouse.click(8, 8)
        await modal.waitFor({ state: 'detached' })
        assert.ok(await focusedIsLearnTrigger(), 'backdrop close returns focus to Learn')
      } finally {
        await page.close()
      }
    })

    await t.test('a pending offer is hidden and withdrawn, not used up, when Import or Generate opens', async () => {
      const page = await context.newPage()
      page.on('pageerror', (e) => pageErrors.push(e.message))
      const offer = page.locator('[data-testid="tutorial-offer"]')
      const openPet = async () => {
        await page.locator('button[data-project-id="pet"]').click()
        await page.locator('[data-testid="project-home"][data-project-id="pet"]').waitFor()
      }
      const home = async () => {
        await page.getByTitle('Back to i2 Home').click()
        await page.locator('[data-testid="project-home"]').waitFor({ state: 'detached' })
        await page.locator('[data-testid="home-projects-column"]').waitFor()
      }
      try {
        await page.goto(`${base}?beat=COMPLETE&tours=1`, { waitUntil: 'domcontentloaded' })
        await openPet()
        await offer.waitFor()
        assert.match(await offer.innerText(), /Project & Session Flow/)
        // Still pending on Home; opening Import withdraws it and nothing can start it there.
        await home()
        assert.equal(await offer.count(), 1, 'offer pending on Home')
        await page.getByRole('button', { name: 'Import Project' }).click()
        await page.locator('[data-testid="import-picker"]').waitFor()
        await offer.waitFor({ state: 'detached' })
        assert.equal(await page.getByRole('button', { name: 'Start tour' }).count(), 0, 'no Start tour during Import')
        await page.keyboard.press('Escape')
        await page.locator('[data-testid="import-picker"]').waitFor({ state: 'detached' })
        await page.waitForTimeout(300)
        assert.equal(await offer.count(), 0, 'withdrawn, not merely hidden')

        // Its eligibility was kept: the next eligible opening offers it again.
        await openPet()
        await offer.waitFor()
        assert.match(await offer.innerText(), /Project & Session Flow/)

        // The same from Learn (Generate starts Jenny) and from Home's Generate button.
        await page.getByRole('button', { name: 'Learn', exact: true }).click()
        await page.locator('[data-testid="learn-tutorial-generate"]').click()
        await page.locator('[data-testid="tutorial-jenny-screen"]').waitFor({ timeout: 8000 })
        await page.waitForTimeout(300)
        assert.equal(await offer.count(), 0, 'no offer over Jenny')
        assert.ok(await page.locator('[data-beat="COMPLETE"]').count() > 0, 'no tour started')
      } finally {
        await page.close()
      }

      // A Widgets offer left pending when Home's Generate opens Jenny is withdrawn too.
      const page2 = await context.newPage()
      page2.on('pageerror', (e) => pageErrors.push(e.message))
      try {
        await page2.goto(`${base}?beat=COMPLETE&tours=1`, { waitUntil: 'domcontentloaded' })
        await page2.locator('[data-name="HeaderWidgetsButton"]').click()
        await page2.locator('[data-name="WidgetsGalleryModal"]').waitFor()
        await page2.locator('[data-testid="tutorial-offer"]').waitFor()
        await page2.keyboard.press('Escape')
        await page2.locator('[data-name="WidgetsGalleryModal"]').waitFor({ state: 'detached' })
        assert.equal(await page2.locator('[data-testid="tutorial-offer"]').count(), 1, 'Widgets offer pending')
        await page2.getByRole('button', { name: 'Generate New Project' }).click()
        await page2.locator('[data-testid="tutorial-jenny-screen"]').waitFor({ timeout: 8000 })
        await page2.locator('[data-testid="tutorial-offer"]').waitFor({ state: 'detached' })
        assert.equal(await page2.getByRole('button', { name: 'Start tour' }).count(), 0)
      } finally {
        await page2.close()
      }
    })

    await t.test('offers: first project opening, dismissal is final, Widgets offer and tour, suppression during Import', async () => {
      const page = await context.newPage()
      page.on('pageerror', (e) => pageErrors.push(e.message))
      try {
        await page.goto(`${base}?beat=COMPLETE&tours=1`, { waitUntil: 'domcontentloaded' })
        // Widgets during no tutorial: offer once; Start runs the tour over the open gallery.
        await page.locator('[data-name="HeaderWidgetsButton"]').click()
        await page.locator('[data-name="WidgetsGalleryModal"]').waitFor()
        await page.locator('[data-testid="tutorial-offer"]').waitFor()
        assert.match(await page.locator('[data-testid="tutorial-offer"]').innerText(), /Widgets & Whatnot/)
        await page.getByRole('button', { name: 'Start tour' }).click()
        await line(page, "Everything's a widget here.")
        await page.locator('[data-name="WidgetArrangeDemo"]').waitFor()
        assert.equal(await page.locator('[data-name="LeekBeatsWidget"]').count(), 1)
        await cont(page)
        await line(page, 'You can drag panel edges to resize them')
        await cont(page)
        await line(page, 'Preference Sliders apply to all models in all conversations.')
        await page.locator('[data-name="PreferenceSlidersPreview"]').waitFor()
        await cont(page)
        // The gallery is already open, so "Click Widgets" is skipped.
        await line(page, 'One of my favorites is the Library')
        await cont(page)
        await page.locator('[data-name="FloatingInfieCallout"]').waitFor({ state: 'detached' })
        assert.equal(await page.locator('[data-name="WidgetsGalleryModal"]').count(), 1, 'a gallery the user opened stays open')
        await page.keyboard.press('Escape')
        await page.locator('[data-name="HeaderWidgetsButton"]').click()
        await page.waitForTimeout(400)
        assert.equal(await page.locator('[data-testid="tutorial-offer"]').count(), 0, 'Widgets offer is first-time only')
        await page.keyboard.press('Escape')

        // Import (and the navigation it performs) never offers Project & Session Flow.
        await page.getByRole('button', { name: 'Import Project' }).click()
        await page.locator('[data-testid="import-choice"]').click()
        await page.locator('[data-testid="import-reply"]').fill('Field notes')
        await page.locator('[data-testid="import-send"]').click()
        await page.locator('[data-testid="project-home"][data-project-id="field-notes"]').waitFor({ timeout: 12000 })
        await page.waitForTimeout(500)
        assert.equal(await page.locator('[data-testid="tutorial-offer"]').count(), 0, 'no offer from Import navigation')

        // The first eligible project opening offers it; Not now uses the offer up.
        await page.locator('[data-name="HeaderBreadcrumbs"] button').first().click()
        await page.locator('button[data-project-id="pet"]').click()
        await page.locator('[data-testid="tutorial-offer"]').waitFor()
        assert.match(await page.locator('[data-testid="tutorial-offer"]').innerText(), /Project & Session Flow/)
        await page.getByRole('button', { name: 'Not now' }).click()
        await page.locator('[data-name="HeaderBreadcrumbs"] button').first().click()
        await page.locator('button[data-project-id="pet"]').click()
        await page.waitForTimeout(400)
        assert.equal(await page.locator('[data-testid="tutorial-offer"]').count(), 0, 'dismissed offers do not return')
      } finally {
        await page.close()
      }
    })

    await t.test('a direct session opening offers the session portion, then Project Home offers the project/files portion', async () => {
      const page = await context.newPage()
      page.on('pageerror', (e) => pageErrors.push(e.message))
      try {
        await page.goto(`${base}?beat=COMPLETE&tours=1`, { waitUntil: 'domcontentloaded' })
        await page.locator('[data-testid="header-session-menu"]').click()
        await page.locator('[data-session-id="add-comments"]').first().click()
        await page.locator('[data-testid="session-screen"]').waitFor()
        await page.locator('[data-testid="tutorial-offer"]').waitFor()
        await page.getByRole('button', { name: 'Start tour' }).click()
        await beat(page, 'B15')
        await line(page, 'Each Session has Session Agents working on it.')
        // Widgets during another tutorial: the gallery opens, the tutorial keeps going, no offer is used up.
        await page.locator('[data-name="HeaderWidgetsButton"]').click()
        await page.locator('[data-name="WidgetsGalleryModal"]').waitFor()
        await page.waitForTimeout(300)
        assert.equal(await page.locator('[data-testid="tutorial-offer"]').count(), 0)
        await page.keyboard.press('Escape')
        await beat(page, 'B15')
        await page.locator('[data-testid="exit-tutorial"]').click()
        await beat(page, 'COMPLETE')
        // Back in the user's own session, not the demo.
        assert.equal(await page.getByText('Tutorial demo').count(), 0)
        await page.locator('[data-testid="session-screen"]').waitFor()
        await page.locator('[data-name="HeaderWidgetsButton"]').click()
        await page.locator('[data-testid="tutorial-offer"]').waitFor()
        assert.match(await page.locator('[data-testid="tutorial-offer"]').innerText(), /Widgets & Whatnot/)
        await page.getByRole('button', { name: 'Not now' }).click()
        await page.keyboard.press('Escape')

        await page.locator('[data-name="HeaderBreadcrumbs"] button').first().click()
        await page.locator('button[data-project-id="pet"]').click()
        await page.locator('[data-testid="tutorial-offer"]').waitFor()
        assert.match(await page.locator('[data-testid="tutorial-offer"]').innerText(), /the project and its files/)
        await page.getByRole('button', { name: 'Start tour' }).click()
        await line(page, "Here you'll work in an i² Workspace.")
        await page.locator('[data-name="OnboardingStageScrim"]').waitFor()
        await page.locator('[data-testid="exit-tutorial"]').click()
        await beat(page, 'COMPLETE')
        await page.locator('[data-testid="project-home"][data-project-id="pet"]').waitFor()
      } finally {
        await page.close()
      }
    })

    await t.test('Project & Session Flow from Learn runs on demo data and returns to the user’s project', async () => {
      const page = await context.newPage()
      page.on('pageerror', (e) => pageErrors.push(e.message))
      try {
        await page.goto(`${base}?beat=COMPLETE`, { waitUntil: 'domcontentloaded' })
        await page.locator('button[data-project-id="pet"]').click()
        await page.locator('[data-testid="project-home"][data-project-id="pet"]').waitFor()
        await page.getByRole('button', { name: 'Learn', exact: true }).click()
        await page.locator('[data-testid="learn-tutorial-project-session"]').click()

        await line(page, "Here you'll work in an i² Workspace.")
        await page.locator('[data-name="WorkspaceVerticalTree"]').waitFor()
        await page.locator('[data-name="OnboardingStageScrim"]').waitFor()
        await cont(page)
        await line(page, 'The key to working with i² is the project folder.')
        await page.locator('[data-name="GreenProjectFolderOnly"]').waitFor()
        await cont(page)
        await line(page, "It's my job to keep these canonical files updated")
        await cont(page)
        await line(page, 'Behind the scenes, i² Core helps me coordinate')
        await cont(page)
        await line(page, "info.md holds the project's name")
        await cont(page)
        await line(page, 'todo.md is what we want to build')
        await cont(page)
        await line(page, 'style.md is the colors, typography')
        await cont(page)
        await line(page, 'guidelines.md tells me, you, your teammates')
        await cont(page)

        await line(page, 'This is Project Home.')
        await page.locator('[data-testid="project-home"][data-project-id="tutorial-demo"]').waitFor()
        await cont(page)
        await line(page, 'I can work with multiple projects at once.')
        await cont(page)
        await line(page, 'Your roadmap and Sessions live here.')
        await cont(page)
        await line(page, 'A Session is a focused piece of work')
        await cont(page)
        await line(page, "When a Session Agent has a question, I'll bring it to you here.")
        await page.locator('[data-testid="composer-send"]').click()
        await line(page, 'Or click the Session name and talk to the Session Agent directly.')
        await page.locator('[data-name="DemoSessionCard"]').first().click()

        await line(page, 'Each Session has Session Agents working on it.')
        await cont(page)
        await line(page, 'Me, the Session Agents, and any other agents you bring in')
        await cont(page)
        await line(page, 'Simulators are built in, too.')
        await cont(page)
        await line(page, 'Tasks come in two groups')
        const openTasks = page.locator('[data-human-task-id][data-done="false"]')
        await openTasks.first().waitFor()
        while (await openTasks.count()) await openTasks.first().click()
        await line(page, 'When the work and checks are ready, I open a pull request.')
        await cont(page)
        await line(page, "Here's the Session Completion Form.")
        await cont(page)
        await line(page, 'These forms boost your level while you work.')
        await cont(page)
        await line(page, "We're also exploring quantum machine learning")
        await page.locator('[data-name="SessionCompletionSubmit"]').click()
        await line(page, 'Submitted. Next I close the session')
        await cont(page)
        await line(page, 'The website lets even your non-technical teammates join in too')
        await cont(page)
        await line(page, "If your project didn't start in i², I'll onboard it for you. I'll offer a tutorial when you do something new here.")
        await cont(page)

        await beat(page, 'COMPLETE')
        await page.locator('[data-testid="project-home"][data-project-id="pet"]').waitFor()
        assert.equal(await page.getByText('Tutorial demo').count(), 0, 'demo project released')
        assert.match(await page.locator('[data-name="Level"]').innerText(), /1/)
      } finally {
        await page.close()
      }
    })

    const serious = pageErrors.filter((e) => !e.includes('favicon') && !/404/.test(e))
    assert.deepEqual(serious, [])
  } finally {
    await browser.close()
    await close(server)
  }
})
