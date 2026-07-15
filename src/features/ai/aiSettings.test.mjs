import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeModelUrl, parseConfidence } from './aiSettings.js';

test('normalizeModelUrl normalizes an HTTPS model folder URL', () => {
  assert.equal(
    normalizeModelUrl('https://teachablemachine.withgoogle.com/models/abc123?x=1#test'),
    'https://teachablemachine.withgoogle.com/models/abc123/',
  );
});

test('normalizeModelUrl rejects empty, invalid, and non-HTTPS URLs', () => {
  assert.throws(() => normalizeModelUrl(''), /입력/);
  assert.throws(() => normalizeModelUrl('not-a-url'), /올바른/);
  assert.throws(() => normalizeModelUrl('http://example.com/model/'), /https/);
});

test('parseConfidence accepts only integers from 0 through 100', () => {
  assert.equal(parseConfidence('0'), 0);
  assert.equal(parseConfidence('90'), 90);
  assert.equal(parseConfidence('100'), 100);
  assert.throws(() => parseConfidence(''), /정수/);
  assert.throws(() => parseConfidence('90.5'), /정수/);
  assert.throws(() => parseConfidence('101'), /정수/);
});
