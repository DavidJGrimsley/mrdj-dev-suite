import test from 'node:test'
import assert from 'node:assert/strict'
import { quoteSemicolonPause } from '../../src/app/closing/quoteSemicolonPause.ts'

test('quote pause adds exactly 200ms after the semicolon at each playback speed', () => {
  const strokes = [
    { entry: { char: 'A' }, entryIndex: 0, start: 0, duration: 1 },
    { entry: { char: ';' }, entryIndex: 1, start: 1, duration: 0.2 },
    { entry: { char: ';' }, entryIndex: 1, start: 1.2, duration: 0.2 },
    { entry: { char: 'B' }, entryIndex: 3, start: 2, duration: 1 },
  ]
  for (const speed of [1, 8, 10]) {
    const result = quoteSemicolonPause(speed).timing({ strokes, duration: 3 })
    assert.deepEqual(result.strokes.slice(0, 3), strokes.slice(0, 3).map(({ start, duration }) => ({ start, duration })))
    assert.ok(Math.abs((result.strokes[3].start - strokes[3].start) / speed - 0.2) < 1e-10)
    assert.equal(result.strokes[3].duration, 1)
    assert.equal(result.duration, 3 + 0.2 * speed)
  }
  assert.equal(quoteSemicolonPause(10).timing({ strokes: strokes.slice(0, 1), duration: 1 }), undefined)
})
