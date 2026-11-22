// Meet Infie music step with real motion: the player is a bounded Music widget with
// its header, actions and song picker from the first frame of its move Home, and the
// one <audio> element keeps playing through the move, the song picker, and the rest
// of Meet Infie (including the staged Home reveals and the Global To-Do line).
import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const testDir = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(testDir, '..', '..')
const workspaceRoot = path.resolve(appRoot, '../../..')
const webDir = path.resolve(process.env.I2_BUILD_DIR || path.join(appRoot, 'dist-hosted', 'web'))

function createStaticServer(distDir) {
  const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webm': 'video/webm', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2', '.ttf': 'font/ttf' }
  return http.createServer((req, res) => {
    try {
      const url = new URL(req.url, 'http://127.0.0.1')
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

async function line(page, text) {
  await page.waitForFunction(
    (t) => [...document.querySelectorAll('[data-slot="infie-message"], [data-name="FloatingInfieCallout"]')].some((el) => el.textContent.includes(t)),
    text,
    { timeout: 20000 },
  )
}
async function cont(page) {
  await page.getByRole('button', { name: 'Continue', exact: true }).click({ timeout: 15000 })
}
/** Same <audio> element as when the test tagged it, playing, and past `since` seconds. */
async function audioState(page) {
  return page.evaluate(() => {
    const audio = document.querySelector('audio')
    return { same: audio === window.__i2Audio, count: document.querySelectorAll('audio').length, paused: audio.paused, time: audio.currentTime }
  })
}

test('browser: Music widget is framed with actions from the start of its Home move; audio is continuous', async (t) => {
  const chromePath = process.env.CHROME_PATH || path.join(process.env.ProgramFiles || 'C:/Program Files', 'Google/Chrome/Application/chrome.exe')
  const pwPath = path.join(workspaceRoot, 'temp', 'exact-upstream', 'node_modules', 'playwright-core')
  assert.ok(fs.existsSync(chromePath), `Chrome missing at ${chromePath}`)
  assert.ok(fs.existsSync(pwPath), `playwright-core missing at ${pwPath}`)
  assert.ok(fs.existsSync(path.join(webDir, 'index.html')), `Build missing at ${webDir}`)

  const { chromium } = await import(pathToFileURL(path.join(pwPath, 'index.mjs')).href)
  const server = createStaticServer(webDir)
  const port = await listen(server)
  const browser = await chromium.launch({ executablePath: chromePath, headless: true, args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'] })
  const pageErrors = []
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' })
    const page = await context.newPage()
    page.on('pageerror', (e) => pageErrors.push(e.message))
    await page.goto(`http://127.0.0.1:${port}/iSquared/?onboarding=1`, { waitUntil: 'domcontentloaded' })
    await page.getByRole('dialog', { name: 'Napoleon Hill opening quotation' }).waitFor({ state: 'visible', timeout: 10000 })
    await page.keyboard.press('Escape')

    await line(page, "Hi there. I'm Infie. What should I call you?")
    await page.locator('#onboarding-name').fill('Ada')
    await page.locator('#onboarding-email').fill('ada@e.mail')
    await page.getByRole('button', { name: 'Submit', exact: true }).click()
    await line(page, "Nice to meet you, Ada. I can see you're level zero.")
    await cont(page)
    await line(page, 'What a noob.')
    await cont(page)
    await line(page, 'Tell me a little about what you like to build and why.')
    await page.locator('#onboarding-project-interest').fill('Tiny games')
    await page.getByRole('button', { name: 'Send', exact: true }).click()
    await line(page, "I don't do much coding myself.")
    await cont(page)

    await line(page, "Btw… it's kinda quiet. Do you like music?")
    const widget = page.locator('[data-name="LeekBeatsWidget"]')
    await widget.waitFor()
    assert.equal(await widget.getAttribute('data-framed'), 'false', 'the Play spotlight is unframed')
    assert.equal(await page.getByRole('button', { name: 'Song picker' }).count(), 0, 'no actions on the Play spotlight')

    // Sample every animation frame from Play until the player settles Home.
    await page.evaluate(() => {
      window.__i2Audio = document.querySelector('audio')
      window.__i2Samples = []
      const tick = () => {
        const el = document.querySelector('[data-name="LeekBeatsWidget"]')
        if (el) {
          const header = el.querySelector('[data-name="LeekBeatsFrame"] [data-widget-header]')
          window.__i2Samples.push({
            docked: el.getAttribute('data-docked'),
            framed: el.getAttribute('data-framed'),
            homeFrame: el.getAttribute('data-home-frame'),
            header: Boolean(header && header.textContent.includes('Music')),
            picker: Boolean(el.querySelector('button[aria-label="Song picker"]')),
            expand: Boolean(el.querySelector('button[aria-label="Expand Music"]')),
            fullscreen: Boolean(el.querySelector('button[aria-label="Fullscreen"]')),
            transport: Boolean(el.querySelector('button[aria-label^="Pause "], button[aria-label^="Play "]')),
            left: parseFloat(el.style.left),
            bottom: parseFloat(el.style.bottom),
          })
        }
        if (!window.__i2StopSampling) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    })
    await widget.locator('button[aria-label^="Play "]').click()
    await line(page, "Oh yea, that's my jam.")
    await page.waitForFunction(() => {
      const s = window.__i2Samples
      const last = s[s.length - 1]
      return last && last.docked === 'true' && Math.abs(last.left - 24) < 0.5 && Math.abs(last.bottom - 24) < 0.5
    }, null, { timeout: 15000 })

    const samples = await page.evaluate(() => { window.__i2StopSampling = true; return window.__i2Samples })
    const firstDocked = samples.findIndex((s) => s.docked === 'true')
    assert.ok(firstDocked > 0, 'the player was sampled before and during its move')
    const startLeft = samples[firstDocked - 1].left
    assert.ok(Math.abs(startLeft - 24) > 40, `the move starts away from Home (left ${startLeft})`)
    const moving = samples.slice(firstDocked)
    assert.ok(moving.some((s) => s.left > 25 && s.left < startLeft - 1), 'captured mid-move frames')
    for (const [i, s] of moving.entries()) {
      const at = `frame ${firstDocked + i} (left ${s.left}, bottom ${s.bottom})`
      assert.equal(s.framed, 'true', `bounded frame during the move: ${at}`)
      assert.equal(s.homeFrame, 'framed', `Home frame during the move: ${at}`)
      assert.ok(s.header, `Music header during the move: ${at}`)
      assert.ok(s.picker && s.expand && s.fullscreen, `song picker, expand and fullscreen during the move: ${at}`)
      assert.ok(s.transport, `transport during the move: ${at}`)
    }
    for (const s of samples.slice(0, firstDocked)) {
      assert.equal(s.picker, false, 'no Home actions before the move starts')
    }

    let audio = await audioState(page)
    assert.deepEqual([audio.same, audio.count, audio.paused], [true, 1, false], 'one audio element, still playing after the move')
    let lastTime = audio.time

    // Song picker opens as a dialog and closes back to the same playing audio.
    await page.getByRole('button', { name: 'Song picker' }).click()
    const picker = page.getByRole('dialog', { name: 'Song picker' })
    await picker.waitFor()
    assert.ok(await picker.locator('[data-name="LeekBeatsLibrary"] [data-track]').count() > 0, 'tracks listed')
    assert.equal(await widget.getAttribute('data-framed'), 'true', 'frame stays while the picker is open')
    await page.keyboard.press('Escape')
    await picker.waitFor({ state: 'detached' })
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), 'Song picker', 'focus returns to the picker button')
    await page.waitForTimeout(400)
    audio = await audioState(page)
    assert.deepEqual([audio.same, audio.count, audio.paused], [true, 1, false], 'audio unchanged by the song picker')
    assert.ok(audio.time > lastTime, `playback advanced (${lastTime} → ${audio.time})`)
    lastTime = audio.time
    await cont(page)

    // The rest of Meet Infie still stages every UI introduction, with the same audio playing.
    await line(page, "I'm all ears if you want to speak conversationally.")
    await page.getByRole('button', { name: 'Not now', exact: true }).click()
    await line(page, 'Since navigating the UI and executing common actions are mapped to a controller')
    await cont(page)
    await line(page, "I'm your orchestrator, coordinator, question-answerer, and maybe friend.")
    await cont(page)
    await line(page, 'I help manage your tasks and projects, even after weeks away.')
    await cont(page)
    await line(page, 'You can ask me for help with any part of the IDE just by holding the hotkeys')
    await cont(page)
    await line(page, "Here's how navigation works: i² takes you Home")
    await page.locator('[data-name="HeaderBreadcrumbs"]').waitFor()
    await cont(page)
    await line(page, 'I am run by an open-weight LLM plus a decision model')
    await cont(page)
    await line(page, 'You can use any combination of models for your Session Agents')
    await page.locator('[data-provider-id="claude"]').click()
    await page.locator('[data-name="SimulatedModelSignInModal"] button', { hasText: 'Connect' }).click()
    await line(page, 'Checking your developer environment...')
    await cont(page)
    await line(page, 'Click Learn for tutorials and lessons, and Widgets to customize your workspace.')
    await page.locator('[data-name="HeaderTutorialsWidgetsGames"]').waitFor()
    await cont(page)
    await line(page, "Your alerts, notifications and settings live here. I'll also help you manage the Global To-Do list.")
    await page.locator('[data-name="HeaderNotificationsSettings"]').waitFor()
    await cont(page)
    await line(page, 'This is i² Home. The Workspace and Emulators controls switch between your work and your previews.')
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
    await cont(page)
    await line(page, "I'll present Action Buttons specific to the next steps of your projects")
    await cont(page)
    await line(page, "Learn has the other tutorials whenever you're ready.")
    await cont(page)
    await line(page, "Speaking of… there's your first level.")
    await cont(page)
    await page.waitForSelector('[data-beat="COMPLETE"]', { timeout: 15000 })

    assert.equal(await widget.getAttribute('data-framed'), 'true', 'still framed on Home after Meet Infie')
    assert.equal(await page.getByRole('button', { name: 'Song picker' }).count(), 1)
    audio = await audioState(page)
    assert.deepEqual([audio.same, audio.count], [true, 1], 'the same audio element for the whole tutorial')
    assert.ok(audio.time > lastTime || audio.paused === false, 'playback continued through Meet Infie')
    assert.deepEqual(pageErrors, [])
  } finally {
    await browser.close()
    await close(server)
  }
})

/** Current Infie message texts (center stage, docked chat, or callout). */
async function shownLines(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('[data-slot="infie-message"], [data-name="FloatingInfieCallout"]')].map((el) => el.textContent),
  )
}
/** Learn → Meet Infie, then through B02–B04 to the B05 music gate. */
async function replayToMusicGate(page) {
  await page.getByRole('button', { name: 'Learn', exact: true }).click()
  await page.locator('[data-testid="learn-tutorial-meet-infie"]').click()
  await line(page, "Hi there. I'm Infie. What should I call you?")
  await page.locator('#onboarding-name').fill('Grace')
  await page.locator('#onboarding-email').fill('grace@e.mail')
  await page.getByRole('button', { name: 'Submit', exact: true }).click()
  await line(page, "Nice to meet you, Grace. I can see you're level zero.")
  await cont(page)
  await line(page, 'What a noob.')
  await cont(page)
  await line(page, 'Tell me a little about what you like to build and why.')
  await page.locator('#onboarding-project-interest').fill('Tiny games')
  await page.getByRole('button', { name: 'Send', exact: true }).click()
  await line(page, "I don't do much coding myself.")
  await cont(page)
  await page.waitForSelector('[data-beat="B05"]', { timeout: 15000 })
}
async function exitReplay(page) {
  await page.locator('[data-testid="exit-tutorial"]').click()
  await page.waitForSelector('[data-beat="COMPLETE"]', { timeout: 15000 })
}

const PLAYING_LINE = "Btw… you've already got music going. Nice. Continue when you're ready, or hit Pause if you'd rather keep it quiet."
const QUIET_PROMPT = "Btw… it's kinda quiet. Do you like music? Hit Play, or Continue and we'll keep it quiet."
const JAM_LINE = "Oh yea, that's my jam."
const QUIET_LINE = 'Your music player will be right here when you want it'

test('browser: Meet Infie replay B05 follows the real audio — playing, paused mid-gate, and paused from the start', async (t) => {
  const chromePath = process.env.CHROME_PATH || path.join(process.env.ProgramFiles || 'C:/Program Files', 'Google/Chrome/Application/chrome.exe')
  const pwPath = path.join(workspaceRoot, 'temp', 'exact-upstream', 'node_modules', 'playwright-core')
  assert.ok(fs.existsSync(chromePath), `Chrome missing at ${chromePath}`)
  assert.ok(fs.existsSync(pwPath), `playwright-core missing at ${pwPath}`)
  assert.ok(fs.existsSync(path.join(webDir, 'index.html')), `Build missing at ${webDir}`)

  const { chromium } = await import(pathToFileURL(path.join(pwPath, 'index.mjs')).href)
  const server = createStaticServer(webDir)
  const port = await listen(server)
  const browser = await chromium.launch({ executablePath: chromePath, headless: true, args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'] })
  const pageErrors = []
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
    const page = await context.newPage()
    page.on('pageerror', (e) => pageErrors.push(e.message))
    await page.goto(`http://127.0.0.1:${port}/iSquared/?beat=COMPLETE`, { waitUntil: 'domcontentloaded' })
    const widget = page.locator('[data-name="LeekBeatsWidget"]')
    await widget.locator('button[aria-label^="Play "]').click()
    await page.waitForFunction(() => !document.querySelector('audio').paused)
    await page.evaluate(() => { window.__i2Audio = document.querySelector('audio') })

    await t.test('music playing: Infie acknowledges it, Continue is "my jam", playback is untouched', async () => {
      await replayToMusicGate(page)
      await line(page, PLAYING_LINE)
      assert.equal((await shownLines(page)).some((l) => l.includes('kinda quiet')), false, 'no "hit Play" prompt while music plays')
      assert.equal(await widget.locator('button[aria-label^="Pause "]').count(), 1, 'the control really is Pause')
      let audio = await audioState(page)
      assert.deepEqual([audio.same, audio.count, audio.paused], [true, 1, false], 'replay keeps the user\'s playback')
      const before = audio.time
      await cont(page)
      await line(page, JAM_LINE)
      assert.equal((await shownLines(page)).some((l) => l.includes(QUIET_LINE)), false, 'Continue does not claim quiet')
      await page.waitForTimeout(400)
      audio = await audioState(page)
      assert.deepEqual([audio.same, audio.paused], [true, false], 'still playing after the gate')
      assert.ok(audio.time > before, `playback advanced (${before} → ${audio.time})`)
      await exitReplay(page)
      assert.equal((await audioState(page)).paused, false, 'still playing after leaving the replay')
    })

    await t.test('Pause during the gate does not advance; the prompt adapts and Continue keeps it quiet', async () => {
      await replayToMusicGate(page)
      await line(page, PLAYING_LINE)
      await widget.locator('button[aria-label^="Pause "]').click()
      await page.waitForFunction(() => document.querySelector('audio').paused)
      await line(page, QUIET_PROMPT)
      await page.waitForTimeout(600)
      const shown = await shownLines(page)
      assert.equal(shown.some((l) => l.includes(JAM_LINE) || l.includes(QUIET_LINE)), false, 'pausing alone does not resolve the gate')
      assert.equal(await page.locator('[data-beat="B05"]').count(), 1)
      await cont(page)
      await line(page, QUIET_LINE)
      await page.waitForTimeout(300)
      const audio = await audioState(page)
      assert.deepEqual([audio.same, audio.paused], [true, true], 'the user\'s pause is kept')
      await exitReplay(page)
      assert.equal((await audioState(page)).paused, true, 'still paused after leaving the replay')
    })

    await t.test('music paused from the start: the usual prompt, and Play resolves it as "my jam"', async () => {
      await replayToMusicGate(page)
      await line(page, QUIET_PROMPT)
      assert.equal(await widget.locator('button[aria-label^="Play "]').count(), 1)
      await widget.locator('button[aria-label^="Play "]').click()
      await line(page, JAM_LINE)
      const audio = await audioState(page)
      assert.deepEqual([audio.same, audio.count, audio.paused], [true, 1, false], 'same audio element, now playing')
      await exitReplay(page)
    })

    assert.deepEqual(pageErrors, [])
  } finally {
    await browser.close()
    await close(server)
  }
})
