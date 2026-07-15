import { Fan } from 'lucide-react';

export function DeviceIllustration() {
  return (
    <div className="device-illustration" aria-hidden="true">
      <div className="microbit-board">
        <span className="pin pin-left" />
        <span className="pin pin-right" />
        <div className="led-grid">
          {Array.from({ length: 25 }).map((_, index) => (
            <i key={index} className={index % 2 === 0 ? 'is-on' : ''} />
          ))}
        </div>
      </div>
      <div className="wire-line" />
      <div className="fan-figure">
        <Fan size={84} strokeWidth={1.5} />
      </div>
    </div>
  );
}
