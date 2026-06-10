export function isPortOpen(port) {
  return Boolean(port?.readable || port?.writable);
}

export function isAlreadyOpenError(error) {
  return error?.name === 'InvalidStateError' || /already open/i.test(error?.message || '');
}

export function isAlreadyClosedError(error) {
  return error?.name === 'InvalidStateError' || /not open|already closed|closed/i.test(error?.message || '');
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
