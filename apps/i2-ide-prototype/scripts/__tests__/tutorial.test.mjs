import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const testDir = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(testDir, '..', '..')
const tutorialDir = path.join(appRoot, 'src', 'tutorial')

test('tutorial manifest resolves configurable URLs without hardcoded localhost in source', async () => {
  const LOCAL_URL_REGEX = /(?:https?|wss?):\/\/(?:localhost|127\.0\.0\.1|\[::1\])/i

  // Verify none of the source files in src/tutorial contain hardcoded localhost/127.0.0.1 strings
  for (const filename of fs.readdirSync(tutorialDir)) {
    if (!filename.endsWith('.ts') && !filename.endsWith('.tsx')) continue
    const content = fs.readFileSync(path.join(tutorialDir, filename), 'utf8')
    assert.equal(
      LOCAL_URL_REGEX.test(content),
      false,
      `${filename} must not contain hardcoded localhost or 127.0.0.1 strings (forbidden in hosted builds)`
    )
  }
})

test('scripted turns contract: 26 exact turns in strict order with isolated patches', async () => {
  const scriptedDataPath = path.join(tutorialDir, 'scriptedData.ts')
  const content = fs.readFileSync(scriptedDataPath, 'utf8')

  // Import directly
  const {
    SCRIPTED_JENNY_TURNS,
    createInitialTutorialBlueprint,
    INITIAL_ROADMAP_TASKS,
    APPROVAL_ANSWER_TEXT,
    JENNY_SUMMARY_MESSAGE,
  } = await import('../../src/tutorial/scriptedData.ts')

  // 1. Verify exact 26 turns count
  assert.equal(SCRIPTED_JENNY_TURNS.length, 26, 'Must contain exactly 26 turns')

  // 2. Verify all 26 exact questions and clickable answers in order
  const EXPECTED_PAIRS = [
    ["What are we building?", "An app to keep track of simple experiments."],
    ["Who is this app's intended audience?", "Scientists, learners, and field researchers who need to record experiments on the go."],
    ["What are the target platforms?", "Android and Web."],
    ["Do you have a framework in mind? I suggest Exact or Expo.", "Exact."],
    ["What would you like to call the app?", "Experimemo."],
    ["Which platform should we get working first?", "Web first so we can preview it, with Android also in the project plan."],
    ["What problem should Experimemo solve?", "Keeping experiment information organized and accessible while working on the go."],
    ["What would make the app successful?", "Making experiments easy to record, track, and manage without slowing people down."],
    ["What should stay outside the initial scope?", "Conducting experiments for users, scientific data analysis, and collaboration."],
    ["What should someone be able to do first?", "Create an experiment, then find it in Track and update it."],
    ["What information and features does that require?", "Hypotheses, procedures, data collection plans, observations, results, notes, photos, and experiment status."],
    ["Which screens do you already have in mind?", "New, Track, an experiment editor, and App Info."],
    ["What kinds of data will the app store?", "Experiment records, dated results, notes, and attached photos."],
    ["Should information stay on the device, or sync between devices?", "Save it locally and support working offline. Multi-device sync can come later."],
    ["Will people need accounts or a shared backend?", "No accounts or shared backend for the first version."],
    ["Do you have a visual style in mind?", "A simple field notebook with green accents, slate surfaces, light and dark themes, and the Experimemo script heading."],
    ["How should people move around the app?", "Use New and Track navigation, open experiments to edit them, and open App Info from the header."],
    ["Should onboarding or an account screen block people from using it?", "No. Let them start using the app directly."],
    ["How will this app make money?", "No monetization for the MVP. Grants might support development later."],
    ["Who is building and maintaining it?", "A solo developer, with design help for the logo."],
    ["What ideas should we save for later?", "Voice-note transcription, hands-free recording, multi-device sync, and folder, search, and filtering improvements."],
    ["Are there references or existing designs to follow?", "I just want a simple UI with forms and cards for tracked experiments."],
    ["How should the first version reach users?", "Start with a web preview, then prepare Android distribution."],
    ["Are support, terms, privacy, and legal contact details ready?", "Not yet. Record those as pending before release."],
    ["Shall I use Exact's standard Contract and TypeScript setup and create an i2 workspace with the project documents?", "Yes."],
    ["Should I include the i² project guidelines and test-before-handoff checks?", "Yes."],
  ]

  EXPECTED_PAIRS.forEach(([expectedQ, expectedA], idx) => {
    const turn = SCRIPTED_JENNY_TURNS[idx]
    assert.equal(turn.turnIndex, idx, `Turn ${idx + 1} index must be ${idx}`)
    assert.equal(turn.question, expectedQ, `Turn ${idx + 1} question mismatch`)
    assert.equal(turn.answer, expectedA, `Turn ${idx + 1} answer mismatch`)
  })

  // 3. Initial blueprint state must have all fields unasked (isDiscussed: false, value: null)
  const initialBp = createInitialTutorialBlueprint()
  for (const [key, field] of Object.entries(initialBp)) {
    if (key === 'roadmapTasks') {
      assert.deepEqual(field, [], 'Roadmap tasks must initially be empty')
      continue
    }
    assert.equal(field.isDiscussed, false, `Field ${key} must initially be isDiscussed: false`)
    assert.equal(field.value, null, `Field ${key} must initially be value: null`)
  }

  // 4. Progressive isolation: Turn 1 patches ONLY overview
  const afterTurn1 = SCRIPTED_JENNY_TURNS[0].patch(initialBp)
  assert.equal(afterTurn1.overview.isDiscussed, true)
  assert.equal(afterTurn1.overview.value, "An app to keep track of simple experiments.")
  // Every other field must remain unasked
  for (const [key, field] of Object.entries(afterTurn1)) {
    if (key === "overview" || key === "roadmapTasks") continue
    assert.equal(field.isDiscussed, false, `Field ${key} must NOT be patched by turn 1`)
    assert.equal(field.value, null, `Field ${key} value must be null after turn 1`)
  }

  // 5. Turn 3 patches targetPlatforms to Android and Web
  const afterTurn3 = SCRIPTED_JENNY_TURNS[2].patch(afterTurn1)
  assert.equal(afterTurn3.targetPlatforms.isDiscussed, true)
  assert.deepEqual(afterTurn3.targetPlatforms.value, ["Android", "Web"])

  // 6. Turn 4 patches framework to Exact
  const afterTurn4 = SCRIPTED_JENNY_TURNS[3].patch(afterTurn3)
  assert.equal(afterTurn4.framework.isDiscussed, true)
  assert.equal(afterTurn4.framework.value, "Exact")

  // 7. Turn 5 patches projectName to Experimemo
  const afterTurn5 = SCRIPTED_JENNY_TURNS[4].patch(afterTurn4)
  assert.equal(afterTurn5.projectName.isDiscussed, true)
  assert.equal(afterTurn5.projectName.value, "Experimemo")

  // 8. Turn 9 patches nonGoals
  const afterTurn9 = SCRIPTED_JENNY_TURNS[8].patch(afterTurn5)
  assert.equal(afterTurn9.nonGoals.isDiscussed, true)
  assert.equal(
    afterTurn9.nonGoals.value,
    "Conducting experiments for users, scientific data analysis, and collaboration."
  )

  // 9. Turn 19 patches monetization
  const afterTurn19 = SCRIPTED_JENNY_TURNS[18].patch(afterTurn9)
  assert.equal(afterTurn19.monetizationStrategy.isDiscussed, true)
  assert.equal(afterTurn19.monetizationStrategy.value, "No monetization for the MVP. Grants might support development later.")

  // 10. Turn 20 patches team
  const afterTurn20 = SCRIPTED_JENNY_TURNS[19].patch(afterTurn19)
  assert.equal(afterTurn20.teamContext.isDiscussed, true)
  assert.equal(afterTurn20.teamContext.value, "A solo developer, with design help for the logo.")

  // 11. Turn 21 patches laterScope
  const afterTurn21 = SCRIPTED_JENNY_TURNS[20].patch(afterTurn20)
  assert.equal(afterTurn21.laterScope.isDiscussed, true)
  assert.ok(afterTurn21.laterScope.value)

  // 12. Turn 22 & Turn 24 & Turn 26 patches
  const afterTurn22 = SCRIPTED_JENNY_TURNS[21].patch(afterTurn21)
  assert.equal(afterTurn22.referenceDesigns.isDiscussed, true)
  assert.equal(
    afterTurn22.referenceDesigns.value,
    "I just want a simple UI with forms and cards for tracked experiments."
  )

  const afterTurn24 = SCRIPTED_JENNY_TURNS[23].patch(afterTurn22)
  assert.equal(afterTurn24.legalSupport.isDiscussed, true)
  assert.equal(afterTurn24.legalSupport.value, "Not yet. Record those as pending before release.")

  const afterTurn26 = SCRIPTED_JENNY_TURNS[25].patch(afterTurn24)
  assert.equal(afterTurn26.mdsGuidelines.isDiscussed, true)
  assert.equal(
    afterTurn26.mdsGuidelines.value,
    "i² project guidelines and test-before-handoff checks included."
  )

  // Ensure no viewer-facing reference-app / existing-Experimemo / MDS strings remain in tutorial copy
  const jennyScreenSource = fs.readFileSync(path.join(tutorialDir, 'TutorialJennyScreen.tsx'), 'utf8')
  const indexSource = fs.readFileSync(path.join(tutorialDir, 'index.ts'), 'utf8')
  const appSource = fs.readFileSync(path.join(appRoot, 'src', 'app', 'App.tsx'), 'utf8')

  for (const [label, src] of [
    ['scriptedData.ts', content],
    ['TutorialJennyScreen.tsx', jennyScreenSource],
  ]) {
    assert.equal(/existing Experimemo/i.test(src), false, `${label} must not reference existing Experimemo`)
    assert.equal(/reference app/i.test(src), false, `${label} must not mention reference app`)
    assert.equal(/reference fields/i.test(src), false, `${label} must not mention reference fields`)
    assert.equal(/reference experiments/i.test(src), false, `${label} must not mention reference experiments`)
    assert.equal(/reference theme tokens/i.test(src), false, `${label} must not mention reference theme tokens`)
    assert.equal(/\bMDS\b/.test(src), false, `${label} must replace viewer-facing MDS with i²`)
  }
  assert.equal(jennyScreenSource.includes('9398d982'), false, 'TutorialJennyScreen must not show revision hashes')
  assert.equal(fs.existsSync(path.join(tutorialDir, 'TutorialSessionScreen.tsx')), false, 'Legacy TutorialSessionScreen must be removed')
  assert.equal(indexSource.includes('TutorialSessionScreen'), false, 'tutorial/index.ts must not export TutorialSessionScreen')
  assert.equal(appSource.includes('TutorialSessionScreen'), false, 'App.tsx must use existing SessionScreen, never TutorialSessionScreen')

  // 13. Approval reply text and proposed roadmap tasks
  assert.equal(APPROVAL_ANSWER_TEXT, "Yes, generate Experimemo.")
  assert.ok(JENNY_SUMMARY_MESSAGE.length > 50)
  assert.match(JENNY_SUMMARY_MESSAGE, /i² quality safeguards/)
  assert.equal(INITIAL_ROADMAP_TASKS.length, 2)
  assert.equal(INITIAL_ROADMAP_TASKS[0].title, "Define Experiment data schema in app.ts")
  assert.equal(INITIAL_ROADMAP_TASKS[0].status, "pending")
  assert.equal(INITIAL_ROADMAP_TASKS[1].title, "Implement Experiment List view in app.contract")
  assert.equal(INITIAL_ROADMAP_TASKS[1].status, "pending")
})

test('manifest keeps internal snapshots out of viewer-visible labels and carries no build provenance', async () => {
  const { PREVIEW_MANIFEST } = await import('../../src/tutorial/manifest.ts')
  const manifestSource = fs.readFileSync(path.join(tutorialDir, 'manifest.ts'), 'utf8')

  for (const entry of Object.values(PREVIEW_MANIFEST)) {
    assert.equal(/\bv[12]\b/i.test(entry.label), false, `label "${entry.label}" must not mention V1/V2`)
    assert.equal(/archive|merged|PR #|commit|branch/i.test(entry.label), false, `label "${entry.label}" must not leak provenance`)
  }
  assert.equal(/provenance|exactRevision|builtAt/.test(manifestSource), false, 'manifest must not store build provenance')
  assert.equal(/[0-9a-f]{40}/.test(manifestSource), false, 'manifest must not embed commit hashes')
  assert.equal(manifestSource.includes('screens-and-function'), false, 'developer branch name must not appear in the manifest')
})

test('session tab order is Infie plus the three provider tabs and keyboard navigation wraps', async () => {
  const { SESSION_TAB_ORDER } = await import('../../src/tutorial/flow.ts')
  assert.deepEqual(SESSION_TAB_ORDER, ['infie', 'openai', 'claude', 'gemini'])

  // Mirrors SessionScreen.handleAgentTabKeyDown
  const getNextTab = (current, key) => {
    const idx = SESSION_TAB_ORDER.indexOf(current)
    const n = SESSION_TAB_ORDER.length
    if (key === 'ArrowRight') return SESSION_TAB_ORDER[(idx + 1) % n]
    if (key === 'ArrowLeft') return SESSION_TAB_ORDER[(idx - 1 + n) % n]
    if (key === 'Home') return SESSION_TAB_ORDER[0]
    if (key === 'End') return SESSION_TAB_ORDER[n - 1]
    return current
  }

  assert.equal(getNextTab('claude', 'ArrowRight'), 'gemini')
  assert.equal(getNextTab('gemini', 'ArrowRight'), 'infie')
  assert.equal(getNextTab('infie', 'ArrowLeft'), 'gemini')
  assert.equal(getNextTab('openai', 'Home'), 'infie')
  assert.equal(getNextTab('openai', 'End'), 'gemini')

  const appSource = fs.readFileSync(path.join(appRoot, 'src', 'app', 'App.tsx'), 'utf8')
  assert.match(appSource, /const agentTabOrder = SESSION_TAB_ORDER/, 'SessionScreen must use the shared four-tab order')
  assert.match(appSource, /e\.key === "Home"/)
  assert.match(appSource, /e\.key === "End"/)
})

test('preview frame is a real iframe at true viewport size with no URL, version or hardware chrome', () => {
  const frameSource = fs.readFileSync(path.join(tutorialDir, 'ExactWebPreviewFrame.tsx'), 'utf8')

  assert.match(frameSource, /sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"/)
  assert.match(frameSource, /<iframe/)
  // iframe element itself is laid out at the viewport dimensions; the wrapper only scales visually
  assert.match(frameSource, /style=\{\{ width: viewport\.width, height: viewport\.height/)
  assert.match(frameSource, /transform: `scale\(\$\{scale\}\)`/)

  assert.match(frameSource, /data-testid="preview-loading"/)
  assert.match(frameSource, /data-testid="preview-unavailable"/)
  assert.match(frameSource, /Reload preview/)

  // No developer URL, new-window link, speaker cutout, fake browser dots or configuration UI
  assert.equal(frameSource.includes('target="_blank"'), false, 'no open-in-new-window link exposing the URL')
  assert.equal(/>\s*\{resolvedUrl\}/.test(frameSource), false, 'the resolved URL must never be rendered as text')
  assert.equal(/Configure|preview_\{version\}|\?preview_/.test(frameSource), false, 'no URL configuration affordance')
  assert.equal(frameSource.includes('rounded-[36px]'), false, 'no fake phone bezel')
  assert.equal(frameSource.includes('Not Native Simulator'), false)
  assert.equal(/provenance|exactRevision/.test(frameSource), false)
})

test('manifest isLoopbackHostname accurately differentiates loopback from remote hosts', async () => {
  const { isLoopbackHostname } = await import('../../src/tutorial/manifest.ts')

  // True loopback hosts
  assert.equal(isLoopbackHostname('localhost'), true)
  assert.equal(isLoopbackHostname('LOCALHOST'), true)
  assert.equal(isLoopbackHostname('127.0.0.1'), true)
  assert.equal(isLoopbackHostname('::1'), true)
  assert.equal(isLoopbackHostname('[::1]'), true)
  assert.equal(isLoopbackHostname('app.localhost'), true)

  // Remote / deployed hosts must be false
  assert.equal(isLoopbackHostname('example.com'), false)
  assert.equal(isLoopbackHostname('deployed.example.org'), false)
  assert.equal(isLoopbackHostname('preview.vercel.app'), false)
  assert.equal(isLoopbackHostname('192.168.1.100'), false)
  assert.equal(isLoopbackHostname(''), false)
  assert.equal(isLoopbackHostname(undefined), false)
})

test('getResolvedPreviewUrl requires explicit config on remote hosts and avoids unencrypted mixed content', async () => {
  const { getResolvedPreviewUrl } = await import('../../src/tutorial/manifest.ts')

  // Save original window if present
  const origWindow = globalThis.window

  try {
    // 1. Simulate remote host with no query params or overrides
    globalThis.window = {
      location: {
        hostname: 'my-remote-app.example.com',
        search: '',
      },
      localStorage: {
        getItem: () => null,
      },
    }

    // Must return empty string on remote host (so viewer shows unconfigured state instead of broken http:8791/8792)
    assert.equal(
      getResolvedPreviewUrl('v1'),
      '',
      'Remote host without configured preview URL must return empty string'
    )
    assert.equal(
      getResolvedPreviewUrl('v2'),
      '',
      'Remote host without configured preview URL must return empty string'
    )

    // 2. Query param works on any host (remote or local)
    globalThis.window.location.search = '?preview_v1=https://custom-preview.test/v1'
    assert.equal(
      getResolvedPreviewUrl('v1'),
      'https://custom-preview.test/v1',
      'Query param must override URL on remote hosts'
    )

    // 3. Loopback host returns port 8792/8791
    globalThis.window.location.search = ''
    globalThis.window.location.hostname = 'localhost'
    const loopbackV1 = getResolvedPreviewUrl('v1')
    assert.match(loopbackV1, /:8792\/?$/, 'Loopback host falls back to port 8792 for v1')
    const loopbackV2 = getResolvedPreviewUrl('v2')
    assert.match(loopbackV2, /:8791\/?$/, 'Loopback host falls back to port 8791 for v2')
  } finally {
    globalThis.window = origWindow
  }
})

test('local preview server verifies /app.js SHA-256 before reuse, uses ephemeral port on conflict, and shuts down cleanly', async () => {
  const os = await import('node:os')
  const http = await import('node:http')
  const { startSnapshotStaticServer } = await import('../lib/local-preview-servers.mjs')

  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'isquared-preview-srv-'))
  const snapDir = path.join(tmpRoot, 'snap')
  fs.mkdirSync(snapDir, { recursive: true })
  fs.writeFileSync(path.join(snapDir, 'index.html'), '<!doctype html><html><body>OK</body></html>')
  fs.writeFileSync(path.join(snapDir, 'app.js'), 'console.log("experimemo-test-bundle");')

  let decoyServer = null
  let srv1 = null
  let srv2 = null
  let fallbackSrv = null

  try {
    // 1. Start a snapshot server on an ephemeral port and verify static serving
    srv1 = await startSnapshotStaticServer({ rootDir: snapDir, preferredPort: 0 })
    assert.equal(srv1.reused, false)
    const appRes = await fetch(`${srv1.url}/app.js`)
    assert.equal(appRes.status, 200)
    assert.match(await appRes.text(), /experimemo-test-bundle/)

    // 2. Requesting preferredPort matching srv1 reuses srv1 by /app.js SHA-256 identity
    srv2 = await startSnapshotStaticServer({ rootDir: snapDir, preferredPort: srv1.port })
    assert.equal(srv2.reused, true)
    assert.equal(srv2.url, srv1.url)

    // 3. Occupy another port with an unrelated decoy server; snapshot server must NOT kill it and must fall back to an ephemeral port
    let decoyHitCount = 0
    decoyServer = http.createServer((_req, res) => {
      decoyHitCount += 1
      res.writeHead(200, { 'Content-Type': 'application/javascript' })
      res.end('console.log("unrelated-other-app");')
    })
    await new Promise((resolve) => decoyServer.listen(0, '127.0.0.1', resolve))
    const decoyPort = decoyServer.address().port

    fallbackSrv = await startSnapshotStaticServer({
      rootDir: snapDir,
      preferredPort: decoyPort,
      allowEphemeralFallback: true,
    })
    assert.equal(fallbackSrv.reused, false)
    assert.notEqual(fallbackSrv.port, decoyPort, 'must pick ephemeral port instead of hijacking unrelated occupant')
    assert.ok(decoyHitCount >= 1, 'identity check probed the occupant before falling back')

    // Unrelated decoy server must still be alive!
    const decoyCheck = await fetch(`http://127.0.0.1:${decoyPort}/`)
    assert.equal(decoyCheck.status, 200)

    // Clean shutdown closes socket
    await fallbackSrv.close()
    await assert.rejects(() => fetch(`${fallbackSrv.url}/app.js`))
    fallbackSrv = null
  } finally {
    if (fallbackSrv) await fallbackSrv.close()
    if (srv1) await srv1.close()
    if (decoyServer) await new Promise((resolve) => decoyServer.close(() => resolve()))
    fs.rmSync(tmpRoot, { recursive: true, force: true })
  }
})

test('ExactWebPreviewFrame probes loopback URLs before mounting iframe and supports Retry recovery', () => {
  const frameSource = fs.readFileSync(path.join(tutorialDir, 'ExactWebPreviewFrame.tsx'), 'utf8')
  assert.match(frameSource, /isLoopbackHostname/)
  assert.match(frameSource, /fetch\(url,\s*\{[\s\S]*mode:\s*"no-cors"/)
  assert.match(frameSource, /probeReady && status !== "unavailable"/)
  assert.match(frameSource, /data-testid="preview-retry-button"/)
})

test('onboarding Stage 1: FloatingPrimitives exports, synchronized copy across the five tutorials, Project & Session Flow B08 4-turn reveal, B15 both-tasks gate, Widgets & Whatnot 5-turn callout, and no Generate glow', async () => {
  const onboardingDir = path.join(appRoot, 'src', 'app', 'onboarding')
  const primitivesSrc = fs.readFileSync(path.join(onboardingDir, 'FloatingPrimitives.tsx'), 'utf8')
  const stageSrc = fs.readFileSync(path.join(onboardingDir, 'OnboardingStage.tsx'), 'utf8')
  const contextSrc = fs.readFileSync(path.join(onboardingDir, 'OnboardingContext.tsx'), 'utf8')
  const ledgerSrc = fs.readFileSync(path.join(onboardingDir, 'revealLedger.ts'), 'utf8')
  const timingSrc = fs.readFileSync(path.join(onboardingDir, 'onboardingTiming.ts'), 'utf8')
  const leekSrc = fs.readFileSync(path.join(onboardingDir, 'LeekBeatsWidget.tsx'), 'utf8')
  const dockSrc = fs.readFileSync(path.join(appRoot, 'src', 'app', 'widgets', 'WidgetDock.tsx'), 'utf8')
  const appSrc = fs.readFileSync(path.join(appRoot, 'src', 'app', 'App.tsx'), 'utf8')
  const cssSrc = fs.readFileSync(path.join(appRoot, 'src', 'styles', 'widgets.css'), 'utf8')
  const transcriptSrc = fs.readFileSync(path.join(appRoot, 'tutorial-script.md'), 'utf8')

  // 1. FloatingPrimitives exports & no duplicate MessageFeed in FloatingPrimitives or OnboardingStage
  for (const exportName of [
    'FloatingInfieMessage',
    'FloatingContinueButton',
    'FloatingField',
    'FloatingButton',
    'FloatingControlGroup',
  ]) {
    assert.match(primitivesSrc, new RegExp(`export (?:function|const) ${exportName}\\b`), `FloatingPrimitives must export ${exportName}`)
  }
  assert.equal(/MessageFeed/.test(primitivesSrc), false, 'FloatingPrimitives must not contain destructive MessageFeed replacement')
  assert.equal(/MessageFeed/.test(stageSrc), false, 'OnboardingStage must not use duplicate MessageFeed')

  // 2. WidgetDock has both invalid duplicate collapseAll helpers removed and supports removable, showDropHint, and data-widget-move-grip
  const collapseAllMatches = dockSrc.match(/const collapseAll\s*=/g) || []
  assert.equal(collapseAllMatches.length, 0, 'WidgetDock must have both invalid duplicate collapseAll helpers removed')
  assert.match(dockSrc, /removable\?:\s*boolean/)
  assert.match(dockSrc, /showDropHint\?:\s*boolean/)
  assert.match(dockSrc, /\[data-widget-move-grip\]/)

  // 3. Bundle revealLedger and onboardingTiming in-memory via esbuild to verify runtime exports & timing helpers
  const esbuild = await import('esbuild')
  const built = await esbuild.build({
    stdin: {
      contents: `export * from './revealLedger.ts'; export * from './onboardingTiming.ts';`,
      resolveDir: onboardingDir,
      loader: 'ts',
    },
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'neutral',
    define: { 'import.meta.env.BASE_URL': '"/"' },
  })
  const dataUrl = `data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text).toString('base64')}`
  const mod = await import(dataUrl)

  assert.match(contextSrc, /currentBeat === "B08"[\s\S]*turns 1-3/, 'OnboardingContext B08 must handle Project & Session Flow turns 0..3')
  assert.equal(mod.B18_MOVE_TURN, 0)
  assert.equal(mod.B18_PANELS_TURN, 1)
  assert.equal(mod.B18_SLIDERS_TURN, 2)
  assert.equal(mod.B18_OPEN_WIDGETS_TURN, 3)
  assert.equal(mod.B18_LIBRARY_TURN, 4)
  assert.equal(mod.B18_EXPLORE_TURN, 5)
  assert.equal(mod.B18_LINES.length, 6, 'Widgets & Whatnot must have 6 turns')

  // The old combined-tour segues are gone, along with their dwell timers.
  assert.equal(mod.B17_TO_UI_SEGUE, undefined)
  assert.equal(mod.B18_TO_SURFACES_SEGUE, undefined)
  assert.equal(mod.B18_SEGUE_TURN, undefined)
  assert.doesNotMatch(stageSrc, /B17_TO_UI_SEGUE|B18_TO_SURFACES_SEGUE/)

  // Pre-dock bottom offset responsive custom property
  assert.equal(mod.PREDOCK_BOTTOM_OFFSET, 'var(--i2-predock-bottom, 14vh)')
  assert.match(cssSrc, /--i2-predock-bottom:\s*14vh/)
  assert.match(cssSrc, /min-width:\s*1500px[\s\S]*--i2-predock-bottom:\s*10vh/)
  assert.match(cssSrc, /min-width:\s*1800px[\s\S]*--i2-predock-bottom:\s*7\.5vh/)
  assert.match(cssSrc, /min-width:\s*2300px[\s\S]*--i2-predock-bottom:\s*5\.5vh/)

  // 4. Synchronized copy checks across runtime and tutorial-script.md
  const requiredCopy = [
    // Meet Infie
    "What a noob.",
    "Tell me a little about what you like to build and why.",
    "I don't do much coding myself. I'll bet you don't either, or we wouldn't be talking. i² helps you focus on the big picture, but I won't hide your files or make them hard to edit by hand. Your ideas and abilities are what make you special and awesome. I'm here to amplify that.",
    "Oh yea, that's my jam. Your music player can live here for now. You can also connect a music streaming service later in settings.",
    "Your music player will be right here when you want it and comes preloaded with some smooth Lo-fi but you can connect a music streaming service later.",
    "I'm all ears if you want to speak conversationally. The built-in music will automatically turn down while either of us is talking, but you can configure push-to-talk later in settings.",
    "Prefer a joystick and programmable keypad? You can do that too.",
    "I'm your orchestrator, coordinator, question-answerer, and maybe friend. I take the boring stuff out of building and show you what you need when you need it.",
    "I help manage your tasks and projects, even after weeks away. I know version control like Git, Perforce and Diversion, but you don't need it to use i². Think of me as your partner-in-crime, your right hand.",
    "You can ask me for help with any part of the IDE just by holding the hotkeys and clicking it. Even individual words or phrases in Session Agent chats! I'll explain things in a way that makes sense to you. I'll get to what Session Agents are later.",
    "Here's how navigation works: i² takes you Home, Project shows your current project, and a Session is a space for a feature, fix, or experiment. Those buttons are handy dropdowns. If you use Git, I'll manage separate worktrees. If not, no problem! You can start Sessions just by talking to me.",
    "I am run by an open-weight LLM plus a decision model, like Jev, on iSquared's server which is included in your plan. I also have a set of deterministic actions to control the UI and state of projects when appropriate, so that I stay consistent. If you want to give me an upgrade with a local or frontier model, you can do so later in settings, so long as the model meets the minimum requirements I need.",
    "Click Learn for tutorials and lessons, and Widgets to customize your workspace. Games unlock at level five, take your level into account and pause when I need you to review something. They're a fun way to wait for Session Agents. You can submit a tutorial, widget or game to the Infinite Intelligence too!",
    "Your alerts, notifications and settings live here. I'll also help you manage the Global To-Do list.",
    "This is i² Home.",
    "Here you can talk with me about whatever you want, or use our conversation in a project. I can also help you manage our Global To-Do list: it includes open project tasks and reminders like ‘Update SSL certificates on MyWebsite.com.’",
    "I'll present Action Buttons specific to the next steps of your projects to save you time typing.",
    "Learn has the other tutorials whenever you're ready. You can also give me feedback, and I'll send it to the right place and give you a ticket to follow up. Now go build cool shit.",
    "Speaking of… there's your first level. I hope you enjoyed this tutorial, and if you didn't, I don't really care. I got paid either way. Toodles for now.",
    // Project & Session Flow
    "Here you'll work in an i² Workspace. It keeps your project, Sessions, and files organized and light on disk. Version control or not, I've got you covered.",
    "The key to working with i² is the project folder. It holds what we're building, our plans, design choices, and guidelines, so every Session Agent sees the whole application, not just their task.",
    "It's my job to keep these canonical files updated, in sync, and free of contradictions. They're separate from your Sessions, so nothing gets lost.",
    "Behind the scenes, i² Core helps me coordinate our tasks, Sessions, and Session Agents. Optional i² Sync lets your team use the website without Git or the IDE. You control what gets shared.",
    "info.md holds the project's name, purpose, and important details. An agent can ask, or you can start from a template. Teammates can chat with me about it on the website, and I use it to keep your vision in mind.",
    "todo.md is what we want to build, change, or fix. Tell me an idea, or add it yourself. GitHub issues come in too, and when anyone edits Info I add todos so the app follows the design. You can audit me.",
    "style.md is the colors, typography, and look. The Stylist previews it, and your designer can use it on the website too.",
    "guidelines.md tells me, you, your teammates, and the Session Agents how to work. It's the most technical file you edit. I'll handle the extra handoff files, silly human.",
    "This is Project Home. Click the project name to switch, or head back to i² Home. Right-click a project to open it in a new window. Work keeps going while you switch. Don't overload your brain. That's what I'm here for.",
    "I can work with multiple projects at once. If Project A needs something new in Project B, I'll make a worktree for each, a master plan, a plan per project, and a shared session so we can catch errors before you test.",
    "Your roadmap and Sessions live here. I help with planning, version control, branches, worktrees, the next step, and research so the plan stays current.",
    "When a Session Agent has a question, I'll bring it to you here. You can reply without opening the Session. Try it.",
    "Or click the Session name and talk to the Session Agent directly. Let's do that now.",
    "Each Session has Session Agents working on it. Pick the model: ready-made agents, your own, or imported ones. i² is where they work together.",
    "Me, the Session Agents, and any other agents you bring in work through the iSquared MCP and tools. We block dangerous mistakes, steer around pitfalls, and put best practices to work.",
    "Simulators are built in, too. Session Agents use them to check their own work, and you can use them to see it yourself.",
    "Tasks come in two groups: Session Agent tasks and Human tasks. You're the human. This one's ready for you to verify. Click on all open tasks to mark them complete.",
    "Here's the Session Completion Form. I've filled in most of it. Check the corrections, add feedback, and hit Submit. Free plans need one; paid users can contribute too. Auto-submit on merge in Settings still counts.",
    "These forms boost your level while you work. Corrections go back to iSquared, not your codebase. How many open Sessions you can leave unsubmitted depends on your level and plan.",
    "We're also exploring quantum machine learning alongside the regular analysis. It's research; nothing you build depends on it. Forms, donors, and paid users help keep i² running, and my creator is grateful to the open-source and free-education communities.",
    "Submitted. Next I close the session: its branches are merged and cleaned up, both locally and on the remote, barring your approval.",
    "The website lets even your non-technical teammates join in too, without the desktop app or the codebase. The mobile app brings notifications, updates, and chat, and you can open your environments on mobile, the website, or in VR.",
    "If your project didn't start in i², I'll onboard it for you. I'll offer a tutorial when you do something new here.",
    // Widgets & Whatnot
    "Everything's a widget here. Move it, resize it, close it, bring it back. More screens or a VR headset? Spread out. You can have as many windows as you want, and iSquared supports fullscreen multiple-screen layout saves. Let's try it with a widget.",
    "You can drag panel edges to resize them or collapse a panel completely. Double-click my chat header or tab bar anytime to collapse all panels and focus on our conversation, then double-click again to bring them back.",
    "Preference Sliders apply to all models in all conversations. Find them in Widgets any time. How fast would you like the text? Try the Speed slider—even while I'm talking. Close this when you're done.",
    "Click Widgets in the header to see everything else you can add to your workspace.",
    "One of my favorites is the Library: screens, flows, components, and packages that fit your project.",
    "Explore the rest of the widgets on your own!",
  ]

  // Exact wording the proposal deletes or replaces (moved lines are listed above in their new tutorial).
  const removedCopy = [
    "This onboarding tutorial may take around 15 minutes",
    "I've filled in some dummy data for this tutorial. Let's open one.",
    "So that's the flow of a session, now onto the rest of the UI.",
    "This IDE is just one surface of iSquared.",
    "I'm going to help you build amazing projects. I hope you're ready.",
    "I actually don't do much coding myself. I bet you don't either",
    "I'm your orchestrator, coordinator, middle-man",
    "I'm an expert at version control like Git, Perforce, Diversion, and more.",
    "That's also how navigation works. Project changes to the name of your current project.",
    "Whenever you want more tutorials and lessons, click Learn in the header.",
    "A combined list of alerts (Global Todo Widget)",
    "You can do a lot from here and then get deeper as needed.",
    "We're now in i² Home.",
    "When anyone edits project Info, I add project Todo items so the app reflects the changes in the grand design. You can view this and keep me in check.",
    "That's about it to get started. This prototype has one more tutorial",
    "Games unlock at level five, so hop to it.",
    "I hope this gives you everything you could need but please submit feedback directly to me",
    "Don't worry about what that means as I'll prompt you with a tutorial any time you do something new here. For now, let's head Home.",
    "Try moving the music player to the bottom panel underneath this chat.",
    "This is the Session Completion Form. I do most of the work.",
    "If you're on the free plan, session completion forms are required",
    "Either way, the corrected actions are what get sent back to improve iSquared",
    "iSquared is also exploring quantum computing: quantum machine learning runs in tandem",
    "Session Completion Forms, donors, and paid users are what keep this experience running.",
    "For which my creator is eternally grateful to the community.",
  ]

  for (const snippet of requiredCopy) {
    assert.ok(
      stageSrc.includes(snippet) || ledgerSrc.includes(snippet),
      `Runtime onboarding source must include exact copy: "${snippet.slice(0, 60)}..."`
    )
    assert.ok(
      transcriptSrc.includes(snippet),
      `tutorial-script.md must include exact copy: "${snippet.slice(0, 60)}..."`
    )
  }

  for (const snippet of removedCopy) {
    assert.equal(stageSrc.includes(snippet) || ledgerSrc.includes(snippet), false, `Removed copy must be gone from runtime: "${snippet.slice(0, 60)}..."`)
    assert.equal(transcriptSrc.includes(snippet), false, `Removed copy must be gone from tutorial-script.md: "${snippet.slice(0, 60)}..."`)
  }

  assert.equal(stageSrc.includes('other Session Agents'), false, 'B09-3 must not say "other Session Agents"')
  // Global To-Do stays in Meet Infie: the notifications line (B11) and the Home chat line (B12).
  assert.match(stageSrc, /I'll also help you manage the Global To-Do list\./)
  assert.match(stageSrc, /I can also help you manage our Global To-Do list: it includes open project tasks/)

  // 5. B15 both-tasks gate in App.tsx SessionScreen
  assert.match(appSrc, /if \(becomingDone && \(!isTutorialActive \|\| nextTests\.every\(x => x\.done\)\)\)/)

  // 6. Widgets & Whatnot: music stays put (no move gate), Widgets button gate, floating callout only
  assert.equal((appSrc.match(/const musicAsWidget = true/g) || []).length, 2)
  assert.match(
    stageSrc,
    /currentBeat === "B18"[\s\S]*?revealGroup\(\["music_play_only", "music_full_player", "widget_move_resize"\]\)/,
    'OnboardingStage B18 cue must keep music_play_only and music_full_player alongside widget_move_resize'
  )
  assert.match(contextSrc, /const MUSIC_GROUPS: readonly RevealGroupId\[\] = \["music_play_only", "music_full_player", "widget_move_resize"\]/)
  assert.match(contextSrc, /currentBeat === "B18"[\s\S]*?revealGroup\(MUSIC_GROUPS\)/)
  assert.doesNotMatch(appSrc, /musicInBottom|isB18MoveTurn/, 'Widgets & Whatnot never asks the user to move the music player')
  assert.match(stageSrc, /setTurnIndex\(B18_PANELS_TURN\)/)
  assert.match(appSrc, /setTurnIndex\(B18_LIBRARY_TURN\)/)
  assert.match(leekSrc, /onMoveToBottomPanel\?:\s*\(\)\s*=>\s*void/)
  assert.match(stageSrc, /widgetsGalleryLive && turnIndex === B18_LIBRARY_TURN/)
  assert.match(stageSrc, /onDismissWidgetsGallery\?\.\(\)/)
  assert.doesNotMatch(stageSrc, /turnIndex === B18_LIBRARY_TURN \|\| turnIndex === B18_EXPLORE_TURN/)
  assert.match(stageSrc, /const isFloatingCallout =\s*currentBeat === "B18" &&\s*\(turnIndex === B18_MOVE_TURN \|\| !widgetsTourInProject \|\| slidersCoversChat \|\| galleryCoversChat\);/)
  assert.match(stageSrc, /ProjectFilePreview file="info"/)
  assert.match(stageSrc, /ProjectFilePreview file="todo"/)
  assert.match(stageSrc, /autoAdvancedFor\.current === currentMessageId/)
  assert.match(stageSrc, /settledAdvancedFor\.current === turnKey/)
  assert.match(stageSrc, /isEarlyCenterStage \|\|\s*isFloatingCallout \|\|/, 'the callout never writes into the docked chat')
  assert.match(stageSrc, /<WidgetArrangeDemo reducedMotion=\{reducedMotion\} \/>/)

  // 7. The Generate button no longer glows: Meet Infie's close points to Learn instead.
  assert.doesNotMatch(appSrc, /glow=\{isTutorialActive && currentBeat === "B20"/)
  assert.match(appSrc, /const highlightTutorialsNav = meetInfieActive && currentBeat === "B20";/)
})
