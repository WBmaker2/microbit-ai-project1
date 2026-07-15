export const DEFAULT_CONFIDENCE = 90;

export function normalizeModelUrl(rawUrl) {
  const trimmed = String(rawUrl ?? '').trim();

  if (!trimmed) {
    throw new Error('모델 주소를 입력해 주세요.');
  }

  let parsed;

  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error('올바른 모델 주소를 입력해 주세요.');
  }

  if (parsed.protocol !== 'https:') {
    throw new Error('보안을 위해 https:// 모델 주소만 사용할 수 있습니다.');
  }

  parsed.hash = '';
  parsed.search = '';

  if (!parsed.pathname.endsWith('/')) {
    parsed.pathname = `${parsed.pathname}/`;
  }

  return parsed.toString();
}

export function parseConfidence(rawValue) {
  const text = String(rawValue ?? '').trim();

  if (!text) {
    throw new Error('0부터 100까지의 정수를 입력해 주세요.');
  }

  const value = Number(text);

  if (!Number.isInteger(value) || value < 0 || value > 100) {
    throw new Error('0부터 100까지의 정수를 입력해 주세요.');
  }

  return value;
}
