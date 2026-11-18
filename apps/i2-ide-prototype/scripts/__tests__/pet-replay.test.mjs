import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const petData = await import('../../src/app/pet/petSessionData.ts')
const localServers = await import('../lib/local-preview-servers.mjs')
const hostedVerify = await import('../lib/verify-hosted-output.mjs')

const {
  createInitialPetReplayState,
  petReplayReducer,
  getRemainingCodingMs,
  getRemainingCodingSeconds,
  getPetPreviewVersionForTarget,
  loadPetReplayState,
  savePetReplayState,
  clearPetReplayState,
  PET_CODING_DURATION_MS,
  PET_SESSION_STORAGE_KEY,
  PET_DIFF_SUMMARY,
  PET_SOURCE_DIFFS,
  PET_AGENT_TASKS_PENDING,
  PET_AGENT_TASKS_DONE,
  PET_PLAN_MD_TEXT,
  PET_REPLAY_TODO_TEXT,
  PET_WRAP_UP_STEPS,
  PET_BLANK_REPORT_NOTICE,
  parsePetReplayState,
} = petData

const {
  PET_PREVIEW_V1_MOUNT,
  PET_PREVIEW_V2_MOUNT,
  PET_PRE_ROUTER_SHIM_MARKER,
  applyPetPreRouterPathShim,
  createPetStaticRequestHandler,
} = localServers

const { verifyHostedOutput } = hostedVerify

const APP_ROOT = path.resolve(import.meta.dirname, '..', '..')

test('Pet replay initializes to PLAN REVIEW with v1 locked, 4 unchecked items, and real PET_V2_READY metadata', async () => {
  const s0 = createInitialPetReplayState()
  assert.equal(s0.status, 'PLAN REVIEW')
  assert.equal(s0.phase, 'plan-review')
  assert.equal(s0.acceptedAt, null)
  assert.equal(s0.deadline, null)
  assert.equal(s0.branchPreviewSelection, 'main')
  assert.equal(s0.testAppOpened, false)
  assert.equal(s0.checklist.length, 4)
  assert.ok(s0.checklist.every((c) => !c.done))
  assert.equal(getPetPreviewVersionForTarget('main', s0), 'v1')
  assert.equal(getPetPreviewVersionForTarget('test', s0), 'v1')
  assert.equal(getPetPreviewVersionForTarget('add-comments', s0), 'v1')

  assert.equal(PET_REPLAY_TODO_TEXT, 'Add comments with Like/Love on comments')
  assert.equal(PET_AGENT_TASKS_PENDING[0].label, 'Add local post comments and per-comment Like/Love reactions')
  assert.equal(PET_AGENT_TASKS_DONE[0].done, true)
  assert.equal(PET_DIFF_SUMMARY.ready, true)
  assert.equal(PET_SOURCE_DIFFS.length, 9)
  assert.match(PET_PLAN_MD_TEXT, /Pet Show and Tell — Comments Implementation Plan/)
  assert.match(PET_PLAN_MD_TEXT, /### 7\. Verification & Export/)

  const syncedPath = path.join(APP_ROOT, 'public', 'workspace-files', 'pet-add-comments.json')
  assert.ok(fs.existsSync(syncedPath), 'public/workspace-files/pet-add-comments.json must exist')
  const synced = JSON.parse(fs.readFileSync(syncedPath, 'utf8'))
  assert.equal(synced.planMd, PET_PLAN_MD_TEXT)
  assert.equal(synced.taskLabel, PET_AGENT_TASKS_PENDING[0].label)
  assert.equal(synced.files.length, PET_SOURCE_DIFFS.length)
  assert.ok(synced.files.every((f) => typeof f.hunk === 'string' && f.hunk.includes('@@')))

  const petGenDir = path.resolve(APP_ROOT, '../../../generated/pet-add-comments-2026-11-16/pet')
  if (fs.existsSync(path.join(petGenDir, 'plan.md'))) {
    const { buildPetArtifactsBundle } = await import('../sync-pet-artifacts.mjs')
    const live = buildPetArtifactsBundle(petGenDir)
    assert.equal(synced.planMd, live.planMd, 'Synced plan.md drifted from Pet generated plan.md')
    assert.equal(synced.taskLabel, live.taskLabel, 'Synced taskLabel drifted from Pet prototype-task-label.txt')
    assert.equal(synced.diffSha256, live.diffSha256, 'Synced diffSha256 drifted from Pet diff-6e17795.patch')
    assert.deepEqual(synced.summary, live.summary, 'Synced numstat drifted from Pet diff-6e17795.patch')
    assert.equal(synced.v2IndexHtmlSha256, live.v2IndexHtmlSha256, 'Synced v2 manifest hash drifted from Pet v2/manifest.json')
  }
})

test('Approve Plan enforces non-skippable 30s deadline before transitioning to WAITING ON TEST', () => {
  const t0 = 1_700_000_000_000
  const s0 = createInitialPetReplayState()
  assert.equal(PET_CODING_DURATION_MS, 30_000)

  // Cannot jump ahead before Approve Plan
  assert.equal(petReplayReducer(s0, { type: 'TEST_APP' }).status, 'PLAN REVIEW')

  const coding = petReplayReducer(s0, { type: 'APPROVE_PLAN', now: t0 })
  assert.equal(coding.status, 'CODING')
  assert.equal(coding.acceptedAt, t0)
  assert.equal(coding.deadline, t0 + 30_000)
  assert.equal(getRemainingCodingMs(coding, t0 + 14_500), 15_500)
  assert.equal(getRemainingCodingSeconds(coding, t0 + 14_500), 16)

  // Cannot skip or open test app during CODING before deadline
  const midTick = petReplayReducer(coding, { type: 'TICK', now: t0 + 29_999 })
  assert.equal(midTick.status, 'CODING')
  assert.equal(petReplayReducer(midTick, { type: 'TEST_APP' }).status, 'CODING')
  assert.equal(petReplayReducer(midTick, { type: 'OPEN_PR' }).status, 'CODING')

  // Deadline reached -> WAITING ON TEST, still keeping v2 unmounted until Test App
  const waiting = petReplayReducer(coding, { type: 'TICK', now: t0 + 30_000 })
  assert.equal(waiting.status, 'WAITING ON TEST')
  assert.equal(waiting.testAppOpened, false)
  assert.equal(getRemainingCodingMs(waiting, t0 + 35_000), 0)
  assert.equal(getPetPreviewVersionForTarget('main', waiting), 'v1')
  assert.equal(getPetPreviewVersionForTarget('test', waiting), 'v1')
  assert.equal(getPetPreviewVersionForTarget('add-comments', waiting), 'v1')
})

function reachVerified(t0 = 1_700_000_000_000) {
  let s = petReplayReducer(createInitialPetReplayState(), { type: 'APPROVE_PLAN', now: t0 })
  s = petReplayReducer(s, { type: 'TICK', now: t0 + 30_000 })
  s = petReplayReducer(s, { type: 'TEST_APP' })
  for (const item of s.checklist) s = petReplayReducer(s, { type: 'TOGGLE_CHECKLIST', id: item.id })
  return petReplayReducer(s, { type: 'VERIFY_TESTING' })
}

function runWrapUp(s) {
  s = petReplayReducer(s, { type: 'START_WRAP_UP' })
  for (let i = 0; i < PET_WRAP_UP_STEPS.length; i += 1) s = petReplayReducer(s, { type: 'WRAP_UP_STEP' })
  return s
}

test('v2 stays unmounted until Test App; checklist gates VERIFIED; MERGED updates test and only Update Main updates main', () => {
  const t0 = 1_700_000_000_000
  let s = petReplayReducer(createInitialPetReplayState(), { type: 'APPROVE_PLAN', now: t0 })
  s = petReplayReducer(s, { type: 'TICK', now: t0 + 30_000 })
  assert.equal(s.status, 'WAITING ON TEST')

  // Clicking Test App mounts v2 on add-comments while keeping main/test on v1
  s = petReplayReducer(s, { type: 'TEST_APP' })
  assert.equal(s.status, 'NEEDS YOU')
  assert.equal(s.testAppOpened, true)
  assert.equal(getPetPreviewVersionForTarget('add-comments', s), 'v2')
  assert.equal(getPetPreviewVersionForTarget('test', s), 'v1')
  assert.equal(getPetPreviewVersionForTarget('main', s), 'v1')

  // Cannot verify until all 4 checklist items are done
  s = petReplayReducer(s, { type: 'TOGGLE_CHECKLIST', id: s.checklist[0].id })
  assert.equal(petReplayReducer(s, { type: 'VERIFY_TESTING' }).status, 'NEEDS YOU')

  for (const item of s.checklist.slice(1)) {
    s = petReplayReducer(s, { type: 'TOGGLE_CHECKLIST', id: item.id })
  }
  s = petReplayReducer(s, { type: 'VERIFY_TESTING' })
  assert.equal(s.status, 'VERIFIED')

  s = petReplayReducer(s, { type: 'OPEN_PR' })
  assert.equal(s.status, 'PR OPEN')
  assert.equal(getPetPreviewVersionForTarget('test', s), 'v1')
  assert.equal(getPetPreviewVersionForTarget('main', s), 'v1')

  s = runWrapUp(s)
  s = petReplayReducer(s, { type: 'MERGE_PR' })
  assert.equal(s.status, 'MERGED')
  assert.equal(getPetPreviewVersionForTarget('test', s), 'v2')
  assert.equal(getPetPreviewVersionForTarget('main', s), 'v1')

  s = petReplayReducer(s, { type: 'SUBMIT_BLANK_REPORT' })
  assert.equal(s.status, 'COMPLETE')
  assert.equal(getPetPreviewVersionForTarget('test', s), 'v2')
  assert.equal(getPetPreviewVersionForTarget('main', s), 'v1', 'report submission must not promote main')

  s = petReplayReducer(s, { type: 'UPDATE_MAIN' })
  assert.equal(getPetPreviewVersionForTarget('main', s), 'v2')
  assert.equal(getPetPreviewVersionForTarget('test', s), 'v2')
})

test('Open PR -> Wrap up polls simulated Doctor/todo/CI/review to green; Merge only after green and only on explicit action', () => {
  let s = petReplayReducer(reachVerified(), { type: 'OPEN_PR' })
  assert.equal(s.status, 'PR OPEN')
  assert.equal(s.wrapUpPhase, 'none')
  assert.match(s.messages.at(-1).content, /Wrap up/)
  assert.doesNotMatch(s.messages.at(-1).content, /Check Project|Review Changes/)

  // No merging, report, or project actions before wrap-up is green
  assert.equal(petReplayReducer(s, { type: 'MERGE_PR' }).status, 'PR OPEN')
  assert.equal(petReplayReducer(s, { type: 'WRAP_UP_STEP' }), s, 'steps do nothing before Wrap up starts')
  assert.equal(petReplayReducer(s, { type: 'SUBMIT_BLANK_REPORT' }).status, 'PR OPEN')
  assert.equal(petReplayReducer(s, { type: 'UPDATE_MAIN' }).mainUpdated, false)

  s = petReplayReducer(s, { type: 'START_WRAP_UP' })
  assert.equal(s.wrapUpPhase, 'polling')
  assert.equal(s.wrapUpStep, 0)
  assert.equal(petReplayReducer(s, { type: 'START_WRAP_UP' }), s, 'Wrap up is not restartable mid-poll')

  assert.deepEqual(PET_WRAP_UP_STEPS.map((x) => x.check), ['doctor', 'todo', 'ci', 'review'])
  for (let i = 0; i < PET_WRAP_UP_STEPS.length; i += 1) {
    assert.equal(petReplayReducer(s, { type: 'MERGE_PR' }).status, 'PR OPEN', `Merge blocked at step ${i}`)
    s = petReplayReducer(s, { type: 'WRAP_UP_STEP' })
    assert.equal(s.wrapUpStep, i + 1)
    assert.equal(s.messages.at(-1).content, PET_WRAP_UP_STEPS[i].message)
  }
  assert.equal(s.wrapUpPhase, 'green')
  assert.equal(s.status, 'PR OPEN', 'green wrap-up never auto-merges')
  assert.match(PET_WRAP_UP_STEPS[0].message, /Simulated `mds doctor --fast`.*0 errors/)
  assert.equal(petReplayReducer(s, { type: 'WRAP_UP_STEP' }), s, 'extra steps after green are ignored')

  s = petReplayReducer(s, { type: 'MERGE_PR' })
  assert.equal(s.status, 'MERGED')
  assert.equal(s.reportSubmitted, false)
  assert.match(s.messages.at(-1).content, /Simulated merge/)
  assert.ok(s.messages.at(-1).content.includes(PET_BLANK_REPORT_NOTICE))
})

test('blank completion report requires explicit submit; Update Main and Reconcile are explicit project-level choices', () => {
  let s = petReplayReducer(runWrapUp(petReplayReducer(reachVerified(), { type: 'OPEN_PR' })), { type: 'MERGE_PR' })
  assert.equal(PET_BLANK_REPORT_NOTICE, 'Nothing to add to Infinite Intelligence was found.')
  assert.equal(petReplayReducer(s, { type: 'UPDATE_MAIN' }), s, 'Update Main unavailable before report submission')
  assert.equal(petReplayReducer(s, { type: 'RECONCILE' }), s, 'Reconcile unavailable before report submission')

  s = petReplayReducer(s, { type: 'SUBMIT_BLANK_REPORT' })
  assert.equal(s.status, 'COMPLETE')
  assert.equal(s.phase, 'complete')
  assert.equal(s.reportSubmitted, true)
  assert.equal(s.mainUpdated, false)
  assert.match(s.messages.at(-1).content, /nothing was added to Infinite Intelligence/)
  assert.equal(petReplayReducer(s, { type: 'SUBMIT_BLANK_REPORT' }), s, 'report submits once')

  const reconciledFirst = petReplayReducer(s, { type: 'RECONCILE' })
  assert.equal(reconciledFirst.reconciled, true)
  assert.equal(reconciledFirst.mainUpdated, false, 'Reconcile never promotes main')
  assert.match(reconciledFirst.messages.at(-1).content, /main is 1 merge behind test/)
  assert.equal(getPetPreviewVersionForTarget('main', reconciledFirst), 'v1')

  s = petReplayReducer(reconciledFirst, { type: 'SELECT_BRANCH_PREVIEW', target: 'test' })
  s = petReplayReducer(s, { type: 'UPDATE_MAIN' })
  assert.equal(s.mainUpdated, true)
  assert.equal(s.branchPreviewSelection, 'main', 'Update Main shows the promoted main preview')
  assert.equal(getPetPreviewVersionForTarget('main', s), 'v2')
  assert.equal(petReplayReducer(s, { type: 'UPDATE_MAIN' }), s, 'Update Main is idempotent')

  s = petReplayReducer(s, { type: 'RECONCILE' })
  assert.match(s.messages.at(-1).content, /`main` and `test` match/)
})

test('wrap-up, report, and project-choice state persist across reload; legacy saved states stay safe', () => {
  const base = petReplayReducer(reachVerified(), { type: 'OPEN_PR' })
  let s = petReplayReducer(base, { type: 'START_WRAP_UP' })
  s = petReplayReducer(s, { type: 'WRAP_UP_STEP' })
  const midPoll = parsePetReplayState(JSON.stringify(s))
  assert.equal(midPoll.status, 'PR OPEN')
  assert.equal(midPoll.wrapUpPhase, 'polling')
  assert.equal(midPoll.wrapUpStep, 1, 'polling resumes from the saved step')

  s = petReplayReducer(runWrapUp(base), { type: 'MERGE_PR' })
  const merged = parsePetReplayState(JSON.stringify(s))
  assert.equal(merged.status, 'MERGED')
  assert.equal(merged.reportSubmitted, false, 'blank report still awaits explicit submit after reload')

  s = petReplayReducer(s, { type: 'SUBMIT_BLANK_REPORT' })
  const complete = parsePetReplayState(JSON.stringify(s))
  assert.equal(complete.reportSubmitted, true)
  assert.equal(complete.mainUpdated, false)
  assert.equal(getPetPreviewVersionForTarget('main', complete), 'v1')

  // Saved by the previous build (no wrap-up fields)
  const strip = (st) => {
    const { wrapUpPhase, wrapUpStep, reportSubmitted, mainUpdated, reconciled, ...rest } = st
    return JSON.stringify(rest)
  }
  const legacyPr = parsePetReplayState(strip(base))
  assert.equal(legacyPr.status, 'PR OPEN')
  assert.equal(legacyPr.wrapUpPhase, 'none', 'legacy PR OPEN must still run Wrap up')
  const legacyMerged = parsePetReplayState(strip({ ...base, status: 'MERGED', phase: 'merged' }))
  assert.equal(legacyMerged.wrapUpPhase, 'green')
  assert.equal(legacyMerged.reportSubmitted, false)
  const legacyComplete = parsePetReplayState(strip({ ...base, status: 'COMPLETE', phase: 'complete' }))
  assert.equal(legacyComplete.reportSubmitted, true)
  assert.equal(legacyComplete.mainUpdated, true, 'legacy COMPLETE already promoted main via the old step')
  assert.equal(getPetPreviewVersionForTarget('main', legacyComplete), 'v2')

  // Garbage wrap-up values are clamped/ignored
  const bogus = parsePetReplayState(JSON.stringify({ ...base, wrapUpPhase: 'exploded', wrapUpStep: 99 }))
  assert.equal(bogus.wrapUpPhase, 'none')
  assert.ok(bogus.wrapUpStep <= PET_WRAP_UP_STEPS.length)
})

test('sessionStorage persists timer deadline across refresh, advances expired deadline on load, and resets only on explicit reset', () => {
  const store = new Map()
  const prevWindow = globalThis.window
  globalThis.window = {
    sessionStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => { store.set(k, String(v)) },
      removeItem: (k) => { store.delete(k) },
    },
  }
  try {
    const t0 = 1_700_000_000_000
    let s = petReplayReducer(createInitialPetReplayState(), { type: 'APPROVE_PLAN', now: t0 })
    s = petReplayReducer(s, { type: 'SELECT_BRANCH_PREVIEW', target: 'test' })
    savePetReplayState(s)
    assert.ok(store.has(PET_SESSION_STORAGE_KEY))

    // Reload at +10s stays CODING with exact remaining deadline and preserved preview target
    const midReload = loadPetReplayState(undefined, t0 + 10_000)
    assert.equal(midReload.status, 'CODING')
    assert.equal(midReload.deadline, t0 + 30_000)
    assert.equal(midReload.branchPreviewSelection, 'test')

    // Reload after >=30s auto-transitions to WAITING ON TEST while still keeping v2 unmounted
    const lateReload = loadPetReplayState(undefined, t0 + 30_001)
    assert.equal(lateReload.status, 'WAITING ON TEST')
    assert.equal(lateReload.testAppOpened, false)
    assert.equal(lateReload.branchPreviewSelection, 'test')

    // Explicit reset clears storage and restarts at PLAN REVIEW
    clearPetReplayState()
    assert.equal(store.has(PET_SESSION_STORAGE_KEY), false)
    const fresh = loadPetReplayState(undefined, t0 + 40_000)
    assert.equal(fresh.status, 'PLAN REVIEW')
    assert.equal(fresh.acceptedAt, null)
  } finally {
    if (prevWindow === undefined) delete globalThis.window
    else globalThis.window = prevWindow
  }
})

test('nested preview mounts, pre-router index.html shim, and verifyHostedOutput checks enforce exact Pet routes', () => {
  assert.equal(PET_PREVIEW_V1_MOUNT, '/iSquared/preview/pet-show-and-tell/v1')
  assert.equal(PET_PREVIEW_V2_MOUNT, '/iSquared/preview/pet-show-and-tell/v2')

  const rawHtml = '<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body><script src="/iSquared/preview/pet-show-and-tell/v1/_expo/static/js/web/entry.js"></script></body></html>'
  const shimmed = applyPetPreRouterPathShim(rawHtml)
  assert.ok(shimmed.includes(PET_PRE_ROUTER_SHIM_MARKER))
  assert.ok(shimmed.indexOf(PET_PRE_ROUTER_SHIM_MARKER) < shimmed.indexOf('entry.js'))
  assert.equal(applyPetPreRouterPathShim(shimmed), shimmed, 'shim injection is idempotent')

  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'i2-pet-verify-'))
  try {
    fs.writeFileSync(path.join(tmpRoot, 'index.html'), '<!DOCTYPE html><html><head></head><body><script type="module" src="/iSquared/assets/main.js"></script></body></html>')
    for (const version of ['v1', 'v2']) {
      const dir = path.join(tmpRoot, 'preview', 'pet-show-and-tell', version)
      fs.mkdirSync(path.join(dir, '_expo', 'static', 'js'), { recursive: true })
      fs.writeFileSync(
        path.join(dir, 'index.html'),
        applyPetPreRouterPathShim(`<!DOCTYPE html><html><head></head><body><script src="/iSquared/preview/pet-show-and-tell/${version}/_expo/static/js/app.js" defer></script></body></html>`),
      )
      fs.writeFileSync(path.join(dir, '_expo', 'static', 'js', 'app.js'), 'console.log("ok");\n')
      fs.writeFileSync(path.join(dir, 'metadata.json'), '{"bundler":"metro","fileMetadata":{"web":{"assets":[]}}}')
    }
    const ok = verifyHostedOutput({ dir: tmpRoot, basePath: '/iSquared/', requirePetPreviews: true })
    assert.equal(ok.errors.length, 0, ok.errors.join('\n'))

    // Missing shim fails verification
    fs.writeFileSync(
      path.join(tmpRoot, 'preview', 'pet-show-and-tell', 'v2', 'index.html'),
      '<!DOCTYPE html><html><head></head><body><script src="/iSquared/preview/pet-show-and-tell/v2/_expo/static/js/app.js" defer></script></body></html>',
    )
    const bad = verifyHostedOutput({ dir: tmpRoot, basePath: '/iSquared/', requirePetPreviews: true })
    assert.ok(bad.errors.some((msg) => msg.includes('shim')))
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true })
  }
})

test('Pet preview handler falls back to the root document for client routes but 404s missing assets', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'i2-pet-handler-'))
  try {
    fs.writeFileSync(path.join(root, 'index.html'), '<!DOCTYPE html><html><head></head><body>root</body></html>')
    fs.mkdirSync(path.join(root, '_expo'))
    fs.writeFileSync(path.join(root, '_expo', 'app.js'), 'console.log(1)')
    const handler = createPetStaticRequestHandler(root)
    const request = (url) =>
      new Promise((resolve) => {
        const res = {
          status: 0,
          headers: {},
          writeHead(status, headers) { this.status = status; this.headers = headers },
          end(body) { resolve({ status: this.status, headers: this.headers, body: body == null ? '' : String(body) }) },
        }
        void handler({ method: 'GET', url }, res)
      })

    const route = await request('/post/abc123')
    assert.equal(route.status, 200)
    assert.match(route.body, /root/)
    assert.ok(route.body.includes(PET_PRE_ROUTER_SHIM_MARKER), 'fallback document is shimmed')
    assert.equal((await request('/_expo/app.js')).status, 200)
    assert.equal((await request('/_expo/missing.js')).status, 404)
    assert.equal((await request('/assets/missing.png')).status, 404)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test('source contracts keep unguided Home/GlobalToDo clean, Not Hotdog at 0 sessions, and tutorial frozen', () => {
  const sim = fs.readFileSync(path.join(APP_ROOT, 'src', 'app', 'widgets', 'simulator.tsx'), 'utf8')
  const files = fs.readFileSync(path.join(APP_ROOT, 'src', 'app', 'widgets', 'workspaceFiles.tsx'), 'utf8')
  const app = fs.readFileSync(path.join(APP_ROOT, 'src', 'app', 'App.tsx'), 'utf8')

  assert.match(sim, /PET_WEB_PREVIEW_V1[\s\S]*?\/iSquared\/preview\/pet-show-and-tell\/v1\/index\.html/)
  assert.match(sim, /PET_WEB_PREVIEW_V2[\s\S]*?\/iSquared\/preview\/pet-show-and-tell\/v2\/index\.html/)
  assert.match(files, /if \(projectId === "tutorial-demo"\)[\s\S]*?"feature\/add-comments"[\s\S]*?folders: \["main", "add-comments", "project"\]/)
  assert.match(app, /id: "pet"[\s\S]*?sessions: 1[\s\S]*?id: "nothotdog"[\s\S]*?sessions: 0/)
  assert.match(app, /PROTOTYPE_SESSIONS: ProtoSession\[\] = \[\s*\{\s*id: PET_REPLAY_SESSION_ID[\s\S]*?initial: "PLAN REVIEW"/)
  assert.match(app, /INIT_GLOBAL_TODOS: GlobalTodoItem\[\] = \[[\s\S]*?id: "gt-1",[\s\S]*?text: PET_REPLAY_TODO_TEXT/)
})

test('source contracts: Pet path uses Wrap up / Merge / blank report / Update Main + Reconcile, never Check Project', () => {
  const app = fs.readFileSync(path.join(APP_ROOT, 'src', 'app', 'App.tsx'), 'utf8')
  const petCtx = fs.readFileSync(path.join(APP_ROOT, 'src', 'app', 'pet', 'PetSessionContext.tsx'), 'utf8')
  const petDataSrc = fs.readFileSync(path.join(APP_ROOT, 'src', 'app', 'pet', 'petSessionData.ts'), 'utf8')
  const form = fs.readFileSync(path.join(APP_ROOT, 'src', 'app', 'onboarding', 'SessionCompletionForm.tsx'), 'utf8')

  assert.doesNotMatch(petDataSrc, /Check Project|COMPLETE_SESSION/)
  assert.doesNotMatch(petCtx, /completeSession|COMPLETE_SESSION/)
  assert.doesNotMatch(app, /pet-complete-session-button|petSession\.completeSession/)
  // The only Check Project left in App.tsx is the generic SESSION_FLOW table, not a Pet branch
  assert.equal((app.match(/Check Project/g) || []).length, 1)
  assert.match(app, /MERGED: +\{ label: "Check Project"/)

  assert.match(app, /testId="pet-wrap-up-button"[\s\S]*?label="Wrap up"[\s\S]*?petSession\.startWrapUp\(\)/)
  assert.match(app, /testId="pet-merge-pr-button"[\s\S]*?label="Merge"[\s\S]*?petSession\.mergePr\(\)/)
  assert.match(app, /testId="pet-completion-report"[\s\S]*?blankNotice=\{PET_BLANK_REPORT_NOTICE\}[\s\S]*?petSession\.submitBlankReport\(\);\s*onOpenProject\(\);/)
  assert.match(app, /testId="project-update-main-button"[\s\S]*?label="Update Main"[\s\S]*?petSession\.updateMain\(\)/)
  assert.match(app, /testId="project-reconcile-button"[\s\S]*?label="Reconcile"[\s\S]*?petSession\.reconcile\(\)/)
  // The Experimemo lesson form keeps its learnings variant (no blank notice)
  assert.match(app, /data-testid="lesson-form"[\s\S]*?<SessionCompletionForm\s+key=[^\n]+\s+submitEnabled\s+summaryDefault=\{xs\.lessonSummary\}/)
  assert.match(form, /submitLabel = "Submit"/)
  assert.match(form, /blankNotice \? "" : summaryDefault/)
})
