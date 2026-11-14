import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialBlueprint, analyzeInput, generateProjectMemory } from '../../src/jenny/discovery.ts';
import { BrowserPrototypeCreationHost, isDraft, planDigest, verifyApproval } from '../../src/jenny/host.ts';
import { DraftSession, RevisionGate, switchFramework } from '../../src/jenny/session.ts';
import { getFramework } from '../../src/jenny/frameworks.ts';
const bp = () => createInitialBlueprint('exact');
const previous = [{ id: 'u', role: 'user', text: 'Notes app', timestamp: 1 }];
const question = text => [...previous, { id: 'j', role: 'jenny', text, timestamp: 2 }];
test('short answers do not rename and pending REST followup is consumed', () => {
 const first = analyzeInput('An iOS notes app called Atlas with search', bp()).updatedBlueprint;
 assert.equal(first.projectName.value, 'Atlas'); assert.equal(first.elevatorPitch.provenance, 'initial-idea');
 const r = analyzeInput('REST API integration', first, question('Does this app need cloud data syncing, or should it run purely offline / on-device?'));
 assert.equal(r.updatedBlueprint.projectName.value, 'Atlas'); assert.equal(r.updatedBlueprint.dataStorage.value, 'REST API integration');
 assert.equal(r.updatedBlueprint.dataStorage.provenance, 'chat'); assert.ok(!r.reply.includes('Does this app need cloud'));
});
test('iOS-only, Supabase storage, word boundaries, negative and deferred features', () => {
 const r = analyzeInput('iOS only app called Atlas with search and Supabase. Payments later. No notifications. Show details.', bp()).updatedBlueprint;
 assert.deepEqual(r.platforms.value, ['iOS']); assert.equal(r.authentication.status, 'unknown');
 assert.ok(!r.mvpFeatures.value.some(f => /Payments|Notifications|AI Assistant/.test(f)));
 assert.ok(r.deferredFeatures.value.includes('Payments & Billing')); assert.equal(r.deferredFeatures.status, 'deferred');
 assert.ok(r.openDecisions.value.some(f => f.includes('No notifications')));
});
test('pending features/style consumed, proposals and conflicts preserved', () => {
 let r = analyzeInput('Lesson plans and class schedules', bp(), question('What are the 1–3 must-have features for the first usable version?'));
 assert.deepEqual(r.updatedBlueprint.mvpFeatures.value, ['Lesson plans', 'class schedules']);
 r = analyzeInput('Not sure, defer', r.updatedBlueprint, question('Do you have a visual style or theme in mind'));
 assert.equal(r.updatedBlueprint.visualDirection.status, 'deferred'); assert.ok(!r.reply.includes('Do you have a visual style'));
 assert.equal(analyzeInput('Maybe use cloud, conflicting requirements', r.updatedBlueprint, previous).updatedBlueprint.openDecisions.status, 'conflicting');
});
test('memory draft preserves scope, explicit unknown design and credential redaction', () => {
 const b = bp(); b.elevatorPitch.value = 'A lesson planner api_key=supersecret';
 const m = generateProjectMemory(b); assert.match(m.infoMd, /lesson planner/); assert.match(m.infoMd, /unknown/);
 assert.match(m.styleMd, /Typography: Unknown/); assert.match(m.styleMd, /compliance unverified/);
 assert.doesNotMatch(JSON.stringify(m), /supersecret|High contrast compliant|Space Grotesk/);
});
test('browser cannot fabricate commands, executable plans, generated files or handoff', async () => {
 const h = new BrowserPrototypeCreationHost(), p = await h.createPlan(bp());
 assert.equal(p.executable, false); assert.equal(p.commandPreview, ''); assert.equal(p.destinationPath, ''); assert.deepEqual(p.generatedFiles, []);
 assert.equal((await h.validatePlan(p)).valid, false); const events = [];
 await assert.rejects(h.executePlan(p, e => events.push(e)), /approval/i);
 await assert.rejects(h.executePlan(p, e => events.push(e), { digest: await planDigest(p), signal: new AbortController().signal }), /Generation unavailable/);
 assert.deepEqual(events, []);
});
test('digest binds reviewed content; missing approval, mutations and abort reject', async () => {
 const p = { ...await new BrowserPrototypeCreationHost().createPlan(bp()), executable: true };
 await assert.rejects(verifyApproval(p), /approval/);
 const approval = { digest: await planDigest(p), signal: new AbortController().signal }; await verifyApproval(p, approval);
 for (const change of [{ template: 'changed' }, { frameworkId: 'expo-react-native' }, { projectMemory: { ...p.projectMemory, infoMd: 'mutated' } }]) await assert.rejects(verifyApproval({ ...p, ...change }, approval), /changed/);
 const c = new AbortController(); c.abort(); await assert.rejects(verifyApproval(p, { ...approval, signal: c.signal }), /abort/i);
});
test('persisted schema validates nested values/version/message types', () => {
 const d = { blueprint: bp(), messages: [], savedAt: 1 }; assert.equal(isDraft(d), true);
 for (const v of [null, {}, { ...d, blueprint: { ...bp(), version: 2 } }, { ...d, blueprint: { ...bp(), platforms: { value: 'iOS' } } }, { ...d, messages: [{ role: 'evil' }] }]) assert.equal(isDraft(v), false);
});
test('storage failure never claims durability; malformed stored draft rejects', async () => {
 const old = globalThis.window;
 try {
  globalThis.window = { localStorage: { setItem() { throw Error('blocked'); } } };
  const h = new BrowserPrototypeCreationHost(); assert.equal(h.capabilities.draftPersistenceAvailable, false); await assert.rejects(h.saveDraft({ blueprint: bp(), messages: [] }), /unavailable/);
  globalThis.window = { localStorage: { setItem() {}, removeItem() {}, getItem() { return '{"blueprint":{}}'; } } };
  await assert.rejects(new BrowserPrototypeCreationHost().loadDraft(), /invalid schema/);
 } finally { globalThis.window = old; }
});
test('delayed hydration gates writes, saves serialize immutable latest snapshots', async () => {
 let load; const writes = [], completions = [];
 const session = new DraftSession({ loadDraft: () => new Promise(r => { load = r; }), saveDraft: data => new Promise(r => { writes.push(data.blueprint.projectName.value); completions.push(r); }) });
 const b = bp(); b.projectName.value = 'First'; const one = session.save({ blueprint: b, messages: [] }); b.projectName.value = 'Latest'; const two = session.save({ blueprint: b, messages: [] });
 await Promise.resolve(); assert.deepEqual(writes, []); load(null); await new Promise(setImmediate); assert.deepEqual(writes, ['First']);
 completions.shift()(); await one; await new Promise(setImmediate); assert.deepEqual(writes, ['First', 'Latest']); completions.shift()(); await two;
});
test('stale discovery ignored after edit/framework change; actual switch invalidates approval', async () => {
 const g = new RevisionGate(), token = g.invalidate(); let complete;
 const pending = new Promise(r => { complete = r; }).then(() => g.current(token));
 const b = bp(); b.approvedPlanId = 'approved'; g.invalidate(); const switched = switchFramework(b, 'expo-react-native'); complete();
 assert.equal(await pending, false); assert.equal(switched.approvedPlanId, null); assert.equal(switched.template, getFramework('expo-react-native').defaultTemplate);
});

test('proposed integrations and deferred backend are not confirmed as MVP', () => {
 const r = analyzeInput('Search. Maybe AI later. Supabase later. No auth.', bp()).updatedBlueprint;
 assert.equal(r.dataStorage.status, 'unknown'); assert.equal(r.authentication.value, 'No authentication');
 assert.ok(!r.mvpFeatures.value.includes('AI Assistant Integration'));
 assert.equal(r.openDecisions.status, 'requires-confirmation');
});
