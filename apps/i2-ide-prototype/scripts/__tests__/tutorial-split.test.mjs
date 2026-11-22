// Source and data contracts for the five-tutorial split (generated/infie-tutorial-split-proposal.md).
// The real-browser walkthrough lives in tutorial-split-browser.test.mjs.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const onboardingDir = path.join(appRoot, 'src', 'app', 'onboarding')
const read = (rel) => fs.readFileSync(path.join(appRoot, rel), 'utf8')

async function loadLedger() {
  const esbuild = await import('esbuild')
  const built = await esbuild.build({
    stdin: { contents: `export * from './revealLedger.ts';`, resolveDir: onboardingDir, loader: 'ts' },
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'neutral',
    define: { 'import.meta.env.BASE_URL': '"/"' },
  })
  return import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text).toString('base64')}`)
}

test('tracks: Meet Infie, Project & Session Flow and Widgets & Whatnot run their own beats in order', async () => {
  const mod = await loadLedger()
  assert.deepEqual(mod.TRACK_BEATS['meet-infie'], ['B00', 'B01', 'B02', 'B03', 'B04', 'B05', 'B06', 'B07', 'B08', 'B10', 'B11', 'B12', 'B20', 'B21'])
  assert.deepEqual(mod.TRACK_BEATS['project-session'], ['B08', 'B09', 'B13', 'B14', 'B15', 'B16', 'B17', 'B19'])
  assert.deepEqual(mod.TRACK_BEATS.widgets, ['B18'])
  assert.equal(mod.trackForBeat('COMPLETE'), null)
  assert.equal(mod.trackForBeat('B08'), 'meet-infie')
  assert.equal(mod.trackForBeat('B12'), 'meet-infie')
  assert.equal(mod.trackForBeat('B20'), 'meet-infie')
  for (const b of ['B09', 'B13', 'B14', 'B15', 'B16', 'B17', 'B19']) assert.equal(mod.trackForBeat(b), 'project-session', b)
  assert.equal(mod.trackForBeat('B18'), 'widgets')
})

test('forms change silently with no two adjacent beats sharing a form inside any tutorial', async () => {
  const mod = await loadLedger()
  for (const [track, beats] of Object.entries(mod.TRACK_BEATS)) {
    const shown = beats.filter((b) => b !== 'B00')
    for (let i = 1; i < shown.length; i += 1) {
      assert.notEqual(mod.BEAT_FORM_MAP[shown[i]], mod.BEAT_FORM_MAP[shown[i - 1]], `${track}: ${shown[i - 1]} -> ${shown[i]}`)
    }
  }
})

test('later tutorials start from the finished shell and stage their own reveals', async () => {
  const mod = await loadLedger()
  const ps = mod.getStartingGroupsForTrack('project-session')
  for (const id of ['header_breadcrumbs', 'header_tutorials_widgets_games', 'level_indicator', 'music_play_only', 'music_full_player']) assert.ok(ps.has(id), id)
  assert.equal(ps.has('project_roadmap_sessions'), false)
  assert.equal(ps.has('session_task_groups'), false)
  assert.equal(mod.getInitialRevealedGroupsForBeat('B13').has('project_roadmap_sessions'), true, 'deep link mid-tour')
  assert.equal(mod.getInitialRevealedGroupsForBeat('B15').has('session_task_groups'), true, 'deep link mid-tour')
  assert.equal('tutorial_demo_project' in mod.REVEAL_LEDGER, false, 'Meet Infie no longer opens a demo project')
  assert.equal(mod.B17_EXPLANATIONS.length, 3)
  assert.equal(mod.B19_FINAL_TURN, 1)
})

test('first-run completion, replay snapshot, and real-state preservation', () => {
  const ctx = read('src/app/onboarding/OnboardingContext.tsx')
  const app = read('src/app/App.tsx')
  // Only the first Meet Infie completion awards the level; a replay restores its snapshot.
  assert.match(ctx, /replaySnapshotRef\.current = replay[\s\S]*?level,[\s\S]*?userProfile,[\s\S]*?connectedModels,/)
  assert.match(ctx, /if \(snapshot\) \{[\s\S]*?setLevel\(snapshot\.level\)[\s\S]*?\} else if \(reason === "completed"\) \{[\s\S]*?setFirstRunComplete\(true\);[\s\S]*?setLevel\(1\)/)
  // The music player stays revealed (and so keeps its position and audio) through a replay.
  assert.match(ctx, /setRevealedGroups\(new Set\(replay \? MUSIC_GROUPS : \[\]\)\)/)
  assert.match(app, /const musicWidgetDocked =\s*!isFirstRunIntro \|\|/)
  assert.match(app, /animateIntro=\{isFirstRunIntro\}/)
  // The plan choice remains gated on the first-run sign-up.
  assert.match(app, /planEligibleRef\.current = false;\s*shownPlanForRunRef\.current = onboardingRunId;/)
  // Learn replays Meet Infie with a snapshot; Generate over an existing project keeps it; Import replays without re-importing.
  assert.match(app, /startOnboarding\(\{ replay: true \}\)/)
  assert.match(app, /if \(!projectCreatedRef\.current\) createProject\(\);/)
  assert.match(app, /\} else if \(importedLive\) \{[\s\S]*?setImportFlowOpen\(true\);/)
  // Project & Session Flow runs on the demo project and returns the user afterwards.
  assert.match(app, /tourReturnRef\.current = \{ route, projectId: activeProjectId, sessionId: activeSessionId \};/)
  assert.match(app, /setActiveProjectId\(TUTORIAL_DEMO_PROJECT\.id\);/)
  assert.match(app, /if \(track === "project-session"\) \{[\s\S]*?setRoute\(back\?\.route \?\? "home"\);/)
})

test('automatic offers: first eligible opening only, never during Generate, Import or another tutorial', () => {
  const app = read('src/app/App.tsx')
  assert.match(app, /const generateOrImportActive =\s*tutorial\.isJennyOpen \|\|\s*pickerOpen \|\|\s*importFlowOpen \|\|\s*\(tutorial\.projectCreated && tutorial\.flow\.stage !== "cleaned-up"\);/)
  assert.match(app, /const canOfferTour = appPhase === "app" && firstRunComplete && !activeTutorial && !generateOrImportActive;/)
  // A pending offer is never shown or accepted during Generate, Import or another tutorial, and
  // is withdrawn (its eligibility handed back) when Generate or Import opens.
  assert.match(app, /const tourOfferBlocked = Boolean\(activeTutorial\) \|\| generateOrImportActive;/)
  assert.match(app, /const acceptTourOffer = \(\) => \{\s*const offer = tourOffer;\s*if \(!offer \|\| tourOfferBlocked\) return;/)
  assert.match(app, /\{tourOffer && !tourOfferBlocked && \(/)
  assert.match(app, /if \(generateOrImportActive && tourOffer\) withdrawTourOffer\(\);/)
  assert.match(app, /setLearnOpen\(false\);\s*withdrawTourOffer\(\);/)
  assert.match(app, /openProjectHome\(\{ \.\.\.IMPORTED_PROJECT \}, \{ suppressTour: true \}\);/)
  assert.match(app, /if \(!opts\?\.suppressTour\) offerProjectTour\(p\.id\);/)
  assert.match(app, /if \(!opts\?\.justStarted\) offerSessionTour\(s\);/)
  assert.match(app, /if \(isWidgetsOpenTurn\) \{[\s\S]*?return;\s*\}\s*offerWidgetsTour\(\);/)
  // Direct session opening -> session portion; the project/files portion is offered next at Project Home.
  assert.match(app, /offersRef\.current\.projectPortionPending = portion === "session";/)
  assert.match(app, /setTourOffer\(\{ kind: "project-session", portion: "project" \}\)/)
  // Jenny's completion navigates without openProjectHome, so it never offers a tour.
  const jenny = app.slice(app.indexOf('setOnJennyCompletedCallback(() => {'), app.indexOf('}, [setOnJennyCompletedCallback, createProject]);'))
  assert.doesNotMatch(jenny, /openProjectHome|offerProjectTour/)
})

test('Learn modal: five tutorials, Education limit, widget-modal fullscreen and close actions', () => {
  const learn = read('src/app/learn/LearnModal.tsx')
  const ids = [...learn.matchAll(/^\s+id: "([a-z-]+)",$/gm)].map((m) => m[1])
  assert.deepEqual(ids, ['meet-infie', 'project-session', 'widgets', 'generate', 'import'])
  for (const title of ['Meet Infie', 'Project & Session Flow', 'Widgets & Whatnot', 'Generate a new project', 'Import project']) {
    assert.match(learn, new RegExp(`title: "${title}"`))
  }
  assert.match(learn, /aria-label="Fullscreen"/)
  assert.match(learn, /aria-label="Close Learn"/)
  assert.match(learn, /e\.key === "Escape"/)
  const app = read('src/app/App.tsx')
  assert.match(app, /const learn = useLearn\(\);\s*const handleTutorials = onTutorials \?\? learn\?\.open/)
  assert.match(app, /Computer science, game development and level-increase lessons belong here\./)
})
