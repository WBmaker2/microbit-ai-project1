import assert from 'node:assert/strict';
import test from 'node:test';
import {
  loadModelLabelsFromMetadata,
  metadataUrlForModel,
  readLabelsFromMetadata,
} from './features/ai/modelMetadata.js';

test('metadataUrlForModel points to metadata.json in the model folder', () => {
  assert.equal(
    metadataUrlForModel('https://teachablemachine.withgoogle.com/models/3_iGiqd9o/'),
    'https://teachablemachine.withgoogle.com/models/3_iGiqd9o/metadata.json',
  );
});

test('readLabelsFromMetadata reads Teachable Machine speech labels', () => {
  assert.deepEqual(readLabelsFromMetadata({ wordLabels: ['배경 소음', 'on', 'off'] }), ['배경 소음', 'on', 'off']);
});

test('readLabelsFromMetadata ignores empty label values', () => {
  assert.deepEqual(readLabelsFromMetadata({ wordLabels: [' on ', '', ' off '] }), ['on', 'off']);
});

test('readLabelsFromMetadata throws when labels are missing', () => {
  assert.throws(() => readLabelsFromMetadata({ modelName: 'empty' }), /class 목록/);
});

test('loadModelLabelsFromMetadata fetches and parses metadata.json', async () => {
  const calls = [];
  const labels = await loadModelLabelsFromMetadata('https://example.com/model/', {
    fetchImpl: async (url) => {
      calls.push(url);
      return {
        ok: true,
        async json() {
          return { wordLabels: ['배경 소음', 'on', 'off'] };
        },
      };
    },
  });

  assert.deepEqual(calls, ['https://example.com/model/metadata.json']);
  assert.deepEqual(labels, ['배경 소음', 'on', 'off']);
});

test('loadModelLabelsFromMetadata reports fetch failures', async () => {
  await assert.rejects(
    () =>
      loadModelLabelsFromMetadata('https://example.com/model/', {
        fetchImpl: async () => ({
          ok: false,
          status: 404,
        }),
      }),
    /404/,
  );
});
