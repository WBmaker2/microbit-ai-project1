export const DEFAULT_COMMAND_COOLDOWN_MS = 1500;

const NOISE_LABELS = new Set(['backgroundnoise', 'unknown', '배경소음', '소음']);

export function normalizeLabel(label) {
  return String(label ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '');
}

export function isNoiseLabel(label) {
  const normalized = normalizeLabel(label);
  return NOISE_LABELS.has(normalized) || normalized.includes('backgroundnoise');
}

export function getBestPrediction(result, labels) {
  if (!Array.isArray(labels) || !labels.length || !result?.scores?.length) {
    return null;
  }

  const best = result.scores.reduce(
    (winner, score, index) => (score > winner.score ? { score, index } : winner),
    { score: -Infinity, index: 0 },
  );

  return {
    className: labels[best.index] || '-',
    confidence: Math.round(best.score * 100),
  };
}

export function evaluatePrediction(options) {
  const {
    className,
    confidence,
    threshold,
    lastSentClass = '-',
    lastSentAt = 0,
    now = Date.now(),
    cooldownMs = DEFAULT_COMMAND_COOLDOWN_MS,
  } = options;

  if (!className || className === '-') {
    return { shouldSend: false, reason: 'empty' };
  }

  if (isNoiseLabel(className)) {
    return { shouldSend: false, reason: 'noise' };
  }

  if (confidence < threshold) {
    return { shouldSend: false, reason: 'below-threshold' };
  }

  if (className === lastSentClass && now - lastSentAt < cooldownMs) {
    return { shouldSend: false, reason: 'cooldown' };
  }

  return { shouldSend: true, reason: 'ready' };
}
