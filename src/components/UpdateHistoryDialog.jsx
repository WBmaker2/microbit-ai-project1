import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { CHANGELOG } from '../data/changelog.js';

export function UpdateHistoryDialog({ isOpen, onClose }) {
  const closeButtonRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    closeButtonRef.current?.focus();
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="dialog-backdrop" onMouseDown={handleBackdropClick}>
      <section className="updates-dialog" role="dialog" aria-modal="true" aria-labelledby="updates-title">
        <div className="dialog-heading">
          <div>
            <span className="dialog-eyebrow">마이크로비트 AI 선풍기</span>
            <h2 id="updates-title">업데이트 내역</h2>
          </div>
          <button ref={closeButtonRef} className="icon-button" type="button" onClick={onClose} aria-label="닫기">
            <X size={22} />
          </button>
        </div>

        <div className="changelog-list">
          {CHANGELOG.map((entry) => (
            <article className="changelog-entry" key={entry.date}>
              <time dateTime={entry.date}>{entry.date}</time>
              <h3>{entry.title}</h3>
              <ul>
                {entry.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
