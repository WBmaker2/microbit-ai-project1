export function isPortOpen(port) {
  return Boolean(port?.readable || port?.writable);
}

export function isAlreadyOpenError(error) {
  return /already open/i.test(error?.message || '');
}

export function isAlreadyClosedError(error) {
  return /not open|already closed|closed/i.test(error?.message || '');
}

export function normalizeSerialMessage(value) {
  const message = String(value ?? '').trim();

  if (!message) {
    throw new Error('전송할 문자열을 입력해 주세요.');
  }

  return message;
}

export async function openPortIfNeeded(port, options) {
  if (isPortOpen(port)) {
    return { alreadyOpen: true, openedNow: false };
  }

  try {
    await port.open(options);
    return { alreadyOpen: false, openedNow: true };
  } catch (error) {
    if (isAlreadyOpenError(error)) {
      return { alreadyOpen: true, openedNow: false };
    }

    throw error;
  }
}
