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
