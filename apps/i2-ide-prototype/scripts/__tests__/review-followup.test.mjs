import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const read = (rel) => fs.readFileSync(path.join(appRoot, rel), 'utf8')

/** Count top-level string entries in an exported const array without executing the module. */
function constArrayLength(source, name) {
  const start = source.indexOf(`export const ${name}`)
  assert.ok(start >= 0, name)
  const open = source.indexOf('[', start)
  const close = source.indexOf('] as const', open)
  assert.ok(open > start && close > open, name)
  return (source.slice(open + 1, close).match(/^\s*"/gm) || []).length
}

test('review follow-up source contracts for R01-R15', () => {
  const app = read('src/app/App.tsx')
  const stage = read('src/app/onboarding/OnboardingStage.tsx')
  const ledger = read('src/app/onboarding/revealLedger.ts')
  const music = read('src/app/onboarding/LeekBeatsWidget.tsx')
  const css = read('src/styles/widgets.css')
  const sessions = read('src/app/widgets/SessionsPanel.tsx')
  const limitPortal = read('src/app/widgets/prototypeLimit.tsx')
  const limitOverlay = read('src/app/components/PrototypeLimit.tsx')
  const importer = read('src/app/home/ImportProjectFlow.tsx')
  const dock = read('src/app/widgets/WidgetDock.tsx')

  assert.equal(constArrayLength(ledger, 'B17_EXPLANATIONS'), 3)
  assert.equal(constArrayLength(ledger, 'B19_LINES'), 1)
  assert.match(ledger, /These forms boost your level while you work/)
  assert.match(ledger, /my creator is grateful to the open-source and free-education communities that made it possible/)
  assert.match(ledger, /The number of open Sessions without submitted forms depends on your level and plan/)
  assert.match(ledger, /apps in your VR headset/)
  assert.match(stage, /I can work with multiple projects at once/)
  assert.match(stage, /data-name="OnboardingMessageScroller"/)
  assert.match(stage, /data-name="OnboardingRightMargin"/)
  assert.match(stage, /Alt = question · Shift = problem\./)
  assert.match(stage, /open-weight LLM plus a decision model, like Jev/)
  assert.equal(stage.includes('overflow-y-auto w-full max-w-[540px]'), true)

  assert.match(app, /function LiveSimulatorBody/)
  assert.match(app, /data-testid="library-simulator"/)
  assert.match(app, /function simulatorProjectSlug/)
  assert.match(app, /SimulatorSurfaceContext\.Provider/)
  assert.equal((app.match(/const musicAsWidget = true/g) || []).length, 2)
  assert.match(app, /allowPanelFloat=\{false\}/)
  assert.match(app, /whitespace-nowrap">Generate New Project/)
  assert.match(app, /max-w-\[558px\]/)
  assert.match(app, /The built-in i² Curated tracks keep playing/)
  assert.doesNotMatch(app, /musicAsWidget && musicDockWidget/)

  const providers = music.slice(music.indexOf('const PROVIDERS = ['), music.indexOf('const sideRow'))
  assert.match(providers, /\{\s*name:\s*"Brain\.Fm"/)
  assert.ok(providers.indexOf('Brain.Fm') < providers.indexOf('Apple Music'))
  assert.match(music, /i² Curated/)
  assert.match(music, /> Playing</)
  assert.doesNotMatch(music, /Playing from/)
  assert.match(music, /mode !== "panel"/)

  assert.match(css, /font-weight:\s*400/)
  assert.match(css, /font-weight:\s*500/)
  assert.match(css, /font-weight:\s*600/)
  assert.match(css, /font-weight:\s*700/)
  assert.match(css, /unicode-range:\s*U\+2026/)
  assert.doesNotMatch(css, /font-weight:\s*100 900/)

  assert.match(sessions, /grid-cols-2/)
  assert.match(limitPortal, /className="contents"/)
  assert.match(limitOverlay, /data-testid="prototype-limit-modal"/)
  assert.match(limitOverlay, /z-\[10060\]/)
  assert.match(importer, /InfieHeroArtwork/)
  assert.match(importer, /data-testid="import-flow"/)
  assert.match(importer, /data-testid=\{`import-message-\$\{line\.id\}`\}/)
  assert.match(dock, /widget\.id === "music" \? "opacity-100"/)
  assert.match(dock, /onHeaderKeyDown/)
})

test('diagnosed corrections: R01, R04, R10, R14, R15', () => {
  const app = read('src/app/App.tsx')
  const stage = read('src/app/onboarding/OnboardingStage.tsx')
  const ledger = read('src/app/onboarding/revealLedger.ts')
  const playlist = read('src/app/onboarding/leekBeatsPlaylist.ts')
  const sim = read('src/app/components/SimulatorPreview.tsx')
  const ctx = read('src/app/onboarding/OnboardingContext.tsx')

  // R04: Visible playlist title is "i² Curated", track artist remains "Leek Beats"
  assert.match(playlist, /export const PLAYLIST_NAME = "i² Curated";/)
  assert.match(playlist, /artist:\s*"Leek Beats"/)

  // R01: Truthful unavailable state for Android when non-pet project (both idle and active simulated)
  assert.match(sim, /if \(!isPet\) \{[\s\S]*data-testid="simulator-unavailable"[\s\S]*No build to simulate/)
  assert.match(sim, /if \(!isPet && isSimulated\) \{[\s\S]*data-testid="simulator-unavailable"/)
  assert.match(app, /\(type === "web" \|\| type === "android"\) && sim\.web\.kind === "none"/)
  assert.match(app, /sim\.web\.kind === "none"\s*\?\s*\(\s*<div className="h-full w-full"><SimulatorUnavailable/)

  // Keep the conversation directly below Infie, rather than pushed to the bottom.
  const scrollerBlock = stage.slice(stage.indexOf('data-name="OnboardingMessageScroller"'), stage.indexOf('data-name="OnboardingMessageScroller"') + 200)
  assert.doesNotMatch(scrollerBlock, /justify-end|mt-auto/)
  assert.match(scrollerBlock, /overflow-y-auto/)
  assert.match(stage, /break-words shrink-0/)

  // R14: Header Widgets button enabled on project/session to allow restoring removed widgets
  assert.match(app, /widgetsEnabled = !disabled \|\| highlightWidgetsNav \|\| activeLevel === "project" \|\| activeLevel === "session"/)

  // R15 / B19: Seeded reveals and correct initial router state
  assert.match(ledger, /export function getInitialRevealedGroupsForBeat/)
  assert.match(ctx, /getInitialRevealedGroupsForBeat\(initialBeat\)/)
  assert.match(app, /\["B15", "B16", "B17", "B19"\]\.includes\(currentBeat\)\)\s*return "session"/)
})
