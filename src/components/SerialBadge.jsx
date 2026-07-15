export function SerialBadge({ serial }) {
  return (
    <div
      className={`serial-badge ${serial.isConnected ? 'is-connected' : ''}`}
      role="status"
      aria-live="polite"
    >
      <span aria-hidden="true" />
      <div>
        <strong>{serial.isConnected ? 'Connected' : 'Disconnected'}</strong>
        <small>{serial.portLabel}</small>
      </div>
    </div>
  );
}
