import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluatePrediction, getBestPrediction, isNoiseLabel } from './predictionPolicy.js';

test('isNoiseLabel blocks Korean and common Teachable Machine noise labels', () => {
  assert.equal(isNoiseLabel('배경 소음'), true);
  assert.equal(isNoiseLabel('_background_noise_'), true);
  assert.equal(isNoiseLabel('Background Noise'), true);
  assert.equal(isNoiseLabel('unknown'), true);
  assert.equal(isNoiseLabel('on'), false);
});

test('getBestPrediction returns the highest scoring class and percent', () => {
  assert.deepEqual(getBestPrediction({ scores: [0.08, 0.91, 0.01] }, ['off', 'on', '배경 소음']), {
    className: 'on',
    confidence: 91,
  });
});

test('evaluatePrediction blocks noise even at 100 percent confidence', () => {
  assert.deepEqual(
    evaluatePrediction({ className: '배경 소음', confidence: 100, threshold: 90 }),
    { shouldSend: false, reason: 'noise' },
  );
});

test('evaluatePrediction applies threshold and same-class cooldown', () => {
  assert.equal(
    evaluatePrediction({ className: 'on', confidence: 89, threshold: 90 }).reason,
    'below-threshold',
  );
  assert.equal(
    evaluatePrediction({
      className: 'on',
      confidence: 95,
      threshold: 90,
      lastSentClass: 'on',
      lastSentAt: 1000,
      now: 2000,
      cooldownMs: 1500,
    }).reason,
    'cooldown',
  );
  assert.equal(
    evaluatePrediction({
      className: 'on',
      confidence: 95,
      threshold: 90,
      lastSentClass: 'on',
      lastSentAt: 1000,
      now: 2600,
      cooldownMs: 1500,
    }).shouldSend,
    true,
  );
});
