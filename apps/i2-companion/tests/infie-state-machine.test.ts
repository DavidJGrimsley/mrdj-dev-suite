import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import {
  clampIdleLoopTime,
  createInitialInfieMachine,
  hasAllControllerClips,
  requestInfieForm,
  stepInfieMachine,
} from '../src/features/infie/infie-state-machine.ts';

const INFIE_CONTROLLER_TIMING = JSON.parse(
  fs.readFileSync(path.resolve(process.cwd(), 'assets/infie/infie-controller-timing.json'), 'utf8')
);

test('idle loop time wraps strictly below 6.0 seconds so frame 181 does not double hit', () => {
  assert.equal(clampIdleLoopTime(0), 0);
  const atSix = clampIdleLoopTime(6.0);
  assert.ok(atSix >= 0 && atSix < 6.0);
  assert.ok(clampIdleLoopTime(11.999999) < 6.0);
});

test('non-mist form transition routes through mist intermediary', () => {
  let m = createInitialInfieMachine();
  m = requestInfieForm(m, 'glyph');
  for (let i = 0; i < 40; i++) m = stepInfieMachine(m, 0.05);
  assert.equal(m.activeAssetForm, 'glyph');

  m = requestInfieForm(m, 'surge');
  assert.equal(m.targetForm, 'surge');
  assert.equal(m.phase, 'fading-to-mist', 'Switching Glyph -> Surge must route through Mist');

  // Complete transition through mist intermediary to surge
  for (let i = 0; i < 30; i++) m = stepInfieMachine(m, 0.05);
  assert.equal(m.activeAssetForm, 'surge');
  assert.equal(m.phase, 'steady');
});

test('controller clip verification enforces all 4 required clips and timing data loaded', () => {
  assert.equal(
    hasAllControllerClips([
      'INFIE_Idle',
      'INFIE_ToController',
      'CONTROLLER_Idle',
      'INFIE_FromController',
    ]),
    true
  );
  assert.equal(hasAllControllerClips(['INFIE_Idle', 'CONTROLLER_Idle']), false);
  assert.ok(INFIE_CONTROLLER_TIMING.duration > 0);
  assert.ok(INFIE_CONTROLLER_TIMING.cubeSeeds.length > 0);
});
