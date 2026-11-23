import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const testDir = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(testDir, '..', '..')
const workspaceRoot = path.resolve(appRoot, '../../..')
const onboardingDir = path.join(appRoot, 'src', 'app', 'onboarding')
const videoAssetPath = path.join(appRoot, 'public', 'assets', 'infie-controls-chain-alpha.webm')
const screenshotDir = process.env.ARGON_SCREENSHOT_DIR || ''

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
}

function createRangeStaticServer(distDir) {
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
        const stat = fs.statSync(filePath)
        const contentType = MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream'
        const range = req.headers.range
        if (range) {
          const m = /bytes=(\d+)-(\d*)/.exec(range)
          const start = m ? Number(m[1]) : 0
          const end = m && m[2] ? Number(m[2]) : stat.size - 1
          res.writeHead(206, {
            'Content-Type': contentType,
            'Content-Range': `bytes ${start}-${end}/${stat.size}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': String(end - start + 1),
          })
          fs.createReadStream(filePath, { start, end }).pipe(res)
        } else {
          res.writeHead(200, {
            'Content-Type': contentType,
            'Accept-Ranges': 'bytes',
            'Content-Length': String(stat.size),
          })
          fs.createReadStream(filePath).pipe(res)
        }
      } else {
        res.writeHead(200, { 'Content-Type': 'text/html' })
        fs.createReadStream(path.join(distDir, 'index.html')).pipe(res)
      }
    } catch (err) {
      res.writeHead(500)
      res.end(String(err))
    }
  })
}

const listen = (server) =>
  new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server.address().port)))
const close = (server) => new Promise((resolve) => server.close(resolve))

test('B06 controls chain cue timings are scaled 10% shorter (0s, 5.4s, 9.9s) while preserving message timing and fallback dwell', async () => {
  const stageSrc = fs.readFileSync(path.join(onboardingDir, 'OnboardingStage.tsx'), 'utf8')
  const timingSrc = fs.readFileSync(path.join(onboardingDir, 'onboardingTiming.ts'), 'utf8')

  assert.match(stageSrc, /export const B06_CONTROLS_CHAIN_CUES:\s*ReadonlyArray<\{\s*t:\s*number;\s*turn:\s*1\s*\|\s*2\s*\|\s*3\s*\}>\s*=\s*\[\s*\{\s*t:\s*0,\s*turn:\s*1\s*\},\s*\{\s*t:\s*5\.4,\s*turn:\s*2\s*\},\s*\{\s*t:\s*9\.9,\s*turn:\s*3\s*\},?\s*\]/)
  assert.match(timingSrc, /export const B06_STILL_MIN_DWELL_MS = 2600;/)
  assert.match(timingSrc, /export const B06_RECENTER_MS = 550;/)

  // Extract and evaluate B06_CONTROLS_CHAIN_CUES and b06TurnForMediaTime via esbuild
  const esbuild = await import('esbuild')
  const cueBlockMatch = stageSrc.match(
    /export const B06_CONTROLS_CHAIN_CUES[\s\S]*?export function b06TurnForMediaTime[\s\S]*?\n\}/
  )
  assert.ok(cueBlockMatch, 'B06_CONTROLS_CHAIN_CUES and b06TurnForMediaTime must be exported in OnboardingStage.tsx')

  const built = await esbuild.build({
    stdin: {
      contents: cueBlockMatch[0],
      resolveDir: onboardingDir,
      loader: 'ts',
    },
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'neutral',
  })
  const mod = await import(
    `data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text).toString('base64')}`
  )

  assert.deepEqual(mod.B06_CONTROLS_CHAIN_CUES, [
    { t: 0, turn: 1 },
    { t: 5.4, turn: 2 },
    { t: 9.9, turn: 3 },
  ])
  assert.equal(mod.b06TurnForMediaTime(0), 1)
  assert.equal(mod.b06TurnForMediaTime(0.9), 1)
  assert.equal(mod.b06TurnForMediaTime(5.39), 1)
  assert.equal(mod.b06TurnForMediaTime(5.4), 2)
  assert.equal(mod.b06TurnForMediaTime(8.1), 2)
  assert.equal(mod.b06TurnForMediaTime(9.89), 2)
  assert.equal(mod.b06TurnForMediaTime(9.9), 3)
  assert.equal(mod.b06TurnForMediaTime(12.6), 3)
  assert.equal(mod.b06TurnForMediaTime(14.4), 3)
})

test('ffprobe: infie-controls-chain-alpha.webm is 14.4s (100/3 fps, 480 frames, exact 30ms frame step, VP9 + alpha)', () => {
  assert.ok(fs.existsSync(videoAssetPath), 'public/assets/infie-controls-chain-alpha.webm exists')

  const probeJson = execFileSync(
    'ffprobe',
    ['-v', 'error', '-show_format', '-show_streams', '-show_packets', '-of', 'json', videoAssetPath],
    { maxBuffer: 50 * 1024 * 1024 }
  )
  const probe = JSON.parse(probeJson)
  assert.equal(probe.streams.length, 1)
  const stream = probe.streams[0]
  assert.equal(stream.codec_name, 'vp9')
  assert.equal(stream.width, 1080)
  assert.equal(stream.height, 1080)
  assert.equal(stream.r_frame_rate, '100/3')
  assert.equal(stream.avg_frame_rate, '100/3')
  assert.equal(stream.tags?.ALPHA_MODE ?? stream.tags?.alpha_mode, '1')
  assert.equal(Number(probe.format.duration), 14.4)

  const packets = probe.packets
  assert.equal(packets.length, 480, 'all 480 frames preserved')
  for (let i = 0; i < packets.length; i++) {
    assert.equal(packets[i].pts, i * 30, `frame ${i} PTS must be exact ${i * 30}ms (10% shorter than 30fps)`)
    assert.equal(packets[i].duration, 30, `frame ${i} duration must be 30ms`)
    assert.ok(
      Array.isArray(packets[i].side_data_list) && packets[i].side_data_list.length > 0,
      `frame ${i} must retain WebM BlockAdditional VP9 alpha side_data`
    )
  }

  // Stage boundary frames match exact 10%-shorter timestamps
  assert.equal(packets[0].pts, 0)     // Mist start: 0.0s -> 0.0s
  assert.equal(packets[30].pts, 900)  // Keyboard+mouse morph start: 1.0s -> 0.9s
  assert.equal(packets[120].pts, 3600) // Keyboard+mouse hold start: 4.0s -> 3.6s
  assert.equal(packets[180].pts, 5400) // Turn 2 cue (Gamepad morph start): 6.0s -> 5.4s
  assert.equal(packets[270].pts, 8100) // Gamepad hold start: 9.0s -> 8.1s
  assert.equal(packets[330].pts, 9900) // Turn 3 cue (Joystick+keypad morph start): 11.0s -> 9.9s
  assert.equal(packets[420].pts, 12600) // Joystick+keypad hold start: 14.0s -> 12.6s
  assert.equal(packets[479].pts, 14370) // Final frame: 15.967s -> 14.370s (ends at 14.400s)

  const candidatePath = path.join(workspaceRoot, 'generated', 'test-exact.webm')
  if (fs.existsSync(candidatePath)) {
    const assetSha = crypto.createHash('sha256').update(fs.readFileSync(videoAssetPath)).digest('hex')
    const candSha = crypto.createHash('sha256').update(fs.readFileSync(candidatePath)).digest('hex')
    assert.equal(assetSha, candSha, 'placed asset matches generated/test-exact.webm SHA-256')
  }
})

test('browser: B06 controls animation plays 14.4s VP9-alpha chain with cues at 0s/5.4s/9.9s and preserves reduced-motion fallback', async (t) => {
  const chromePath =
    process.env.CHROME_PATH ||
    path.join(process.env.ProgramFiles || 'C:/Program Files', 'Google/Chrome/Application/chrome.exe')
  const pwDir = path.join(workspaceRoot, 'temp', 'exact-upstream', 'node_modules', 'playwright-core')
  const buildDir = process.env.I2_BUILD_DIR || path.join(appRoot, 'dist-hosted', 'web')

  if (!fs.existsSync(chromePath) || !fs.existsSync(pwDir) || !fs.existsSync(path.join(buildDir, 'index.html'))) {
    t.skip('Chrome, playwright-core, or built web bundle not available')
    return
  }

  const { chromium } = await import(pathToFileURL(path.join(pwDir, 'index.mjs')).href)
  const server = createRangeStaticServer(buildDir)
  const port = await listen(server)
  const baseUrl = `http://127.0.0.1:${port}/iSquared/`
  const browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'],
  })
  const pageErrors = []

  try {
    // A paused video looks stalled to the 4s watchdog, so boundary checks pause only
    // for the snapshot and then play very slowly inside the cue window.
    const seek = async (page, seconds, { play = false, rate = 1 } = {}) => {
      await page.evaluate(async ({ seconds, play, rate }) => {
        const v = document.querySelector('[data-name="ControlsTransformationVideo"]')
        if (!v) throw new Error('Video element missing')
        v.pause()
        const done = new Promise((resolve) => v.addEventListener('seeked', resolve, { once: true }))
        v.currentTime = seconds
        await Promise.race([
          done,
          new Promise((_, reject) => setTimeout(() => reject(new Error(`seek ${seconds} timeout`)), 4000)),
        ])
        v.playbackRate = rate
        if (play) await v.play()
      }, { seconds, play, rate })
    }

    await t.test('normal motion: B06 video mounts with true alpha, advances turns at 5.4s and 9.9s, and offers Continue on the joystick caption after 14.4s', async () => {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
      const page = await context.newPage()
      page.on('pageerror', (e) => pageErrors.push(e.message))
      try {
        await page.goto(`${baseUrl}?beat=B06`, { waitUntil: 'domcontentloaded', timeout: 10000 })
        await page.getByRole('button', { name: 'Not now', exact: true }).click({ timeout: 10000 })

        const video = page.locator('[data-name="ControlsTransformationVideo"]')
        await video.waitFor({ state: 'visible', timeout: 8000 })
        assert.equal(await video.getAttribute('data-video-phase'), 'playing')

        // Wait for Turn 1 text and video readiness using bounded check (never hangs if already loaded)
        const turn1Meta = await page.evaluate(async () => {
          const v = document.querySelector('[data-name="ControlsTransformationVideo"]')
          if (!v) throw new Error('Video element missing')
          // Stay inside the keyboard cue while the caption reveals and its dwell runs.
          v.playbackRate = 0.5
          if (v.readyState < 2) {
            await Promise.race([
              new Promise((res, rej) => {
                v.addEventListener('loadeddata', res, { once: true })
                v.addEventListener('error', () => rej(new Error('video error')), { once: true })
              }),
              new Promise((_, rej) => setTimeout(() => rej(new Error('loadeddata timeout')), 5000)),
            ])
          }
          const c = document.createElement('canvas')
          c.width = 270
          c.height = 270
          const ctx = c.getContext('2d')
          ctx.drawImage(v, 0, 0, 270, 270)
          const corner = Array.from(ctx.getImageData(4, 4, 1, 1).data)
          return {
            duration: Number(v.duration.toFixed(2)),
            width: v.videoWidth,
            height: v.videoHeight,
            cornerAlpha: corner[3],
          }
        })
        assert.equal(turn1Meta.duration, 14.4)
        assert.equal(turn1Meta.width, 1080)
        assert.equal(turn1Meta.height, 1080)
        assert.equal(turn1Meta.cornerAlpha, 0, 'VP9 alpha transparency preserved in live B06 video')

        await page.waitForFunction(
          () =>
            [...document.querySelectorAll('[data-slot="infie-message"]')].some((el) =>
              el.textContent.includes('Of course you can use the keyboard and mouse.')
            ),
          null,
          { timeout: 6000 }
        )
        if (screenshotDir) {
          fs.mkdirSync(screenshotDir, { recursive: true })
          await page.screenshot({ path: path.join(screenshotDir, 'b06-live-turn1-keyboard.png') })
        }

        // Pause and seek to 5.35s (still Turn 1, just before 5.4s cue)
        await seek(page, 5.35)
        await page.waitForTimeout(80)
        const preCue2Messages = await page.locator('[data-slot="infie-message"], [data-slot="infie-message-history"]').allInnerTexts()
        assert.equal(
          preCue2Messages.some((m) => m.includes("Or pick up a gamepad if that's more your groove.")),
          false,
          'Turn 2 must not trigger before 5.4s'
        )

        // Seek to 5.4s -> triggers Turn 2 (gamepad) once the keyboard caption's dwell is done.
        await seek(page, 5.4, { play: true, rate: 0.5 })
        await page.waitForFunction(
          () =>
            [...document.querySelectorAll('[data-slot="infie-message"]')].some((el) =>
              el.textContent.includes("Or pick up a gamepad if that's more your groove.")
            ),
          null,
          { timeout: 8000 }
        )
        if (screenshotDir) {
          await page.screenshot({ path: path.join(screenshotDir, 'b06-live-turn2-gamepad.png') })
        }

        // Seek to 9.85s while paused (still Turn 2, just before 9.9s cue)
        await seek(page, 9.85)
        await page.waitForTimeout(80)
        const preCue3Messages = await page.locator('[data-slot="infie-message"], [data-slot="infie-message-history"]').allInnerTexts()
        assert.equal(
          preCue3Messages.some((m) => m.includes('Prefer a joystick and programmable keypad?')),
          false,
          'Turn 3 must not trigger before 9.9s'
        )

        // Seek to 9.9s -> triggers Turn 3 (joystick + keypad) once the gamepad dwell is done.
        await seek(page, 9.9, { play: true, rate: 0.5 })
        await page.waitForFunction(
          () =>
            [...document.querySelectorAll('[data-slot="infie-message"]')].some((el) =>
              el.textContent.includes('Prefer a joystick and programmable keypad? You can do that too.')
            ),
          null,
          { timeout: 6000 }
        )
        // Wait for Turn 3 text reveal to complete before seeking near end
        await page.locator('[data-slot="infie-message"] [data-text-reveal="complete"]').waitFor({ timeout: 6000 })
        if (screenshotDir) {
          await page.screenshot({ path: path.join(screenshotDir, 'b06-live-turn3-joystick.png') })
        }

        // Before video ends, Turn 4 must not have started and no Continue button appears on Turn 3.
        assert.equal(await page.locator('[data-name="ControlsAllThreeIllustrations"]').count(), 0)
        assert.equal(await page.getByRole('button', { name: 'Continue', exact: true }).count(), 0)

        // The ended event advances Turn 3 automatically into Turn 4 (no Continue on joystick caption).
        await seek(page, 14.1, { play: true, rate: 1 })
        await page.locator('[data-name="ControlsAllThreeIllustrations"]').waitFor({ state: 'visible', timeout: 8000 })
        await page.waitForFunction(
          () =>
            [...document.querySelectorAll('[data-slot="infie-message"]')].some((el) =>
              el.textContent.includes('Since navigating the UI and executing common actions are mapped to a controller')
            ),
          null,
          { timeout: 6000 }
        )
        await page.getByRole('button', { name: 'Continue', exact: true }).waitFor({ timeout: 6000 })
        if (screenshotDir) {
          await page.screenshot({ path: path.join(screenshotDir, 'b06-live-turn4-all-three.png') })
        }
      } finally {
        await context.close()
      }
    })

    await t.test('reduced motion: B06 skips video and steps through still PNG illustrations with reading dwell', async () => {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        reducedMotion: 'reduce',
      })
      const page = await context.newPage()
      page.on('pageerror', (e) => pageErrors.push(e.message))
      try {
        await page.goto(`${baseUrl}?beat=B06`, { waitUntil: 'domcontentloaded', timeout: 10000 })
        await page.getByRole('button', { name: 'Not now', exact: true }).click({ timeout: 10000 })

        assert.equal(await page.locator('[data-name="ControlsTransformationVideo"]').count(), 0)
        await page.locator('[data-name="ControlsDeviceIllustration"][data-device="keyboard-mouse"]').waitFor({ timeout: 4000 })
        await page.locator('[data-name="ControlsDeviceIllustration"][data-device="gamepad"]').waitFor({ timeout: 10000 })
        await page.locator('[data-name="ControlsDeviceIllustration"][data-device="joystick-numpad"]').waitFor({ timeout: 10000 })
        assert.equal(await page.locator('[data-name="ControlsAllThreeIllustrations"]').count(), 0)
        assert.equal(await page.getByRole('button', { name: 'Continue', exact: true }).count(), 0)
        await page.locator('[data-name="ControlsAllThreeIllustrations"]').waitFor({ timeout: 10000 })
        await page.getByRole('button', { name: 'Continue', exact: true }).waitFor({ timeout: 6000 })
      } finally {
        await context.close()
      }
    })

    const serious = pageErrors.filter((e) => !e.includes('favicon') && !/404/.test(e))
    assert.deepEqual(serious, [])
  } finally {
    await browser.close()
    await close(server)
  }
})
