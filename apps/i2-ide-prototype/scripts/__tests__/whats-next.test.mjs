import test from 'node:test'
import assert from 'node:assert/strict'

const wn = await import('../../src/app/home/whatsNext.ts')
const petData = await import('../../src/app/pet/petSessionData.ts')
const flow = await import('../../src/tutorial/flow.ts')
const imported = await import('../../src/app/home/importedProject.ts')

const { scanOpenProjects, whatsNextSummary, WHATS_NEXT_MAX_RECOMMENDATIONS } = wn
const { createInitialPetReplayState, petReplayReducer, PET_WRAP_UP_STEPS, PET_CODING_DURATION_MS } = petData
const { createInitialFlowState, flowReducer } = flow

const petInput = (s, remainingSeconds = 0) => ({
  status: s.status,
  wrapUpPhase: s.wrapUpPhase,
  mainUpdated: s.mainUpdated,
  remainingSeconds,
})
const noExperimemo = { projectCreated: false, stage: 'starter', session: null }
const scan = (pet, extra = {}) =>
  scanOpenProjects({ pet: petInput(pet), importedLive: false, experimemo: noExperimemo, ...extra })

function petAt(target) {
  let s = createInitialPetReplayState()
  const steps = [
    ['PLAN REVIEW', () => petReplayReducer(s, { type: 'APPROVE_PLAN', now: 0 })],
    ['CODING', () => petReplayReducer(s, { type: 'TICK', now: PET_CODING_DURATION_MS })],
    ['WAITING ON TEST', () => petReplayReducer(s, { type: 'TEST_APP' })],
    ['NEEDS YOU', () => {
      let n = s
      for (const c of n.checklist) n = petReplayReducer(n, { type: 'TOGGLE_CHECKLIST', id: c.id })
      return petReplayReducer(n, { type: 'VERIFY_TESTING' })
    }],
    ['VERIFIED', () => petReplayReducer(s, { type: 'OPEN_PR' })],
  ]
  for (const [status, advance] of steps) {
    if (s.status === target) return s
    assert.equal(s.status, status)
    s = advance()
  }
  return s
}

function petWrapUp(phase) {
  let s = petAt('PR OPEN')
  if (phase === 'none') return s
  s = petReplayReducer(s, { type: 'START_WRAP_UP' })
  if (phase === 'polling') return s
  for (let i = 0; i < PET_WRAP_UP_STEPS.length; i++) s = petReplayReducer(s, { type: 'WRAP_UP_STEP' })
  assert.equal(s.wrapUpPhase, 'green')
  return s
}

const merged = () => petReplayReducer(petWrapUp('green'), { type: 'MERGE_PR' })
const complete = () => petReplayReducer(merged(), { type: 'SUBMIT_BLANK_REPORT' })

test('Pet recommendation follows the real Add Comments lifecycle, one per state', () => {
  const cases = [
    [petAt('PLAN REVIEW'), /Review Plan/, 'session'],
    [petAt('CODING'), /Check on/, 'session'],
    [petAt('WAITING ON TEST'), /Test App/, 'session'],
    [petAt('NEEDS YOU'), /Checklist/, 'session'],
    [petAt('VERIFIED'), /Open PR/, 'session'],
    [petWrapUp('none'), /^Wrap up$/, 'session'],
    [petWrapUp('polling'), /Check on/, 'session'],
    [petWrapUp('green'), /^Merge$/, 'session'],
    [merged(), /Submit Report/, 'session'],
    [complete(), /Update Main or Reconcile/, 'project'],
  ]
  for (const [state, label, kind] of cases) {
    const r = scan(state).recommendations
    assert.equal(r.length, 1, state.status)
    assert.equal(r[0].id, 'pet')
    assert.match(r[0].actionLabel, label, `${state.status}/${state.wrapUpPhase}`)
    assert.equal(r[0].destination.kind, kind)
    assert.equal(r[0].destination.projectId, 'pet')
    if (kind === 'session') assert.equal(r[0].destination.sessionId, 'add-comments')
  }
  // The retired ambiguous "Check Project" step never appears.
  for (const [state] of cases) assert.equal(/Check Project/.test(JSON.stringify(scan(state))), false)
})

test('Pet after Update Main is finished: no recommendation, conversational no-pending line only', () => {
  const done = petReplayReducer(complete(), { type: 'UPDATE_MAIN' })
  const result = scan(done)
  assert.equal(result.recommendations.length, 0)
  assert.match(result.lines[0], /Add Comments is complete and main is updated — no pending items/)
  assert.match(whatsNextSummary(result), /Nothing is waiting on you/)
  // Reconcile after the update doesn't resurrect it.
  assert.equal(scan(petReplayReducer(done, { type: 'RECONCILE' })).recommendations.length, 0)
  // Reconcile before Update Main keeps the project-level choice open.
  const reconciled = petReplayReducer(complete(), { type: 'RECONCILE' })
  assert.match(scan(reconciled).recommendations[0].actionLabel, /Update Main/)
})

test('CODING recommendation reports the live remaining seconds', () => {
  const s = petAt('CODING')
  const r = scanOpenProjects({ pet: petInput(s, 17), importedLive: false, experimemo: noExperimemo })
  assert.match(r.recommendations[0].message, /17s left/)
  assert.match(r.lines[0], /17s left/)
})

test('Not Hotdog always gets an explicit no-pending line and never an action', () => {
  for (const state of [petAt('PLAN REVIEW'), complete()]) {
    const result = scan(state)
    assert.ok(result.lines.includes('Not Hotdog: no pending items.'))
    assert.equal(result.recommendations.some((r) => /hotdog/i.test(JSON.stringify(r))), false)
  }
})

test('imported Field Notes appears only once imported and opens its project to review sessions', () => {
  assert.equal(scan(petAt('PLAN REVIEW')).recommendations.some((r) => r.id === 'field-notes'), false)
  const result = scan(petAt('PLAN REVIEW'), { importedLive: true })
  const fn = result.recommendations.find((r) => r.id === 'field-notes')
  assert.ok(fn)
  assert.deepEqual(fn.destination, { kind: 'project', projectId: imported.IMPORT_PROJECT_ID })
  assert.match(fn.actionLabel, /Review sessions/)
  assert.equal(fn.session, undefined)
  assert.match(result.lines.join('\n'), new RegExp(`${imported.IMPORTED_SESSIONS.length} sessions open`))
  assert.equal(/complete|merged|done/i.test(fn.message), false, 'no imaginary completed work')
})

function experimemoAt(stop) {
  let s = flowReducer(createInitialFlowState(), { type: 'CREATE_PROJECT' })
  if (stop === 'starter') return s
  s = flowReducer(s, { type: 'WHATS_NEXT' })
  if (stop === 'scanning') return s
  // Drain the scripted home lane up to plan-ready.
  for (let i = 0; i < 200 && s.stage !== 'plan-ready'; i++) {
    if (s.stage === 'question' || s.stage === 'schema-question') s = flowReducer(s, { type: 'SEND_HOME', text: s.homeDraft })
    else if (s.lanes.home) s = flowReducer(s, s.lanes.home.action)
    else break
  }
  assert.equal(s.stage, 'plan-ready')
  if (stop === 'plan-ready') return s
  s = flowReducer(s, { type: 'START_SESSION' })
  return s
}

test('generated Experimemo (Exact) yields an action only while its work is unfinished', () => {
  assert.equal(scan(petAt('PLAN REVIEW')).recommendations.some((r) => r.id === 'experimemo'), false)

  const starter = scan(petAt('PLAN REVIEW'), { experimemo: experimemoAt('starter') })
  const rec0 = starter.recommendations.find((r) => r.id === 'experimemo')
  assert.deepEqual(rec0.destination, { kind: 'project', projectId: 'experimemo' })

  const planning = scan(petAt('PLAN REVIEW'), { experimemo: experimemoAt('scanning') })
  assert.match(planning.recommendations.find((r) => r.id === 'experimemo').actionLabel, /Continue planning/)

  const ready = scan(petAt('PLAN REVIEW'), { experimemo: experimemoAt('plan-ready') })
  assert.match(ready.recommendations.find((r) => r.id === 'experimemo').actionLabel, /Start Session/)

  const live = experimemoAt('session')
  const sess = scan(petAt('PLAN REVIEW'), { experimemo: live }).recommendations.find((r) => r.id === 'experimemo')
  assert.deepEqual(sess.destination, { kind: 'session', projectId: 'experimemo', sessionId: 'experimemo-session' })
  assert.equal(sess.session, flow.SESSION_NAME)
  assert.match(sess.actionLabel, /^Continue$/, 'first real session action is the delegate Continue')

  const cleaned = { projectCreated: true, stage: 'cleaned-up', session: null }
  const after = scan(petAt('PLAN REVIEW'), { experimemo: cleaned })
  assert.equal(after.recommendations.some((r) => r.id === 'experimemo'), false)
  assert.match(after.lines.join('\n'), /Experimemo: its session is complete and archived — no pending items/)
})

test('max three recommendations in deterministic Pet > Field Notes > Experimemo order', () => {
  const result = scanOpenProjects({
    pet: petInput(petAt('NEEDS YOU')),
    importedLive: true,
    experimemo: experimemoAt('session'),
  })
  assert.equal(WHATS_NEXT_MAX_RECOMMENDATIONS, 3)
  assert.deepEqual(result.recommendations.map((r) => r.id), ['pet', 'field-notes', 'experimemo'])
  assert.match(whatsNextSummary(result), /3 things/)
  assert.equal(new Set(result.recommendations.map((r) => r.id)).size, 3, 'no duplicates')
  // A finished Pet frees its slot without reordering the rest.
  const finished = petReplayReducer(complete(), { type: 'UPDATE_MAIN' })
  const rest = scanOpenProjects({ pet: petInput(finished), importedLive: true, experimemo: experimemoAt('session') })
  assert.deepEqual(rest.recommendations.map((r) => r.id), ['field-notes', 'experimemo'])
})
