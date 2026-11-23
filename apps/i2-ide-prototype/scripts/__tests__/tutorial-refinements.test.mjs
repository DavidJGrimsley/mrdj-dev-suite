// Focused checks for Meet Infie auto-advance, the widgets host project, and chat drafts.
import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const testDir = path.dirname(fileURLToPath(import.meta.url))
const onboardingDir = path.resolve(testDir, '../../src/app/onboarding')

const esbuild = await import('esbuild')
const built = await esbuild.build({
  stdin: {
    contents: `
      export * from './onboardingTiming.ts';
      export * from './widgetsTourProject.ts';
      export * from './chatDraftMemory.ts';
    `,
    resolveDir: onboardingDir,
    loader: 'ts',
  },
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'neutral',
  define: { 'import.meta.env.BASE_URL': '"/"' },
})
const mod = await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text).toString('base64')}`)

const ACTION_BUTTONS = "I'll present Action Buttons specific to the next steps of your projects to save you time typing."
const JOKE = "I don't do much coding myself. I'll bet you don't either, or we wouldn't be talking. i² helps you focus on the big picture, but I won't hide your files or make them hard to edit by hand. Your ideas and abilities are what make you special and awesome. I'm here to amplify that."
const KEYBOARD = 'You can control this IDE in a number of ways. Of course you can use the keyboard and mouse.'
const GAMEPAD = "Or pick up a gamepad if that's more your groove."
const JOYSTICK = 'Prefer a joystick and programmable keypad? You can do that too.'

test('96 characters is short enough to auto-advance, and the cutoff is inclusive', () => {
  assert.equal(mod.MEET_INFIE_SHORT_LINE_CHARS, 96)
  assert.equal(ACTION_BUTTONS.length, 96)
  assert.equal('This is i² Home.'.length < 96, true)
  assert.ok(JOKE.length > 96)
  assert.equal(KEYBOARD.length <= 96, true)
  const qualifies = (line, extras = {}) => mod.meetInfieAutoAdvance({
    activeTutorial: 'meet-infie',
    beat: 'B12',
    readingTurn: true,
    consecutiveAutos: 0,
    line,
    ...extras,
  })
  assert.equal(qualifies(ACTION_BUTTONS), true)
  assert.equal(qualifies('x'.repeat(97)), false)
  assert.equal(qualifies('What a noob.', { beat: 'B03' }), true)
  assert.equal(qualifies('N'.repeat(160), { beat: 'B03', consecutiveAutos: 0 }), true)
  assert.equal(qualifies('What a noob.', { beat: 'B03', consecutiveAutos: 2 }), false)
  assert.equal(qualifies('Short line.', { activeTutorial: 'project-session' }), false)
  assert.equal(qualifies('Short line.', { readingTurn: false }), false)
})

test('reading dwell starts from the revealed text and has a floor', () => {
  assert.equal(mod.readingDwellMs('What a noob.'), 1200)
  assert.equal(mod.readingDwellMs('one two three four five six'), 1320)
  assert.equal(mod.readingDwellMs('hi', 2600), 2600)
})

test('Meet Infie never auto-advances three informational lines in a row', () => {
  const lines = [
    ['B12', 'Let me scoot over and make some room.'],
    ['B12', 'This is i² Home.'],
    ['B12', 'You can resume projects that are already onboarded to iSquared.'],
    ['B12', 'You can also start new projects or onboard existing ones to iSquared.'],
    ['B12', "Here you can talk with me about whatever you want, or use our conversation in a project. I can also help you manage our Global To-Do list: it includes open project tasks and reminders like ‘Update SSL certificates on MyWebsite.com.’"],
    ['B12', ACTION_BUTTONS],
    ['B20', 'Learn has the other tutorials whenever you\'re ready. You can also give me feedback, and I\'ll send it to the right place and give you a ticket to follow up. Now go build cool shit.'],
    ['B06', KEYBOARD],
    ['B06', GAMEPAD],
    ['B06', JOYSTICK],
  ]
  let consecutive = 0
  const autos = []
  for (const [beat, line] of lines) {
    if (beat === 'B06' && line === KEYBOARD) consecutive = 0
    if (beat === 'B12' && line.startsWith('You can also start')) consecutive = 0
    if (beat === 'B12' && line === ACTION_BUTTONS) consecutive = 0
    const auto = mod.meetInfieAutoAdvance({
      activeTutorial: 'meet-infie',
      beat,
      readingTurn: true,
      consecutiveAutos: consecutive,
      line,
    })
    autos.push(auto)
    consecutive = auto ? consecutive + 1 : consecutive
  }
  assert.deepEqual(autos, [
    true, true, false,
    true, false, true, false,
    true, true, false,
  ])
})

test('the widgets host is the first active usable project', () => {
  const projects = [
    { id: 'experimemo', active: true, wired: true },
    { id: 'pet', active: true, wired: true },
    { id: 'nothotdog', wired: true },
    { id: 'field-notes', active: true, wired: true },
    { id: 'tutorial-demo', active: true, wired: true },
  ]
  const options = {
    demoProjectId: 'tutorial-demo',
    isImported: (id) => id === 'field-notes',
  }
  assert.equal(mod.firstActiveUsableProject(projects, options).id, 'experimemo')
  assert.equal(mod.firstActiveUsableProject(projects.slice(1), options).id, 'pet')
  assert.equal(mod.firstActiveUsableProject([
    { id: 'field-notes', active: true, wired: true },
    { id: 'tutorial-demo', active: true, wired: true },
    { id: 'nothotdog', wired: true },
  ], options), null)
})

test('chat drafts survive a screen change and an empty draft is kept', () => {
  const home = mod.chatDraftKey('home')
  const pet = mod.chatDraftKey('project', 'pet')
  const session = mod.chatDraftKey('session', 'add-comments')
  mod.writeChatDraft(home, 'home note')
  mod.writeChatDraft(pet, 'pet note')
  mod.writeChatDraft(session, 'session note')
  assert.equal(mod.readChatDraft(home), 'home note')
  assert.equal(mod.readChatDraft(pet), 'pet note')
  mod.writeChatDraft(pet, '')
  assert.equal(mod.readChatDraft(pet), '')
  assert.equal(mod.readChatDraft(session), 'session note')
  assert.equal(mod.readChatDraft(mod.chatDraftKey('project', 'other')), '')
})
