import test from 'node:test'
import assert from 'node:assert/strict'

const flow = await import('../../src/tutorial/flow.ts')
const viewport = await import('../../src/tutorial/viewport.ts')

const {
  createInitialFlowState,
  flowReducer,
  getPrimaryAction,
  getSessionActions,
  getProgressivePlan,
  getSessionComposerPlaceholder,
  areAllAgentTasksDone,
  areAllHumanTestsDone,
  countCompletedTasks,
  BUNDLE_ANSWER,
  STARTER_MESSAGE,
  SCANNING_MESSAGE,
  QUESTION_MESSAGE,
  SCHEMA_QUESTION_MESSAGE,
  SCHEMA_PROPOSAL_ANSWER,
  PLANNING_START_MESSAGE,
  PLAN_SCRIPT,
  CAMERA_PLAN_MD_BLOCK,
  LESSON_SUMMARY,
  LESSON_ACTION,
  SANITY_HUMAN_TEST_ID,
  SANITY_HUMAN_TEST_LABEL,
  PROVIDERS,
  SESSION_TAB_LABEL,
  SESSION_TAB_ACCESSIBLE_LABEL,
} = flow

const dispatch = (state, action) => flowReducer(state, action)

/** Fire every scheduled lane (stands in for the timers the TutorialProvider owns) until quiet. */
function settle(state, { only } = {}) {
  let guard = 0
  for (;;) {
    const entries = Object.entries(state.lanes).filter(([lane, v]) => v && (!only || only.includes(lane)))
    if (entries.length === 0) return state
    for (const [, lane] of entries) state = dispatch(state, lane.action)
    if (++guard > 300) throw new Error('lanes never settled')
  }
}

function toPlanReady() {
  let st = dispatch(createInitialFlowState(), { type: 'CREATE_PROJECT' })
  st = dispatch(st, { type: 'WHATS_NEXT' })
  st = settle(st) // -> question ("Bundle it!")
  st = dispatch(st, { type: 'SEND_HOME', text: st.homeDraft })
  // -> schema-question ("Let a model propose one.")
  st = dispatch(st, { type: 'SEND_HOME', text: st.homeDraft })
  return settle(st)
}

function toSession() {
  const st = toPlanReady()
  return dispatch(st, { type: 'START_SESSION' })
}

function completeAllWorkersAndTriage(startState) {
  let st = startState
  for (const tab of ['openai', 'infie', 'claude', 'infie', 'gemini']) {
    st = dispatch(st, { type: 'SET_TAB', tab })
    st = settle(st)
  }
  st = dispatch(st, { type: 'FIX_PROBLEMS' })
  st = dispatch(st, { type: 'SET_TAB', tab: 'gemini' })
  st = settle(st)
  return st
}

/** Plays the whole guided session through cleanup and returns seen snapshots. */
function playWholeSession() {
  const seen = []
  let st = toSession()
  seen.push(st)
  st = dispatch(st, { type: 'DELEGATE' })
  seen.push(st)
  st = completeAllWorkersAndTriage(st)
  seen.push(st)

  for (const h of st.session.humanTests) {
    st = dispatch(st, { type: 'TOGGLE_HUMAN_TEST', id: h.id })
  }
  seen.push(st)
  st = dispatch(st, { type: 'OPEN_PR' })
  seen.push(st)
  st = dispatch(st, { type: 'REVIEW_CHANGES' })
  seen.push(st)
  st = dispatch(st, { type: 'START_WRAP_UP' })
  st = settle(st)
  seen.push(st)
  st = dispatch(st, { type: 'PRESENT_CHANGES' })
  seen.push(st)
  st = dispatch(st, { type: 'TOGGLE_HUMAN_TEST', id: flow.SANITY_HUMAN_TEST_ID })
  seen.push(st)
  st = dispatch(st, {
    type: 'SUBMIT_LESSON',
    summary: st.session.lessonSummary,
    correctedAction: st.session.lessonAction,
  })
  seen.push(st)
  st = dispatch(st, { type: 'REQUEST_CLEANUP' })
  seen.push(st)
  st = dispatch(st, { type: 'CONFIRM_CLEANUP' })
  seen.push(st)
  return { final: st, seen }
}

test('nothing exists before Jenny completes: no project, no session, guarded actions are no-ops', () => {
  const st = createInitialFlowState()
  assert.equal(st.projectCreated, false)
  assert.equal(st.session, null)
  assert.deepEqual(st.homeMessages, [])
  for (const action of [
    { type: 'WHATS_NEXT' },
    { type: 'START_SESSION' },
    { type: 'DELEGATE' },
    { type: 'FIX_PROBLEMS' },
    { type: 'SEND_HOME', text: 'Bundle it!' },
    { type: 'SET_TAB', tab: 'openai' },
  ]) {
    const after = dispatch(st, action)
    assert.equal(after.session, null, `${action.type} must not create a session`)
    assert.equal(after.projectCreated, false)
    assert.deepEqual(after.homeMessages, [])
  }
})

test('creating the project shows only Infie starter message; no session, tasks or diffs', () => {
  const st = dispatch(createInitialFlowState(), { type: 'CREATE_PROJECT' })
  assert.equal(st.projectCreated, true)
  assert.equal(st.stage, 'starter')
  assert.equal(st.projectPreviewVersion, 'v1')
  assert.equal(st.session, null)
  assert.equal(st.homeMessages.length, 1)
  assert.equal(st.homeMessages[0].role, 'infie')
  assert.equal(st.homeMessages[0].text, STARTER_MESSAGE)
  assert.equal(dispatch(st, { type: 'START_SESSION' }).session, null)
})

test('What\'s Next -> scanning -> bundle question -> schema question (fixed replies only) -> exact planning line', () => {
  let st = dispatch(createInitialFlowState(), { type: 'CREATE_PROJECT' })
  st = dispatch(st, { type: 'WHATS_NEXT' })
  assert.equal(st.stage, 'scanning')
  assert.equal(st.homeMessages.at(-1).text, SCANNING_MESSAGE)
  assert.equal(dispatch(st, { type: 'WHATS_NEXT' }).homeMessages.length, st.homeMessages.length)
  assert.equal(dispatch(st, { type: 'SET_HOME_DRAFT', value: 'x' }).homeDraft, '')
  assert.equal(dispatch(st, { type: 'SEND_HOME', text: 'x' }).homeMessages.length, st.homeMessages.length)

  st = settle(st)
  assert.equal(st.stage, 'question')
  assert.equal(st.homeMessages.at(-1).text, QUESTION_MESSAGE)
  assert.equal(st.homeDraft, BUNDLE_ANSWER)

  // Fixed reply lock: editing draft or submitting arbitrary text does nothing
  assert.equal(dispatch(st, { type: 'SET_HOME_DRAFT', value: 'One at a time' }).homeDraft, BUNDLE_ANSWER)
  assert.equal(dispatch(st, { type: 'SEND_HOME', text: 'One at a time' }).stage, 'question')

  st = dispatch(st, { type: 'SEND_HOME', text: st.homeDraft })
  assert.equal(st.stage, 'schema-question')
  assert.equal(st.homeMessages.at(-2).role, 'user')
  assert.equal(st.homeMessages.at(-2).text, BUNDLE_ANSWER)
  assert.equal(st.homeMessages.at(-1).text, SCHEMA_QUESTION_MESSAGE)
  assert.equal(st.homeDraft, SCHEMA_PROPOSAL_ANSWER)

  // Schema question fixed reply lock: arbitrary text rejected
  assert.equal(dispatch(st, { type: 'SET_HOME_DRAFT', value: 'Custom schema' }).homeDraft, SCHEMA_PROPOSAL_ANSWER)
  assert.equal(dispatch(st, { type: 'SEND_HOME', text: 'Custom schema' }).stage, 'schema-question')

  st = dispatch(st, { type: 'SEND_HOME', text: st.homeDraft })
  assert.equal(st.stage, 'planning')
  assert.equal(st.homeDraft, '')
  assert.equal(st.homeMessages.at(-2).text, SCHEMA_PROPOSAL_ANSWER)
  assert.equal(st.homeMessages.at(-1).text, 'Starting ping-pong planning with your available providers.')
  assert.equal(st.homeMessages.at(-1).text, PLANNING_START_MESSAGE)

  // double submit during planning does nothing
  assert.equal(dispatch(st, { type: 'SEND_HOME', text: SCHEMA_PROPOSAL_ANSWER }).homeMessages.length, st.homeMessages.length)
})

test('planning progresses through Ping-Pong turns and updates progressive Plan widget data', () => {
  let st = dispatch(createInitialFlowState(), { type: 'CREATE_PROJECT' })
  st = dispatch(st, { type: 'WHATS_NEXT' })
  st = settle(st)
  st = dispatch(st, { type: 'SEND_HOME', text: st.homeDraft })
  st = dispatch(st, { type: 'SEND_HOME', text: st.homeDraft })

  const beforeSnapshot = getProgressivePlan(st.planCursor, st.planNotes)
  assert.equal(beforeSnapshot.schemaFields.length, 0)
  assert.equal(beforeSnapshot.models, null)

  // Step through first planning turn -> schema fields appear
  st = dispatch(st, st.lanes.home.action)
  const step1 = getProgressivePlan(st.planCursor, st.planNotes)
  assert.ok(step1.schemaFields.some((f) => f.includes('hypothesis')))
  assert.match(step1.storageDetail, /experiments\.json/)

  st = settle(st)
  assert.equal(st.stage, 'plan-ready')
  const finalPlan = getProgressivePlan(st.planCursor, st.planNotes)
  assert.ok(finalPlan.screens.length >= 4)
  assert.match(finalPlan.cameraDetail, /device\.camera purpose\.camera/)
  assert.match(finalPlan.cameraDetail, /strings\/en\.json/)
  assert.ok(finalPlan.dependencies.length >= 4)
  assert.equal(finalPlan.models.architectureReview, 'Claude Opus 5.5')
  assert.ok(finalPlan.models.gruntWork.some((g) => /GPT-5\.4 Mini/.test(g)))
  assert.ok(finalPlan.models.gruntWork.some((g) => /Claude Sonnet/.test(g)))
  assert.ok(finalPlan.models.gruntWork.some((g) => /Gemini Flash/.test(g)))

  const planned = st.homeMessages.slice(-PLAN_SCRIPT.length)
  const speakers = planned.map((m) => m.role)
  for (const provider of PROVIDERS) assert.ok(speakers.includes(provider))
  assert.equal(speakers.at(-1), 'infie')
  const text = planned.map((m) => m.text).join('\n')
  assert.match(text, /Claude Opus 5\.5/)
  assert.match(
    text,
    /use the most efficient models available for grunt work while architecture and review will be done by the more capable models\. No top-tier models \(such as Astra or Fable\) are required for this work\./
  )
  assert.doesNotMatch(text, /what are we building/i)
  assert.equal(st.session, null)
})

test('optional plan edits stay local and surface inside Plan widget notes', () => {
  let st = toPlanReady()
  st = dispatch(st, { type: 'SET_HOME_DRAFT', value: 'Please also include timer accuracy tips' })
  st = dispatch(st, { type: 'SEND_HOME', text: st.homeDraft })
  assert.equal(st.stage, 'plan-ready')
  assert.equal(st.session, null)
  assert.deepEqual(st.planNotes, ['Please also include timer accuracy tips'])
  const plan = getProgressivePlan(st.planCursor, st.planNotes)
  assert.deepEqual(plan.notes, ['Please also include timer accuracy tips'])
  assert.doesNotMatch(st.homeMessages.at(-1).text, /replanning|asked (OpenAI|Claude|Gemini)|calling/i)
})

test('session topic labels, sequential glow -> check -> clear, and queued multi-task order', () => {
  assert.equal(SESSION_TAB_LABEL.openai, 'Schema & storage')
  assert.equal(SESSION_TAB_LABEL.claude, 'New, Track & editor')
  assert.equal(SESSION_TAB_LABEL.gemini, 'Photo capture')
  assert.match(SESSION_TAB_ACCESSIBLE_LABEL.openai, /Schema & storage \(OpenAI\)/)

  let st = toSession()
  st = dispatch(st, { type: 'DELEGATE' })
  st = dispatch(st, { type: 'SET_TAB', tab: 'openai' })
  // Advance OpenAI worker lane manually without draining task lane yet
  st = settle(st, { only: ['openai'] })
  // Task starts glowing BEFORE becoming completed!
  assert.equal(st.session.tasks[0].glowing, true)
  assert.equal(st.session.tasks[0].status, 'in_progress')
  assert.equal(st.session.taskGlowPhase, 'glowing')
  assert.ok(st.lanes.task, 'task lane schedules check-off after glow')

  // Even if another task is queued while one is glowing/checked, the queue preserves strict sequential steps
  st = dispatch(st, st.lanes.task.action)
  assert.equal(st.session.tasks[0].status, 'completed')
  assert.equal(st.session.tasks[0].glowing, true)
  assert.equal(st.session.taskGlowPhase, 'checked')

  st = dispatch(st, st.lanes.task.action)
  assert.equal(st.session.tasks[0].glowing, false)
  assert.equal(st.session.taskGlowPhase, 'idle')

  // Verify Claude report elevates projectPreviewVersion to v2
  st = dispatch(st, { type: 'SET_TAB', tab: 'infie' })
  st = dispatch(st, { type: 'SET_TAB', tab: 'claude' })
  st = settle(st)
  assert.equal(st.projectPreviewVersion, 'v2')
  assert.equal(st.session.tasks[1].status, 'completed')
  assert.equal(st.session.tasks[1].glowing, false)
})

test('worker-tab composer appends only to that worker thread and triggers PrototypeLimit without leaving tab', () => {
  let st = toSession()
  st = dispatch(st, { type: 'DELEGATE' })
  st = dispatch(st, { type: 'SET_TAB', tab: 'claude' })
  assert.match(getSessionComposerPlaceholder('claude'), /New, Track & editor \(Claude\)/)

  const beforeInfieLen = st.session.infie.length
  const beforeClaudeLen = st.session.tabs.claude.length
  st = dispatch(st, { type: 'SET_SESSION_DRAFT', value: 'Add validation hint on Track tab' })
  st = dispatch(st, { type: 'SEND_SESSION', text: st.session.tabDrafts.claude })

  assert.equal(st.session.activeTab, 'claude')
  assert.equal(st.session.workerLimitTab, 'claude')
  assert.equal(st.session.infie.length, beforeInfieLen, 'must not route worker composer message to Infie')
  assert.equal(st.session.tabs.claude.length, beforeClaudeLen + 1)
  assert.equal(st.session.tabs.claude.at(-1).role, 'user')
  assert.equal(st.session.tabs.claude.at(-1).text, 'Add validation hint on Track tab')
  assert.equal(st.session.tabDrafts.claude, '')

  st = dispatch(st, { type: 'DISMISS_WORKER_LIMIT' })
  assert.equal(st.session.workerLimitTab, null)
  assert.equal(st.session.activeTab, 'claude')
})

test('camera problem consults multiple models, notes plan.md, removes Yes propose it, and gates PR on both agent and human checks', () => {
  let st = toSession()
  st = dispatch(st, { type: 'DELEGATE' })
  for (const tab of ['openai', 'infie', 'claude', 'infie', 'gemini']) {
    st = dispatch(st, { type: 'SET_TAB', tab })
    st = settle(st)
  }

  assert.equal(st.session.status, 'REVIEW FIXES')
  assert.equal(st.session.tasks[2].status, 'needs_fix')
  assert.match(st.session.tabs.gemini.at(-1).text, /device\.camera purpose\.camera/)
  assert.match(st.session.tabs.gemini.at(-1).text, /strings\/en\.json/)
  assert.match(st.session.tabs.gemini.at(-1).text, /purpose\.camera/)
  assert.match(st.session.tabs.gemini.at(-1).text, /web preview/i)

  const infieText = st.session.infie.map((m) => `${m.sender}: ${m.text}`).join('\n')
  assert.match(infieText, /OpenAI/)
  assert.match(infieText, /Claude/)
  assert.match(infieText, /plan\.md/)
  assert.equal(st.session.planMdNote, CAMERA_PLAN_MD_BLOCK)

  // Fix Problems -> Gemini fixes -> moves directly to NEEDS YOU (no "Yes, propose it." draft)
  st = dispatch(st, { type: 'FIX_PROBLEMS' })
  st = dispatch(st, { type: 'SET_TAB', tab: 'gemini' })
  st = settle(st)
  assert.equal(st.session.cameraFixed, true)
  assert.equal(st.session.tasks[2].status, 'completed')
  assert.equal(st.session.tasks[2].glowing, false)
  assert.equal(st.session.status, 'NEEDS YOU')
  assert.equal(st.session.tabDrafts.infie, '')
  assert.ok(areAllAgentTasksDone(st.session))
  assert.equal(areAllHumanTestsDone(st.session), false)
  assert.deepEqual(getSessionActions(st.session), [], 'Open PR stays hidden until all Human Testing checks pass')
  assert.match(st.session.humanTests[2].text, /photo attachment control in the web preview/i)

  // Open PR appears ONLY when all 3 human tests are also checked off
  st = dispatch(st, { type: 'TOGGLE_HUMAN_TEST', id: 'exp-human-1' })
  st = dispatch(st, { type: 'TOGGLE_HUMAN_TEST', id: 'exp-human-2' })
  assert.equal(st.session.status, 'NEEDS YOU')
  assert.equal(dispatch(st, { type: 'OPEN_PR' }).session.status, 'NEEDS YOU')

  st = dispatch(st, { type: 'TOGGLE_HUMAN_TEST', id: 'exp-human-3' })
  assert.equal(st.session.status, 'VERIFIED')
  assert.deepEqual(getSessionActions(st.session).map((a) => a.key), ['open-pr'])
})

test('PR Review -> Wrap up polling -> Present changes & Auto-merge -> gated multi-lesson form -> Clean up Session -> Confirm retains v2 preview', () => {
  let st = toSession()
  st = dispatch(st, { type: 'DELEGATE' })
  st = completeAllWorkersAndTriage(st)

  for (const h of st.session.humanTests) {
    st = dispatch(st, { type: 'TOGGLE_HUMAN_TEST', id: h.id })
  }
  assert.equal(st.session.lesson, 'none')

  st = dispatch(st, { type: 'OPEN_PR' })
  assert.equal(st.session.status, 'PR OPEN')
  assert.deepEqual(getSessionActions(st.session).map((a) => a.key), ['review-changes'])

  st = dispatch(st, { type: 'REVIEW_CHANGES' })
  assert.equal(st.session.reviewOpen, true)
  assert.equal(st.session.wrapUpPhase, 'ready')
  assert.deepEqual(getSessionActions(st.session).map((a) => a.key), ['wrap-up'])

  // Cannot merge or open form before Wrap up finishes polling to green
  assert.equal(dispatch(st, { type: 'AUTO_MERGE' }).session.status, 'PR OPEN')
  assert.equal(dispatch(st, { type: 'SUBMIT_LESSON', summary: 'x', correctedAction: 'y' }).session.lesson, 'none')

  st = dispatch(st, { type: 'START_WRAP_UP' })
  assert.equal(st.session.wrapUpPhase, 'polling')
  assert.deepEqual(getSessionActions(st.session), [])
  st = settle(st)
  assert.equal(st.session.wrapUpPhase, 'green')
  assert.deepEqual(getSessionActions(st.session).map((a) => a.key), ['auto-merge', 'present-changes'])

  // Branch A: direct Auto-merge from green immediately merges without adding the sanity task
  const directMerged = dispatch(st, { type: 'AUTO_MERGE' })
  assert.equal(directMerged.session.status, 'MERGED')
  assert.equal(directMerged.session.wrapUpPhase, 'merged')
  assert.equal(directMerged.session.lesson, 'form')
  assert.equal(directMerged.session.humanTests.length, 3)

  // Branch B: Present changes returns to normal layout, adds unchecked 'Sanity check app after bug fixes',
  // keeps form blocked while unchecked, and auto-simulates merge as soon as checked (no second Auto-merge).
  st = dispatch(st, { type: 'PRESENT_CHANGES' })
  assert.equal(st.session.presentedChanges, true)
  assert.equal(st.session.reviewOpen, false)
  assert.equal(st.session.wrapUpPhase, 'sanity-check')
  assert.equal(st.session.status, 'PR OPEN')
  assert.equal(st.session.lesson, 'none')
  assert.deepEqual(getSessionActions(st.session), [], 'no second Auto-merge action on Present changes path')
  assert.equal(st.session.humanTests.length, 4)
  assert.deepEqual(st.session.humanTests.at(-1), {
    id: SANITY_HUMAN_TEST_ID,
    text: SANITY_HUMAN_TEST_LABEL,
    done: false,
  })
  // Form & initial human tasks remain locked while sanity task is unchecked
  assert.equal(dispatch(st, { type: 'TOGGLE_HUMAN_TEST', id: 'exp-human-1' }).session.humanTests[0].done, true)
  assert.equal(dispatch(st, { type: 'AUTO_MERGE' }).session.status, 'PR OPEN')
  assert.equal(dispatch(st, { type: 'SUBMIT_LESSON', summary: 'x', correctedAction: 'y' }).session.lesson, 'none')

  // Checking 'Sanity check app after bug fixes' automatically simulates merge & opens multi-lesson form
  st = dispatch(st, { type: 'TOGGLE_HUMAN_TEST', id: SANITY_HUMAN_TEST_ID })
  assert.equal(st.session.humanTests.at(-1).done, true)
  assert.equal(st.session.status, 'MERGED')
  assert.equal(st.session.wrapUpPhase, 'merged')
  assert.equal(st.session.lesson, 'form')
  assert.match(st.session.lessonSummary, /schema & offline store/i)
  assert.match(st.session.lessonSummary, /New\/Track\/Editor/i)
  assert.match(st.session.lessonSummary, /camera permission/i)
  assert.match(st.session.lessonAction, /strings\/en\.json/)
  assert.deepEqual(getSessionActions(st.session), [])

  // Submit form -> single Clean up Session action
  st = dispatch(st, { type: 'SUBMIT_LESSON', summary: LESSON_SUMMARY, correctedAction: LESSON_ACTION })
  assert.equal(st.session.status, 'COMPLETE')
  assert.equal(st.session.lesson, 'approved')
  assert.deepEqual(getSessionActions(st.session).map((a) => a.key), ['cleanup'])

  // Confirm cleanup requires clicking Clean up Session first
  assert.equal(dispatch(st, { type: 'CONFIRM_CLEANUP' }).session !== null, true)
  st = dispatch(st, { type: 'REQUEST_CLEANUP' })
  assert.equal(st.session.cleanupPhase, 'confirm')
  assert.deepEqual(getSessionActions(st.session).map((a) => a.key), ['confirm-cleanup'])

  st = dispatch(st, { type: 'CONFIRM_CLEANUP' })
  assert.equal(st.session, null)
  assert.equal(st.stage, 'cleaned-up')
  assert.equal(st.archivedSessionCount, 1)
  assert.equal(st.projectPreviewVersion, 'v2', 'updated v2 preview persists after session cleanup')
})

test('scripted viewer-facing text never leaks versions, builds, provenance or invented counts', () => {
  const { seen, final } = playWholeSession()
  const texts = []
  const collect = (st) => {
    st.homeMessages.forEach((m) => texts.push(m.text, m.sender, m.badge ?? '', ...(m.details ?? [])))
    if (st.session) {
      st.session.infie.forEach((m) => texts.push(m.text, m.sender, m.badge ?? '', ...(m.details ?? [])))
      PROVIDERS.forEach((p) => st.session.tabs[p].forEach((m) => texts.push(m.text, m.sender, m.badge ?? '', ...(m.details ?? []))))
      texts.push(...st.session.tasks.map((t) => t.label), ...st.session.humanTests.map((t) => t.text), ...st.session.diffs.map((d) => d.name))
    }
  }
  seen.forEach(collect)
  collect(final)
  const all = texts.join('\n')
  assert.doesNotMatch(all, /\bV[12]\b/)
  assert.doesNotMatch(all, /\bMDS\b/)
  assert.doesNotMatch(all, /reference app|existing Experimemo|PR #|commit [0-9a-f]{7}/i)
  assert.doesNotMatch(all, /screens-and-function/)
  assert.doesNotMatch(all, /PhotoShare|Supabase|pet-show/i)
  assert.doesNotMatch(all, /\b\d+ (Bun |unit |Exact web |synthetic |camera |browser )?(tests?|journeys?) passed/i)
  assert.doesNotMatch(all, /\+\d+|-\d+ lines/)
  assert.doesNotMatch(all, /\$ |npm |pnpm |bun |git /i, 'no fabricated commands')
})

test('responsive preview viewports are true CSS sizes and the fit scale never enlarges', () => {
  const { getPreviewViewport, fitScale, DEFAULT_PREVIEW_DEVICE, DEFAULT_PREVIEW_ORIENTATION, PREVIEW_VIEWPORTS } = viewport
  assert.equal(DEFAULT_PREVIEW_DEVICE, 'desktop')
  assert.equal(DEFAULT_PREVIEW_ORIENTATION, 'portrait')
  assert.deepEqual(getPreviewViewport('desktop', 'portrait'), { width: 960, height: 1200 })
  assert.deepEqual(getPreviewViewport('desktop', 'landscape'), { width: 1200, height: 960 })
  assert.deepEqual(getPreviewViewport('mobile', 'portrait'), { width: 390, height: 720 })
  assert.deepEqual(getPreviewViewport('mobile', 'landscape'), { width: 720, height: 390 })
  for (const device of Object.keys(PREVIEW_VIEWPORTS)) {
    const p = getPreviewViewport(device, 'portrait')
    const l = getPreviewViewport(device, 'landscape')
    assert.deepEqual({ width: p.height, height: p.width }, l)
  }
  assert.ok(getPreviewViewport('desktop', 'portrait').width > 768)
  assert.ok(getPreviewViewport('mobile', 'landscape').width < 768 + 1)

  const small = fitScale(getPreviewViewport('desktop', 'portrait'), { width: 312, height: 440 })
  assert.ok(small < 0.4 && small > 0.3, `expected shrink to fit, got ${small}`)
  assert.equal(fitScale({ width: 390, height: 720 }, { width: 5000, height: 5000 }), 1, 'never enlarges')
  assert.equal(fitScale({ width: 390, height: 720 }, { width: 0, height: 0 }), 1, 'unmeasured box falls back to 1')
})
