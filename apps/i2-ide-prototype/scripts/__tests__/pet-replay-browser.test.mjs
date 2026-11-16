import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { verifyHostedOutput } from '../lib/verify-hosted-output.mjs'

const testDir = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(testDir, '..', '..')
const workspaceRoot = path.resolve(appRoot, '../../..')
const archivePath = path.join(appRoot, 'dist-hosted', 'isquared-web.tgz')

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.wasm': 'application/wasm',
  '.ttf': 'font/ttf',
}

function resolveBrowserDeps() {
  const chromePath =
    process.env.CHROME_PATH ||
    path.join(process.env.ProgramFiles || 'C:/Program Files', 'Google/Chrome/Application/chrome.exe')
  const pwPath = path.join(workspaceRoot, 'temp', 'exact-upstream', 'node_modules', 'playwright-core')
  assert.ok(fs.existsSync(chromePath), `Chrome missing at ${chromePath}`)
  assert.ok(fs.existsSync(pwPath), `playwright-core missing at ${pwPath}`)
  return { chromePath, pwPath }
}

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex')
}

/**
 * Mirrors hosted subpath behavior under /iSquared/:
 * - exact file hits (no automatic directory index rewrite)
 * - root fallback to web/index.html for unknown /iSquared/* paths
 */
function createHostedExactOrFallbackServer(webDir, basePath = '/iSquared/') {
  return http.createServer((req, res) => {
    try {
      const url = new URL(req.url, 'http://127.0.0.1')
      const pathname = url.pathname
      if (!pathname.startsWith(basePath)) {
        res.writeHead(404)
        return res.end('Not found')
      }
      const rel = decodeURIComponent(pathname.slice(basePath.length))
      const candidate = rel ? path.resolve(webDir, rel) : path.join(webDir, 'index.html')
      const resolved = candidate.startsWith(path.resolve(webDir)) && fs.existsSync(candidate) && fs.statSync(candidate).isFile()
        ? candidate
        : path.join(webDir, 'index.html')
      const ext = path.extname(resolved).toLowerCase()
      res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' })
      fs.createReadStream(resolved).pipe(res)
    } catch (err) {
      res.writeHead(500)
      res.end(String(err))
    }
  })
}

async function listen(server) {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const addr = server.address()
  return typeof addr === 'object' && addr ? addr.port : 0
}

test('hosted archive extraction, SHA256SUMS, nested preview routes, and full 30s unguided Pet replay through wrap-up, merge, blank report, and project actions', async () => {
  assert.ok(fs.existsSync(archivePath), `Hosted archive missing at ${archivePath}; run build-hosted.mjs --archive first`)
  const { chromePath, pwPath } = resolveBrowserDeps()
  const { chromium } = await import(pathToFileURL(path.join(pwPath, 'index.mjs')).href)

  const extractDir = fs.mkdtempSync(path.join(os.tmpdir(), 'i2-hosted-extract-'))
  let server
  let browser
  try {
    execFileSync('tar', ['-xzf', '-'], {
      cwd: extractDir,
      input: fs.readFileSync(archivePath),
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    const extractedWeb = path.join(extractDir, 'web')
    assert.ok(fs.existsSync(path.join(extractedWeb, 'index.html')))
    assert.ok(fs.existsSync(path.join(extractedWeb, 'preview', 'pet-show-and-tell', 'v1', 'index.html')))
    assert.ok(fs.existsSync(path.join(extractedWeb, 'preview', 'pet-show-and-tell', 'v2', 'index.html')))
    assert.ok(fs.existsSync(path.join(extractDir, 'manifest.json')))
    assert.ok(fs.existsSync(path.join(extractDir, 'provenance.json')))
    assert.ok(fs.existsSync(path.join(extractDir, 'SHA256SUMS')))
    assert.ok(fs.existsSync(path.join(extractDir, 'manifests', 'pet-v1-manifest.json')))
    assert.ok(fs.existsSync(path.join(extractDir, 'manifests', 'pet-v2-manifest.json')))

    // Verify every entry in SHA256SUMS matches extracted bytes on disk
    const sumsRaw = fs.readFileSync(path.join(extractDir, 'SHA256SUMS'), 'utf8').trim().split(/\r?\n/)
    assert.ok(sumsRaw.length >= 10, 'SHA256SUMS should list web and metadata files')
    for (const line of sumsRaw) {
      const m = line.match(/^([0-9a-f]{64})  (.+)$/)
      assert.ok(m, `Invalid SHA256SUMS line: ${line}`)
      const targetFile = path.join(extractDir, m[2])
      assert.ok(fs.existsSync(targetFile), `Missing file from SHA256SUMS: ${m[2]}`)
      assert.equal(sha256File(targetFile), m[1], `SHA-256 mismatch for ${m[2]}`)
    }

    // Verify extracted web tree passes verifyHostedOutput with both Pet previews required
    const check = verifyHostedOutput({ dir: extractedWeb, basePath: '/iSquared/', requirePetPreviews: true })
    assert.equal(check.errors.length, 0, check.errors.join('\n'))

    server = createHostedExactOrFallbackServer(extractedWeb, '/iSquared/')
    const port = await listen(server)
    const origin = `http://127.0.0.1:${port}`

    browser = await chromium.launch({ executablePath: chromePath, headless: true })
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const page = await context.newPage()
    const pageErrors = []
    page.on('pageerror', (e) => pageErrors.push(e.message))

    // 1. Direct route smoke on /v1/index.html and /v2/index.html (verifying pre-router shim prevents Expo +not-found)
    for (const ver of ['v1', 'v2']) {
      await page.goto(`${origin}/iSquared/preview/pet-show-and-tell/${ver}/index.html`, { waitUntil: 'networkidle' })
      await page.waitForFunction(() => /A LITTLE JOY, EVERY DAY/i.test(document.body.innerText), { timeout: 15000 })
      const text = await page.evaluate(() => document.body.innerText)
      assert.equal(/This screen doesn't exist/i.test(text), false, `${ver} must not render Expo +not-found`)
      const currentPathname = await page.evaluate(() => window.location.pathname)
      assert.equal(currentPathname, `/iSquared/preview/pet-show-and-tell/${ver}/`)
    }

    // 2. Unguided i2 Home -> single global session Add Comments (PLAN REVIEW), Not Hotdog has 0 sessions, 1 Global To-Do
    await page.goto(`${origin}/iSquared/?beat=COMPLETE`, { waitUntil: 'domcontentloaded' })
    await page.locator('[data-testid="home-projects-column"]').waitFor({ timeout: 10000 })
    const homeActionBtn = page.locator('[data-testid="home-pet-action-button"]')
    await homeActionBtn.waitFor()
    const homeActionText = await homeActionBtn.innerText()
    assert.match(homeActionText, /Approve Plan/i)
    assert.match(homeActionText, /Add Comments/i)
    assert.match(homeActionText, /PLAN REVIEW/i)

    // Verify Global To-Do widget has 1 item: "Add comments with Like/Love on comments"
    await page.getByRole('button', { name: 'Widgets' }).click()
    await page.getByText('Global To-Do').first().click()
    await page.getByText('Add comments with Like/Love on comments').first().waitFor()
    await page.keyboard.press('Escape')

    // Verify Not Hotdog has 0 seeded sessions
    await page.locator('[data-testid="home-projects-column"] [data-project-id="nothotdog"]').click()
    await page.locator('[data-testid="project-home"][data-project-id="nothotdog"]').waitFor()
    assert.equal(await page.locator('[data-sessions-layout] [data-session-card]').count(), 0)

    // Go back Home -> click Approve Plan in HomeInfieActionRow -> starts non-skippable 30s countdown & opens Add Comments
    await page.getByTitle('Back to i2 Home').click()
    await homeActionBtn.click()
    await page.locator('[data-testid="session-screen"]').waitFor({ timeout: 10000 })
    assert.equal(await page.locator('[data-testid="session-screen"]').getAttribute('data-session-status'), 'CODING')
    await page.locator('[data-testid="pet-coding-countdown"]').waitFor()
    // Ensure preview stays v1 during CODING and Plan.md works
    assert.equal(await page.locator('[data-pet-preview-version]').first().getAttribute('data-pet-preview-version'), 'v1')
    assert.equal(await page.locator('[data-testid="pet-test-app-button"]').count(), 0, 'Test App must not appear during CODING')
    assert.equal(await page.getByRole('button', { name: 'Continue' }).count(), 0, 'No Continue bypass during CODING')

    await page.locator('[data-testid="session-plan-md"]').click()
    await page.locator('[data-testid="file-viewer"]').waitFor()
    const planText = await page.locator('[data-testid="file-viewer"]').innerText()
    assert.match(planText, /Pet Show and Tell — Comments Implementation Plan/)
    assert.match(planText, /Verification & Export/)
    await page.keyboard.press('Escape')

    // Navigate Home mid-timer + reload page to prove parent-tab sessionStorage preserves deadline & countdown
    await page.locator('[data-testid="pet-explore-home-button"]').click()
    await page.locator('[data-testid="home-projects-column"]').waitFor()
    await page.reload({ waitUntil: 'networkidle' })
    await page.locator('[data-testid="home-pet-action-button"]').waitFor()
    assert.match(await page.locator('[data-testid="home-pet-action-button"]').innerText(), /Coding \(/i)
    await page.locator('[data-testid="home-pet-action-button"]').click()
    await page.locator('[data-testid="session-screen"]').waitFor()

    // Wait for real 30s deadline to finish -> WAITING ON TEST with 9 real diff files, STILL v1 preview
    await page.waitForFunction(
      () => document.querySelector('[data-testid="session-screen"]')?.getAttribute('data-session-status') === 'WAITING ON TEST',
      { timeout: 42000 },
    )
    assert.equal(await page.locator('[data-pet-preview-version]').first().getAttribute('data-pet-preview-version'), 'v1')
    const sessionTextAtWait = await page.locator('[data-testid="session-screen"]').innerText()
    assert.match(sessionTextAtWait, /post-detail-screen\.tsx/)
    assert.match(sessionTextAtWait, /\+1156/)
    // Clicking a diff row opens the actual unified git diff hunk in FileViewer
    await page.locator('[data-testid="pet-diff-row"]').first().click()
    await page.locator('[data-testid="file-viewer"]').waitFor()
    const diffViewerText = await page.locator('[data-testid="file-viewer"]').innerText()
    assert.match(diffViewerText, /diff --git/)
    assert.match(diffViewerText, /@@/)
    await page.keyboard.press('Escape')

    // Click Test App -> mounts v2 and enters NEEDS YOU
    await page.locator('[data-testid="pet-test-app-button"]').click()
    assert.equal(await page.locator('[data-testid="session-screen"]').getAttribute('data-session-status'), 'NEEDS YOU')
    assert.equal(await page.locator('[data-pet-preview-version]').first().getAttribute('data-pet-preview-version'), 'v2')

    // Exercise real Pet v2 UI inside the iframe (post detail comments + validation + Like/Love toggle + persistence)
    const petFrame = page.frameLocator('iframe[data-testid="preview-iframe"]').first()
    await petFrame.getByText(/Mia|Nora/i).first().waitFor({ timeout: 15000 })
    // Open Mia's post card detail screen
    await petFrame.getByRole('button', { name: "View Mia's post: Is that a smile?" }).first().click()
    await petFrame.getByText('No comments yet').waitFor({ timeout: 10000 })
    await petFrame.getByRole('button', { name: 'Post comment' }).click()
    await petFrame.getByText('Write a comment before posting.').waitFor()
    const commentBox = petFrame.locator('textarea, input').first()
    // Strict 181-char rejection check (no silent clamp)
    await commentBox.fill('x'.repeat(181))
    assert.equal((await commentBox.inputValue()).length, 181, '181-char input must not be silently truncated')
    await petFrame.getByText('181/180').waitFor()
    await petFrame.getByRole('button', { name: 'Post comment' }).click()
    await petFrame.getByText('Comments must be 180 characters or fewer.').waitFor()
    await petFrame.getByText('0 comments').waitFor()
    await commentBox.fill('Such a happy dog!')
    await petFrame.getByRole('button', { name: 'Post comment' }).click()
    await petFrame.getByText('Such a happy dog!').waitFor()
    const likeCommentBtn = petFrame.getByRole('button', { name: 'Like comment: Such a happy dog!' })
    await likeCommentBtn.click()
    await likeCommentBtn.click()
    // Navigate back to feed & reopen post to confirm comment persistence
    await petFrame.getByRole('button', { name: 'Back to the feed' }).click()
    await petFrame.getByText('Meet the pets').waitFor({ timeout: 10000 })
    await petFrame.getByRole('button', { name: "View Mia's post: Is that a smile?" }).first().click()
    await petFrame.getByText('Such a happy dog!').waitFor()

    // Check off all 4 Human Testing checklist items one by one & verify running counts (Verify Testing gated until 4/4)
    const checklistIds = ['pet-chk-post', 'pet-chk-toggle', 'pet-chk-persist', 'pet-chk-validation']
    for (let idx = 0; idx < checklistIds.length; idx += 1) {
      assert.equal(await page.locator('[data-testid="pet-verify-testing-button"]').isDisabled(), true)
      await page.locator(`[data-human-task-id="${checklistIds[idx]}"]`).click()
      assert.match(await page.locator('[data-name="HumanTestingPanel"]').innerText(), new RegExp(`Human Testing ${idx + 1}/4`, 'i'))
    }
    assert.equal(await page.locator('[data-testid="pet-verify-testing-button"]').isDisabled(), false)
    await page.locator('[data-testid="pet-verify-testing-button"]').click()
    assert.equal(await page.locator('[data-testid="session-screen"]').getAttribute('data-session-status'), 'VERIFIED')

    await page.locator('[data-testid="pet-open-pr-button"]').click()
    const sessionStatus = () => page.locator('[data-testid="session-screen"]').getAttribute('data-session-status')
    const replayState = () =>
      page.evaluate(() => JSON.parse(window.sessionStorage.getItem('i2.pet.addComments.replay.v1') || 'null'))
    const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
    assert.equal(await sessionStatus(), 'PR OPEN')

    // PR OPEN -> next action is Wrap up (no Merge, no Check Project) with visible simulated checks queued
    const wrapChecks = page.locator('[data-testid="pet-wrapup-checks"]')
    await wrapChecks.waitFor()
    assert.equal(await wrapChecks.getAttribute('data-wrapup-phase'), 'none')
    assert.match(await wrapChecks.innerText(), /Simulated wrap-up/i)
    assert.equal(await page.locator('[data-testid="pet-merge-pr-button"]').count(), 0, 'Merge hidden before Wrap up')
    assert.equal(await page.getByText('Check Project').count(), 0, 'Check Project removed from the Pet path')
    await page.locator('[data-testid="pet-wrap-up-button"]').click()
    assert.equal(await wrapChecks.getAttribute('data-wrapup-phase'), 'polling')
    await page.locator('[data-testid="pet-wrapup-polling"]').waitFor()
    assert.equal(await page.locator('[data-testid="pet-merge-pr-button"]').count(), 0, 'Merge hidden while polling')

    // Navigate away + reload mid wrap-up: progress persists and resumes, Home shows the live step
    await page.getByTitle('Back to i2 Home').click()
    await page.reload({ waitUntil: 'networkidle' })
    await page.locator('[data-testid="home-pet-action-button"]').waitFor()
    assert.match(await page.locator('[data-testid="home-pet-action-button"]').innerText(), /Wrapping up|Merge/)
    assert.equal((await replayState()).status, 'PR OPEN')
    await page.locator('[data-testid="home-pet-action-button"]').click()
    await page.locator('[data-testid="session-screen"]').waitFor()
    await page.waitForFunction(
      () => document.querySelector('[data-testid="pet-wrapup-checks"]')?.getAttribute('data-wrapup-phase') === 'green',
      { timeout: 15000 },
    )
    for (const check of ['doctor', 'todo', 'ci', 'review']) {
      assert.equal(await page.locator(`[data-testid="pet-wrapup-check-${check}"]`).getAttribute('data-check-state'), 'done')
    }
    assert.match(await page.locator('[data-testid="pet-wrapup-check-doctor"]').innerText(), /0 errors/)
    // Green never auto-merges: the user must click Merge
    await pause(2000)
    assert.equal(await sessionStatus(), 'PR OPEN')
    await page.locator('[data-testid="pet-merge-pr-button"]').click()
    assert.equal(await sessionStatus(), 'MERGED')
    let saved = await replayState()
    assert.equal(saved.mainUpdated, false)

    // MERGED -> blank completion report (same form style), explicit submit only
    const report = page.locator('[data-testid="pet-completion-report"]')
    await report.waitFor()
    assert.equal(await report.getAttribute('data-report-kind'), 'blank')
    assert.match(await report.innerText(), /Nothing to add to Infinite Intelligence was found\./)
    await pause(1500)
    assert.equal(await sessionStatus(), 'MERGED', 'report waits for an explicit submit')
    // Reload while the report is pending keeps it pending
    await page.reload({ waitUntil: 'networkidle' })
    await page.locator('[data-testid="home-pet-action-button"]').waitFor()
    assert.match(await page.locator('[data-testid="home-pet-action-button"]').innerText(), /Completion Report/)
    await page.locator('[data-testid="home-pet-action-button"]').click()
    await report.waitFor()
    await report.getByRole('button', { name: 'Submit Blank Report' }).click()

    // Submission -> Project Home with project-level choices; main still on baseline until Update Main
    const petHome = page.locator('[data-testid="project-home"][data-project-id="pet"]')
    await petHome.waitFor({ timeout: 10000 })
    saved = await replayState()
    assert.equal(saved.status, 'COMPLETE')
    assert.equal(saved.reportSubmitted, true)
    assert.equal(saved.mainUpdated, false, 'report submission must not promote main')
    assert.equal(await page.locator('[data-testid="pet-session-status"]').first().innerText().then((t) => /COMPLETE/i.test(t)), true)
    const updateMain = page.locator('[data-testid="project-update-main-button"]')
    const reconcile = page.locator('[data-testid="project-reconcile-button"]')
    await updateMain.waitFor()
    await reconcile.waitFor()
    assert.equal(await petHome.getByText('Check Project').count(), 0)
    await pause(1500)
    assert.equal((await replayState()).mainUpdated, false, 'Update Main never runs automatically')

    const homePreview = petHome.locator('[data-pet-preview-version]').first()
    const hasHomePreview = (await petHome.locator('[data-pet-preview-version]').count()) > 0
    assert.ok(hasHomePreview, 'Project Home must show the Pet web preview')
    if (hasHomePreview) {
      await petHome.locator('[data-testid="simulator-session-select"]').first().click()
      await page.locator('[data-sim-option="main"]').first().click()
      assert.equal(await homePreview.getAttribute('data-pet-preview-version'), 'v1', 'main preview stays v1 before Update Main')
      await petHome.locator('[data-testid="simulator-session-select"]').first().click()
      await page.locator('[data-sim-option="test"]').first().click()
      assert.equal(await homePreview.getAttribute('data-pet-preview-version'), 'v2', 'test preview is v2 after merge')
    }

    await reconcile.click()
    await page.waitForFunction(() => /1 merge behind test/.test(document.querySelector('[data-testid="project-home"]')?.innerText || ''), { timeout: 15000 })
    assert.equal((await replayState()).mainUpdated, false, 'Reconcile does not promote main')

    await updateMain.click()
    await page.waitForFunction(() => /Simulated Update Main/.test(document.querySelector('[data-testid="project-home"]')?.innerText || ''), { timeout: 15000 })
    assert.equal(await updateMain.count(), 0, 'Update Main disappears once main is updated')
    saved = await replayState()
    assert.equal(saved.mainUpdated, true)
    assert.equal(saved.branchPreviewSelection, 'main')
    if (hasHomePreview) {
      assert.equal(await homePreview.getAttribute('data-pet-preview-version'), 'v2', 'main preview promoted by Update Main')
    }

    // Reload after completion: state persists; user can return to the session
    await page.reload({ waitUntil: 'networkidle' })
    await page.locator('[data-testid="home-pet-action-button"]').waitFor()
    assert.match(await page.locator('[data-testid="home-pet-action-button"]').innerText(), /Main updated/)
    await page.locator('[data-testid="home-pet-action-button"]').click()
    await page.locator('[data-testid="session-screen"]').waitFor()
    assert.equal(await sessionStatus(), 'COMPLETE')
    assert.match(await page.locator('[data-testid="pet-complete-badge"]').innerText(), /main updated/i)
    assert.equal(await page.locator('[data-testid="pet-completion-report"]').count(), 0)
    await page.locator('[data-testid="pet-go-project-button"]').click()
    await petHome.waitFor()
    await reconcile.click()
    await page.waitForFunction(() => /main` and `test` match|main and test match/.test(document.querySelector('[data-testid="project-home"]')?.innerText || ''), { timeout: 15000 })
    await petHome.locator('[data-testid="open-add-comments-button"]').click()
    await page.locator('[data-testid="session-screen"]').waitFor()

    // Explicit Reset returns replay cleanly to PLAN REVIEW and v1
    await page.locator('[data-testid="pet-reset-button"]').click()
    assert.equal(await page.locator('[data-testid="session-screen"]').getAttribute('data-session-status'), 'PLAN REVIEW')
    assert.equal(await page.locator('[data-pet-preview-version]').first().getAttribute('data-pet-preview-version'), 'v1')

    assert.deepEqual(pageErrors, [])
  } finally {
    await browser?.close()
    await new Promise((resolve) => (server ? server.close(resolve) : resolve()))
    fs.rmSync(extractDir, { recursive: true, force: true })
  }
})
