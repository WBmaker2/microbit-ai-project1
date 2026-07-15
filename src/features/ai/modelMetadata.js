export function metadataUrlForModel(modelBaseUrl) {
  return `${modelBaseUrl}metadata.json`;
}

export function readLabelsFromMetadata(metadata) {
  const candidateLabels = metadata?.wordLabels ?? metadata?.labels ?? metadata?.model?.labels ?? [];
  const labels = Array.isArray(candidateLabels)
    ? candidateLabels.map((label) => String(label).trim()).filter(Boolean)
    : [];

  if (!labels.length) {
    throw new Error('metadata.json에서 class 목록을 찾지 못했습니다.');
  }

  return labels;
}

export async function loadModelLabelsFromMetadata(modelBaseUrl, options = {}) {
  const { fetchImpl = fetch, signal } = options;
  const response = await fetchImpl(metadataUrlForModel(modelBaseUrl), { signal });

  if (!response.ok) {
    throw new Error(`metadata.json을 불러오지 못했습니다. (${response.status})`);
  }

  return readLabelsFromMetadata(await response.json());
}
