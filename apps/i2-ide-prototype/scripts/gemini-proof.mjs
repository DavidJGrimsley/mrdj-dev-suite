import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import assert from 'node:assert/strict'

const testDir = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(testDir, '..')
const workspaceRoot = path.resolve(appRoot, '../../..')
const pwPath = path.join(workspaceRoot, 'temp', 'exact-upstream', 'node_modules', 'playwright-core')
const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const screenshotsDir = path.join(workspaceRoot, 'generated', 'ide-widgets-review-2026-11-15', 'gemini-screenshots')

fs.mkdirSync(screenshotsDir, { recursive: true })

const { chromium } = await import(pathToFileURL(path.join(pwPath, 'index.mjs')).href)

async function run() {
  console.log('[gemini-proof] Launching Chrome...')
  const browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
  })

  const results = {
    r01: false,
    r04: false,
    r10_900x640: false,
    r10_1100x760: false,
    r14: false,
    r15_cold: false,
    r15_walked: false,
    measurements: {},
  }

  try {
    const page = await browser.newPage()
    page.on('console', msg => {
      if (msg.type() === 'error') console.log('[browser error]', msg.text())
    })

    // ──────────────────────────────────────────────────────────────────────────
    // 1. R04: Visible playlist title is "i² Curated" and track artist is "Leek Beats"
    // ──────────────────────────────────────────────────────────────────────────
    console.log('[gemini-proof] Verifying R04: Playlist title on B06...')
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('http://127.0.0.1:8451/iSquared/?beat=B06', { waitUntil: 'networkidle' })
    await page.waitForSelector('[data-name="LeekBeatsWidget"]', { timeout: 10000 })
    await page.waitForTimeout(600)

    const musicWidgetText = await page.textContent('[data-name="LeekBeatsWidget"]')
    console.log(`[gemini-proof] R04 Music text snippet: "${musicWidgetText.replace(/\s+/g, ' ').slice(0, 100)}"`)
    assert.ok(musicWidgetText.includes('i² Curated'), 'Visible playlist title must contain "i² Curated"')
    assert.ok(!musicWidgetText.includes('LeekBeats: i² Curated'), 'Visible title must not say "LeekBeats: i² Curated"')

    const shotR04 = path.join(screenshotsDir, 'gemini-r04-curated-playlist-title.png')
    await page.screenshot({ path: shotR04 })
    console.log(`[gemini-proof] Saved ${shotR04}`)
    results.r04 = true

    // ──────────────────────────────────────────────────────────────────────────
    // 2. R10: 900x640 message bubbles do not overlap
    // ──────────────────────────────────────────────────────────────────────────
    console.log('[gemini-proof] Verifying R10: 900x640 message bubbles on B03...')
    await page.setViewportSize({ width: 900, height: 640 })
    await page.goto('http://127.0.0.1:8451/iSquared/?beat=B03', { waitUntil: 'networkidle' })
    await page.waitForSelector('[data-name="OnboardingMessageScroller"]', { timeout: 10000 })
    await page.waitForTimeout(600)

    const bubbleEls = await page.$$('[data-name="OnboardingMessageScroller"] [data-message-id]')
    console.log(`[gemini-proof] Found ${bubbleEls.length} message bubbles at B03`)
    const boxes = []
    for (const b of bubbleEls) {
      const box = await b.boundingBox()
      if (box && box.height > 10) boxes.push(box)
    }

    let overlapDetected = false
    for (let i = 0; i < boxes.length - 1; i++) {
      const b1 = boxes[i]
      const b2 = boxes[i + 1]
      if (b2.y < b1.y + b1.height - 1) {
        console.error(`[gemini-proof] Overlap detected: b1 bottom=${b1.y + b1.height}, b2 top=${b2.y}`)
        overlapDetected = true
      }
    }
    assert.ok(!overlapDetected, 'Message bubbles must not overlap vertically')

    const shotR10_900 = path.join(screenshotsDir, 'gemini-r10-900x640-no-bubble-overlap.png')
    await page.screenshot({ path: shotR10_900 })
    console.log(`[gemini-proof] Saved ${shotR10_900}`)
    results.r10_900x640 = true
    results.measurements.r10_boxes_checked = boxes.length

    // ──────────────────────────────────────────────────────────────────────────
    // 3. R10: 1100x760 B09 Stylist paint no clipping
    // ──────────────────────────────────────────────────────────────────────────
    console.log('[gemini-proof] Verifying R10: 1100x760 B09 Stylist layout...')
    await page.setViewportSize({ width: 1100, height: 760 })
    await page.goto('http://127.0.0.1:8451/iSquared/?beat=B09', { waitUntil: 'networkidle' })
    await page.waitForSelector('[data-name="OnboardingMessageScroller"]', { timeout: 10000 })
    await page.waitForTimeout(600)

    // Advance to turn 2 where StylistPreview / OnboardingRightMargin is displayed
    console.log('[gemini-proof] Advancing B09 to turn 2 for Stylist preview...')
    for (let t = 0; t < 2; t++) {
      const cont = await page.waitForSelector('button:has-text("Continue")', { timeout: 5000 })
      await cont.click()
      await page.waitForTimeout(500)
    }

    const rightMarginEl = await page.waitForSelector('[data-name="OnboardingRightMargin"]', { timeout: 5000 })
    assert.ok(rightMarginEl, 'OnboardingRightMargin must exist at B09 turn 2')

    const rightMarginBox = await rightMarginEl.boundingBox()
    console.log(`[gemini-proof] Right margin card box:`, rightMarginBox)
    assert.ok(rightMarginBox.x + rightMarginBox.width <= 1100 + 10, 'Right margin card must not overflow viewport width')
    assert.ok(rightMarginBox.y >= 0, 'Right margin card top must not be clipped negative')

    const stageFrameShift = await page.getAttribute('[data-name="OnboardingStageFrame"]', 'data-chat-shift')
    console.log(`[gemini-proof] Stage frame chat shift: ${stageFrameShift}`)
    assert.equal(stageFrameShift, 'true', 'On 1100x760 with right margin, chat shift must be true')

    const shotR10_1100 = path.join(screenshotsDir, 'gemini-r10-1100x760-b09-stylist-no-clip.png')
    await page.screenshot({ path: shotR10_1100 })
    console.log(`[gemini-proof] Saved ${shotR10_1100}`)
    results.r10_1100x760 = true
    results.measurements.rightMarginBox = rightMarginBox

    // ──────────────────────────────────────────────────────────────────────────
    // 4. R01: NotHotdog Android preview truthful unavailable state
    // ──────────────────────────────────────────────────────────────────────────
    console.log('[gemini-proof] Verifying R01: Not Hotdog Android unavailable state on complete Home...')
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('http://127.0.0.1:8451/iSquared/?beat=COMPLETE', { waitUntil: 'networkidle' })
    await page.waitForSelector('[data-name="ActiveProjectsSection"], div:has-text("Not Hotdog")', { timeout: 10000 })
    await page.waitForTimeout(600)

    // Click Not Hotdog project card using exact data-project-id
    const notHotdogCard = await page.waitForSelector('button[data-project-id="nothotdog"]', { timeout: 5000 })
    await notHotdogCard.click()
    await page.waitForTimeout(800)

    // Switch to Emulators tab in header
    const emuTab = await page.waitForSelector('button:has-text("Emulators")', { timeout: 5000 })
    await emuTab.click()
    await page.waitForTimeout(800)

    // Verify EmulatorScreen is visible with unavailable state for Not Hotdog
    const unavailableEl = await page.waitForSelector('[data-testid="simulator-unavailable"]', { timeout: 8000 })
    const unavailableText = await unavailableEl.textContent()
    console.log(`[gemini-proof] R01 Not Hotdog text: "${unavailableText.replace(/\s+/g, ' ').slice(0, 120)}"`)
    assert.ok(unavailableText.includes('No build to simulate'), 'Must state No build to simulate')
    assert.ok(unavailableText.includes('Not Hotdog'), 'Must name Not Hotdog')

    const shotR01_unavailable = path.join(screenshotsDir, 'gemini-r01-nothotdog-android-unavailable.png')
    await page.screenshot({ path: shotR01_unavailable })
    console.log(`[gemini-proof] Saved ${shotR01_unavailable}`)

    // Switch project to Pet Show and Tell
    const homeBtn = await page.waitForSelector('button[title="Back to i2 Home"], button[title="i2 Home"], button:has-text("Home")', { timeout: 5000 })
    await homeBtn.click()
    await page.waitForTimeout(600)

    const petCard = await page.waitForSelector('button[data-project-id="pet"]', { timeout: 5000 })
    await petCard.click()
    await page.waitForTimeout(600)

    const petEmuTab = await page.waitForSelector('button:has-text("Emulators")', { timeout: 5000 })
    await petEmuTab.click()
    await page.waitForTimeout(800)

    const shotR01_live = path.join(screenshotsDir, 'gemini-r01-pet-android-preview-live.png')
    await page.screenshot({ path: shotR01_live })
    console.log(`[gemini-proof] Saved ${shotR01_live}`)
    results.r01 = true

    // ──────────────────────────────────────────────────────────────────────────
    // 5. R14: B18 close music -> Gallery restore -> real header drag -> B19
    // ──────────────────────────────────────────────────────────────────────────
    console.log('[gemini-proof] Verifying R14: B18 close music, restore from gallery, and real header move...')
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('http://127.0.0.1:8451/iSquared/?beat=B18', { waitUntil: 'networkidle' })
    await page.waitForSelector('[data-testid="session-screen"]', { timeout: 10000 })
    await page.waitForTimeout(800)

    const shotR14_01 = path.join(screenshotsDir, 'gemini-r14-01-b18-arrival.png')
    await page.screenshot({ path: shotR14_01 })
    console.log(`[gemini-proof] Saved ${shotR14_01}`)

    // Find music remove button
    const removeMusicBtn = await page.waitForSelector('[data-widget-remove="music"]', { timeout: 5000 })
    assert.ok(removeMusicBtn, 'Remove button for music widget must exist on B18 arrival')
    await removeMusicBtn.click()
    await page.waitForTimeout(600)

    // Verify music widget removed
    const musicAfterRemove = await page.$('[data-dock-item="music"]')
    assert.equal(musicAfterRemove, null, 'Music widget must be removed from dock after clicking X')
    const shotR14_02 = path.join(screenshotsDir, 'gemini-r14-02-music-removed.png')
    await page.screenshot({ path: shotR14_02 })
    console.log(`[gemini-proof] Saved ${shotR14_02}`)

    // Click Header Widgets button (which is enabled!)
    const headerWidgetsBtn = await page.waitForSelector('button[data-name="HeaderWidgetsButton"]', { timeout: 5000 })
    assert.ok(headerWidgetsBtn, 'Header Widgets button must exist')
    const isDisabled = await headerWidgetsBtn.getAttribute('disabled')
    assert.equal(isDisabled, null, 'Header Widgets button must NOT be disabled on B18')
    await headerWidgetsBtn.click()
    await page.waitForTimeout(600)

    // Verify Widgets Gallery opens
    await page.waitForSelector('[data-name="WidgetsGalleryModal"]', { timeout: 5000 })
    const shotR14_03 = path.join(screenshotsDir, 'gemini-r14-03-widgets-gallery-open.png')
    await page.screenshot({ path: shotR14_03 })
    console.log(`[gemini-proof] Saved ${shotR14_03}`)

    // Find and click restore music button
    const restoreMusicBtn = await page.waitForSelector('button[data-restore-widget="music"]', { timeout: 5000 })
    assert.ok(restoreMusicBtn, 'Restore music button must exist in Widgets Gallery')
    await restoreMusicBtn.click()
    await page.waitForTimeout(600)

    // Close gallery modal
    await page.keyboard.press('Escape')
    await page.waitForTimeout(600)

    // Verify music widget restored
    const musicRestored = await page.waitForSelector('[data-dock-item="music"]', { timeout: 5000 })
    assert.ok(musicRestored, 'Music widget must be restored back into dock')
    const shotR14_04 = path.join(screenshotsDir, 'gemini-r14-04-music-restored.png')
    await page.screenshot({ path: shotR14_04 })
    console.log(`[gemini-proof] Saved ${shotR14_04}`)

    // Perform REAL move to bottom panel via keyboard on header
    console.log('[gemini-proof] Moving music widget to bottom panel via real header keyboard action...')
    await musicRestored.focus()
    await page.keyboard.press('ArrowDown')
    await page.waitForTimeout(800)

    // Verify music is now in bottom panel
    const musicInBottom = await page.waitForSelector('[data-dock-panel="bottom"] [data-dock-item="music"]', { timeout: 5000 })
    assert.ok(musicInBottom, 'Music widget must now be inside bottom panel')
    const shotR14_05 = path.join(screenshotsDir, 'gemini-r14-05-music-in-bottom-panel.png')
    await page.screenshot({ path: shotR14_05 })
    console.log(`[gemini-proof] Saved ${shotR14_05}`)

    // Continue through B18 turns to advance to B19
    console.log('[gemini-proof] Walking remaining B18 turns...')
    // B18 Turn 1 Continue
    const continueBtn1 = await page.waitForSelector('button:has-text("Continue")', { timeout: 5000 })
    await continueBtn1.click()
    await page.waitForTimeout(600)

    // B18 Turn 2: Click glowing Widgets button in header
    const glowingWidgetsBtn = await page.waitForSelector('button[data-name="HeaderWidgetsButton"]', { timeout: 5000 })
    await glowingWidgetsBtn.click()
    await page.waitForTimeout(1000)

    // B18 Turn 3 / 4 Continue to B19 (on the floating callout)
    const continueToB19 = await page.waitForSelector('button:has-text("Continue")', { timeout: 10000 })
    await continueToB19.click()
    await page.waitForTimeout(2000)

    // Check we reached B19
    const beatAfter = await page.getAttribute('#root [data-beat]', 'data-beat')
    console.log(`[gemini-proof] Beat after walking B18: ${beatAfter}`)
    assert.equal(beatAfter, 'B19', 'Must advance to B19')
    const shotR14_06 = path.join(screenshotsDir, 'gemini-r14-06-advance-to-b19.png')
    await page.screenshot({ path: shotR14_06 })
    console.log(`[gemini-proof] Saved ${shotR14_06}`)
    results.r14 = true
    results.r15_walked = true

    // ──────────────────────────────────────────────────────────────────────────
    // 6. R15: Cold load B19 renders SessionScreen and consolidated surfaces line
    // ──────────────────────────────────────────────────────────────────────────
    console.log('[gemini-proof] Verifying R15: Cold load B19...')
    await page.goto('http://127.0.0.1:8451/iSquared/?beat=B19', { waitUntil: 'networkidle' })
    await page.waitForSelector('[data-testid="session-screen"]', { timeout: 10000 })
    await page.waitForTimeout(600)

    const latestMessage = page.locator('[data-slot="infie-message"]')
    await latestMessage.waitFor({ timeout: 10000 })
    const messageText = await latestMessage.textContent()
    console.log(`[gemini-proof] B19 Message text: "${messageText.slice(0, 120)}..."`)
    assert.ok(
      messageText.includes('The website lets even your non-technical teammates join in too without downloading the desktop app or codebase.'),
      'B19 consolidated surfaces sentence (website, mobile, VR) must be rendered'
    )

    const shotR15_cold = path.join(screenshotsDir, 'gemini-r15-b19-cold-load-session.png')
    await page.screenshot({ path: shotR15_cold })
    console.log(`[gemini-proof] Saved ${shotR15_cold}`)
    results.r15_cold = true

    console.log('\n==========================================')
    console.log('[gemini-proof] ALL 5 CORRECTIONS VERIFIED CLEANLY!')
    console.log('==========================================')
    console.log(JSON.stringify(results, null, 2))
  } finally {
    await browser.close()
  }
}

run().catch(err => {
  console.error('[gemini-proof ERROR]', err)
  process.exit(1)
})
